import type { StatBlock, TrialResult } from '../results/schema';
import { mean, median, scoresOf, stddev, type Stat } from './types';

/** `score-stats` (§12): min/max/mean/median/stddev of verdict scores per group. */
export const scoreStats: Stat = {
  id: 'score-stats',
  compute(group: TrialResult[]): StatBlock {
    const scores = scoresOf(group);
    const first = group[0];
    return {
      id: 'score-stats',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      count: scores.length,
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
      mean: mean(scores),
      median: median(scores),
      stddev: stddev(scores),
    };
  },
};
