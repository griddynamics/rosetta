import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getProvider, parseModelRef, providers } from '../../src/llm/providers';
import { defaultEnvFilePath, parseDotEnv, resolveBaseUrls, resolveKeys } from '../../src/llm/keys';
import { trialSpecSchema } from '../../src/shared/ipc';
import { ConfigError } from '../../src/shared/errors';

describe('provider map (§5.6)', () => {
  it('parses "provider/model" refs (model id may contain slashes)', () => {
    expect(parseModelRef('anthropic/claude-sonnet-4-6')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-6',
    });
    expect(parseModelRef('openai/gpt-4o/2024')).toEqual({ provider: 'openai', modelId: 'gpt-4o/2024' });
  });

  it('rejects malformed refs', () => {
    expect(() => parseModelRef('nothing')).toThrow(ConfigError);
    expect(() => parseModelRef('/model')).toThrow(ConfigError);
    expect(() => parseModelRef('provider/')).toThrow(ConfigError);
  });

  it('resolves known providers, throws on unknown with the known list', () => {
    expect(getProvider('anthropic')).toBe(providers.anthropic);
    expect(getProvider('openai')).toBe(providers.openai);
    expect(() => getProvider('cohere')).toThrow(/Known providers: anthropic, openai/);
  });

  it('constructs a real @ai-sdk/openai client offline (bare model id + key threaded through, no network call)', () => {
    // Closes the one gap left by the mocked router tests (which never touch the real
    // `createOpenAI` factory): prove the openai entry in the provider map actually builds
    // a LanguageModel bound to the given model id, exactly like the anthropic entry
    // already exercised via judge/workhorse overrides elsewhere. Construction is pure
    // client-object wiring — no request is sent (§12 offline contract on `.model()`).
    // `LanguageModel` (from `ai`) is a union that also admits bare gateway-registry
    // strings; the concrete SDK client object is a runtime detail this test asserts
    // on directly rather than widening the shared type for one test's sake.
    const model = providers.openai.model('gpt-4o-mini', 'sk-test-not-real') as unknown as {
      modelId: string;
      provider: string;
    };
    expect(model.modelId).toBe('gpt-4o-mini');
    expect(model.provider).toMatch(/^openai/);
  });

  it('passes a baseURL into the real @ai-sdk/openai client offline', () => {
    const model = providers.openai.model('gpt-4o-mini', 'sk-test-not-real', 'https://bifrost.example/openai') as unknown as {
      config: { url(args: { path: string; modelId: string }): URL };
      modelId: string;
    };
    expect(String(model.config.url({ path: '/v1/responses', modelId: model.modelId }))).toBe(
      'https://bifrost.example/openai/v1/responses',
    );
  });

  it('constructs a real @ai-sdk/anthropic client offline for comparison (same contract both providers)', () => {
    const model = providers.anthropic.model('claude-sonnet-4-6', 'sk-test-not-real') as unknown as {
      modelId: string;
      provider: string;
    };
    expect(model.modelId).toBe('claude-sonnet-4-6');
    expect(model.provider).toMatch(/^anthropic/);
  });

  it('passes a baseURL into the real @ai-sdk/anthropic client offline', () => {
    const model = providers.anthropic.model(
      'claude-sonnet-4-6',
      'sk-test-not-real',
      'https://bifrost.example/anthropic',
    ) as unknown as { config: { baseURL: string } };
    expect(model.config.baseURL).toBe('https://bifrost.example/anthropic');
  });
});

describe('key resolution (§12)', () => {
  it('defaults the .env lookup to cwd, not the installed package root', () => {
    expect(defaultEnvFilePath()).toBe(join(process.cwd(), '.env'));
  });

  it('parses a .env file (comments, quotes, export prefix)', () => {
    const parsed = parseDotEnv(
      ['# comment', 'export ANTHROPIC_API_KEY="sk-file-anthropic"', "OPENAI_API_KEY='sk-file-openai'", 'BLANK='].join(
        '\n',
      ),
    );
    expect(parsed.ANTHROPIC_API_KEY).toBe('sk-file-anthropic');
    expect(parsed.OPENAI_API_KEY).toBe('sk-file-openai');
  });

  it('prefers CURIOCITY_<PROVIDER>_KEY over the provider-standard var', () => {
    const keys = resolveKeys({
      env: { CURIOCITY_ANTHROPIC_KEY: 'sk-curio', ANTHROPIC_API_KEY: 'sk-standard' },
      envFilePath: null,
    });
    expect(keys.anthropic).toBe('sk-curio');
  });

  it('falls back to the provider-standard var, then to the .env file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curio-env-'));
    const envFile = join(dir, '.env');
    writeFileSync(envFile, 'OPENAI_API_KEY=sk-from-file\n');

    const keys = resolveKeys({ env: { ANTHROPIC_API_KEY: 'sk-standard' }, envFilePath: envFile });
    expect(keys.anthropic).toBe('sk-standard'); // process env
    expect(keys.openai).toBe('sk-from-file'); // .env file fallback
  });

  it('omits providers with no resolvable key', () => {
    const keys = resolveKeys({ env: {}, envFilePath: null });
    expect(keys).toEqual({});
  });

  it('a live process-env standard var outranks a stale CURIOCITY_<PROVIDER>_KEY left in .env (§12 tiered precedence)', () => {
    // Regression: precedence must be tiered by SOURCE first (env, then .env file),
    // and only by name within a source — never ".env file CURIOCITY var" ahead of
    // "process.env standard var". Otherwise a stale local .env value could shadow a
    // live CI-injected key, e.g. sending a run to the wrong account/key silently.
    const dir = mkdtempSync(join(tmpdir(), 'curio-env-'));
    const envFile = join(dir, '.env');
    writeFileSync(envFile, 'CURIOCITY_ANTHROPIC_KEY=sk-stale-from-file\n');

    const keys = resolveKeys({ env: { ANTHROPIC_API_KEY: 'sk-live-ci' }, envFilePath: envFile });
    expect(keys.anthropic).toBe('sk-live-ci');
  });

  it('the .env file is consulted only when the environment has neither name (both name orders)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curio-env-'));
    const envFile = join(dir, '.env');
    writeFileSync(envFile, 'CURIOCITY_ANTHROPIC_KEY=sk-curio-from-file\nOPENAI_API_KEY=sk-standard-from-file\n');

    const keys = resolveKeys({ env: {}, envFilePath: envFile });
    expect(keys.anthropic).toBe('sk-curio-from-file');
    expect(keys.openai).toBe('sk-standard-from-file');
  });
});

