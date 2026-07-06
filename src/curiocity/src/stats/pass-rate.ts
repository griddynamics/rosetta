import type { StatBlock, TrialResult } from '../results/schema';
import { completedTrials, ERROR_STATUS_SET, type Stat } from './types';

/**
 * `pass-rate` (§12): passed / (passed + failed). Error-status trials are excluded
 * from the denominator (D14) but counted separately as `errors`.
 */
export const passRate: Stat = {
  id: 'pass-rate',
  compute(group: TrialResult[]): StatBlock {
    const completed = completedTrials(group);
    const passed = completed.filter((t) => t.status === 'passed').length;
    const failed = completed.length - passed;
    const errors = group.filter((t) => ERROR_STATUS_SET.has(t.status)).length;
    const first = group[0];
    return {
      id: 'pass-rate',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      passed,
      failed,
      errors,
      completed: completed.length,
      passRate: completed.length > 0 ? passed / completed.length : 0,
    };
  },
};
