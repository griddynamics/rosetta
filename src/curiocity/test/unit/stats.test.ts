import { describe, it, expect } from 'vitest';
import { scoreStats } from '../../src/stats/score-stats';
import { passRate } from '../../src/stats/pass-rate';
import { classifyStability, stability } from '../../src/stats/stability';
import type { StatContext } from '../../src/stats/types';
import { trialResultSchema, type TrialResult, type TrialStatus } from '../../src/results/schema';

const GATE = { minScore: 60, minPassRate: 0.8, maxStddev: 10 };
const CTX: StatContext = { gate: GATE };

function t(status: TrialStatus, score?: number): TrialResult {
  return trialResultSchema.parse({
    schemaVersion: 1,
    agent: 'mock',
    case: 'c',
    repeat: 1,
    status,
    ...(score !== undefined ? { verdict: { pass: score >= 60, score, rationale: '' } } : {}),
  });
}

describe('pass-rate (§12): error statuses excluded from the denominator', () => {
  it('counts only passed/failed; errors reported separately', () => {
    const group = [t('passed', 90), t('failed', 30), t('timeout'), t('setup-error'), t('skipped')];
    const block = passRate.compute(group, CTX) as Record<string, unknown>;
    expect(block.passed).toBe(1);
    expect(block.failed).toBe(1);
    expect(block.completed).toBe(2);
    expect(block.errors).toBe(3);
    expect(block.passRate).toBeCloseTo(0.5, 6);
  });
});

describe('score-stats (§12)', () => {
  it('computes min/max/mean/median/stddev over verdict scores', () => {
    const group = [t('passed', 80), t('passed', 100), t('failed', 60), t('timeout')];
    const block = scoreStats.compute(group, CTX) as Record<string, number>;
    expect(block.count).toBe(3);
    expect(block.min).toBe(60);
    expect(block.max).toBe(100);
    expect(block.mean).toBeCloseTo(80, 6);
    expect(block.median).toBe(80);
  });
});

describe('stability (§12): classification boundaries', () => {
  it('stable-pass: pass-rate ≥ minPassRate AND tight spread', () => {
    const group = [t('passed', 90), t('passed', 92), t('passed', 88), t('passed', 91), t('passed', 89)];
    expect(classifyStability(group, CTX)).toBe('stable-pass');
  });

  it('stable-fail: pass-rate ≤ 1 - minPassRate AND tight spread', () => {
    const group = [t('failed', 20), t('failed', 22), t('failed', 18), t('failed', 21), t('failed', 19)];
    expect(classifyStability(group, CTX)).toBe('stable-fail');
  });

  it('flaky: mixed pass-rate', () => {
    const group = [t('passed', 85), t('failed', 40), t('passed', 82)];
    expect(classifyStability(group, CTX)).toBe('flaky');
  });

  it('flaky: high pass-rate but a wide score spread (a wide band never counts as stable)', () => {
    // all pass, but stddev(50,100,50,100...) > maxStddev(10) → flaky
    const group = [t('passed', 50), t('passed', 100), t('passed', 50), t('passed', 100), t('passed', 60)];
    expect(classifyStability(group, CTX)).toBe('flaky');
  });

  it('no-data when there are no completed trials', () => {
    expect(classifyStability([t('timeout'), t('setup-error')], CTX)).toBe('no-data');
  });

  it('exposes the classification in the stat block', () => {
    const group = [t('passed', 90), t('passed', 92)];
    const block = stability.compute(group, CTX) as Record<string, unknown>;
    expect(block.classification).toBe('stable-pass');
    expect(block.repeats).toBe(2);
  });
});
