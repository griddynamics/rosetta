import type { GateConfig, PricingMap } from '../config/schema';
import { INFRA_ERROR_STATUSES, NOT_RUN_STATUS, type StatBlock, type TrialResult, type TrialStatus } from '../results/schema';

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

/**
 * Uncompleted statuses: every status other than `passed`/`failed` (D14). This is the report's `errors` count
 * (`pass-rate`): the infra-error statuses (`INFRA_ERROR_STATUSES`, results/schema.ts)
 * PLUS the not-run status (`skipped`, `NOT_RUN_STATUS`). A not-run cell counts here
 * because the report shows how many planned trials yielded no result, whatever the
 * cause; it does not count toward the gate's exit 3 because nothing in the infra
 * failed (§13). The two sets answer different questions on purpose — they are not
 * meant to agree.
 */
export const UNCOMPLETED_STATUSES: ReadonlySet<TrialStatus> = new Set<TrialStatus>([
  ...INFRA_ERROR_STATUSES,
  NOT_RUN_STATUS,
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
