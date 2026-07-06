import type { StatBlock, TrialResult } from '../results/schema';
import { statRegistry } from './registry';
import { scoreStats } from './score-stats';
import { passRate } from './pass-rate';
import { stability } from './stability';
import { costRollup } from './cost-rollup';
import { timeRollup } from './time-rollup';
import { turnMetricsStat } from './turn-metrics';
import { metrics } from './metrics';
import type { StatContext } from './types';

/**
 * Stats layer entry (§5.5/§12). Registering a built-in = one line here (D5). Stats
 * run per `(case×agent)` group; `computeGroupStats` is the pure aggregation used by
 * both `run` and `report` (D8 — new stats apply retroactively).
 */
if (!statRegistry.has('score-stats')) statRegistry.register(scoreStats);
if (!statRegistry.has('pass-rate')) statRegistry.register(passRate);
if (!statRegistry.has('stability')) statRegistry.register(stability);
if (!statRegistry.has('cost-rollup')) statRegistry.register(costRollup);
if (!statRegistry.has('time-rollup')) statRegistry.register(timeRollup);
if (!statRegistry.has('turn-metrics')) statRegistry.register(turnMetricsStat);
if (!statRegistry.has('metrics')) statRegistry.register(metrics);

export { statRegistry };
export * from './types';
export { scoreStats, passRate, stability, costRollup, timeRollup, turnMetricsStat, metrics };

/** Deterministic display order of the built-in stats. */
const STAT_ORDER = [
  'score-stats',
  'pass-rate',
  'stability',
  'cost-rollup',
  'time-rollup',
  'turn-metrics',
  'metrics',
];

/** Group trials by `(case×agent)`, in deterministic order. */
export function groupTrials(trials: TrialResult[]): Map<string, TrialResult[]> {
  const groups = new Map<string, TrialResult[]>();
  const sorted = [...trials].sort(
    (a, b) => a.case.localeCompare(b.case) || a.agent.localeCompare(b.agent) || a.repeat - b.repeat,
  );
  for (const t of sorted) {
    const key = `${t.case}::${t.agent}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(t);
    else groups.set(key, [t]);
  }
  return groups;
}

export interface ComputeStatsOptions {
  /** Include `cost-rollup` (gated by `--collect-cost`, §12/D9). */
  includeCost?: boolean;
}

/** Compute every built-in stat for every `(case×agent)` group → flat StatBlock[]. */
export function computeGroupStats(
  trials: TrialResult[],
  ctx: StatContext,
  opts: ComputeStatsOptions = {},
): StatBlock[] {
  const includeCost = opts.includeCost ?? true;
  const active = STAT_ORDER.filter((id) => includeCost || id !== 'cost-rollup');
  const blocks: StatBlock[] = [];
  for (const [, group] of groupTrials(trials)) {
    for (const id of active) {
      blocks.push(statRegistry.get(id).compute(group, ctx));
    }
  }
  return blocks;
}
