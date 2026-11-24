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

describe('Claude 5.5 pricing', () => {
  it('prices the 5.5 generation from its own entries, not a shorter prefix', () => {
    expect(resolvePricing('claude-opus-5-5')).toEqual({ input: 4.0, output: 20.0 });
    expect(resolvePricing('claude-sonnet-5-5')).toEqual({ input: 2.0, output: 10.0 });
    expect(resolvePricing('claude-haiku-5-5')).toEqual({ input: 0.1, output: 0.5 });
  });

  it('computes cost for a Haiku 5.5 run at the short-prompt rate', () => {
    expect(computeCostUsd(1_000_000, 1_000_000, 'claude-haiku-5-5')).toBeCloseTo(0.6, 6);
  });
});
