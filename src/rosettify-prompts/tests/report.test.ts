import { describe, expect, it } from 'vitest';
import { buildReport, renderMarkdownReport } from '../src/report.js';
import type { BenchConfig, RunResult } from '../src/types.js';

const config: BenchConfig = {
  model: 'claude-sonnet-5',
  maxOutputTokens: 2048,
  thinking: {
    enabled: true,
    mode: 'adaptive',
    budgetTokens: 8192,
    effort: 'low',
    display: 'summarized',
  },
  repetitions: 2,
  concurrency: 2,
  suites: [
    {
      id: 'suite-a',
      eval: {
        assertions: [{ id: 'a', text: 'Answer should be terse.' }],
      },
      variants: [{ id: 'v1', turns: ['hello'] }],
    },
  ],
};

function run(repetition: number, passed: 'pass' | 'partial' | 'fail', confidence: number): RunResult {
  return {
    suiteId: 'suite-a',
    variantId: 'v1',
    repetition,
    model: 'claude-sonnet-5',
    turns: [],
    evalResult: [
      {
        text: 'a',
        passed,
        reasons: 'reason',
        suggestions: 'suggestion',
        confidence,
      },
    ],
    totals: {
      inputTokens: 10,
      outputTokens: 20,
      thinkingTokens: 5,
      costUsd: 0.001,
      latencyMs: 100,
    },
  };
}

describe('buildReport', () => {
  it('aggregates eval pass/partial/fail counts and confidence stats', () => {
    const report = buildReport(config, [run(0, 'pass', 90), run(1, 'partial', 70)]);
    expect(report.summaries[0]).toMatchObject({
      evalPasses: 1,
      evalPartials: 1,
      evalFailures: 0,
      evalErrors: 0,
    });
    expect(report.summaries[0].evalConfidence?.mean).toBe(80);
  });

  it('aggregates evalError counts across all repetitions in variant summaries and markdown', () => {
    const evalErrorRun: RunResult = {
      ...run(1, 'pass', 90),
      evalResult: undefined,
      evalError: 'judge unavailable',
    };
    const report = buildReport(config, [run(0, 'pass', 90), evalErrorRun]);
    const markdown = renderMarkdownReport(report);

    expect(report.summaries[0].evalErrors).toBe(1);
    expect(markdown).toContain('Eval pass/partial/fail/error');
    expect(markdown).toContain('| v1 | 2/0 | 1/0/0/1 |');
  });

  it('renders eval reasons and suggestions without an evidence field', () => {
    const markdown = renderMarkdownReport(buildReport(config, [run(0, 'fail', 60)]));
    expect(markdown).toContain('Eval pass/partial/fail');
    expect(markdown).toContain('Reasons: reason Suggestions: suggestion');
    expect(markdown).not.toContain('Evidence');
  });
});
