import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execa } from 'execa';
import { agentProfileSchema, provisionSchema, type AgentProfile } from '../config/schema';
import type { TrialSpec } from '../shared/ipc';
import type { ModelRouter } from '../shared/model-router';
import { zeroUsage, type QnaEntry } from '../shared/trajectory';
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
import { buildAgentEffortRecord, buildAgentModelRecord } from './agent-model';
import { computeTurnMetrics } from '../results/turn-metrics';
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
 * §7 rule. Every §7 status is reachable from here (see `status.ts` for the mapping).
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
  // (R2) the exact instant the agent process is spawned WITH the prompt already in
  // its launch args (D15) — anchors turn 1's timeline start; see interaction/engine.ts.
  let spawnedAt: number | undefined;

  let status: TrialStatus = 'launch-error';
  let verdict: Verdict | undefined;
  // Set when ≥1 evaluator THREW (§7): trial becomes `eval-error`, verdict discarded.
  let evalError = false;
  let evaluators: TrialResultInput['evaluators'] = [];
  let qna: QnaEntry[] = [];
  let turnCount = 0;
  const artifacts: TrialArtifacts = {};
  let agentUsage = zeroUsage();
  let interaction: InteractionResult | undefined;
  // Per-phase walls (§12); every leg MEASURED, not derived by subtraction.
  const phases = {
    workspaceMs: 0,
    setupMs: 0,
    provisionMs: 0,
    launchMs: 0,
    interactMs: 0,
    collectMs: 0,
    evaluateMs: 0,
    teardownMs: 0,
  };
  let checksMs = 0;
  let judgeLlmMs = 0;
  let interactLlmMs = 0; // harness-LLM wall-clock recorded during interact
  let transcriptSourceLabel: 'hook' | 'fallback' | undefined;

  try {
    // --- Step 1: workspace ---------------------------------------------------
    const workspaceStart = Date.now();
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
    phases.workspaceMs = Date.now() - workspaceStart;

    // --- Step 2: setup -------------------------------------------------------
    const setupStart = Date.now();
    const setupRes = await runSetup(spec.setup, scriptEnv, opts.baseEnv);
    phases.setupMs = Date.now() - setupStart;
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
      const provisionStart = Date.now();
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
      phases.provisionMs = Date.now() - provisionStart;
      const launchStart = Date.now();
      spawnedAt = launchStart;
      session = new TerminalSession({
        command: resolvedCommand,
        args: plan.args,
        cwd: workspace,
        env: plan.env,
        submit: profile.submit,
      });
      // launchMs = spawn→ready; readiness runs inside the engine, so its measured
      // readyMs is added to this base once interact returns (§12).
      phases.launchMs = Date.now() - launchStart;
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
      ...(spawnedAt !== undefined ? { spawnedAt } : {}),
      log,
    });
    const interactStart = Date.now();
    interaction = await engine.run();
    const interactWall = Date.now() - interactStart;
    turnCount = interaction.turnCount;
    qna = interaction.qna;
    agentUsage = interaction.usage;
    transcriptSourceLabel = interaction.transcriptSource === 'authoritative' ? 'hook' : 'fallback';
    // Readiness (launching → ready) was measured inside the engine — bill it to
    // launchMs (spawn→ready, §12), leaving interactMs = the turn loop after ready.
    phases.launchMs += interaction.readyMs;
    phases.interactMs = Math.max(0, interactWall - interaction.readyMs);
    // Harness-LLM wall-clock recorded so far is all interact-side (QnA) LLM time.
    interactLlmMs = meter.totalDurationMs();

    // --- Step 6: collect -----------------------------------------------------
    const collectStart = Date.now();
    const diff = snapshot ? await computeDiff(snapshot, workspace) : '';
    artifacts.trajectory = interaction.events;
    const rawTranscript = readIfExists(interaction.transcriptPath);
    if (rawTranscript !== undefined) artifacts.rawTranscript = rawTranscript;
    artifacts.screen = interaction.screens.join('\n---\n');
    artifacts.diff = diff;
    // Transcript views (§14 addendum): each adapter converts ITS OWN raw transcript +
    // the normalized events into human-readable markdown. Defensive by design — a
    // view-rendering bug must never fail the trial, so this is best-effort/try-catch.
    try {
      artifacts.views = adapter.buildTranscriptViews(rawTranscript ?? '', interaction.events, {
        prompt: spec.prompt,
        qnaLog: qna,
      });
    } catch (err) {
      log('transcript view build failed (non-fatal)', { error: (err as Error).message });
    }
    phases.collectMs = Date.now() - collectStart;

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
        // External-evaluator context (§11): file paths + identity for the stdin JSON.
        rawTranscriptPath: interaction.transcriptPath,
        ...(spec.caseDir !== undefined ? { caseDir: spec.caseDir } : {}),
        ...(interaction.agentModel !== undefined
          ? { agentModel: interaction.agentModel }
          : profile.agentModel !== undefined
            ? { agentModel: profile.agentModel }
            : {}),
        sessionId: trialCtx.sessionId,
        router,
        log,
      });
      // Evaluate splits into deterministic checks vs judge-LLM (§12): the judge LLM
      // time is whatever the meter accrued during evaluate; the rest is checks.
      const evalWall = Date.now() - evalStart;
      phases.evaluateMs = evalWall;
      judgeLlmMs = Math.max(0, meter.totalDurationMs() - interactLlmMs);
      checksMs = Math.max(0, evalWall - judgeLlmMs);
      if (evalOut.status === 'evaluated') {
        // Keep the per-evaluator records either way (so the errored evaluator stays
        // visible in trial.json). On an evaluator infra error, DROP the combiner verdict
        // and mark the trial `eval-error` (§7) — it was never validly judged.
        evaluators = evalOut.evaluators;
        if (evalOut.errored) {
          evalError = true;
        } else {
          verdict = evalOut.verdict;
        }
      }
    }

    status = evalError ? 'eval-error' : deriveCompletedStatus(interaction.outcome, verdict);
  } catch (err) {
    if (!(err instanceof LifecycleHandled)) {
      // Truly unexpected error inside the lifecycle → treat as launch/infra error.
      status = 'launch-error';
      log('lifecycle fatal', { error: (err as Error).message });
    }
  } finally {
    // --- Step 8: teardown (ALWAYS) ------------------------------------------
    if (workspace) {
      const teardownStart = Date.now();
      try {
        await runTeardown(spec.teardown, scriptEnv, opts.baseEnv);
      } catch {
        // best-effort
      }
      phases.teardownMs = Date.now() - teardownStart;
    }
    session?.kill();
  }

  // --- Workspace retention (§7 step 8) --------------------------------------
  // Still part of the spec's "teardown" step (§7: "teardown — always runs...; then
  // workspace deleted unless --keep-workspace or the trial failed") — billed onto
  // `teardownMs` (not a separate leg) so the 8 phase walls stay a real partition of
  // `totalMs` (Part 3.3 sanity: this cleanup used to fall OUTSIDE every phase).
  const retentionStart = Date.now();
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
  phases.teardownMs += Date.now() - retentionStart;

  // Cost block (§12): agent usage + harness usage itemized per role, each keyed to a
  // concrete `provider/model` (the model is the unit of account). `models.agent` is
  // the agent's own model where the CLI reported it (SessionStart payload).
  const harness = meter.byRole();
  const harnessModels = meter.modelsByRole();
  const models: Record<string, string> = { ...harnessModels };
  if (interaction?.agentModel) models.agent = interaction.agentModel;
  const cost: TrialResultInput['cost'] = {
    agent: agentUsage,
    ...(harness.fast ? { fast: harness.fast } : {}),
    ...(harness.workhorse ? { workhorse: harness.workhorse } : {}),
    ...(harness.judge ? { judge: harness.judge } : {}),
    ...(Object.keys(models).length > 0 ? { models } : {}),
  };

  // Time decomposition (§12): agentPureMs is MEASURED from the per-turn timeline (not
  // interactMs − llm); harnessReactMs splits into per-model LLM time vs overhead.
  const totalMs = Date.now() - startedAt;
  const agentPureMs = interaction?.agentPureMs ?? 0;
  const harnessReactMs = interaction?.harnessReactMs ?? 0;
  const harnessLlmByModel = meter.durationByModel();
  const harnessOverheadMs = Math.max(0, harnessReactMs - interactLlmMs);

  // Turn metrics (§12): derived from the persisted per-turn timeline (D8 retroactive).
  const turnMetrics = interaction ? computeTurnMetrics(interaction.timeline) : undefined;
  // agentModel accounting (§5.2): requested (what we passed to the CLI) vs observed
  // (what the CLI's SessionStart payload reported), with a tolerant mismatch flag.
  const agentModelRecord = buildAgentModelRecord(profile.agentModel, interaction?.agentModel);
  // agentEffort accounting (§5.2): requested (passed to the CLI) vs observed (the Stop-hook
  // payload's `effort`), with an exact-match mismatch flag. When an effort was requested but
  // the adapter reported none back (no effort surface), warn + omit `observed` — never fail.
  const agentEffortRecord = buildAgentEffortRecord(profile.agentEffort, interaction?.agentEffort);
  if (profile.agentEffort !== undefined && interaction?.agentEffort === undefined) {
    log('agentEffort requested but not observed (adapter reported no effort; omitting observed)', {
      agent: spec.agentId,
      requested: profile.agentEffort,
    });
  }

  const resultInput: TrialResultInput = {
    schemaVersion: SCHEMA_VERSION,
    agent: spec.agentId,
    case: spec.caseName,
    repeat: spec.repeat,
    status,
    ...(verdict ? { verdict } : {}),
    evaluators,
    turnCount,
    ...(turnMetrics ? { turnMetrics } : {}),
    qna,
    cost,
    ...(agentModelRecord ? { agentModel: agentModelRecord } : {}),
    ...(agentEffortRecord ? { agentEffort: agentEffortRecord } : {}),
    ...(transcriptSourceLabel ? { transcriptSource: transcriptSourceLabel } : {}),
    timings: {
      totalMs,
      workspaceMs: phases.workspaceMs,
      setupMs: phases.setupMs,
      provisionMs: phases.provisionMs,
      launchMs: phases.launchMs,
      interactMs: phases.interactMs,
      collectMs: phases.collectMs,
      evaluateMs: phases.evaluateMs,
      teardownMs: phases.teardownMs,
      agentPureMs,
      // Legacy alias so pre-bump readers / the time-rollup stat keep working.
      agentMs: agentPureMs,
      harnessReactMs,
      harnessLlmMs: meter.totalDurationMs(),
      harnessOverheadMs,
      ...(Object.keys(harnessLlmByModel).length > 0 ? { harnessLlmByModel } : {}),
      checksMs,
      judgeLlmMs,
      ...(interaction ? { timeline: interaction.timeline } : {}),
    },
    ...(workspacePath ? { workspacePath } : {}),
  };

  return { result: trialResultSchema.parse(resultInput), artifacts };
}

/** Internal control-flow marker: a lifecycle step already set a terminal status. */
class LifecycleHandled extends Error {}
