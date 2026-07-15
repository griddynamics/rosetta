import {
  generateObject as sdkGenerateObject,
  generateText as sdkGenerateText,
  type LanguageModel,
} from 'ai';
import type { z } from 'zod';
import { ConfigError } from '../shared/errors';
import {
  perplexityLevel,
  type GenerateObjectRequest,
  type GenerateObjectResult,
  type GenerateTextRequest,
  type ModelRouter,
} from '../shared/model-router';
import type { PartialModelRoles, Role } from '../shared/models';
import { makeUsage, type Usage } from '../shared/trajectory';
import type { CostMeter } from './cost-meter';
import { getProvider, parseModelRef } from './providers';

/**
 * Real `ModelRouter` (§5.6, §12) backed by the Vercel AI SDK. Resolves each role to
 * a `"provider/model"` (judge defaults to workhorse), constructs the `@ai-sdk/*`
 * client with the resolved key, and calls `generateText` / `generateObject`.
 *
 * The SDK functions are injectable (`deps.generateText`/`generateObject`) so unit
 * tests exercise the whole path — role resolution, provider/key lookup, client
 * construction — with ZERO real network calls (the user's keys cost real money;
 * live verification is a later milestone).
 */

interface GenTextArgs {
  model: LanguageModel;
  system?: string;
  prompt: string;
}
interface GenObjArgs extends GenTextArgs {
  schema: unknown;
  /** Provider-namespaced options forwarded to the SDK — used to request OpenAI logprobs
   *  (harmless cross-provider: Anthropic ignores the openai-namespaced option). */
  providerOptions?: Record<string, Record<string, unknown>>;
}
/**
 * Installed Vercel AI SDK usage shape (verified against the actual `ai`/`@ai-sdk/anthropic`
 * packages in node_modules, NOT assumed from docs — §12 "re-derive from real fixtures").
 * The SDK's normalized `LanguageModelUsage` flattens the provider's usage into TOP-LEVEL
 * `inputTokens`/`outputTokens` that are CACHE/REASONING-INCLUSIVE totals
 * (`inputTokens = noCache + cacheRead + cacheWrite`, `outputTokens = text + reasoning`),
 * with the disjoint breakdown nested under `inputTokenDetails`/`outputTokenDetails`. A
 * flat `reasoningTokens`/`cachedInputTokens` (this module's previous assumption, and a
 * provider-specific `providerMetadata.anthropic.cacheCreationInputTokens` reach-in) do
 * NOT exist on the real result — they silently read as `undefined` → 0, which zeroed out
 * reasoning/cache classes for every harness fast/workhorse/judge call while inflating
 * `input`/`output` by the very tokens that should have been broken out (§12 bug, found by
 * probing the installed SDK with `ai/test`'s `MockLanguageModelV3`, not by trusting this
 * comment or the old mocked unit test). Subtracting the nested detail fields from the
 * inclusive totals restores disjointness; `raw` keeps the full nested object.
 */
interface SdkUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  inputTokenDetails?: { noCacheTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number };
  outputTokenDetails?: { textTokens?: number; reasoningTokens?: number };
}
interface SdkResult {
  usage?: SdkUsage;
  providerMetadata?: Record<string, Record<string, unknown>>;
}
type GenerateTextFn = (args: GenTextArgs) => Promise<{ text: string } & SdkResult>;
type GenerateObjectFn = (args: GenObjArgs) => Promise<{ object: unknown } & SdkResult>;

const defaultGenerateText: GenerateTextFn = async (args) => {
  // Cast at the single SDK seam; the rest of the module is fully typed.
  const res = await sdkGenerateText(args as Parameters<typeof sdkGenerateText>[0]);
  return { text: res.text, usage: res.usage, providerMetadata: res.providerMetadata };
};

const defaultGenerateObject: GenerateObjectFn = async (args) => {
  const res = await sdkGenerateObject(args as Parameters<typeof sdkGenerateObject>[0]);
  return { object: res.object, usage: res.usage, providerMetadata: res.providerMetadata };
};

