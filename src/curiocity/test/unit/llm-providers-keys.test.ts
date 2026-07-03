import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getProvider, parseModelRef, providers } from '../../src/llm/providers';
import { parseDotEnv, resolveKeys } from '../../src/llm/keys';
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

  it('constructs a real @ai-sdk/anthropic client offline for comparison (same contract both providers)', () => {
    const model = providers.anthropic.model('claude-sonnet-4-6', 'sk-test-not-real') as unknown as {
      modelId: string;
      provider: string;
    };
    expect(model.modelId).toBe('claude-sonnet-4-6');
    expect(model.provider).toMatch(/^anthropic/);
  });
});

describe('key resolution (§12)', () => {
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
