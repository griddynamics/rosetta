import type { StatBlock, TrialResult } from '../results/schema';
import type { Stat } from './types';

/**
 * `time-rollup` (§12): the full time decomposition summed across the group — total
 * wall vs measured agent-pure time side by side, the harness-reaction split (per-model
 * LLM vs overhead), the per-phase walls, and the evaluate split. `agentPureMs` prefers
 * the measured value but falls back to the legacy `agentMs` field so a pre-bump run
 * still rolls up (D8 retroactive).
 */
export const timeRollup: Stat = {
  id: 'time-rollup',
  compute(group: TrialResult[]): StatBlock {
    const sums: Record<string, number> = {
      totalMs: 0,
      workspaceMs: 0,
      setupMs: 0,
      provisionMs: 0,
      launchMs: 0,
      interactMs: 0,
      collectMs: 0,
      evaluateMs: 0,
      teardownMs: 0,
      agentPureMs: 0,
      harnessReactMs: 0,
      harnessLlmMs: 0,
      harnessOverheadMs: 0,
      checksMs: 0,
      judgeLlmMs: 0,
    };
    const llmByModel: Record<string, number> = {};

    for (const t of group) {
      const tm = t.timings;
      if (!tm) continue;
      for (const key of Object.keys(sums)) {
        const v = (tm as Record<string, unknown>)[key];
        if (typeof v === 'number') sums[key] += v;
      }
      // agentPureMs is the measured field; fall back to the legacy agentMs.
      if (tm.agentPureMs === undefined && typeof tm.agentMs === 'number') {
        sums.agentPureMs += tm.agentMs;
      }
      for (const [model, ms] of Object.entries(tm.harnessLlmByModel ?? {})) {
        llmByModel[model] = (llmByModel[model] ?? 0) + ms;
      }
    }

    const first = group[0];
    return {
      id: 'time-rollup',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      ...sums,
      // Legacy alias kept for backward-compat readers of the rollup.
      agentMs: sums.agentPureMs,
      ...(Object.keys(llmByModel).length > 0 ? { harnessLlmByModel: llmByModel } : {}),
    };
  },
};
