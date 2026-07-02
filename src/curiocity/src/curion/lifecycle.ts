import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execa } from 'execa';
import { agentProfileSchema, provisionSchema, type AgentProfile } from '../config/schema';
import type { TrialSpec } from '../shared/ipc';
import type { ModelRouter } from '../shared/model-router';
import type { QnaEntry } from '../shared/trajectory';
import { agentRegistry } from '../agents';
import { resolveCommand } from '../agents/launch';
import type { CanonicalHookSpec, TrialContext } from '../agents/types';
import { TerminalSession } from '../terminal/session';
import { InteractionEngine, type InteractionResult } from '../interaction/engine';
import {
  SCHEMA_VERSION,
  trialResultSchema,
  type TrialResult,
  type TrialResultInput,
  type TrialStatus,
  type Verdict,
} from '../results/schema';
import type { TrialArtifacts } from '../results/store';
import { runEvaluatorPipeline } from './evaluate';
import { buildRouter } from './router-factory';
import { CostMeter } from '../llm/cost-meter';
import { MeteredRouter } from '../llm/router';
import { runSetup, runTeardown } from './setup';
import { deriveCompletedStatus, shouldKeepWorkspace } from './status';
import {
  computeDiff,
  copySource,
  createCtrlDir,
  createWorkspace,
  removeDir,
  snapshotSource,
  unzipSource,
} from './workspace';

/**
 * Trial lifecycle state machine (§7 steps 1-8, in order) — the whole of one
 * Curion's work. Teardown (step 8) ALWAYS runs; workspace retention follows the
 * §7 rule. All 8 statuses are reachable from here (see `status.ts` for the mapping).
 */

export interface RunTrialOptions {
  /** The child's already-scrubbed env (§4); the agent PTY env derives from this. */
  baseEnv: Record<string, string>;
  log?: (msg: string, fields?: Record<string, unknown>) => void;
  onQna?: (entry: QnaEntry) => void;
  onMirror?: (data: string) => void;
  /** Test hooks. */
  pollIntervalMs?: number;
  maxWallClockMs?: number;
  /** Inject a ModelRouter (in-process tests); defaults to `buildRouter(spec)`. */
  router?: ModelRouter;
}

export interface RunTrialResult {
  result: TrialResult;
  artifacts: TrialArtifacts;
}

function writePlanFile(file: { path: string; content: string; mode?: number }): void {
  mkdirSync(dirname(file.path), { recursive: true });
  writeFileSync(file.path, file.content);
  if (file.mode !== undefined) chmodSync(file.path, file.mode);
}

function readIfExists(path: string): string | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