describe('base URL resolution (§12/Bifrost)', () => {
  it('fans CURIOCITY_BASE_URL out to every provider for multi-provider gateways like Bifrost', () => {
    const baseUrls = resolveBaseUrls({
      env: { CURIOCITY_BASE_URL: 'https://bifrost.example/gateway' },
      envFilePath: null,
    });

    expect(baseUrls).toEqual(
      Object.fromEntries(Object.keys(providers).map((provider) => [provider, 'https://bifrost.example/gateway'])),
    );
  });

  it('prefers CURIOCITY_<PROVIDER>_BASE_URL over <PROVIDER>_BASE_URL over CURIOCITY_BASE_URL', () => {
    const baseUrls = resolveBaseUrls({
      env: {
        CURIOCITY_ANTHROPIC_BASE_URL: 'https://curio-anthropic.example',
        ANTHROPIC_BASE_URL: 'https://anthropic.example',
        CURIOCITY_BASE_URL: 'https://global.example',
      },
      envFilePath: null,
    });
    expect(baseUrls.anthropic).toBe('https://curio-anthropic.example');
    expect(baseUrls.openai).toBe('https://global.example');
  });

  it('falls back to the .env file with the same name order when env has no base URL', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curio-env-'));
    const envFile = join(dir, '.env');
    writeFileSync(
      envFile,
      [
        'CURIOCITY_BASE_URL=https://file-global.example',
        'OPENAI_BASE_URL=https://file-openai.example',
        'CURIOCITY_ANTHROPIC_BASE_URL=https://file-anthropic.example',
      ].join('\n'),
    );

    const baseUrls = resolveBaseUrls({ env: {}, envFilePath: envFile });
    expect(baseUrls.anthropic).toBe('https://file-anthropic.example');
    expect(baseUrls.openai).toBe('https://file-openai.example');
  });

  it('a live env base URL outranks a stale provider-specific .env value', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curio-env-'));
    const envFile = join(dir, '.env');
    writeFileSync(envFile, 'CURIOCITY_OPENAI_BASE_URL=https://stale-file.example\n');

    const baseUrls = resolveBaseUrls({
      env: { OPENAI_BASE_URL: 'https://live-env.example' },
      envFilePath: envFile,
    });
    expect(baseUrls.openai).toBe('https://live-env.example');
  });

  it('throws ConfigError for malformed resolved base URLs before building clients', () => {
    expect(() =>
      resolveBaseUrls({
        env: { OPENAI_BASE_URL: 'not a url' },
        envFilePath: null,
      }),
    ).toThrow(ConfigError);
  });

  it('throws ConfigError for non-http(s) resolved base URLs', () => {
    expect(() =>
      resolveBaseUrls({
        env: { CURIOCITY_BASE_URL: 'ftp://bifrost.example' },
        envFilePath: null,
      }),
    ).toThrow(/http:\/\/ or https:\/\//);
  });

  it('TrialSpec IPC carries baseUrls and defaults to an empty map', () => {
    const withBaseUrls = trialSpecSchema.parse({
      agentId: 'a',
      caseName: 'c',
      repeat: 1,
      timeoutSec: 1,
      prompt: 'p',
      qna: 'q',
      models: {},
      keys: {},
      baseUrls: { openai: 'https://bifrost.example/openai' },
      profile: {},
      adapter: 'mock',
      runDir: '/tmp/run',
    });
    expect(withBaseUrls.baseUrls.openai).toBe('https://bifrost.example/openai');

    const withoutBaseUrls = trialSpecSchema.parse({
      agentId: 'a',
      caseName: 'c',
      repeat: 1,
      timeoutSec: 1,
      prompt: 'p',
      qna: 'q',
      models: {},
      keys: {},
      profile: {},
      adapter: 'mock',
      runDir: '/tmp/run',
    });
    expect(withoutBaseUrls.baseUrls).toEqual({});
  });
});
