import type { StatBlock, TrialResult } from '../results/schema';
import type { Stat } from './types';

/** `time-rollup` (§12): wall-clock breakdown summed across the group. */
export const timeRollup: Stat = {
  id: 'time-rollup',
  compute(group: TrialResult[]): StatBlock {
    let totalMs = 0;
    let agentMs = 0;
    let harnessLlmMs = 0;
    let checksMs = 0;
    for (const t of group) {
      const tm = t.timings;
      if (!tm) continue;
      totalMs += tm.totalMs ?? 0;
      agentMs += tm.agentMs ?? 0;
      harnessLlmMs += tm.harnessLlmMs ?? 0;
      checksMs += tm.checksMs ?? 0;
    }
    const first = group[0];
    return {
      id: 'time-rollup',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      totalMs,
      agentMs,
      harnessLlmMs,
      checksMs,
    };
  },
};
