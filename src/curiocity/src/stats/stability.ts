import type { StatBlock, TrialResult } from '../results/schema';
import { completedTrials, scoresOf, stddev, type Stat, type StatContext } from './types';

/**
 * `stability` (§12): classify a `(case×agent)` group as
 *   - `stable-pass` — pass-rate ≥ `minPassRate` AND a tight score spread,
 *   - `stable-fail` — pass-rate ≤ `1 - minPassRate` AND a tight score spread,
 *   - `flaky`       — mixed pass-rate OR a wide score spread,
 *   - `no-data`     — no completed trials.
 *
 * "A tight high band beats a wide one with the same mean": a wide spread (stddev >
 * `maxStddev`) always demotes to `flaky`. Spread only counts when repeats > 1.
 */
export type Stability = 'stable-pass' | 'stable-fail' | 'flaky' | 'no-data';

export function classifyStability(group: TrialResult[], ctx: StatContext): Stability {
  const completed = completedTrials(group);
  if (completed.length === 0) return 'no-data';
  const passed = completed.filter((t) => t.status === 'passed').length;
  const passRate = passed / completed.length;
  const scores = scoresOf(group);
  const tightSpread = scores.length < 2 || stddev(scores) <= ctx.gate.maxStddev;

  if (passRate >= ctx.gate.minPassRate && tightSpread) return 'stable-pass';
  if (passRate <= 1 - ctx.gate.minPassRate && tightSpread) return 'stable-fail';
  return 'flaky';
}

export const stability: Stat = {
  id: 'stability',
  compute(group: TrialResult[], ctx: StatContext): StatBlock {
    const completed = completedTrials(group);
    const passed = completed.filter((t) => t.status === 'passed').length;
    const scores = scoresOf(group);
    const first = group[0];
    return {
      id: 'stability',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      classification: classifyStability(group, ctx),
      passRate: completed.length > 0 ? passed / completed.length : 0,
      stddev: stddev(scores),
      repeats: group.length,
    };
  },
};
