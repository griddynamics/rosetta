import type { GateConfig, PricingMap } from '../config/schema';
import type { StatBlock, TrialResult } from '../results/schema';

/**
 * Stat contract (§5.5, §12). A pure reducer over one `(case×agent)` group. The
 * arch's abridged interface is `compute(group)`; we thread a small read-only
 * `StatContext` for the stats that need config-time thresholds/pricing (stability,
 * cost-rollup) so `report` can recompute them retroactively with changed config (D8).
 */
export interface StatContext {
  gate: GateConfig;
  pricing?: PricingMap;
}

export interface Stat {
  readonly id: string;
  compute(group: TrialResult[], ctx: StatContext): StatBlock;
}

export const ERROR_STATUS_SET = new Set<TrialResult['status']>([
  'setup-error',
  'launch-error',
  'timeout',
  'agent-hung',
  'agent-crash',
  'skipped',
]);

/** Completed trials that enter score statistics (§7/D14): passed or failed only. */
export function completedTrials(group: TrialResult[]): TrialResult[] {
  return group.filter((t) => t.status === 'passed' || t.status === 'failed');
}

/** Verdict scores from completed trials (error statuses excluded). */
export function scoresOf(group: TrialResult[]): number[] {
  return completedTrials(group)
    .filter((t) => t.verdict !== undefined)
    .map((t) => t.verdict!.score);
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
