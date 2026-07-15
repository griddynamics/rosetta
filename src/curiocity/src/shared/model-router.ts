import { z } from 'zod';
import { CuriocityError } from './errors';
import { roleSchema, type Role } from './models';
import { usageSchema, zeroUsage, type Usage } from './trajectory';

/**
 * `ModelRouter` (§5.6) — the PORT only. The real Vercel-AI-SDK-backed router is
 * M3 (`llm/`); this module defines the interface every LLM caller (interaction
 * QnA, evaluators/judge) programs against, plus a scripted `FakeModelRouter` test
 * util so the fork+PTV+interaction loop runs deterministically with zero tokens.
 *
 * The interface lives in `shared/` (the dependency floor, §3) because both the
 * interaction engine (curion) and future evaluators consume it.
 */

export interface GenerateTextRequest {
  /** System prompt (e.g. the qna.md policy, or a classifier instruction). */
  system?: string;
  /** User content (question + context, or the message/screen being classified). */
  prompt: string;
}

export type GenerateObjectRequest = GenerateTextRequest;

/**
 * Result of a `generateObject` call. `perplexityLevel` (§5.4) is MEASURED from the
 * generated output's token logprobs when the provider exposes them (absent otherwise,
 * e.g. Anthropic). `model` is the resolved `provider/model` id that served the call —
 * it keys the one-time "no logprobs" warning in `llm-judge` (absent for routers that
 * don't resolve a concrete model).
 */
export interface GenerateObjectResult<T> {
  object: T;
  usage: Usage;
  perplexityLevel?: number;
  model?: string;
}

export interface ModelRouter {
  generateText(role: Role, req: GenerateTextRequest): Promise<{ text: string; usage: Usage }>;
  generateObject<T>(
    role: Role,
    req: GenerateObjectRequest,
    schema: z.ZodType<T>,
  ): Promise<GenerateObjectResult<T>>;
}

/**
 * `perplexityLevel(logprobs)` (§5.4) — pure, unit-testable. Maps a set of per-token
 * natural-log probabilities to a 0–100 uncertainty level:
 *
 *   PPL   = exp(−mean(logprobs))          // perplexity over the tokens
 *   level = 100 × (1 − 1/PPL)             // 0 = every token near-certain; ↑ = more uncertain
 *
 * `level` is in [0, 100) analytically; clamped to [0, 100] and rounded to 2 decimals
 * for a stable, comparable metric. An empty input yields 0 (no uncertainty signal) —
 * callers that treat "no tokens" as "unmeasured" must guard for emptiness themselves.
 */
export function perplexityLevel(logprobs: number[]): number {
  if (logprobs.length === 0) return 0;
  const meanLogprob = logprobs.reduce((sum, lp) => sum + lp, 0) / logprobs.length;
  const ppl = Math.exp(-meanLogprob);
  const level = 100 * (1 - 1 / ppl);
  const clamped = Math.min(100, Math.max(0, level));
  return Math.round(clamped * 100) / 100;
}

// --- FakeModelRouter (test util) --------------------------------------------
// Scripted per-call: entries are consumed strictly in order, one per router call.
// Running out of entries throws — an unexpected LLM call (e.g. a P3 violation
// injecting a reply where it must not) fails the test loudly instead of silently
// hanging. Zero tokens, fully deterministic.

export const fakeRouterEntrySchema = z.object({
  /** If set, the call's role must match (guards against mis-ordered scripts). */
  role: roleSchema.optional(),
  /** If set, the call kind must match: `text` → generateText, `object` → generateObject. */
  kind: z.enum(['text', 'object']).optional(),
  /** Response for a `generateText` call. */
  text: z.string().optional(),
  /** Response for a `generateObject` call (validated against the caller's schema). */
  object: z.unknown().optional(),
  /** Optional usage to report; defaults to zero tokens. */
  usage: usageSchema.optional(),
  /** Optional per-token logprobs to drive a MEASURED `perplexityLevel` on the returned
   *  object result (§5.4). Mutually informative with `perplexityLevel` below — if both
   *  are set, `logprobs` wins (it is computed via the real helper). */
  logprobs: z.array(z.number()).optional(),
  /** Optional pre-computed perplexity 0–100 to return directly (when a test does not
   *  want to supply raw logprobs). Ignored if `logprobs` is present. */
  perplexityLevel: z.number().optional(),
  /** Optional resolved `provider/model` id to return (keys the llm-judge warning). */
  model: z.string().optional(),
});
export type FakeRouterEntry = z.infer<typeof fakeRouterEntrySchema>;

export const fakeRouterScriptSchema = z.object({
  entries: z.array(fakeRouterEntrySchema).default([]),
});
export type FakeRouterScript = z.infer<typeof fakeRouterScriptSchema>;

export class ScriptExhaustedError extends CuriocityError {
  constructor(message: string) {
    super(message, 'FAKE_ROUTER_EXHAUSTED');
  }
}

export interface FakeRouterCall {
  role: Role;
  kind: 'text' | 'object';
  req: GenerateTextRequest;
}

const ZERO_USAGE: Usage = zeroUsage();

export class FakeModelRouter implements ModelRouter {
  private index = 0;
  readonly calls: FakeRouterCall[] = [];

  constructor(private readonly script: FakeRouterScript) {}

  private nextEntry(role: Role, kind: 'text' | 'object', req: GenerateTextRequest): FakeRouterEntry {
    this.calls.push({ role, kind, req });
    if (this.index >= this.script.entries.length) {
      throw new ScriptExhaustedError(
        `FakeModelRouter script exhausted: unscripted ${kind} call (role=${role}) #${this.index + 1}. ` +
          `Prompt head: ${JSON.stringify(req.prompt.slice(0, 120))}`,
      );
    }
    const entry = this.script.entries[this.index]!;
    this.index += 1;
    if (entry.role !== undefined && entry.role !== role) {
      throw new ScriptExhaustedError(
        `FakeModelRouter entry #${this.index} expected role "${entry.role}" but got "${role}".`,
      );
    }
    if (entry.kind !== undefined && entry.kind !== kind) {
      throw new ScriptExhaustedError(
        `FakeModelRouter entry #${this.index} expected kind "${entry.kind}" but got "${kind}".`,
      );
    }
    return entry;
  }

  async generateText(role: Role, req: GenerateTextRequest): Promise<{ text: string; usage: Usage }> {
    const entry = this.nextEntry(role, 'text', req);
    return { text: entry.text ?? '', usage: entry.usage ?? { ...ZERO_USAGE } };
  }

  async generateObject<T>(
    role: Role,
    req: GenerateObjectRequest,
    schema: z.ZodType<T>,
  ): Promise<GenerateObjectResult<T>> {
    const entry = this.nextEntry(role, 'object', req);
    const parsed = schema.safeParse(entry.object);
    if (!parsed.success) {
      throw new ScriptExhaustedError(
        `FakeModelRouter object entry #${this.index} failed the caller's schema: ${parsed.error.message}`,
      );
    }
    const perplexity =
      entry.logprobs !== undefined ? perplexityLevel(entry.logprobs) : entry.perplexityLevel;
    return {
      object: parsed.data,
      usage: entry.usage ?? { ...ZERO_USAGE },
      ...(perplexity !== undefined ? { perplexityLevel: perplexity } : {}),
      ...(entry.model !== undefined ? { model: entry.model } : {}),
    };
  }

  /** True when every scripted entry has been consumed (assert in tests). */
  isExhausted(): boolean {
    return this.index >= this.script.entries.length;
  }
}
