import { describe, expect, it } from 'vitest';
import { computeCostUsd, resolvePricing } from '../src/pricing.js';

describe('resolvePricing', () => {
  it('resolves an exact known model id', () => {
    expect(resolvePricing('claude-sonnet-4-6')).toEqual({ input: 3.0, output: 15.0 });
  });

  it('resolves a dated snapshot id via longest-prefix match', () => {
    expect(resolvePricing('claude-sonnet-4-6-20260615')).toEqual({ input: 3.0, output: 15.0 });
  });

  it('prefers a more specific override over a shorter built-in prefix', () => {
    const pricing = resolvePricing('claude-sonnet-4-6-special', {
      'claude-sonnet-4-6-special': { input: 1, output: 2 },
    });
    expect(pricing).toEqual({ input: 1, output: 2 });
  });

  it('returns null for a fully unknown model', () => {
    expect(resolvePricing('some-unknown-model')).toBeNull();
  });
});

describe('computeCostUsd', () => {
  it('computes cost from input/output token counts', () => {
    const cost = computeCostUsd(1_000_000, 1_000_000, 'claude-sonnet-4-6');
    expect(cost).toBeCloseTo(3.0 + 15.0, 10);
  });

  it('returns null when pricing is unknown', () => {
    expect(computeCostUsd(1000, 1000, 'unknown-model')).toBeNull();
  });

  it('applies pricingOverrides', () => {
    const cost = computeCostUsd(1_000_000, 0, 'my-model', { 'my-model': { input: 7, output: 0 } });
    expect(cost).toBeCloseTo(7.0, 10);
  });
});
