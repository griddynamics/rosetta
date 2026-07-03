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

export interface ModelRouter {
  generateText(role: Role, req: GenerateTextRequest): Promise<{ text: string; usage: Usage }>;
  generateObject<T>(
    role: Role,
    req: GenerateObjectRequest,
    schema: z.ZodType<T>,
  ): Promise<{ object: T; usage: Usage }>;
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
  ): Promise<{ object: T; usage: Usage }> {
    const entry = this.nextEntry(role, 'object', req);
    const parsed = schema.safeParse(entry.object);
    if (!parsed.success) {
      throw new ScriptExhaustedError(
        `FakeModelRouter object entry #${this.index} failed the caller's schema: ${parsed.error.message}`,
      );
    }
    return { object: parsed.data, usage: entry.usage ?? { ...ZERO_USAGE } };
  }

  /** True when every scripted entry has been consumed (assert in tests). */
  isExhausted(): boolean {
    return this.index >= this.script.entries.length;
  }
}
