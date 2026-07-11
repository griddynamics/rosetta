import { describe, expect, it } from 'vitest';
import { runBenchSuite, validateEvalResultItem } from '../src/runner.js';
import type Anthropic from '@anthropic-ai/sdk';
import type { BenchConfig } from '../src/types.js';

describe('validateEvalResultItem', () => {
  it('normalizes to the public eval result shape and drops evidence', () => {
    expect(
      validateEvalResultItem({
        text: 'assertion-a',
        passed: 'partial',
        reasons: 'Mostly meets the assertion.',
        suggestions: 'Tighten the final sentence.',
        confidence: 82,
        evidence: ['not part of the result shape'],
      }),
    ).toEqual({
      text: 'assertion-a',
      passed: 'partial',
      reasons: 'Mostly meets the assertion.',
      suggestions: 'Tighten the final sentence.',
      confidence: 82,
    });
  });

  it('requires pass, partial, or fail and confidence from 0 to 100', () => {
    expect(() =>
      validateEvalResultItem({
        text: 'assertion-a',
        passed: 'yes',
        reasons: '',
        suggestions: '',
        confidence: 50,
      }),
    ).toThrow(/passed/);
    expect(() =>
      validateEvalResultItem({
        text: 'assertion-a',
        passed: 'pass',
        reasons: '',
        suggestions: '',
        confidence: 101,
      }),
    ).toThrow(/between 0 and 100/);
  });
});

describe('runBenchSuite eval failure semantics', () => {
  it('records malformed judge output as evalError without failing the completed run', async () => {
    const config: BenchConfig = {
      model: 'claude-sonnet-5',
      maxOutputTokens: 128,
      thinking: {
        enabled: false,
        mode: 'adaptive',
        budgetTokens: 1024,
        effort: 'low',
        display: 'omitted',
      },
      repetitions: 1,
      concurrency: 1,
      suites: [
        {
          id: 'suite-a',
          eval: {
            mode: 'individual',
            assertions: [{ id: 'assertion-a', text: 'Must be valid.' }],
          },
          variants: [{ id: 'variant-a', turns: ['hello'] }],
        },
      ],
    };
    let createCalls = 0;
    const client = {
      messages: {
        async create() {
          createCalls++;
          if (createCalls === 1) {
            return {
              content: [{ type: 'text', text: 'assistant final' }],
              usage: { input_tokens: 11, output_tokens: 13 },
              stop_reason: 'end_turn',
            };
          }
          return {
            content: [{ type: 'text', text: 'not json' }],
            usage: { input_tokens: 17, output_tokens: 19 },
            stop_reason: 'end_turn',
          };
        },
      },
    } as unknown as Anthropic;

    const [run] = await runBenchSuite(client, config);

    expect(run.error).toBeUndefined();
    expect(run.evalError).toMatch(/Eval assertion "assertion-a" failed: eval judge did not return a JSON object/);
    expect(run.evalResult).toBeUndefined();
    expect(run.turns).toHaveLength(1);
    expect(run.turns[0].assistantText).toBe('assistant final');
    expect(run.totals).toMatchObject({
      inputTokens: 11,
      outputTokens: 13,
      thinkingTokens: null,
    });
    expect(run.totals.costUsd).toBeCloseTo(0.000152);
    expect(createCalls).toBe(2);
  });

  it('retains successful eval results when a later assertion fails', async () => {
    const config: BenchConfig = {
      model: 'claude-sonnet-5',
      maxOutputTokens: 128,
      thinking: {
        enabled: false,
        mode: 'adaptive',
        budgetTokens: 1024,
        effort: 'low',
        display: 'omitted',
      },
      repetitions: 1,
      concurrency: 1,
      suites: [
        {
          id: 'suite-a',
          eval: {
            mode: 'individual',
            assertions: [
              { id: 'assertion-a', text: 'Must be valid.' },
              { id: 'assertion-b', text: 'Must also be valid.' },
            ],
          },
          variants: [{ id: 'variant-a', turns: ['hello'] }],
        },
      ],
    };
    let createCalls = 0;
    const client = {
      messages: {
        async create() {
          createCalls++;
          if (createCalls === 1) {
            return {
              content: [{ type: 'text', text: 'assistant final' }],
              usage: { input_tokens: 11, output_tokens: 13 },
              stop_reason: 'end_turn',
            };
          }
          if (createCalls === 2) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    text: 'assertion-a',
                    passed: 'pass',
                    reasons: 'Meets the first assertion.',
                    suggestions: '',
                    confidence: 92,
                  }),
                },
              ],
              usage: { input_tokens: 17, output_tokens: 19 },
              stop_reason: 'end_turn',
            };
          }
          return {
            content: [{ type: 'text', text: 'not json' }],
            usage: { input_tokens: 23, output_tokens: 29 },
            stop_reason: 'end_turn',
          };
        },
      },
    } as unknown as Anthropic;

    const [run] = await runBenchSuite(client, config);

    expect(run.error).toBeUndefined();
    expect(run.evalResult).toEqual([
      {
        text: 'assertion-a',
        passed: 'pass',
        reasons: 'Meets the first assertion.',
        suggestions: '',
        confidence: 92,
      },
    ]);
    expect(run.evalError).toMatch(/Eval assertion "assertion-b" failed: eval judge did not return a JSON object/);
    expect(createCalls).toBe(3);
  });
});