export interface RealModelRouterDeps {
  /** Effective model roles for the trial (top-level < profile < case < CLI). */
  models: PartialModelRoles;
  /** Provider → api key (resolved at orchestrator startup, §12). */
  keys: Record<string, string>;
  /** Provider → base URL (resolved at orchestrator startup, §12/Bifrost). */
  baseUrls?: Record<string, string>;
  /** Injectable SDK calls (tests supply fakes so no network is touched). */
  generateText?: GenerateTextFn;
  generateObject?: GenerateObjectFn;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Map an AI SDK result (usage) → the normalized full-breakdown Usage (§12, Part 1.3).
 * `inputTokens`/`outputTokens` on the real, installed SDK result are CACHE/REASONING
 * INCLUSIVE totals (verified against the actual package, see the `SdkUsage` doc above)
 * — subtract the nested `inputTokenDetails`/`outputTokenDetails` breakdown to recover
 * disjoint classes, so `total` (computed by `makeUsage` as the disjoint sum) is never a
 * double count and reasoning/cache are never silently zeroed. Provider-agnostic: reads
 * only the SDK's own normalized detail fields, not a provider-specific reach-in. Fields
 * absent → 0 (an older/simpler mock, or a provider that reports neither detail, degrades
 * to plain input/output with no cache/reasoning — never negative, via the `Math.max(0,…)`
 * guard). The native usage object is kept in `raw` so nothing is dropped.
 */
function toUsage(res: SdkResult | undefined): Usage {
  const u = res?.usage;
  const cacheRead = num(u?.inputTokenDetails?.cacheReadTokens);
  const cacheWrite = num(u?.inputTokenDetails?.cacheWriteTokens);
  const reasoning = num(u?.outputTokenDetails?.reasoningTokens);
  const input = Math.max(0, num(u?.inputTokens) - cacheRead - cacheWrite);
  const output = Math.max(0, num(u?.outputTokens) - reasoning);
  return makeUsage({
    input,
    output,
    reasoning,
    cacheRead,
    cacheWrite,
    // `total` intentionally NOT taken from `u.totalTokens` — makeUsage's disjoint-class
    // sum (input+output+reasoning+cacheRead+cacheWrite) equals it exactly here (the SDK
    // itself defines totalTokens = inputTokens.total + outputTokens.total) and is more
    // robust than depending on the SDK still reporting it.
    ...(u !== undefined ? { raw: u } : {}),
  });
}

/**
 * Extract per-token logprobs from an SDK result's provider metadata (§5.4). OpenAI exposes
 * them at `providerMetadata.openai.logprobs` when `providerOptions.openai.logprobs=true` is
 * requested; `generateObject` does not strip them. TWO real shapes coexist in the installed
 * `@ai-sdk/openai` and must both be handled (verified against the package, not docs):
 *   - Responses API: one per-token ARRAY is pushed per message content part, so the top
 *     level is NESTED — `[[{token,logprob,top_logprobs}, ...], ...]` (usually one inner
 *     array; several with multiple content parts). Reading `.logprob` on an inner array
 *     yields `undefined`, so a flat-only reader silently drops every real OpenAI response.
 *   - Chat-completions: a FLAT `Array<{token,logprob}>` (`choice.logprobs.content`).
 * We concatenate inner arrays in order (content parts contribute in sequence) and also
 * accept top-level token objects, collecting only finite numeric logprobs. Anthropic
 * exposes none → the field is absent and this returns `undefined` (→ no `perplexityLevel`,
 * one-time warning in the caller — never an error, §P7). Returns `undefined` when nothing
 * finite is collected (absent/empty/malformed/all-empty-inner), preserving absent-semantics.
 */
function extractLogprobs(providerMetadata: SdkResult['providerMetadata']): number[] | undefined {
  const raw = providerMetadata?.['openai']?.['logprobs'];
  if (!Array.isArray(raw)) return undefined;
  const nums: number[] = [];
  const take = (item: unknown): void => {
    const lp = (item as { logprob?: unknown })?.logprob;
    if (typeof lp === 'number' && Number.isFinite(lp)) nums.push(lp);
  };
  for (const entry of raw) {
    if (Array.isArray(entry)) {
      for (const inner of entry) take(inner);
    } else {
      take(entry);
    }
  }
  return nums.length > 0 ? nums : undefined;
}

/** Resolve the `"provider/model"` string for a role (judge defaults to workhorse). */
export function resolveRoleModel(models: PartialModelRoles, role: Role): string {
  const ref = role === 'judge' ? (models.judge ?? models.workhorse) : models[role];
  if (ref === undefined || ref === '') {
    throw new ConfigError(
      `models config required at execution time: no model configured for role "${role}". ` +
        'Set `models.fast` and `models.workhorse` in config (judge defaults to workhorse).',
    );
  }
  return ref;
}

export class RealModelRouter implements ModelRouter {
  private readonly genText: GenerateTextFn;
  private readonly genObj: GenerateObjectFn;

