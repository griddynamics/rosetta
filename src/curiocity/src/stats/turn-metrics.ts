import type { StatBlock, TrialResult } from '../results/schema';
import { computeTurnMetrics } from '../results/turn-metrics';
import { completedTrials, mean, type Stat } from './types';

/**
 * `turn-metrics` (§12): roll up the per-trial turn metrics across a (case×agent) group
 * — totals plus per-trial means of turnsTotal / questionTurns / interruptions. Prefers
 * the stored `turnMetrics`; falls back to re-deriving from the persisted per-turn
 * timeline (D8 — so `report` works on runs written before turnMetrics was stored, as
 * long as the timeline carries the `question` flag). Error-status trials are excluded
 * (they never interacted meaningfully), matching the score/pass-rate convention (D14).
 */
export const turnMetricsStat: Stat = {
  id: 'turn-metrics',
  compute(group: TrialResult[]): StatBlock {
    const trials = completedTrials(group);
    const totals = { turnsTotal: 0, questionTurns: 0, interruptions: 0 };
    const each = { turnsTotal: [] as number[], questionTurns: [] as number[], interruptions: [] as number[] };

    for (const t of trials) {
      const tm =
        t.turnMetrics ?? (t.timings?.timeline ? computeTurnMetrics(t.timings.timeline) : undefined);
      if (!tm) continue;
      totals.turnsTotal += tm.turnsTotal;
      totals.questionTurns += tm.questionTurns;
      totals.interruptions += tm.interruptions;
      each.turnsTotal.push(tm.turnsTotal);
      each.questionTurns.push(tm.questionTurns);
      each.interruptions.push(tm.interruptions);
    }

    const first = group[0];
    return {
      id: 'turn-metrics',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      turnsTotal: totals.turnsTotal,
      questionTurns: totals.questionTurns,
      interruptions: totals.interruptions,
      meanTurnsTotal: mean(each.turnsTotal),
      meanQuestionTurns: mean(each.questionTurns),
      meanInterruptions: mean(each.interruptions),
      trials: each.turnsTotal.length,
    };
  },
};
