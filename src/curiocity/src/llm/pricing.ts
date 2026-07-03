import type { PricingMap } from '../config/schema';
import type { Usage } from '../shared/trajectory';

/**
 * Pricing (§12). Dollar amounts are computed ONLY from the config `pricing` map. A
 * model absent from the map is reported tokens-only (`unpriced: true`) so the caller
 * can emit exactly one warning per unpriced model (never abort — P7).
 *
 * Tiered: each disjoint token class is priced at its own rate. Absent cache rates
 * fall back to `inputPer1M` (no discount); an absent `reasoningPer1M` falls back to
 * `outputPer1M`. Because the classes are disjoint (see `Usage`), summing class × rate
 * never double-counts.
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
  const reasoningRate = entry.reasoningPer1M ?? entry.outputPer1M;
  const cacheReadRate = entry.cacheReadPer1M ?? entry.inputPer1M;
  const cacheWriteRate = entry.cacheWritePer1M ?? entry.inputPer1M;
  const usd =
    (usage.input / 1_000_000) * entry.inputPer1M +
    (usage.output / 1_000_000) * entry.outputPer1M +
    (usage.reasoning / 1_000_000) * reasoningRate +
    (usage.cacheRead / 1_000_000) * cacheReadRate +
    (usage.cacheWrite / 1_000_000) * cacheWriteRate;
  return { usd, unpriced: false };
}
