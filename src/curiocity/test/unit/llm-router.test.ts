import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  MeteredRouter,
  RealModelRouter,
  resolveRoleModel,
} from '../../src/llm/router';
import { CostMeter } from '../../src/llm/cost-meter';
import { FakeModelRouter } from '../../src/shared/model-router';
import { makeUsage } from '../../src/shared/trajectory';
import { ConfigError } from '../../src/shared/errors';

/**
 * Zero real network calls: the SDK generate functions are injected fakes. We
 * exercise role→model resolution, provider/key lookup, client construction and
 * usage mapping — everything up to (and including) client construction.
 */
const MODELS = { fast: 'anthropic/fast-x', workhorse: 'openai/work-y' };
const KEYS = { anthropic: 'sk-a', openai: 'sk-o' };

describe('resolveRoleModel (judge defaults to workhorse)', () => {
  it('resolves fast/workhorse, and judge → workhorse when unset', () => {
    expect(resolveRoleModel(MODELS, 'fast')).toBe('anthropic/fast-x');
    expect(resolveRoleModel(MODELS, 'workhorse')).toBe('openai/work-y');
    expect(resolveRoleModel(MODELS, 'judge')).toBe('openai/work-y');
    expect(resolveRoleModel({ ...MODELS, judge: 'anthropic/judge-z' }, 'judge')).toBe('anthropic/judge-z');
  });

  it('throws when a required role model is missing', () => {
    expect(() => resolveRoleModel({ fast: 'anthropic/x' }, 'workhorse')).toThrow(ConfigError);
  });
});

describe('RealModelRouter (injected SDK, no network)', () => {
  it('requires models config at construction (§12)', () => {
    expect(() => new RealModelRouter({ models: { fast: 'anthropic/x' }, keys: KEYS })).toThrow(
      ConfigError,
    );
  });

  it('resolves the role model, constructs a client, maps usage', async () => {
    const seen: { hasModel: boolean; system?: string; prompt: string }[] = [];
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateText: async (args) => {
        seen.push({ hasModel: args.model !== undefined && args.model !== null, ...(args.system !== undefined ? { system: args.system } : {}), prompt: args.prompt });
        return { text: 'hi', usage: { inputTokens: 3, outputTokens: 5 } };
      },
    });
    const res = await router.generateText('fast', { system: 'sys', prompt: 'p' });
    expect(res.text).toBe('hi');
    // AI SDK usage mapped into the full breakdown (§12); native usage kept in `raw`.
    // No inputTokenDetails/outputTokenDetails on this minimal mock → cache/reasoning 0.
    expect(res.usage).toMatchObject({ input: 3, output: 5, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 8 });
    expect(seen[0]).toMatchObject({ hasModel: true, system: 'sys', prompt: 'p' });
  });

  it('passes the resolved provider base URL into the constructed model client', async () => {
    let seenBaseURL: string | undefined;
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      baseUrls: { anthropic: 'https://bifrost.example/anthropic', openai: 'https://bifrost.example/openai' },
      generateText: async (args) => {
        seenBaseURL = (args.model as unknown as { config?: { baseURL?: string } }).config?.baseURL;
        return { text: 'hi' };
      },
    });

    await router.generateText('fast', { prompt: 'p' });
    expect(seenBaseURL).toBe('https://bifrost.example/anthropic');
  });

  it('decomposes the REAL installed AI SDK usage shape (§12 disjointness, orchestrator finding)', async () => {
    // The installed `ai`/`@ai-sdk/anthropic` packages report `inputTokens`/`outputTokens`
    // as CACHE/REASONING-INCLUSIVE totals, with the disjoint breakdown nested under
    // `inputTokenDetails`/`outputTokenDetails` — verified directly against the real,
    // installed package via `ai/test`'s `MockLanguageModelV3` (not assumed from a stale
    // flat `reasoningTokens`/`cachedInputTokens` shape, which does not exist on the real
    // result and previously caused reasoning/cache to silently read as 0). This test pins
    // the router's mapping to the ACTUAL shape so a future SDK bump that changes it again
    // is caught here instead of silently zeroing cost classes.
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateText: async () => ({
        text: 'hi',
        usage: {
          inputTokens: 1300, // noCache(1000) + cacheRead(300) + cacheWrite(0)
          outputTokens: 250, // text(200) + reasoning(50)
          totalTokens: 1550,
          inputTokenDetails: { noCacheTokens: 1000, cacheReadTokens: 300, cacheWriteTokens: 0 },
          outputTokenDetails: { textTokens: 200, reasoningTokens: 50 },
        },
      }),
    });
    const res = await router.generateText('fast', { prompt: 'p' });
    expect(res.usage).toMatchObject({
      input: 1000,
      output: 200,
      reasoning: 50,
      cacheRead: 300,
      cacheWrite: 0,
      total: 1550, // disjoint sum, never a double count of the cache/reasoning tokens
    });
  });

  it('maps missing usage fields to zero', async () => {
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateObject: async () => ({ object: { score: 90, pass: true, rationale: 'ok' } }),
    });
    const schema = z.object({ score: z.number(), pass: z.boolean(), rationale: z.string() });
    const res = await router.generateObject('judge', { prompt: 'p' }, schema);
    expect(res.object.score).toBe(90);
    expect(res.usage).toMatchObject({ input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0 });
  });

  it('throws a ConfigError when no key is resolved for the provider', async () => {
    const router = new RealModelRouter({
      models: MODELS,
      keys: { anthropic: 'sk-a' }, // openai (workhorse) key absent
      generateText: async () => ({ text: 'x' }),
    });
    await expect(router.generateText('workhorse', { prompt: 'p' })).rejects.toThrow(ConfigError);
  });
});

