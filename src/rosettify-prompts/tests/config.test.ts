import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig, parseConfig } from '../src/config.js';

function minimalSuite(overrides: Record<string, unknown> = {}) {
  return {
    suites: [
      {
        id: 'suite-a',
        variants: [{ id: 'v1', turns: ['hello'] }],
      },
    ],
    ...overrides,
  };
}

describe('parseConfig', () => {
  it('applies defaults for a minimal config', () => {
    const config = parseConfig(minimalSuite());
    expect(config.model).toBe('claude-sonnet-5');
    expect(config.repetitions).toBe(5);
    expect(config.thinking.enabled).toBe(true);
    expect(config.thinking.budgetTokens).toBe(8192);
  });

  it('rejects a manual thinking budget that is not less than maxOutputTokens', () => {
    expect(() =>
      parseConfig(
        minimalSuite({
          maxOutputTokens: 2000,
          thinking: { enabled: true, mode: 'manual', budgetTokens: 2000 },
        }),
      ),
    ).toThrow(/budgetTokens/);
  });

  it('allows adaptive thinking regardless of maxOutputTokens (no budgetTokens check)', () => {
    expect(() =>
      parseConfig(
        minimalSuite({
          maxOutputTokens: 2000,
          thinking: { enabled: true, mode: 'adaptive', effort: 'high' },
        }),
      ),
    ).not.toThrow();
  });

  it('rejects duplicate variant ids within a suite', () => {
    expect(() =>
      parseConfig({
        suites: [
          {
            id: 'suite-a',
            variants: [
              { id: 'v1', turns: ['a'] },
              { id: 'v1', turns: ['b'] },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate variant id/);
  });

  it('rejects a thinking budget below the Anthropic minimum of 1024', () => {
    expect(() =>
      parseConfig(minimalSuite({ thinking: { enabled: true, mode: 'manual', budgetTokens: 100 } })),
    ).toThrow();
  });

  it('rejects a suite with no variants', () => {
    expect(() => parseConfig({ suites: [{ id: 'suite-a', variants: [] }] })).toThrow();
  });

  it('formats invalid-config errors as a readable path + message list', () => {
    expect(() => parseConfig({ suites: [{ id: 'suite-a', variants: [] }] })).toThrow(
      /Config is invalid:\n\s+- suites\.0\.variants: /,
    );
  });

  it('accepts per-suite overrides of global defaults', () => {
    const config = parseConfig(
      minimalSuite({
        suites: [
          {
            id: 'suite-a',
            model: 'claude-opus-4-8',
            repetitions: 2,
            variants: [{ id: 'v1', turns: ['hi'] }],
          },
        ],
      }),
    );
    expect(config.suites[0].model).toBe('claude-opus-4-8');
    expect(config.suites[0].repetitions).toBe(2);
  });
});

describe('loadConfig', () => {
  function tmpFile(name: string, contents: string): string {
    const dir = mkdtempSync(path.join(tmpdir(), 'rosettify-prompts-test-'));
    const file = path.join(dir, name);
    writeFileSync(file, contents, 'utf-8');
    return file;
  }

  it('gives a clean error for a missing file, not a raw ENOENT stack', () => {
    const missingPath = path.join(tmpdir(), `does-not-exist-${Date.now()}.json`);
    expect(() => loadConfig(missingPath)).toThrow(/Config file not found/);
  });

  it('gives a clean error for invalid JSON', () => {
    const file = tmpFile('evals.json', '{ not valid json');
    expect(() => loadConfig(file)).toThrow(/Config file is not valid JSON/);
  });

  it('loads and validates a well-formed file', () => {
    const file = tmpFile(
      'evals.json',
      JSON.stringify(minimalSuite()),
    );
    const config = loadConfig(file);
    expect(config.suites[0].id).toBe('suite-a');
  });
});
