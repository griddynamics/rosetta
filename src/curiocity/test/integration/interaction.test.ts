import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, it, expect } from 'vitest';
import { runTrial } from '../../src/curion/lifecycle';
import { buildChildEnv } from '../../src/orchestrator/env';
import { FakeModelRouter, type FakeRouterScript } from '../../src/shared/model-router';
import { listTmpAgentDirs, mockSpec, sweepNewTmpAgentDirs, type MockSpecArgs } from './helpers';

// Several tests below intentionally produce retained (failed/error) trials whose
// workspace + ctrl dir are kept per §7. Sweep the ones this file created so a full
// vitest run shows no `curiocity-ws-*`/`curiocity-ctrl-*` growth (Part 3.3). The
// production retention rule itself is unchanged.
const tmpBaseline = new Set(listTmpAgentDirs());
afterAll(() => sweepNewTmpAgentDirs(tmpBaseline));

/**
 * Interaction-engine coverage (§6). Runs the full trial lifecycle IN-PROCESS with
 * a scripted FakeModelRouter so every §6 trigger-table row is exercised and the
 * exact LLM call sequence is asserted (zero tokens, deterministic). Fork + PTY +
 * env-scrub + results are covered in suite.test.ts / cli-run.test.ts.
 */

const baseEnv = buildChildEnv();

async function run(args: MockSpecArgs, script?: FakeRouterScript) {
  const router = script ? new FakeModelRouter(script) : undefined;
  const spec = mockSpec(args);
  const { result } = await runTrial(spec, {
    baseEnv,
    ...(router ? { router } : {}),
  });
  return { result, router };
}

