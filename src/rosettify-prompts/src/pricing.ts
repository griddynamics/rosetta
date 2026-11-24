import type { ModelPricing } from './types.js';

/**
 * USD per 1M tokens, standard (non-batch, non-cached) API pricing.
 * Thinking tokens are billed at the output rate (Anthropic does not price
 * them separately), so no extra "thinking" price is needed here.
 *
 * Verified against Anthropic's pricing page as of 2026-10. Prices change
 * over time — override via `pricingOverrides` in evals.json rather than
 * editing this file for one-off runs.
 */
export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  // Introductory pricing through 2026-08-31; standard $3/$15 after that — bump this
  // (or set pricingOverrides in tests.json) once the intro window ends.
  'claude-sonnet-5': { input: 2.0, output: 10.0 },
  // Claude 5.5 generation. Haiku 5.5 is $0.10/$0.50 for prompts up to 100K tokens and $0.50/$2.50
  // above that; this table is flat per model, so it carries the short-prompt rate — set
  // pricingOverrides for long-prompt runs.
  'claude-opus-5-5': { input: 4.0, output: 20.0 },
  'claude-sonnet-5-5': { input: 2.0, output: 10.0 },
  'claude-haiku-5-5': { input: 0.1, output: 0.5 },
  'claude-opus-4-6': { input: 5.0, output: 25.0 },
  'claude-opus-4-7': { input: 5.0, output: 25.0 },
  'claude-opus-4-8': { input: 5.0, output: 25.0 },
};

/** Resolves pricing for a model id, matching on longest known prefix so
 * dated snapshot ids (e.g. `claude-sonnet-4-6-20260615`) still resolve. */
export function resolvePricing(
  model: string,
  overrides?: Record<string, ModelPricing>,
): ModelPricing | null {
  const table = { ...DEFAULT_PRICING, ...overrides };
  if (table[model]) return table[model];
  let best: { key: string; pricing: ModelPricing } | null = null;
  for (const [key, pricing] of Object.entries(table)) {
    if (model.startsWith(key) && (!best || key.length > best.key.length)) {
      best = { key, pricing };
    }
  }
  return best?.pricing ?? null;
}

export function computeCostUsd(
  inputTokens: number,
  outputTokens: number,
  model: string,
  overrides?: Record<string, ModelPricing>,
): number | null {
  const pricing = resolvePricing(model, overrides);
  if (!pricing) return null;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}
