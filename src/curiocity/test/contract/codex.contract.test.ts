import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { CodexAdapter } from '../../src/agents/codex/adapter';
import { CODEX_DEFAULT_PROFILE } from '../../src/agents/codex/profile';
import { assertCodexFlags } from '../../src/agents/codex/preflight';
import { resolveCommand } from '../../src/agents/launch';
import type { CanonicalHookSpec, TrialContext } from '../../src/agents/types';
import { agentProfileSchema } from '../../src/config/schema';
import { deriveCompletedStatus } from '../../src/curion/status';
import { InteractionEngine } from '../../src/interaction/engine';
import { FakeModelRouter } from '../../src/shared/model-router';
import { TerminalSession } from '../../src/terminal/session';

/**
 * LIVE adapter-contract test for `codex` (§15, §10.2, M5 DoD). Runs ONE real trial
 * against the locally installed & authenticated `codex` CLI (0.142.2) in a throwaway
 * workspace. It exercises the whole adapter contract end-to-end:
 *   flag preflight → renderHooks (.codex/hooks.json) → buildLaunch → spawn PTY →
 *   (SessionStart ctrl file OR rollout fallback) → turn loop → transcript located →
 *   parseEvents (rollout dialect) → extractUsage → terminate.
 *
 * Codex's STRICT hook-output validation may silently disable a hook, so BOTH the
 * hook path and the computed-rollout fallback are acceptable — the test reports which
 * one ran. No harness LLM tokens are spent (FakeModelRouter). NOTHING is written to
 * ~/.codex/config.toml — asserted by hashing it before/after. EXCLUDED from default
 * vitest/smoke — run via `npm run contract:codex`.
 */

const PROMPT = 'Reply with the single word PONG and nothing else. Do not run any commands.';
const TIMEOUT_SEC = 240;
const adapter = new CodexAdapter();

const CONFIG_TOML = join(homedir(), '.codex', 'config.toml');

interface ConfigSnapshot {
  existed: boolean;
  hash: string | null;
  mtimeMs: number | null;
}

function snapshotConfig(): ConfigSnapshot {
  if (!existsSync(CONFIG_TOML)) return { existed: false, hash: null, mtimeMs: null };
  const buf = readFileSync(CONFIG_TOML);
  return {
    existed: true,
    hash: createHash('sha256').update(buf).digest('hex'),
    mtimeMs: statSync(CONFIG_TOML).mtimeMs,
  };
}

interface TrialOut {
  workspace: string;
  ctrlDir: string;
  sessionStartPath: string;
  stopPath: string;
  hooksJsonPath: string;
  logs: string[];
  hasExited: boolean;
  outcome: string;
  transcriptPath: string;
  transcriptSource: string;
  eventKinds: string[];
  assistantTexts: string[];
  usageInput: number;
  usageOutput: number;
  ranFastCalls: number;
  sessionStartAppeared: boolean;
  stopAppeared: boolean;
}

async function runLiveCodexTrial(): Promise<TrialOut> {
  const workspace = mkdtempSync(join(tmpdir(), 'curiocity-codex-ws-'));
  const ctrlDir = mkdtempSync(join(tmpdir(), 'curiocity-codex-ctrl-'));
  // (m5-review R1) Everything from here on can throw (flag/launch errors, a stalled
  // PTY, an assertion) BEFORE this function ever reaches its `return`. Previously
  // that left `workspace`/`ctrlDir` (and the isolated CODEX_HOME under it) orphaned
  // in $TMPDIR forever — the caller's own cleanup only runs when this function
  // RETURNS successfully. Confirmed live: a stale pair from an earlier aborted
  // development run (predating the CODEX_HOME isolation fix) was still on disk at
  // the start of this review. Guarantee cleanup here too, on every exit path.
  try {
    return await runLiveCodexTrialInner(workspace, ctrlDir);
  } catch (err) {
    rmSync(workspace, { recursive: true, force: true });
    rmSync(ctrlDir, { recursive: true, force: true });
    throw err;
  }
}

