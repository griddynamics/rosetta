import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { runTrial } from '../../src/curion/lifecycle';
import { buildChildEnv } from '../../src/orchestrator/env';
import { FakeModelRouter, type FakeRouterScript } from '../../src/shared/model-router';
import { mockSpec, type MockSpecArgs } from './helpers';

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
});
