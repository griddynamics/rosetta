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
});