async function runLiveCodexTrialInner(workspace: string, ctrlDir: string): Promise<TrialOut> {
  const logs: string[] = [];
  const log = (msg: string, fields?: Record<string, unknown>): void => {
    logs.push(`${msg}${fields ? ` ${JSON.stringify(fields)}` : ''}`);
  };

  const profile = agentProfileSchema.parse(CODEX_DEFAULT_PROFILE);
  const ctx: TrialContext = {
    agentId: 'codex',
    caseName: 'contract-pong',
    repeat: 1,
    workspace,
    ctrlDir,
    sessionId: 'unused-codex-has-no-session-id-flag',
    prompt: PROMPT,
    profile,
    provision: { mcps: [], plugins: [] },
    startedAt: Date.now(),
  };
  const hookSpec: CanonicalHookSpec = {
    sessionStart: { writeTo: join(ctrlDir, 'session-start.json') },
    stop: { appendTo: join(ctrlDir, 'stop.jsonl') },
  };

  const plan = await adapter.prepare(ctx, hookSpec);
  const resolved = resolveCommand(plan.command, plan.env);
  if (resolved === null) throw new Error(`codex CLI not resolvable on PATH (command="${plan.command}")`);

  for (const file of plan.files) {
    mkdirSync(join(file.path, '..'), { recursive: true });
    writeFileSync(file.path, file.content);
  }
  // Apply the launch plan's provisioning commands EXACTLY as the Curion lifecycle does
  // (§7): this creates the isolated CODEX_HOME + symlinks auth.json (P11 isolation), so
  // nothing is written to the user's real ~/.codex.
  for (const cmd of plan.commands) {
    execSync(cmd, { cwd: workspace, stdio: 'ignore' });
  }
  const hooksJsonPath = join(workspace, '.codex', 'hooks.json');
  // CODEX_HOME the adapter chose (assert isolation: it is NOT the real ~/.codex).
  const codexHome = plan.env.CODEX_HOME ?? '';
  expect(codexHome.startsWith(ctrlDir)).toBe(true);

  const spawnedAt = Date.now();
  const session = new TerminalSession({
    command: resolved,
    args: plan.args,
    cwd: workspace,
    env: plan.env,
    submit: profile.submit,
  });

  // FakeModelRouter that NEVER terminates the trial: screen classification returns
  // 'thinking' and any stop classification returns 'working'. Completion must come
  // from the DETERMINISTIC path (Stop hook + rollout `task_complete` → detectCompletion),
  // not from an LLM — which is exactly what we want to prove. Zero tokens.
  const router = new FakeModelRouter({
    entries: Array.from({ length: 12 }, () => ({
      role: 'fast' as const,
      kind: 'object' as const,
      object: { classification: 'working', kind: 'thinking' },
    })),
  });

  let outcome = 'unknown';
  let transcriptPath = '';
  let transcriptSource = 'unknown';
  let eventKinds: string[] = [];
  let assistantTexts: string[] = [];
  let usageInput = 0;
  let usageOutput = 0;
  try {
    const engine = new InteractionEngine({
      session,
      adapter,
      ctx,
      profile,
      router,
      spawnedAt,
      qnaPolicy: 'Answer concisely. If unsure, abort.',
      maxWallClockMs: TIMEOUT_SEC * 1000,
      log,
    });
    const result = await engine.run();
    outcome = result.outcome;
    transcriptPath = result.transcriptPath;
    transcriptSource = result.transcriptSource;
    eventKinds = result.events.map((e) => e.kind);
    assistantTexts = result.events
      .filter((e) => e.kind === 'assistant')
      .map((e) => String((e.payload as { text?: string }).text ?? ''));
    // Disjoint classes (§12): input excludes cached tokens; add cacheRead back for
    // the "did we account any prompt tokens" contract check. output excludes reasoning.
    usageInput = result.usage.input + result.usage.cacheRead;
    usageOutput = result.usage.output + result.usage.reasoning;
  } finally {
    session.kill();
  }

  return {
    workspace,
    ctrlDir,
    sessionStartPath: hookSpec.sessionStart.writeTo,
    stopPath: hookSpec.stop.appendTo,
    hooksJsonPath,
    logs,
    hasExited: session.hasExited,
    outcome,
    transcriptPath,
    transcriptSource,
    eventKinds,
    assistantTexts,
    usageInput,
    usageOutput,
    ranFastCalls: router.calls.length,
    sessionStartAppeared: existsSync(hookSpec.sessionStart.writeTo),
    stopAppeared: existsSync(hookSpec.stop.appendTo),
  };
}

