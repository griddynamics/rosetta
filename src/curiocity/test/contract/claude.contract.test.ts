import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ClaudeCodeAdapter } from '../../src/agents/claude-code/adapter';
import { CLAUDE_CODE_DEFAULT_PROFILE } from '../../src/agents/claude-code/profile';
import { computeTranscriptPath } from '../../src/agents/claude-code/transcript-path';
import { resolveCommand } from '../../src/agents/launch';
import type { CanonicalHookSpec, TrialContext } from '../../src/agents/types';
import { agentProfileSchema } from '../../src/config/schema';
import { deriveCompletedStatus } from '../../src/curion/status';
import { InteractionEngine } from '../../src/interaction/engine';
import { FakeModelRouter } from '../../src/shared/model-router';
import { TerminalSession } from '../../src/terminal/session';

/**
 * LIVE adapter-contract test for `claude-code` (§15, M4 DoD). Runs ONE real trial
 * against the locally installed & authenticated `claude` CLI in a throwaway
 * workspace. It exercises the WHOLE adapter contract end-to-end:
 *   renderHooks (+ coexistence) → buildLaunch (env strip) → spawn PTY → SessionStart
 *   ctrl file → turn loop driven by the Stop ctrl file → transcript located (hook AND
 *   computed fallback) → parseEvents → terminate.
 *
 * No harness LLM tokens are spent: a scripted FakeModelRouter fast-classifies the
 * single turn as `done`, and NO evaluation runs. The child `claude` uses the user's
 * own CLI auth (expected/unavoidable, §9). EXCLUDED from default vitest/smoke — run
 * via `npm run contract:claude`.
 */

const PROMPT = 'Reply with the single word PONG and nothing else.';
const TIMEOUT_SEC = 180;

const adapter = new ClaudeCodeAdapter();

interface TrialArtifactsOut {
  workspace: string;
  ctrlDir: string;
  sessionId: string;
  markerPath: string;
  sessionStartPath: string;
  stopPath: string;
  logs: string[];
  hasExited: boolean;
  outcome: string;
  transcriptPathAuthoritative: string;
  transcriptSource: string;
  eventKinds: string[];
  assistantTexts: string[];
  ranFastCalls: number;
}

/** Pre-create a workspace project-settings marker hook (hook-coexistence assertion). */
function writeMarkerSettings(workspace: string, markerPath: string): void {
  const dir = join(workspace, '.claude');
  mkdirSync(dir, { recursive: true });
  const settings = {
    hooks: {
      SessionStart: [
        { hooks: [{ type: 'command', command: `printf 'MARKER' > '${markerPath}'` }] },
      ],
    },
  };
  writeFileSync(join(dir, 'settings.json'), JSON.stringify(settings, null, 2));
}

async function runLiveClaudeTrial(): Promise<TrialArtifactsOut> {
  const workspace = mkdtempSync(join(tmpdir(), 'curiocity-claude-ws-'));
  const ctrlDir = mkdtempSync(join(tmpdir(), 'curiocity-claude-ctrl-'));
  const sessionId = randomUUID();
  const markerPath = join(ctrlDir, 'coexistence-marker.txt');
  const logs: string[] = [];
  const log = (msg: string, fields?: Record<string, unknown>): void => {
    logs.push(`${msg}${fields ? ` ${JSON.stringify(fields)}` : ''}`);
  };

  // Pre-create a harmless project-scoped marker hook alongside the harness --settings
  // layer: BOTH must fire in one session (hook-coexistence contract, §5.2).
  writeMarkerSettings(workspace, markerPath);

  const profile = agentProfileSchema.parse(CLAUDE_CODE_DEFAULT_PROFILE);
  const ctx: TrialContext = {
    agentId: 'claude-code',
    caseName: 'contract-pong',
    repeat: 1,
    workspace,
    ctrlDir,
    sessionId,
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
  if (resolved === null) throw new Error(`claude CLI not resolvable on PATH (command="${plan.command}")`);

  // Verify env stripping actually applied BEFORE launch — the #1 live-failure cause
  // (a claude that still sees CLAUDECODE runs as a nested child and never persists a
  // transcript, §10.1). This test itself runs inside a Claude Code session.
  expect(plan.env.CLAUDECODE).toBeUndefined();
  expect(Object.keys(plan.env).some((k) => k.startsWith('CLAUDE_CODE'))).toBe(false);
  expect(plan.env.ANTHROPIC_API_KEY).toBeUndefined();

  for (const file of plan.files) {
    mkdirSync(join(file.path, '..'), { recursive: true });
    writeFileSync(file.path, file.content);
  }

  const spawnedAt = Date.now();
  const session = new TerminalSession({
    command: resolved,
    args: plan.args,
    cwd: workspace,
    env: plan.env,
    submit: profile.submit,
  });

  // FakeModelRouter: fast-classify the single completed turn as `done`. Extra `done`
  // entries are harmless (unused). Zero tokens; no evaluation, no workhorse calls.
  const router = new FakeModelRouter({
    entries: [
      { role: 'fast', kind: 'object', object: { classification: 'done' } },
      { role: 'fast', kind: 'object', object: { classification: 'done' } },
      { role: 'fast', kind: 'object', object: { classification: 'done' } },
    ],
  });

  let outcome = 'unknown';
  let transcriptPathAuthoritative = '';
  let transcriptSource = 'unknown';
  let eventKinds: string[] = [];
  let assistantTexts: string[] = [];
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
    transcriptPathAuthoritative = result.transcriptPath;
    transcriptSource = result.transcriptSource;
    eventKinds = result.events.map((e) => e.kind);
    assistantTexts = result.events
      .filter((e) => e.kind === 'assistant')
      .map((e) => String((e.payload as { text?: string }).text ?? ''));
  } finally {
    session.kill();
  }

  return {
    workspace,
    ctrlDir,
    sessionId,
    markerPath,
    sessionStartPath: hookSpec.sessionStart.writeTo,
    stopPath: hookSpec.stop.appendTo,
    logs,
    hasExited: session.hasExited,
    outcome,
    transcriptPathAuthoritative,
    transcriptSource,
    eventKinds,
    assistantTexts,
    ranFastCalls: router.calls.length,
  };
}

