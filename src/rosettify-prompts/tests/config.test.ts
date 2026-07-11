import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadConfig, parseConfig } from '../src/config.js';

const REQUIRED_VARIANT_TEXT =
  'MUST ONLY think, reason, plan, and chat in compressed/terse/unicode chars/terms/always no hieroglyphs - exclude artifacts, any tool calls, all code, etc.';

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

  it('accepts optional suite eval config', () => {
    const config = parseConfig(
      minimalSuite({
        suites: [
          {
            id: 'suite-a',
            eval: {
              judgePrompt: 'Prefer strict grading.',
              assertions: [{ id: 'a1', text: 'Must answer tersely.', rubric: 'No extra details.' }],
            },
            variants: [{ id: 'v1', turns: ['hi'] }],
          },
        ],
      }),
    );
    expect(config.suites[0].eval?.assertions[0].id).toBe('a1');
  });

  it('defaults judgeMode to combined and additional/supporting to empty', () => {
    const config = parseConfig(minimalSuite());
    expect(config.judgeMode).toBe('combined');
    expect(config.additional).toEqual([]);
    expect(config.supporting).toEqual([]);
  });

  it('parses additional, supporting paths, global judgeMode, and per-suite eval.mode', () => {
    const config = parseConfig(
      minimalSuite({
        additional: ['shared context'],
        supporting: ['refs/a.md'],
        judgeMode: 'individual',
        suites: [
          {
            id: 'suite-a',
            eval: { mode: 'combined', assertions: [{ id: 'a1', text: 'ok' }] },
            variants: [{ id: 'v1', turns: ['hi'] }],
          },
        ],
      }),
    );
    expect(config.additional).toEqual(['shared context']);
    expect(config.supporting).toEqual(['refs/a.md']);
    expect(config.judgeMode).toBe('individual');
    expect(config.suites[0].eval?.mode).toBe('combined');
  });

  it('rejects an invalid judgeMode', () => {
    expect(() => parseConfig(minimalSuite({ judgeMode: 'sideways' }))).toThrow();
  });

  it('rejects duplicate eval assertion ids within a suite', () => {
    expect(() =>
      parseConfig(
        minimalSuite({
          suites: [
            {
              id: 'suite-a',
              eval: {
                assertions: [
                  { id: 'a1', text: 'first' },
                  { id: 'a1', text: 'second' },
                ],
              },
              variants: [{ id: 'v1', turns: ['hi'] }],
            },
          ],
        }),
      ),
    ).toThrow(/duplicate eval assertion id/);
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

  it('reads config-declared supporting files relative to the config file', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rosettify-prompts-test-'));
    writeFileSync(path.join(dir, 'ref.md'), 'REF BODY', 'utf-8');
    writeFileSync(path.join(dir, 'evals.json'), JSON.stringify(minimalSuite({ supporting: ['ref.md'] })), 'utf-8');
    const config = loadConfig(path.join(dir, 'evals.json'));
    expect(config.supportingFiles).toHaveLength(1);
    expect(config.supportingFiles?.[0].content).toBe('REF BODY');
    expect(config.supportingFiles?.[0].path).toBe(path.join(dir, 'ref.md'));
  });

  it('gives a clean error when a supporting file is missing', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'rosettify-prompts-test-'));
    writeFileSync(path.join(dir, 'evals.json'), JSON.stringify(minimalSuite({ supporting: ['nope.md'] })), 'utf-8');
    expect(() => loadConfig(path.join(dir, 'evals.json'))).toThrow(/Could not read supporting file "nope\.md"/);
  });

  it('loads the checked-in example configs', () => {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const evals = loadConfig(path.join(packageRoot, 'evals.json'));
    const smoke = loadConfig(path.join(packageRoot, 'evals.smoke.json'));
    expect(evals.suites[0].variants.map((v) => v.id)).toContain('think-reason-plan-chat');
    expect(smoke.suites[0].variants.map((v) => v.id)).toContain('think-reason-plan-chat');
  });

  it('keeps the required think/reason/plan/chat variant text in checked-in eval configs', () => {
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const evals = loadConfig(path.join(packageRoot, 'evals.json'));
    const smoke = loadConfig(path.join(packageRoot, 'evals.smoke.json'));

    const evalsVariant = evals.suites[0].variants.find((v) => v.id === 'think-reason-plan-chat');
    const smokeVariant = smoke.suites[0].variants.find((v) => v.id === 'think-reason-plan-chat');

    expect(evalsVariant?.systemPrompt).toBe(REQUIRED_VARIANT_TEXT);
    expect(smokeVariant?.turns[0]).toBe(REQUIRED_VARIANT_TEXT);
  });
});