export async function runTrial(spec: TrialSpec, opts: RunTrialOptions): Promise<RunTrialResult> {
  const log = opts.log ?? (() => {});
  const startedAt = Date.now();

  const profile: AgentProfile = agentProfileSchema.parse(spec.profile);
  const adapter = agentRegistry.get(profile.adapter);
  const provision = provisionSchema.parse(spec.provision ?? {});
  // Meter every router call (§12); wrap an injected router too so in-process tests
  // still itemize harness usage into the cost block.
  const meter = new CostMeter();
  const router = opts.router
    ? new MeteredRouter(opts.router, meter, spec.models)
    : buildRouter(spec, meter);

  const scriptEnv = {
    workspace: '',
    caseName: spec.caseName,
    agentId: spec.agentId,
    repeat: spec.repeat,
    ctrlDir: '',
  };

  let workspace: string | undefined;
  let ctrlDir: string | undefined;
  let snapshot: string | undefined;
  let session: TerminalSession | undefined;

  let status: TrialStatus = 'launch-error';
  let verdict: Verdict | undefined;
  let evaluators: TrialResultInput['evaluators'] = [];
  let qna: QnaEntry[] = [];
  let turnCount = 0;
  const artifacts: TrialArtifacts = {};
  let agentUsage = { inputTokens: 0, outputTokens: 0 };
  let interaction: InteractionResult | undefined;
  let checksMs = 0;
  let agentMs = 0;
  let llmMsAfterInteract = 0;

  try {
    // --- Step 1: workspace ---------------------------------------------------
    workspace = createWorkspace();
    ctrlDir = createCtrlDir();
    scriptEnv.workspace = workspace;
    scriptEnv.ctrlDir = ctrlDir;
    try {
      if (spec.srcZipPath) await unzipSource(spec.srcZipPath, workspace);
      else if (spec.srcDir) copySource(spec.srcDir, workspace);
    } catch (err) {
      status = 'launch-error';
      log('workspace prep failed', { error: (err as Error).message });
      throw new LifecycleHandled();
    }
    snapshot = snapshotSource(workspace);

    // --- Step 2: setup -------------------------------------------------------
    const setupRes = await runSetup(spec.setup, scriptEnv, opts.baseEnv);
    if (!setupRes.ok) {
      status = 'setup-error';
      log('setup-error', { script: setupRes.failure.script, exitCode: setupRes.failure.exitCode });
      throw new LifecycleHandled();
    }

    // --- Steps 3-4: provision + launch (standard pipeline, §5.2) -------------
    const hookSpec: CanonicalHookSpec = {
      sessionStart: { writeTo: join(ctrlDir, 'session-start.json') },
      stop: { appendTo: join(ctrlDir, 'stop.jsonl') },
    };
    const trialCtx: TrialContext = {
      agentId: spec.agentId,
      caseName: spec.caseName,
      repeat: spec.repeat,
      workspace,
      ctrlDir,
      sessionId: randomUUID(),
      prompt: spec.prompt,
      profile,
      provision,
      startedAt,
    };

    try {
      const plan = await adapter.prepare(trialCtx, hookSpec);
      // Launch preflight (R1): resolve the agent command on the PTY's PATH before
      // spawning. node-pty does not throw for a missing binary — it would exit
      // nonzero and read as `agent-crash`; an unresolvable command is a launch
      // failure (the agent never ran), so report `launch-error` here instead.
      const resolvedCommand = resolveCommand(plan.command, plan.env);
      if (resolvedCommand === null) {
        status = 'launch-error';
        log('launch-error: agent command not found on PATH', { command: plan.command });
        throw new LifecycleHandled();
      }
      for (const file of plan.files) writePlanFile(file);
      for (const cmd of plan.commands) {
        await execa(cmd, { shell: true, cwd: workspace, env: opts.baseEnv, reject: true });
      }
      session = new TerminalSession({
        command: resolvedCommand,
        args: plan.args,
        cwd: workspace,
        env: plan.env,
        submit: profile.submit,
      });
    } catch (err) {
      status = 'launch-error';
      log('launch-error', { error: (err as Error).message });
      throw new LifecycleHandled();
    }

    if (spec.mirror && opts.onMirror) {
      const onMirror = opts.onMirror;
      session.onData((_paneId, bytes) => onMirror(bytes));
    }

    // --- Step 5: interact ----------------------------------------------------
    const engine = new InteractionEngine({
      session,
      adapter,
      ctx: trialCtx,
      profile,
      router,
      qnaPolicy: spec.qna,
      maxWallClockMs: opts.maxWallClockMs ?? spec.timeoutSec * 1000 + 10_000,
      ...(opts.pollIntervalMs !== undefined ? { pollIntervalMs: opts.pollIntervalMs } : {}),
      ...(opts.onQna ? { onQna: opts.onQna } : {}),
      log,
    });
    const interactStart = Date.now();
    interaction = await engine.run();
    const interactMs = Date.now() - interactStart;
    turnCount = interaction.turnCount;
    qna = interaction.qna;
    agentUsage = interaction.usage;
    // Split interact wall-clock into agent runtime vs harness-LLM (QnA) time (§12).
    llmMsAfterInteract = meter.totalDurationMs();
    agentMs = Math.max(0, interactMs - llmMsAfterInteract);

    // --- Step 6: collect -----------------------------------------------------
    const diff = snapshot ? await computeDiff(snapshot, workspace) : '';
    artifacts.trajectory = interaction.events;
    const rawTranscript = readIfExists(interaction.transcriptPath);
    if (rawTranscript !== undefined) artifacts.rawTranscript = rawTranscript;
    artifacts.screen = interaction.screens.join('\n---\n');
    artifacts.diff = diff;

    // --- Step 7: evaluate (§11 pipeline + combiner) --------------------------
    if (interaction.outcome === 'done' && spec.evaluate) {
      const evalStart = Date.now();
      const evalOut = await runEvaluatorPipeline({
        enabled: true,
        workspace,
        workspaceDiff: diff,
        events: interaction.events,
        qna,
        evaluators: spec.evaluators,
        combiner: spec.combiner,
        caseFiles: {
          ...(spec.evaluation !== undefined ? { evaluationMd: spec.evaluation } : {}),
          promptMd: spec.prompt,
        },
        agentId: spec.agentId,
        router,
      });
      // Deterministic-check time = evaluate wall-clock minus the judge LLM time
      // that ran inside it (§12: checks vs harness-LLM are separate lines).
      const evalWall = Date.now() - evalStart;
      const judgeLlmMs = meter.totalDurationMs() - llmMsAfterInteract;
      checksMs = Math.max(0, evalWall - judgeLlmMs);
      if (evalOut.status === 'evaluated') {
        verdict = evalOut.verdict;
        evaluators = evalOut.evaluators;
      }
    }

    status = deriveCompletedStatus(interaction.outcome, verdict);
  } catch (err) {
    if (!(err instanceof LifecycleHandled)) {
      // Truly unexpected error inside the lifecycle → treat as launch/infra error.
      status = 'launch-error';
      log('lifecycle fatal', { error: (err as Error).message });
    }
  } finally {
    // --- Step 8: teardown (ALWAYS) ------------------------------------------
    if (workspace) {
      try {
        await runTeardown(spec.teardown, scriptEnv, opts.baseEnv);
      } catch {
        // best-effort
      }
    }
    session?.kill();
  }

  // --- Workspace retention (§7 step 8) --------------------------------------
  let workspacePath: string | undefined;
  if (workspace) {
    if (shouldKeepWorkspace(status, spec.keepWorkspace)) {
      workspacePath = workspace;
    } else {
      removeDir(workspace);
    }
  }
  if (snapshot) removeDir(snapshot);
  if (ctrlDir && !workspacePath) removeDir(ctrlDir);

  // Cost block (§12): agent usage + harness usage itemized per role, plus the
  // resolved model per role (lets `cost-rollup` itemize $ by model retroactively).
  const harness = meter.byRole();
  const harnessModels = meter.modelsByRole();
  const cost: TrialResultInput['cost'] = {
    agent: agentUsage,
    ...(harness.fast ? { fast: harness.fast } : {}),
    ...(harness.workhorse ? { workhorse: harness.workhorse } : {}),
    ...(harness.judge ? { judge: harness.judge } : {}),
    ...(Object.keys(harnessModels).length > 0 ? { models: harnessModels } : {}),
  };

  const resultInput: TrialResultInput = {
    schemaVersion: SCHEMA_VERSION,
    agent: spec.agentId,
    case: spec.caseName,
    repeat: spec.repeat,
    status,
    ...(verdict ? { verdict } : {}),
    evaluators,
    turnCount,
    qna,
    cost,
    timings: {
      totalMs: Date.now() - startedAt,
      ...(agentMs > 0 ? { agentMs } : {}),
      harnessLlmMs: meter.totalDurationMs(),
      ...(checksMs > 0 ? { checksMs } : {}),
    },
    ...(workspacePath ? { workspacePath } : {}),
  };

  return { result: trialResultSchema.parse(resultInput), artifacts };
}

/** Internal control-flow marker: a lifecycle step already set a terminal status. */
class LifecycleHandled extends Error {}