describe('thinking token derivation', () => {
  it('derives thinkingTokens from output_tokens minus countTokens(assistantText) when usage omits it', async () => {
    const config: BenchConfig = {
      model: 'claude-sonnet-5',
      maxOutputTokens: 128,
      thinking: {
        enabled: true,
        mode: 'adaptive',
        budgetTokens: 1024,
        effort: 'low',
        display: 'omitted',
      },
      repetitions: 1,
      concurrency: 1,
      suites: [
        {
          id: 'suite-a',
          variants: [{ id: 'variant-a', turns: ['hello'] }],
        },
      ],
    };
    const client = {
      messages: {
        async create() {
          return {
            content: [{ type: 'text', text: 'assistant final' }],
            usage: { input_tokens: 11, output_tokens: 50 },
            stop_reason: 'end_turn',
          };
        },
        async countTokens() {
          return { input_tokens: 30 };
        },
      },
    } as unknown as Anthropic;

    const [run] = await runBenchSuite(client, config);

    expect(run.error).toBeUndefined();
    expect(run.turns[0].thinkingTokens).toBe(20);
    expect(run.turns[0].thinkingTokensSource).toBe('derived');
    expect(run.totals.thinkingTokens).toBe(20);
  });

  it('leaves thinkingTokens null when the derivation would go negative or countTokens is unavailable', async () => {
    const config: BenchConfig = {
      model: 'claude-sonnet-5',
      maxOutputTokens: 128,
      thinking: {
        enabled: true,
        mode: 'adaptive',
        budgetTokens: 1024,
        effort: 'low',
        display: 'omitted',
      },
      repetitions: 1,
      concurrency: 1,
      suites: [
        {
          id: 'suite-a',
          variants: [{ id: 'variant-a', turns: ['hello'] }],
        },
      ],
    };
    const client = {
      messages: {
        async create() {
          return {
            content: [{ type: 'text', text: 'hi' }],
            usage: { input_tokens: 11, output_tokens: 3 },
            stop_reason: 'end_turn',
          };
        },
        async countTokens() {
          return { input_tokens: 8 };
        },
      },
    } as unknown as Anthropic;

    const [run] = await runBenchSuite(client, config);

    expect(run.error).toBeUndefined();
    expect(run.turns[0].thinkingTokens).toBeNull();
    expect(run.turns[0].thinkingTokensSource).toBeNull();
    expect(run.totals.thinkingTokens).toBeNull();
  });
});

const NO_THINKING = { enabled: false, mode: 'adaptive', budgetTokens: 1024, effort: 'low', display: 'omitted' } as const;

