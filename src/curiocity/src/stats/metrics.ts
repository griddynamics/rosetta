import type { StatBlock, TrialResult } from '../results/schema';
import { mean, stddev, type Stat } from './types';

/**
 * `metrics` (§11 `external`): roll up every named metric emitted by an `external`
 * evaluator across the group's trials — mean / min / max / stddev / count per metric
 * name, per (case×agent). Values are already normalized 0-100 by the evaluator contract.
 * Pure reducer over stored `TrialResult`s, so `report` recomputes it retroactively (D8).
 */
export const metrics: Stat = {
  id: 'metrics',
  compute(group: TrialResult[]): StatBlock {
    const byName = new Map<string, number[]>();
    for (const t of group) {
      for (const ev of t.evaluators ?? []) {
        for (const m of ev.metrics ?? []) {
          const arr = byName.get(m.name) ?? [];
          arr.push(m.value);
          byName.set(m.name, arr);
        }
      }
    }

    const out: Record<string, { mean: number; min: number; max: number; stddev: number; count: number }> = {};
    for (const [name, values] of byName) {
      out[name] = {
        mean: mean(values),
        min: Math.min(...values),
        max: Math.max(...values),
        stddev: stddev(values),
        count: values.length,
      };
    }

    const first = group[0];
    return {
      id: 'metrics',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      metrics: out,
    };
  },
};
