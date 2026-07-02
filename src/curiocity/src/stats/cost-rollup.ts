import { HARNESS_ROLES, zeroUsage } from '../llm/cost-meter';
import { priceUsage } from '../llm/pricing';
import type { StatBlock, TrialResult } from '../results/schema';
import type { Role } from '../shared/models';
import type { Usage } from '../shared/trajectory';
import type { Stat, StatContext } from './types';

/**
 * `cost-rollup` (§12): itemize tokens (+$ where priced) — agent usage vs harness
 * `fast`/`workhorse`/`judge`, and by model. Token counts are ALWAYS reported;
 * dollars come only from the config `pricing` map. Models missing from the map are
 * reported tokens-only and surfaced in `unpricedModels` so the caller can warn once.
 */
function add(into: Usage, u: Usage | undefined): void {
  if (!u) return;
  into.inputTokens += u.inputTokens;
  into.outputTokens += u.outputTokens;
}

export const costRollup: Stat = {
  id: 'cost-rollup',
  compute(group: TrialResult[], ctx: StatContext): StatBlock {
    const agent = zeroUsage();
    const harness: Record<Role, Usage> = { fast: zeroUsage(), workhorse: zeroUsage(), judge: zeroUsage() };
    const byModel = new Map<string, Usage>();

    for (const t of group) {
      const cost = t.cost;
      if (!cost) continue;
      add(agent, cost.agent);
      const models = (cost.models ?? {}) as Partial<Record<Role, string>>;
      for (const role of HARNESS_ROLES) {
        const u = cost[role];
        if (!u) continue;
        add(harness[role], u);
        const model = models[role];
        if (model) {
          const acc = byModel.get(model) ?? zeroUsage();
          add(acc, u);
          byModel.set(model, acc);
        }
      }
    }

    const models: Record<string, { inputTokens: number; outputTokens: number; usd?: number }> = {};
    const unpriced: string[] = [];
    let totalUsd = 0;
    let anyPriced = false;
    for (const [model, usage] of byModel) {
      const { usd, unpriced: isUnpriced } = priceUsage(model, usage, ctx.pricing);
      if (isUnpriced) {
        unpriced.push(model);
        models[model] = { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens };
      } else {
        anyPriced = true;
        totalUsd += usd!;
        models[model] = { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, usd: usd! };
      }
    }

    const first = group[0];
    return {
      id: 'cost-rollup',
      ...(first ? { case: first.case, agent: first.agent } : {}),
      agentUsage: agent,
      harness,
      byModel: models,
      ...(anyPriced ? { usd: totalUsd } : {}),
      unpricedModels: unpriced,
    };
  },
};
