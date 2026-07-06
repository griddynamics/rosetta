import { describe, it, expect } from 'vitest';
import { gatedMean, DEFAULT_CAP, DEFAULT_PASS_THRESHOLD } from '../../src/combiners/gated-mean';
import type { CombineItem } from '../../src/combiners/types';
import type { EvalResult } from '../../src/evaluators/types';

function item(r: Partial<EvalResult>, weight = 1): CombineItem {
  return { result: { pass: r.pass ?? true, gate: r.gate ?? false, details: r.details ?? '', ...(r.score !== undefined ? { score: r.score } : {}) }, weight };
}

describe('gated-mean combiner (§5.4)', () => {
  it('caps the score at the cap when any gate fails, regardless of a high judge score', () => {
    const v = gatedMean.combine([
      item({ gate: true, pass: false, details: 'build failed' }),
      item({ score: 95 }),
    ]);
    expect(v.pass).toBe(false);
    expect(v.score).toBe(DEFAULT_CAP); // min(95, 40) = 40
    expect(v.rationale).toContain('build failed');
  });

  it('keeps a below-cap mean when a gate fails (still ≤ cap)', () => {
    const v = gatedMean.combine([
      item({ gate: true, pass: false, details: 'gate' }),
      item({ score: 20 }),
    ]);
    expect(v.score).toBe(20);
    expect(v.pass).toBe(false);
  });

  it('passes when all gates pass and the weighted mean ≥ passThreshold', () => {
    const v = gatedMean.combine([
      item({ gate: true, pass: true }),
      item({ score: 80 }, 3),
      item({ score: 40 }, 1),
    ]);
    // weighted mean = (80*3 + 40*1)/4 = 70
    expect(v.score).toBeCloseTo(70, 6);
    expect(v.pass).toBe(true);
  });

  it('fails when the weighted mean is below passThreshold', () => {
    const v = gatedMean.combine([item({ score: 55 })]);
    expect(v.pass).toBe(false);
    expect(DEFAULT_PASS_THRESHOLD).toBe(60);
  });

  it('gives a full passing score when gates pass and nothing is scored', () => {
    const v = gatedMean.combine([item({ gate: true, pass: true })]);
    expect(v.score).toBe(100);
    expect(v.pass).toBe(true);
  });

  it('honours custom cap / passThreshold params', () => {
    const capped = gatedMean.combine([item({ gate: true, pass: false }), item({ score: 90 })], { cap: 10, passThreshold: 50 });
    expect(capped.score).toBe(10);
    const passing = gatedMean.combine([item({ score: 55 })], { passThreshold: 50 });
    expect(passing.pass).toBe(true);
  });
});