describe('codex LIVE adapter contract (§15, §10.2)', () => {
  it('flag preflight: installed codex advertises the §10.2 launch flags', () => {
    // Throws with the missing-flag list if the pinned CLI drifted.
    const help = assertCodexFlags();
    expect(help).toContain('--dangerously-bypass-hook-trust');
    // eslint-disable-next-line no-console
    console.log('[contract:codex] flag preflight OK');
  });

  it('runs a real PONG trial: transcript located, PONG + token usage, clean exit, no ~/.codex mutation', async () => {
    // (0) ~/.codex/config.toml non-mutation baseline (P11).
    const before = snapshotConfig();

    let out: TrialOut | undefined;
    try {
      out = await runLiveCodexTrial();

      const summary = {
        outcome: out.outcome,
        transcriptSource: out.transcriptSource,
        sessionStartAppeared: out.sessionStartAppeared,
        stopAppeared: out.stopAppeared,
        eventKinds: Array.from(new Set(out.eventKinds)),
        assistantTexts: out.assistantTexts,
        usage: { input: out.usageInput, output: out.usageOutput },
        fastCalls: out.ranFastCalls,
        hasExited: out.hasExited,
      };
      // eslint-disable-next-line no-console
      console.log('[contract:codex] summary:', JSON.stringify(summary, null, 2));

      // (1) .codex/hooks.json was written into the workspace (registration).
      expect(existsSync(out.hooksJsonPath), '.codex/hooks.json should exist').toBe(true);

      // (2) Which capture path ran? Report it. BOTH are contract-valid (§10.2):
      //     hook path (session-start.json / stop.jsonl appeared) OR rollout fallback.
      if (out.sessionStartAppeared) {
        const ss = JSON.parse(readFileSync(out.sessionStartPath, 'utf8')) as {
          session_id?: string;
          transcript_path?: string;
          cwd?: string;
        };
        // eslint-disable-next-line no-console
        console.log('[contract:codex] HOOK PATH: session-start.json:', JSON.stringify(ss));
        expect(typeof ss.session_id).toBe('string');
      } else {
        // eslint-disable-next-line no-console
        console.log('[contract:codex] FALLBACK PATH: SessionStart ctrl file never appeared (strict-validation risk) → rollout located by cwd+mtime');
      }
      // eslint-disable-next-line no-console
      console.log('[contract:codex] transcript:', out.transcriptSource, out.transcriptPath);

      // (3) Transcript located (either source) and parsed with an assistant PONG.
      expect(['authoritative', 'fallback']).toContain(out.transcriptSource);
      expect(existsSync(out.transcriptPath), `transcript ${out.transcriptPath} should exist`).toBe(true);
      const events = adapter.parseEvents(readFileSync(out.transcriptPath, 'utf8'));
      expect(events.length).toBeGreaterThan(0);
      const assistant = events.filter((e) => e.kind === 'assistant');
      expect(assistant.length).toBeGreaterThan(0);
      const pong = assistant.some((e) =>
        String((e.payload as { text?: string }).text ?? '').toUpperCase().includes('PONG'),
      );
      expect(pong, 'an assistant message should contain PONG').toBe(true);

      // (4) token_count usage extracted.
      const usage = adapter.extractUsage(events);
      // eslint-disable-next-line no-console
      console.log('[contract:codex] events:', events.length, 'usage:', JSON.stringify(usage));
      expect(usage.input).toBeGreaterThan(0);

      // (5) Status passed.
      expect(out.outcome).toBe('done');
      expect(deriveCompletedStatus('done')).toBe('passed');

      // (6) No orphaned processes.
      expect(out.hasExited, 'codex PTY should have exited after terminate()').toBe(true);
    } catch (err) {
      if (out) {
        // eslint-disable-next-line no-console
        console.error('[contract:codex] FAILURE logs:\n' + out.logs.join('\n'));
      }
      throw err;
    } finally {
      // (7) ~/.codex/config.toml NON-MUTATION (P11) — hash + mtime unchanged.
      const after = snapshotConfig();
      expect(after.existed).toBe(before.existed);
      expect(after.hash).toBe(before.hash);
      expect(after.mtimeMs).toBe(before.mtimeMs);
      // eslint-disable-next-line no-console
      console.log('[contract:codex] ~/.codex/config.toml unchanged:', after.hash === before.hash);

      if (out) {
        // Clean up OUR temp dirs only. NEVER touch ~/.codex (the rollout it wrote
        // there is left in place — reading it is fine, deleting it is not).
        rmSync(out.workspace, { recursive: true, force: true });
        rmSync(out.ctrlDir, { recursive: true, force: true });
      }
    }
  });
});