describe('§6 interaction engine — trigger table, row by row', () => {
  it('row 3 (deterministic done marker) → terminate → passed, and row 8 (never inject on tool activity)', async () => {
    // No router at all: the UnavailableRouter throws if invoked. clean.json emits
    // tool activity (Read/Bash) then a done stop with a task_complete marker, so the
    // engine terminates deterministically WITHOUT any LLM call and injects nothing.
    const { result } = await run({ scene: 'clean.json' });
    expect(result.status).toBe('passed');
    expect(result.verdict).toBeUndefined(); // evaluation skipped (§7)
    expect(result.qna).toEqual([]);
    expect(result.turnCount).toBe(1);
    // transcriptSource is a RECORDED, checkable field (Part 3.2): the mock writes a
    // session-start.json (the authoritative capture-hook payload) → 'hook'.
    expect(result.transcriptSource).toBe('hook');
  });

  it('row 3 (Stop → fast classifies done) → terminate → passed', async () => {
    const { result, router } = await run({ scene: 'clean-llm-done.json' }, {
      entries: [{ role: 'fast', object: { classification: 'done' } }],
    });
    expect(result.status).toBe('passed');
    expect(router!.isExhausted()).toBe(true);
    expect(router!.calls).toHaveLength(1);
    expect(router!.calls[0]!.role).toBe('fast');
  });

  it('row 1 (pending structured question) → workhorse answer → typed reply', async () => {
    const { result, router } = await run({ scene: 'structured-question.json' }, {
      entries: [{ role: 'workhorse', text: 'json' }],
    });
    expect(result.status).toBe('passed');
    expect(result.qna).toHaveLength(1);
    expect(result.qna[0]).toMatchObject({ type: 'structured', question: 'Which output format?', answer: 'json' });
    expect(router!.calls.map((c) => c.role)).toEqual(['workhorse']);
    expect(router!.isExhausted()).toBe(true);
  });

  it('row 2 (Stop → fast classifies question) → workhorse free-text answer → typed reply', async () => {
    const { result, router } = await run({ scene: 'free-text-question.json' }, {
      entries: [
        { role: 'fast', object: { classification: 'question' } },
        { role: 'workhorse', text: 'out.txt' },
      ],
    });
    expect(result.status).toBe('passed');
    expect(result.qna).toHaveLength(1);
    expect(result.qna[0]).toMatchObject({ type: 'free-text', answer: 'out.txt' });
    expect(result.qna[0]!.question).toContain('filename');
    expect(router!.calls.map((c) => c.role)).toEqual(['fast', 'workhorse']);
    expect(router!.isExhausted()).toBe(true);
  });

  it('task_complete on a QUESTION turn is NOT swallowed as done (codex free-text-ask regression)', async () => {
    // The turn ends with a `task_complete` marker AND a question ("...?"). detectCompletion
    // must NOT terminate here — the fast classifier runs and the question is answered.
    // The follow-up done turn (no '?') still terminates deterministically (no LLM).
    const { result, router } = await run({ scene: 'question-then-complete.json' }, {
      entries: [
        { role: 'fast', object: { classification: 'question' } },
        { role: 'workhorse', text: 'option A' },
      ],
    });
    expect(result.status).toBe('passed');
    expect(result.qna).toHaveLength(1);
    expect(result.qna[0]).toMatchObject({ type: 'free-text', answer: 'option A' });
    expect(router!.calls.map((c) => c.role)).toEqual(['fast', 'workhorse']);
    expect(router!.isExhausted()).toBe(true);
  });

  it('row 4 (Stop classified working) → keep waiting, then done → passed', async () => {
    // The intermediate empty-message stop is classified `working` deterministically
    // (no LLM). If the engine had terminated early, turnCount would be 1, not 2.
    const { result } = await run({ scene: 'working-then-done.json' });
    expect(result.status).toBe('passed');
    expect(result.turnCount).toBe(2);
    expect(result.qna).toEqual([]);
  });

  it('row 5 (stall, screen-reader) → fast classifies screen input-prompt → workhorse reply', async () => {
    const { result, router } = await run(
      { scene: 'screen-prompt.json', profileOverrides: { strategy: 'screen-reader' } },
      {
        entries: [
          { role: 'fast', object: { kind: 'input-prompt' } },
          { role: 'workhorse', text: 'my-value' },
        ],
      },
    );
    expect(result.status).toBe('passed');
    expect(result.qna).toHaveLength(1);
    expect(result.qna[0]).toMatchObject({ type: 'free-text', answer: 'my-value' });
    expect(router!.calls.map((c) => c.role)).toEqual(['fast', 'workhorse']);
  });

  it('rows 6+7 (freeze watchdog: first window runs checks, second consecutive → agent-hung)', async () => {
    // json-only + no structured question → the first-window checks find nothing and
    // inject nothing; a second identical window trips the deterministic fail-safe.
    const { result } = await run({ scene: 'freeze.json', profileOverrides: { freezeMs: 200 } });
    expect(result.status).toBe('agent-hung');
    expect(result.qna).toEqual([]);
  });

  it('time decomposition (§12): agentPureMs is MEASURED from the per-turn timeline, split from harnessReact', async () => {
    // Scene: agent thinks 250ms → asks a structured question → (harness answers via a
    // scripted workhorse, instant) → agent works 120ms → done. So the agent-pure time
    // (Σ stopAt−turnStart) is dominated by the two agent sleeps, while harness reaction
    // (Σ reactionDoneAt−stopAt) is tiny (the fake router returns immediately).
    const { result } = await run(
      { scene: 'qna-timeline.json', profileOverrides: { stallMs: 60, freezeMs: 5000 } },
      { entries: [{ role: 'workhorse', text: 'json' }] },
    );
    expect(result.status).toBe('passed');
    expect(result.qna).toHaveLength(1);

    const tm = result.timings!;
    const timeline = tm.timeline!;
    // Two turns: the structured-question turn, then the done turn.
    expect(timeline.length).toBe(2);
    for (const t of timeline) {
      expect(t.turnStart).toBeLessThanOrEqual(t.stopAt);
      expect(t.stopAt).toBeLessThanOrEqual(t.reactionDoneAt);
    }

    // agentPureMs is MEASURED from the timeline (Σ stopAt − turnStart), NOT derived by
    // subtracting harness time from the interact wall — recompute and assert equality.
    const measuredPure = timeline.reduce((s, t) => s + (t.stopAt - t.turnStart), 0);
    const measuredReact = timeline.reduce((s, t) => s + (t.reactionDoneAt - t.stopAt), 0);
    expect(tm.agentPureMs).toBe(measuredPure);
    expect(tm.harnessReactMs).toBe(measuredReact);

    // The agent genuinely spent time (≈370ms of sleeps); the harness reaction is small.
    expect(tm.agentPureMs!).toBeGreaterThan(300);
    expect(tm.agentPureMs!).toBeGreaterThan(tm.harnessReactMs!);
  });

  it('(R2 regression) single-turn agentPureMs reflects real spawn→stop work, not ready-settle skew', async () => {
    // Reproduces the turn-1 timing misattribution bug: production claude/codex
    // profiles have NO readiness `bannerPattern` (§10.1/§10.2 — only `quietMs`), so
    // readiness settles only once the screen stops changing. A CLI that repaints
    // continuously while "thinking" (spinner, live token counters) means the agent's
    // real single-turn work happens ENTIRELY inside the spawn→ready-settle window.
    // Before the fix, turn 1's `turnStart` was stamped at ready-settle, so
    // `agentPureMs = stopAt - turnStart` collapsed to ~one poll tick (~25ms) while the
    // real work silently piled up inside `launchMs`. `bannerPattern: ''` disables the
    // banner shortcut so this scenario exercises the same quiet-based readiness path
    // real v1 profiles use; the mock `spin` step repaints the screen every 40ms for
    // 300ms (like a spinner), so quiet-based readiness cannot settle until spin ends.
    const { result } = await run({
      scene: 'turn1-spawn-anchor.json',
      profileOverrides: { bannerPattern: '', quietMs: 80 },
    });
    expect(result.status).toBe('passed');
    expect(result.turnCount).toBe(1);

    const tm = result.timings!;
    expect(tm.timeline).toHaveLength(1);
    const turn = tm.timeline![0]!;
    expect(turn.turnStart).toBeLessThanOrEqual(turn.stopAt);

    // The fix: turn 1 is anchored at process spawn (before the 300ms spin), so the
    // measured agent-pure time captures the real work instead of reading ~0.
    expect(tm.agentPureMs!).toBeGreaterThanOrEqual(250);
  });

  it('turn metrics (§12): a multi-question turn is counted ONCE (questionTurns=1)', async () => {
    // One Stop message bundling two questions → the harness answers it in ONE turn, so
    // questionTurns is 1 (not 2). Then a done turn. interruptions collapses the single
    // consecutive run to 1.
    const { result } = await run({ scene: 'multi-question-turn.json' }, {
      entries: [
        { role: 'fast', object: { classification: 'question' } },
        { role: 'workhorse', text: 'json, out.txt' },
      ],
    });
    expect(result.status).toBe('passed');
    expect(result.qna).toHaveLength(1);
    expect(result.turnMetrics).toEqual({ turnsTotal: 2, questionTurns: 1, interruptions: 1 });
  });

  it('agent-crash: PTY exits unexpectedly before a done signal', async () => {
    const { result } = await run({ scene: 'crash.json' });
    expect(result.status).toBe('agent-crash');
  });

  it('launch-error: workspace preparation fails (corrupt src.zip)', async () => {
    const bad = join(mkdtempSync(join(tmpdir(), 'curio-badzip-')), 'src.zip');
    writeFileSync(bad, 'this is definitely not a zip archive');
    const { result } = await run({ scene: 'clean.json', srcZipPath: bad });
    expect(result.status).toBe('launch-error');
  });

  it('launch-error (R1 preflight): unresolvable agent command → launch-error, not agent-crash', async () => {
    // node-pty would spawn a PTY that exits nonzero for a missing binary, which the
    // engine reads as `agent-crash`. The launch preflight resolves the command first,
    // so an unresolvable command is reported as the accurate `launch-error`.
    const { result } = await run({
      scene: 'clean.json',
      profileOverrides: { command: 'curiocity-nonexistent-binary-xyz' },
    });
    expect(result.status).toBe('launch-error');
  });
});
