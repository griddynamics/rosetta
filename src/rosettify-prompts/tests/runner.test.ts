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
