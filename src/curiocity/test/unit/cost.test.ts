import { describe, it, expect } from 'vitest';
import { priceUsage } from '../../src/llm/pricing';
import { costRollup } from '../../src/stats/cost-rollup';
import { DEFAULT_GATE } from '../../src/config/defaults';
import { trialResultSchema, type TrialResult } from '../../src/results/schema';

const PRICING = {
  'anthropic/sonnet': { inputPer1M: 3, outputPer1M: 15 },
};

function trial(over: Partial<TrialResult>): TrialResult {
  return trialResultSchema.parse({
    schemaVersion: 1,
    agent: 'mock',
    case: 'c',
    repeat: 1,
    status: 'passed',
    ...over,
  });
}

describe('priceUsage (§12)', () => {
  it('computes $ from the pricing map', () => {
    const res = priceUsage('anthropic/sonnet', { inputTokens: 1_000_000, outputTokens: 1_000_000 }, PRICING);
    expect(res.unpriced).toBe(false);
    expect(res.usd).toBeCloseTo(18, 6);
  });

  it('reports tokens-only (unpriced) for a model missing from the map', () => {
    const res = priceUsage('openai/mystery', { inputTokens: 100, outputTokens: 100 }, PRICING);
    expect(res.unpriced).toBe(true);
    expect(res.usd).toBeUndefined();
  });
});

describe('cost-rollup stat (§12): agent + harness itemization, $ vs tokens-only', () => {
  it('itemizes agent vs harness roles by model, prices what it can, warns on the rest', () => {
    const group = [
      trial({
        cost: {
          agent: { inputTokens: 100, outputTokens: 50 },
          judge: { inputTokens: 1_000_000, outputTokens: 0 },
          fast: { inputTokens: 500, outputTokens: 10 },
          models: { judge: 'anthropic/sonnet', fast: 'openai/mystery' },
        },
      }),
    ];
    const block = costRollup.compute(group, { gate: DEFAULT_GATE, pricing: PRICING }) as Record<string, unknown>;

    // Agent vs harness itemization.
    expect(block.agentUsage).toEqual({ inputTokens: 100, outputTokens: 50 });
    expect((block.harness as Record<string, unknown>).judge).toEqual({ inputTokens: 1_000_000, outputTokens: 0 });

    // Priced model → $; unpriced model → tokens-only + surfaced for a warning.
    const byModel = block.byModel as Record<string, { usd?: number }>;
    expect(byModel['anthropic/sonnet'].usd).toBeCloseTo(3, 6);
    expect(byModel['openai/mystery'].usd).toBeUndefined();
    expect(block.usd).toBeCloseTo(3, 6);
    expect(block.unpricedModels).toEqual(['openai/mystery']);
  });

  it('reports tokens-only with no $ when there is no pricing map', () => {
    const group = [
      trial({ cost: { judge: { inputTokens: 10, outputTokens: 10 }, models: { judge: 'anthropic/sonnet' } } }),
    ];
    const block = costRollup.compute(group, { gate: DEFAULT_GATE }) as Record<string, unknown>;
    expect(block.usd).toBeUndefined();
    expect(block.unpricedModels).toEqual(['anthropic/sonnet']);
  });
});