describe('variant system prompt augmentation', () => {
  it('appends --additional then --supporting (delimited) after each variant prompt; empty base gets injected context alone', async () => {
    const systems: Array<string | undefined> = [];
    const config: BenchConfig = {
      model: 'm',
      maxOutputTokens: 128,
      thinking: NO_THINKING,
      repetitions: 1,
      concurrency: 1, // deterministic order: withbase then nobase
      additional: ['ADD-CTX'],
      supportingFiles: [{ path: 'ref.md', content: 'REF-CONTENT' }],
      suites: [
        {
          id: 's',
          variants: [
            { id: 'withbase', systemPrompt: 'BASE-PROMPT', turns: ['hi'] },
            { id: 'nobase', turns: ['hi'] },
          ],
        },
      ],
    };
    const client = {
      messages: {
        async create(params: { system?: string }) {
          systems.push(params.system);
          return { content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' };
        },
      },
    } as unknown as Anthropic;

    await runBenchSuite(client, config);

    expect(systems).toHaveLength(2);
    const [withBase, noBase] = systems as string[];
    expect(withBase.indexOf('BASE-PROMPT')).toBeGreaterThanOrEqual(0);
    expect(withBase.indexOf('BASE-PROMPT')).toBeLessThan(withBase.indexOf('ADD-CTX'));
    expect(withBase.indexOf('ADD-CTX')).toBeLessThan(withBase.indexOf('REF-CONTENT'));
    expect(withBase).toContain('SUPPORTING_FILE 1: ref.md');
    expect(withBase).toContain('DO_NOT_FOLLOW');
    expect(noBase).not.toContain('BASE-PROMPT');
    expect(noBase.startsWith('ADD-CTX')).toBe(true);
    expect(noBase).toContain('REF-CONTENT');
  });
});

describe('combined judge mode (default)', () => {
  function combinedConfig(repetitions: number): BenchConfig {
    return {
      model: 'm',
      maxOutputTokens: 128,
      thinking: NO_THINKING,
      repetitions,
      concurrency: 4,
      suites: [
        {
          id: 's',
          eval: { assertions: [{ id: 'a1', text: 'be good' }] },
          variants: [
            { id: 'v1', turns: ['hi'] },
            { id: 'v2', turns: ['hi'] },
          ],
        },
      ],
    };
  }

  function combinedClient(counters: { judge: number; conv: number }): Anthropic {
    return {
      messages: {
        async create(params: { messages: Array<{ content: unknown }> }) {
          const prompt = String(params.messages[params.messages.length - 1]?.content ?? '');
          if (prompt.includes('Candidate responses:')) {
            counters.judge++;
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    scores: [
                      { variantId: 'v1', text: 'a1', passed: 'pass', reasons: 'good', suggestions: '', confidence: 95 },
                      { variantId: 'v2', text: 'a1', passed: 'fail', reasons: 'bad', suggestions: 'fix', confidence: 40 },
                    ],
                  }),
                },
              ],
              usage: { input_tokens: 5, output_tokens: 5 },
              stop_reason: 'end_turn',
            };
          }
          counters.conv++;
          return { content: [{ type: 'text', text: 'answer' }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' };
        },
      },
    } as unknown as Anthropic;
  }

  it('judges all variants together in one call per assertion and maps scores by variantId (combined is the default)', async () => {
    const counters = { judge: 0, conv: 0 };
    const runs = await runBenchSuite(combinedClient(counters), combinedConfig(1));

    expect(counters.conv).toBe(2);
    expect(counters.judge).toBe(1); // one combined call for the single assertion, not one per variant
    const v1 = runs.find((r) => r.variantId === 'v1')!;
    const v2 = runs.find((r) => r.variantId === 'v2')!;
    expect(v1.evalResult).toEqual([{ text: 'a1', passed: 'pass', reasons: 'good', suggestions: '', confidence: 95 }]);
    expect(v2.evalResult?.[0].passed).toBe('fail');
    expect(v1.error).toBeUndefined();
    expect(v2.error).toBeUndefined();
  });

  it('runs one combined judge call per repetition (per-repetition grouping)', async () => {
    const counters = { judge: 0, conv: 0 };
    await runBenchSuite(combinedClient(counters), combinedConfig(2));
    expect(counters.conv).toBe(4);
    expect(counters.judge).toBe(2); // one per repetition
  });

  it('isolates a bad per-variant score: the other variant is still scored and the batch does not fail', async () => {
    const client = {
      messages: {
        async create(params: { messages: Array<{ content: unknown }> }) {
          const prompt = String(params.messages[params.messages.length - 1]?.content ?? '');
          if (prompt.includes('Candidate responses:')) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    scores: [
                      { variantId: 'v1', text: 'a1', passed: 'pass', reasons: 'ok', suggestions: '', confidence: 90 },
                      { variantId: 'v2', text: 'a1', passed: 'nope', reasons: 'x', suggestions: '', confidence: 50 },
                    ],
                  }),
                },
              ],
              usage: { input_tokens: 5, output_tokens: 5 },
              stop_reason: 'end_turn',
            };
          }
          return { content: [{ type: 'text', text: 'answer' }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' };
        },
      },
    } as unknown as Anthropic;

    const runs = await runBenchSuite(client, combinedConfig(1));
    const v1 = runs.find((r) => r.variantId === 'v1')!;
    const v2 = runs.find((r) => r.variantId === 'v2')!;
    expect(v1.evalResult?.[0].passed).toBe('pass');
    expect(v2.evalResult).toBeUndefined();
    expect(v2.evalError).toMatch(/Eval assertion "a1" failed/);
    expect(v1.error).toBeUndefined();
    expect(v2.error).toBeUndefined();
  });

  it('accepts a bare top-level array from the judge (not only the {scores} envelope)', async () => {
    const client = {
      messages: {
        async create(params: { messages: Array<{ content: unknown }> }) {
          const prompt = String(params.messages[params.messages.length - 1]?.content ?? '');
          if (prompt.includes('Candidate responses:')) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify([
                    { variantId: 'v1', text: 'a1', passed: 'pass', reasons: 'g', suggestions: '', confidence: 88 },
                    { variantId: 'v2', text: 'a1', passed: 'partial', reasons: 'm', suggestions: '', confidence: 60 },
                  ]),
                },
              ],
              usage: { input_tokens: 5, output_tokens: 5 },
              stop_reason: 'end_turn',
            };
          }
          return { content: [{ type: 'text', text: 'answer' }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' };
        },
      },
    } as unknown as Anthropic;

    const runs = await runBenchSuite(client, combinedConfig(1));
    expect(runs.find((r) => r.variantId === 'v1')!.evalResult?.[0].passed).toBe('pass');
    expect(runs.find((r) => r.variantId === 'v2')!.evalResult?.[0].passed).toBe('partial');
  });

  it('disables thinking on judge calls', async () => {
    const judgeThinking: unknown[] = [];
    const client = {
      messages: {
        async create(params: { messages: Array<{ content: unknown }>; thinking?: unknown }) {
          const prompt = String(params.messages[params.messages.length - 1]?.content ?? '');
          if (prompt.includes('Candidate responses:')) {
            judgeThinking.push(params.thinking);
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    scores: [
                      { variantId: 'v1', text: 'a1', passed: 'pass', reasons: 'g', suggestions: '', confidence: 90 },
                      { variantId: 'v2', text: 'a1', passed: 'pass', reasons: 'g', suggestions: '', confidence: 90 },
                    ],
                  }),
                },
              ],
              usage: { input_tokens: 5, output_tokens: 5 },
              stop_reason: 'end_turn',
            };
          }
          return { content: [{ type: 'text', text: 'answer' }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' };
        },
      },
    } as unknown as Anthropic;

    await runBenchSuite(client, combinedConfig(1));
    expect(judgeThinking).toEqual([{ type: 'disabled' }]);
  });
});