describe('claude-code LIVE adapter contract (§15)', () => {
  it('runs a real PONG trial: ctrl files, transcript (hook == computed), events, coexistence, clean exit', async () => {
    let out: TrialArtifactsOut | undefined;
    try {
      out = await runLiveClaudeTrial();

      // --- Evidence dump (summarized in the run report) ---------------------
      const summary = {
        outcome: out.outcome,
        transcriptSource: out.transcriptSource,
        eventKinds: out.eventKinds,
        assistantTexts: out.assistantTexts,
        fastCalls: out.ranFastCalls,
        hasExited: out.hasExited,
      };
      // eslint-disable-next-line no-console
      console.log('[contract:claude] summary:', JSON.stringify(summary, null, 2));

      // --- (1) SessionStart ctrl file appeared with expected fields --------
      expect(existsSync(out.sessionStartPath), 'session-start.json should exist').toBe(true);
      const ss = JSON.parse(readFileSync(out.sessionStartPath, 'utf8')) as {
        session_id?: string;
        transcript_path?: string;
      };
      expect(ss.session_id).toBe(out.sessionId);
      expect(typeof ss.transcript_path).toBe('string');
      expect(ss.transcript_path!.length).toBeGreaterThan(0);
      // eslint-disable-next-line no-console
      console.log('[contract:claude] session-start.json:', JSON.stringify(ss));

      // --- (2) Stop ctrl file appeared with last_assistant_message ---------
      expect(existsSync(out.stopPath), 'stop.jsonl should exist').toBe(true);
      const stopLines = readFileSync(out.stopPath, 'utf8').split('\n').filter((l) => l.trim() !== '');
      expect(stopLines.length).toBeGreaterThan(0);
      const stop = JSON.parse(stopLines[0]!) as { last_assistant_message?: string | null };
      expect('last_assistant_message' in stop).toBe(true);
      // eslint-disable-next-line no-console
      console.log('[contract:claude] stop.jsonl[0]:', JSON.stringify(stop));

      // --- (3) Transcript located via hook AND computed fallback (same file)
      expect(out.transcriptSource).toBe('authoritative');
      expect(existsSync(out.transcriptPathAuthoritative)).toBe(true);
      const computed = computeTranscriptPath(homedir(), out.workspace, out.sessionId);
      expect(existsSync(computed), `computed fallback ${computed} should exist`).toBe(true);
      expect(realpathSync(computed)).toBe(realpathSync(out.transcriptPathAuthoritative));
      // eslint-disable-next-line no-console
      console.log('[contract:claude] transcript hook==computed:', realpathSync(computed));

      // --- (4) Trajectory parsed >0 with an assistant message containing PONG
      const raw = readFileSync(out.transcriptPathAuthoritative, 'utf8');
      const events = adapter.parseEvents(raw);
      expect(events.length).toBeGreaterThan(0);
      const assistant = events.filter((e) => e.kind === 'assistant');
      expect(assistant.length).toBeGreaterThan(0);
      const pong = assistant.some((e) => String((e.payload as { text?: string }).text ?? '').includes('PONG'));
      expect(pong, 'an assistant message should contain PONG').toBe(true);
      const usage = adapter.extractUsage(events);
      // eslint-disable-next-line no-console
      console.log('[contract:claude] events:', events.length, 'usage:', JSON.stringify(usage));

      // --- (5) Trial status passed --------------------------------------
      expect(out.outcome).toBe('done');
      expect(deriveCompletedStatus('done')).toBe('passed');

      // --- (6) Hook-coexistence: BOTH the project marker AND the harness ---
      //          capture hooks fired in the SAME session (§5.2).
      expect(existsSync(out.markerPath), 'project-settings marker hook should have fired').toBe(true);
      expect(readFileSync(out.markerPath, 'utf8')).toContain('MARKER');
      expect(existsSync(out.sessionStartPath), 'harness capture hook should have fired').toBe(true);
      // eslint-disable-next-line no-console
      console.log('[contract:claude] coexistence: marker + capture hooks both present');

      // --- (7) No orphaned processes ------------------------------------
      expect(out.hasExited, 'claude PTY should have exited after terminate()').toBe(true);
    } catch (err) {
      if (out) {
        // eslint-disable-next-line no-console
        console.error('[contract:claude] FAILURE logs:', out.logs.join('\n'));
      }
      throw err;
    } finally {
      // Clean up OUR temp dirs only. NEVER touch ~/.claude (the transcript it wrote
      // there is left in place — reading it is fine, deleting it is not).
      if (out) {
        rmSync(out.workspace, { recursive: true, force: true });
        rmSync(out.ctrlDir, { recursive: true, force: true });
      }
    }
  });
});
