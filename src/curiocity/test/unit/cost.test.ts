import { describe, it, expect } from 'vitest';
import { priceUsage } from '../../src/llm/pricing';
import { costRollup } from '../../src/stats/cost-rollup';
import { DEFAULT_GATE } from '../../src/config/defaults';
import { trialResultSchema, type TrialResult } from '../../src/results/schema';
import { makeUsage } from '../../src/shared/trajectory';

const PRICING = {
  'anthropic/sonnet': { inputPer1M: 3, outputPer1M: 15, cacheWritePer1M: 3.75, cacheReadPer1M: 0.3 },
  'anthropic/haiku': { inputPer1M: 1, outputPer1M: 5 }, // no cache/reasoning tiers → fallbacks
};

function trial(over: Partial<TrialResult>): TrialResult {
  return trialResultSchema.parse({
    schemaVersion: 2,
    agent: 'mock',
    case: 'c',
    repeat: 1,
    status: 'passed',
    ...over,
  });
}

describe('priceUsage (§12): tiered pricing + fallbacks', () => {
  it('prices every disjoint token class at its own rate', () => {
    const res = priceUsage(
      'anthropic/sonnet',
      makeUsage({ input: 1_000_000, output: 1_000_000, cacheWrite: 1_000_000, cacheRead: 1_000_000 }),
      PRICING,
    );
    expect(res.unpriced).toBe(false);
    // 3 + 15 + 3.75 (cacheWrite) + 0.30 (cacheRead) = 22.05
    expect(res.usd).toBeCloseTo(22.05, 6);
  });

  it('falls back: reasoning→outputPer1M, cache→inputPer1M when tiers absent', () => {
    const res = priceUsage(
      'anthropic/haiku',
      makeUsage({ input: 1_000_000, output: 0, reasoning: 1_000_000, cacheRead: 1_000_000, cacheWrite: 1_000_000 }),
      PRICING,
    );
    // input 1 + reasoning→output 5 + cacheRead→input 1 + cacheWrite→input 1 = 8
    expect(res.usd).toBeCloseTo(8, 6);
  });

  it('reports tokens-only (unpriced) for a model missing from the map', () => {
    const res = priceUsage('openai/mystery', makeUsage({ input: 100, output: 100 }), PRICING);
    expect(res.unpriced).toBe(true);
    expect(res.usd).toBeUndefined();
  });
});

describe('cost-rollup stat (§12): per model × source, no cross-model token sum', () => {
  it('itemizes one entry per (source, model) with the full token breakdown + $', () => {
    const group = [
      trial({
        cost: {
          agent: makeUsage({ input: 100, output: 50, cacheRead: 20 }),
          judge: makeUsage({ input: 1_000_000, output: 0 }),
          fast: makeUsage({ input: 500, output: 10 }),
          models: { agent: 'anthropic/sonnet', judge: 'anthropic/sonnet', fast: 'openai/mystery' },
        },
      }),
    ];
    const block = costRollup.compute(group, { gate: DEFAULT_GATE, pricing: PRICING }) as Record<string, unknown>;
    const items = block.items as Array<{ source: string; model: string; usage: { input: number }; usd?: number; unpriced: boolean }>;

    // One row per (source, model) — agent & judge are separate rows even on the same model.
    const agentRow = items.find((i) => i.source === 'agent')!;
    const judgeRow = items.find((i) => i.source === 'judge')!;
    const fastRow = items.find((i) => i.source === 'fast')!;
    expect(agentRow.model).toBe('anthropic/sonnet');
    expect(agentRow.usage.input).toBe(100);
    expect(judgeRow.usage.input).toBe(1_000_000);
    // judge priced (sonnet input rate 3/M → $3); fast model unpriced.
    expect(judgeRow.usd).toBeCloseTo(3, 6);
    expect(fastRow.unpriced).toBe(true);
    expect(fastRow.usd).toBeUndefined();

    // No cross-MODEL token sum: byModel aggregates per model (agent+judge share sonnet),
    // but never mixes different models into one figure.
    const byModel = block.byModel as Record<string, { usage: { input: number }; usd?: number }>;
    expect(byModel['anthropic/sonnet'].usage.input).toBe(1_000_100); // agent 100 + judge 1_000_000
    expect(byModel['openai/mystery'].usd).toBeUndefined();

    // Only the $ total is additive across models.
    // judge 3 + agent(sonnet): input 100→0.0003, output 50→0.00075, cacheRead 20→0.000006
    expect(block.usd).toBeCloseTo(3.001056, 5);
    expect(block.unpricedModels).toEqual(['openai/mystery']);
  });

  it('keeps two DIFFERENT models under the SAME source separate across trials (m8-review a)', () => {
    // Repeats of the same case can run the agent on different models (e.g. a config change
    // between trials, or a silent CLI fallback). Those must NOT be merged into one agent
    // figure — the (source, model) key keeps them as distinct rows so per-model $ is right.
    const group = [
      trial({ cost: { agent: makeUsage({ input: 1_000_000 }), models: { agent: 'anthropic/sonnet' } } }),
      trial({ cost: { agent: makeUsage({ input: 2_000_000 }), models: { agent: 'anthropic/haiku' } } }),
    ];
    const block = costRollup.compute(group, { gate: DEFAULT_GATE, pricing: PRICING }) as Record<string, unknown>;
    const items = block.items as Array<{ source: string; model: string; usage: { input: number }; usd?: number }>;
    const agentRows = items.filter((i) => i.source === 'agent');
    // Two separate agent rows — one per model — never a single blended row.
    expect(agentRows.length).toBe(2);
    expect(agentRows.find((r) => r.model === 'anthropic/sonnet')!.usage.input).toBe(1_000_000);
    expect(agentRows.find((r) => r.model === 'anthropic/haiku')!.usage.input).toBe(2_000_000);
    // byModel stays per-model; no cross-model token blending.
    const byModel = block.byModel as Record<string, { usage: { input: number } }>;
    expect(byModel['anthropic/sonnet'].usage.input).toBe(1_000_000);
    expect(byModel['anthropic/haiku'].usage.input).toBe(2_000_000);
    // Only $ is additive across models: sonnet 1M input @3 + haiku 2M input @1 = 5.
    expect(block.usd).toBeCloseTo(5, 6);
  });

  it('reports tokens-only with no $ when there is no pricing map (warning path)', () => {
    const group = [
      trial({ cost: { judge: makeUsage({ input: 10, output: 10 }), models: { judge: 'anthropic/sonnet' } } }),
    ];
    const block = costRollup.compute(group, { gate: DEFAULT_GATE }) as Record<string, unknown>;
    expect(block.usd).toBeUndefined();
    expect(block.unpricedModels).toEqual(['anthropic/sonnet']);
  });
});