describe('failure isolation', () => {
  it('records a failed variant conversation as error without failing the batch', async () => {
    const config: BenchConfig = {
      model: 'm',
      maxOutputTokens: 128,
      thinking: NO_THINKING,
      repetitions: 1,
      concurrency: 4,
      suites: [
        {
          id: 's',
          variants: [
            { id: 'v-boom', turns: ['BOOM'] },
            { id: 'v-ok', turns: ['ok'] },
          ],
        },
      ],
    };
    const client = {
      messages: {
        async create(params: { messages: Array<{ content: unknown }> }) {
          const prompt = String(params.messages[params.messages.length - 1]?.content ?? '');
          if (prompt.includes('BOOM')) {
            throw Object.assign(new Error('bad request'), { status: 400 }); // non-retryable
          }
          return { content: [{ type: 'text', text: 'answer' }], usage: { input_tokens: 1, output_tokens: 1 }, stop_reason: 'end_turn' };
        },
      },
    } as unknown as Anthropic;

    const runs = await runBenchSuite(client, config);
    expect(runs).toHaveLength(2);
    const boom = runs.find((r) => r.variantId === 'v-boom')!;
    const ok = runs.find((r) => r.variantId === 'v-ok')!;
    expect(boom.error).toMatch(/bad request/);
    expect(ok.error).toBeUndefined();
    expect(ok.turns[0].assistantText).toBe('answer');
  });
});
