import { z } from 'zod';

/**
 * `TrajectoryEvent` (§5.2) — the ONE normalized shape every evaluator, judge and
 * stat consumes regardless of agent. Each adapter's `parseEvents` maps its native
 * transcript dialect into arrays of these.
 */
export const trajectoryKindSchema = z.enum([
  'user',
  'assistant',
  'tool_call',
  'tool_result',
  'usage',
  'lifecycle',
]);
export type TrajectoryKind = z.infer<typeof trajectoryKindSchema>;

export const trajectoryEventSchema = z.object({
  /** Event timestamp: epoch millis (number) or the source ISO string. */
  ts: z.union([z.number(), z.string()]),
  kind: trajectoryKindSchema,
  /** Tool / event name where applicable (e.g. tool_call name, lifecycle phase). */
  name: z.string().optional(),
  /** Opaque per-kind payload; not interpreted at the shared layer. */
  payload: z.unknown(),
});
export type TrajectoryEvent = z.infer<typeof trajectoryEventSchema>;

/**
 * QnA audit entry (§6). Every typed reply the harness sends in answer to a genuine
 * question is recorded here (full audit trail). Referenced by both the results
 * schema and IPC messages, hence it lives in `shared/`.
 */
export const qnaEntrySchema = z.object({
  type: z.enum(['structured', 'free-text']),
  question: z.string(),
  answer: z.string(),
  ts: z.union([z.number(), z.string()]),
});
export type QnaEntry = z.infer<typeof qnaEntrySchema>;

/**
 * Token usage accounting — the full breakdown (§12). Every usage record, harness-side
 * and agent-side, carries the same six token classes plus `raw` (the provider-native
 * usage object, so nothing is ever dropped). Fields are 0 when the provider doesn't
 * report them.
 *
 * The five counted classes are DISJOINT (non-overlapping) so that
 *   `total` == input + output + reasoning + cacheWrite + cacheRead
 * and priced $ = Σ(class × rate) never double-counts. Adapters are responsible for
 * decomposing each provider's native shape into disjoint classes (see the per-adapter
 * `extractUsage` notes):
 *   - `input`      — fresh, uncached prompt tokens (full input rate)
 *   - `cacheRead`  — tokens served from the prompt cache (cache-read rate)
 *   - `cacheWrite` — tokens written to the prompt cache (cache-write rate)
 *   - `output`     — generated tokens EXCLUDING separately-reported reasoning
 *   - `reasoning`  — reasoning / thinking tokens billed as their own class
 * (Anthropic folds thinking INTO output and reports no separate reasoning, so for
 * Anthropic `reasoning` stays 0 and `output` already includes thinking — §12.)
 *
 * Backward compatibility (§14): older run dirs stored `{inputTokens, outputTokens}`
 * (+ provider-specific cache/reasoning keys). The preprocess step below maps those
 * legacy names onto the new classes so `curiocity report` on a pre-bump run still
 * renders real numbers rather than crashing or zeroing out.
 */
function normalizeUsageInput(val: unknown): unknown {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return val;
  const v = { ...(val as Record<string, unknown>) };
  const pick = (name: string): number | undefined =>
    typeof v[name] === 'number' && Number.isFinite(v[name]) ? (v[name] as number) : undefined;
  if (v.input === undefined) v.input = pick('inputTokens');
  if (v.output === undefined) v.output = pick('outputTokens');
  if (v.cacheRead === undefined) v.cacheRead = pick('cacheReadInputTokens') ?? pick('cachedInputTokens');
  if (v.cacheWrite === undefined) v.cacheWrite = pick('cacheCreationInputTokens');
  if (v.reasoning === undefined) v.reasoning = pick('reasoningOutputTokens');
  if (v.total === undefined) {
    const sum =
      (Number(v.input) || 0) +
      (Number(v.output) || 0) +
      (Number(v.reasoning) || 0) +
      (Number(v.cacheWrite) || 0) +
      (Number(v.cacheRead) || 0);
    if (sum > 0) v.total = sum;
  }
  return v;
}

export const usageSchema = z.preprocess(
  normalizeUsageInput,
  z
    .object({
      input: z.number().nonnegative().default(0),
      output: z.number().nonnegative().default(0),
      reasoning: z.number().nonnegative().default(0),
      cacheWrite: z.number().nonnegative().default(0),
      cacheRead: z.number().nonnegative().default(0),
      total: z.number().nonnegative().default(0),
      /** Provider-native usage object, passed through verbatim (nothing dropped). */
      raw: z.unknown().optional(),
    })
    .passthrough(),
);
export type Usage = z.infer<typeof usageSchema>;

/** The five disjoint token classes summed into `total`. */
const USAGE_CLASSES = ['input', 'output', 'reasoning', 'cacheWrite', 'cacheRead'] as const;

/** A fresh zeroed usage record. */
export function zeroUsage(): Usage {
  return { input: 0, output: 0, reasoning: 0, cacheWrite: 0, cacheRead: 0, total: 0 };
}

/**
 * Build a Usage from a partial, filling `total` from the disjoint class sum when the
 * caller didn't provide one (and passing `raw` through). Use this at every mapping
 * seam (adapters, router, meter) so `total` is always consistent.
 */
export function makeUsage(partial: Partial<Usage>): Usage {
  const u = zeroUsage();
  for (const k of USAGE_CLASSES) {
    if (typeof partial[k] === 'number') u[k] = partial[k] as number;
  }
  u.total =
    typeof partial.total === 'number' && partial.total > 0
      ? partial.total
      : USAGE_CLASSES.reduce((s, k) => s + u[k], 0);
  if (partial.raw !== undefined) u.raw = partial.raw;
  return u;
}

/** Add every token class of `u` into the accumulator `into` (recomputes `total`). */
export function addUsage(into: Usage, u: Usage | undefined): void {
  if (!u) return;
  for (const k of USAGE_CLASSES) into[k] += u[k] ?? 0;
  into.total = USAGE_CLASSES.reduce((s, k) => s + into[k], 0);
}
