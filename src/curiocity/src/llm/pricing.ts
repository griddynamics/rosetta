import type { PricingMap } from '../config/schema';
import type { Usage } from '../shared/trajectory';

/**
 * Pricing (§12). Dollar amounts are computed ONLY from the config `pricing` map
 * (`provider/model → {inputPer1M, outputPer1M}`). A model absent from the map is
 * reported tokens-only (`unpriced: true`) so the caller can emit exactly one
 * warning per unpriced model (never abort — P7).
 */

export interface PriceResult {
  /** Dollar cost, or undefined when the model is not in the pricing map. */
  usd?: number;
  /** True when the model was missing from the pricing map (tokens-only). */
  unpriced: boolean;
}

export function priceUsage(model: string, usage: Usage, pricing?: PricingMap): PriceResult {
  const entry = pricing?.[model];
  if (!entry) return { unpriced: true };
  const usd =
    (usage.inputTokens / 1_000_000) * entry.inputPer1M +
    (usage.outputTokens / 1_000_000) * entry.outputPer1M;
  return { usd, unpriced: false };
}
