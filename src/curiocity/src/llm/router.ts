import {
  generateObject as sdkGenerateObject,
  generateText as sdkGenerateText,
  type LanguageModel,
} from 'ai';
import type { z } from 'zod';
import { ConfigError } from '../shared/errors';
import type {
  GenerateObjectRequest,
  GenerateTextRequest,
  ModelRouter,
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
}
/**
 * Vercel AI SDK usage shape (v5): `inputTokens`/`outputTokens`/`totalTokens` plus
 * `reasoningTokens` and `cachedInputTokens`. Anthropic cache-creation arrives via
 * `providerMetadata.anthropic.cacheCreationInputTokens` (§12). We keep it loose and
 * map ALL fields we recognize; anything unrecognized survives in `raw`.
 */
interface SdkUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
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
  /** Injectable SDK calls (tests supply fakes so no network is touched). */
  generateText?: GenerateTextFn;
  generateObject?: GenerateObjectFn;
}

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

/**
 * Map an AI SDK result (usage + providerMetadata) → the normalized full-breakdown
 * Usage (§12, Part 1.3). The harness LLM is Anthropic in practice, whose `inputTokens`
 * already EXCLUDES cache (cache read/creation are reported separately), so no
 * subtraction is needed to keep the classes disjoint. `reasoningTokens`/
 * `cachedInputTokens` map straight through; Anthropic cache-creation comes from
 * `providerMetadata.anthropic`. Fields absent → 0. The native usage object is kept in
 * `raw` so nothing is dropped.
 */
function toUsage(res: SdkResult | undefined): Usage {
  const u = res?.usage;
  const anthropic = res?.providerMetadata?.anthropic;
  const cacheWrite = num(
    anthropic?.['cacheCreationInputTokens'] ?? anthropic?.['cache_creation_input_tokens'],
  );
  const cacheRead = num(u?.cachedInputTokens);
  return makeUsage({
    input: num(u?.inputTokens),
    output: num(u?.outputTokens),
    reasoning: num(u?.reasoningTokens),
    cacheRead,
    cacheWrite,
    ...(u?.totalTokens !== undefined ? { total: num(u.totalTokens) } : {}),
    ...(u !== undefined ? { raw: u } : {}),
  });
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
    return getProvider(provider).model(modelId, key);
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
  ): Promise<{ object: T; usage: Usage }> {
    const res = await this.genObj({
      model: this.modelFor(role),
      schema,
      ...(req.system !== undefined ? { system: req.system } : {}),
      prompt: req.prompt,
    });
    return { object: res.object as T, usage: toUsage(res) };
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
  ): Promise<{ object: T; usage: Usage }> {
    const started = Date.now();
    const res = await this.inner.generateObject(role, req, schema);
    this.meter.record(role, this.modelLabel(role), res.usage, Date.now() - started);
    return res;
  }
}
