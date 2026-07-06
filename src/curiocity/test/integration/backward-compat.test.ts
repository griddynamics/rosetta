import { afterAll, describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runReport } from '../../src/cli/commands/report';
import { ExitCode } from '../../src/cli/exit-codes';
import type { StatBlock } from '../../src/results/schema';

/**
 * Backward compatibility (hard rule): `report` on a PRE-schema-bump run dir must still
 * work. Old runs stored `schemaVersion: 1` with usage as `{inputTokens, outputTokens}`
 * (+ provider cache keys) and a minimal `timings` block (totalMs/agentMs/harnessLlmMs/
 * checksMs). Missing NEW fields must render as absent/zeros — never crash — and legacy
 * usage/time fields must map onto the new breakdown.
 */

const dirs: string[] = [];
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

/** Synthesize an old-schema (v1) run dir on disk — deliberately NOT via the current
 *  store writer, so it exercises the real backward-compat load path. */
function writeOldRun(): string {
  const runDir = mkdtempSync(join(tmpdir(), 'curio-oldrun-'));
  dirs.push(runDir);
  const trialDir = join(runDir, 'trials', 'legacy', 'claude-code', '1');
  mkdirSync(trialDir, { recursive: true });

  const oldTrial = {
    schemaVersion: 1,
    agent: 'claude-code',
    case: 'legacy',
    repeat: 1,
    status: 'passed',
    verdict: { pass: true, score: 90, rationale: 'legacy run' },
    evaluators: [],
    turnCount: 1,
    qna: [],
    // Legacy usage shape (pre-bump): inputTokens/outputTokens + provider cache keys.
    cost: {
      agent: { inputTokens: 1000, outputTokens: 200, cacheReadInputTokens: 500, cacheCreationInputTokens: 50 },
      judge: { inputTokens: 2000, outputTokens: 300 },
      models: { judge: 'anthropic/sonnet' },
    },
    // Legacy timings: only the four original legs; no timeline, no per-phase walls.
    timings: { totalMs: 5000, agentMs: 3000, harnessLlmMs: 1500, checksMs: 10 },
    // NOTE: no transcriptSource (a new field) — must render as absent, not crash.
  };
  writeFileSync(join(trialDir, 'trial.json'), JSON.stringify(oldTrial, null, 2));

  const oldSuite = {
    schemaVersion: 1,
    runDir,
    createdAt: '2026-06-01T00:00:00.000Z',
    // pricing snapshot so `report` recovers $ retroactively without --config.
    config: {
      globals: { gate: { minScore: 60, minPassRate: 0.8, maxStddev: 10 } },
      pricing: { 'anthropic/sonnet': { inputPer1M: 3, outputPer1M: 15 } },
    },
    matrix: [{ case: 'legacy', agent: 'claude-code', repeat: 1 }],
    groups: [],
  };
  writeFileSync(join(runDir, 'suite.json'), JSON.stringify(oldSuite, null, 2));
  return runDir;
}

describe('backward compat: report on a pre-bump (v1) run dir', () => {
  it('loads, re-stats, re-gates and re-renders without crashing; maps legacy fields', () => {
    const runDir = writeOldRun();

    const exit = runReport(runDir, {});
    expect(exit).toBe(ExitCode.OK); // gate passes (score 90)

    const suite = JSON.parse(readFileSync(join(runDir, 'suite.json'), 'utf8'));
    const groups = suite.groups as StatBlock[];

    // cost-rollup: legacy usage mapped into the full breakdown.
    const cost = groups.find((g) => g.id === 'cost-rollup') as Record<string, unknown>;
    const items = cost.items as Array<{ source: string; model: string; usage: Record<string, number>; usd?: number }>;
    const agentRow = items.find((i) => i.source === 'agent')!;
    const judgeRow = items.find((i) => i.source === 'judge')!;
    expect(agentRow.usage.input).toBe(1000); // inputTokens → input
    expect(agentRow.usage.cacheRead).toBe(500); // cacheReadInputTokens → cacheRead
    expect(agentRow.usage.cacheWrite).toBe(50); // cacheCreationInputTokens → cacheWrite
    expect(judgeRow.usage.input).toBe(2000);
    // judge priced from the recovered snapshot pricing (2000*3 + 300*15 per 1M).
    expect(judgeRow.usd).toBeCloseTo(0.0105, 6);

    // time-rollup: legacy agentMs surfaces as agentPureMs (fallback), new legs zeroed.
    const time = groups.find((g) => g.id === 'time-rollup') as Record<string, number>;
    expect(time.agentPureMs).toBe(3000);
    expect(time.totalMs).toBe(5000);
    expect(time.judgeLlmMs).toBe(0); // new field absent in old run → zero, not a crash

    // suite.md renders (transcript col shows '—' for the absent field).
    const md = readFileSync(join(runDir, 'suite.md'), 'utf8');
    expect(md).toContain('Curiocity suite report');
    expect(md).toContain('legacy');
  });
});
