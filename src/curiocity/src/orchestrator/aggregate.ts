import type { GateConfig, PricingMap } from '../config/schema';
import type { StatBlock, TrialResult } from '../results/schema';
import { computeGroupStats } from '../stats';
import { gatekeeper, type GateOutcome } from './gatekeeper';

/**
 * Suite aggregation (§12/§13, D8): the pure step shared by `run` and `report`.
 * Computes per-`(case×agent)` stats and the gate outcome from stored `TrialResult`s
 * — so `report` re-gates and re-stats retroactively with changed thresholds/pricing.
 */
export interface AggregateArgs {
  trials: TrialResult[];
  gate: GateConfig;
  pricing?: PricingMap;
  /** `--collect-cost` (§12/D9): include the `cost-rollup` stat. */
  collectCost: boolean;
}

export interface AggregateResult {
  groups: StatBlock[];
  gate: GateOutcome;
  /** Distinct models missing from the pricing map (caller warns once per model). */
  unpricedModels: string[];
}

export function aggregate(args: AggregateArgs): AggregateResult {
  const gate = gatekeeper(args.trials, args.gate);
  const groups = computeGroupStats(
    args.trials,
    { gate: args.gate, ...(args.pricing ? { pricing: args.pricing } : {}) },
    { includeCost: args.collectCost },
  );
  const unpriced = new Set<string>();
  for (const g of groups) {
    if (g.id !== 'cost-rollup') continue;
    for (const m of ((g as Record<string, unknown>)['unpricedModels'] as string[]) ?? []) {
      unpriced.add(m);
    }
  }
  return { groups, gate, unpricedModels: [...unpriced] };
}