describe('RealModelRouter perplexityLevel from OpenAI logprobs (§5.4)', () => {
  const objSchema = z.object({ score: z.number(), pass: z.boolean(), rationale: z.string() });
  const object = { score: 90, pass: true, rationale: 'ok' };
  // −ln2 per token → mean −ln2 → PPL 2 → level = 100×(1 − 1/2) = 50.
  const LN2 = -0.6931471805599453;

  it('(a) decodes the REAL nested Responses-API shape [[{token,logprob},...]] → perplexityLevel 50', async () => {
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateObject: async () => ({
        object,
        providerMetadata: {
          openai: { logprobs: [[{ token: 'a', logprob: LN2 }, { token: 'b', logprob: LN2 }]] },
        },
      }),
    });
    const res = await router.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(res.perplexityLevel).toBe(50);
  });

  it('(b) decodes the FLAT chat-completions shape [{token,logprob},...] → perplexityLevel 50', async () => {
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateObject: async () => ({
        object,
        providerMetadata: {
          openai: { logprobs: [{ token: 'a', logprob: LN2 }, { token: 'b', logprob: LN2 }] },
        },
      }),
    });
    const res = await router.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(res.perplexityLevel).toBe(50);
  });

  it('(c) requests OpenAI logprobs via providerOptions on the SDK call', async () => {
    let seenProviderOptions: unknown;
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateObject: async (args) => {
        seenProviderOptions = args.providerOptions;
        return { object };
      },
    });
    await router.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(seenProviderOptions).toEqual({ openai: { logprobs: true } });
  });

  it('(d) metadata without logprobs → perplexityLevel undefined', async () => {
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateObject: async () => ({ object, providerMetadata: { openai: {} } }),
    });
    const res = await router.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(res.perplexityLevel).toBeUndefined();
  });

  it('(e) nested shape with an empty inner array is computed from the populated one', async () => {
    const router = new RealModelRouter({
      models: MODELS,
      keys: KEYS,
      generateObject: async () => ({
        object,
        providerMetadata: {
          openai: { logprobs: [[], [{ token: 'a', logprob: LN2 }, { token: 'b', logprob: LN2 }]] },
        },
      }),
    });
    const res = await router.generateObject('judge', { prompt: 'p' }, objSchema);
    expect(res.perplexityLevel).toBe(50);
  });
});

describe('MeteredRouter (§12 cost meter)', () => {
  it('records {role, model, usage} for every wrapped call', async () => {
    const meter = new CostMeter();
    const inner = new FakeModelRouter({
      entries: [
        { role: 'fast', kind: 'text', text: 'a', usage: makeUsage({ input: 10, output: 2 }) },
        { role: 'judge', kind: 'object', object: { ok: true }, usage: makeUsage({ input: 20, output: 4 }) },
      ],
    });
    const router = new MeteredRouter(inner, meter, MODELS);

    await router.generateText('fast', { prompt: 'p' });
    await router.generateObject('judge', { prompt: 'p' }, z.object({ ok: z.boolean() }));

    expect(meter.records).toHaveLength(2);
    expect(meter.records[0]).toMatchObject({ role: 'fast', model: 'anthropic/fast-x' });
    // judge label falls back to the workhorse model (judge defaults to workhorse).
    expect(meter.records[1]).toMatchObject({ role: 'judge', model: 'openai/work-y' });

    const byRole = meter.byRole();
    expect(byRole.fast).toMatchObject({ input: 10, output: 2, total: 12 });
    expect(byRole.judge).toMatchObject({ input: 20, output: 4, total: 24 });
    expect(meter.modelsByRole()).toEqual({ fast: 'anthropic/fast-x', judge: 'openai/work-y' });
  });
});