  constructor(private readonly deps: RealModelRouterDeps) {
    // Enforce: models config is REQUIRED whenever a real router is constructed (§12).
    resolveRoleModel(deps.models, 'fast');
    resolveRoleModel(deps.models, 'workhorse');
    this.genText = deps.generateText ?? defaultGenerateText;
    this.genObj = deps.generateObject ?? defaultGenerateObject;
  }

  private modelFor(role: Role): LanguageModel {
    const ref = resolveRoleModel(this.deps.models, role);
    const { provider, modelId } = parseModelRef(ref);
    const key = this.deps.keys[provider];
    if (key === undefined || key === '') {
      throw new ConfigError(
        `No API key resolved for provider "${provider}" (role "${role}"). ` +
          `Set CURIOCITY_${provider.toUpperCase()}_KEY or the provider-standard var.`,
      );
    }
    return getProvider(provider).model(modelId, key, this.deps.baseUrls?.[provider]);
  }

  async generateText(role: Role, req: GenerateTextRequest): Promise<{ text: string; usage: Usage }> {
    const res = await this.genText({
      model: this.modelFor(role),
      ...(req.system !== undefined ? { system: req.system } : {}),
      prompt: req.prompt,
    });
    return { text: res.text, usage: toUsage(res) };
  }

  async generateObject<T>(
    role: Role,
    req: GenerateObjectRequest,
    schema: z.ZodType<T>,
  ): Promise<GenerateObjectResult<T>> {
    const model = resolveRoleModel(this.deps.models, role);
    const res = await this.genObj({
      model: this.modelFor(role),
      schema,
      // Request logprobs on every generateObject call — harmless cross-provider
      // (Anthropic ignores the openai-namespaced option), enables perplexity on OpenAI.
      providerOptions: { openai: { logprobs: true } },
      ...(req.system !== undefined ? { system: req.system } : {}),
      prompt: req.prompt,
    });
    const logprobs = extractLogprobs(res.providerMetadata);
    const perplexity = logprobs !== undefined ? perplexityLevel(logprobs) : undefined;
    return {
      object: res.object as T,
      usage: toUsage(res),
      ...(perplexity !== undefined ? { perplexityLevel: perplexity } : {}),
      model,
    };
  }
}

/**
 * Decorator that records every wrapped call into the cost meter (§12). Wraps ANY
 * `ModelRouter` (real, fake, or unavailable) so harness usage is metered uniformly.
 * The model label per role comes from the effective `models` config; when absent
 * (mock/fake tests with no models) it falls back to the role name.
 */
export class MeteredRouter implements ModelRouter {
  constructor(
    private readonly inner: ModelRouter,
    private readonly meter: CostMeter,
    private readonly models: PartialModelRoles,
  ) {}

  private modelLabel(role: Role): string {
    const ref = role === 'judge' ? (this.models.judge ?? this.models.workhorse) : this.models[role];
    return ref ?? role;
  }

  async generateText(role: Role, req: GenerateTextRequest): Promise<{ text: string; usage: Usage }> {
    const started = Date.now();
    const res = await this.inner.generateText(role, req);
    this.meter.record(role, this.modelLabel(role), res.usage, Date.now() - started);
    return res;
  }

  async generateObject<T>(
    role: Role,
    req: GenerateObjectRequest,
    schema: z.ZodType<T>,
  ): Promise<GenerateObjectResult<T>> {
    const started = Date.now();
    const res = await this.inner.generateObject(role, req, schema);
    this.meter.record(role, this.modelLabel(role), res.usage, Date.now() - started);
    return res;
  }
}
