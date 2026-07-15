import { describe, it, expect } from 'vitest';
import { cell, markdownReporter } from '../../src/reporters/markdown';
import { suiteResultSchema, trialResultSchema, type TrialResultInput } from '../../src/results/schema';

/**
 * Feature B (markdown reporter, presentation only): the per-trial evaluator section
 * surfaces the llm-judge `confidenceLevel`/`perplexityLevel` and per-metric
 * `confidenceLevel`/`perplexityLevel` (§5.4), and renders `eval-error` like the other
 * error statuses. Old runs (empty `evaluators`, no new fields) still render.
 */

function suite() {
  return suiteResultSchema.parse({
    schemaVersion: 2,
    runDir: '/tmp/run-x',
    createdAt: '2026-07-06T00:00:00.000Z',
    config: {},
    matrix: [{ case: 'c', agent: 'claude-code', repeat: 1 }],
    groups: [],
  });
}

function trial(over: Partial<TrialResultInput>) {
  return trialResultSchema.parse({
    schemaVersion: 2,
    agent: 'claude-code',
    case: 'c',
    repeat: 1,
    status: 'passed',
    ...over,
  });
}

function render(trials: ReturnType<typeof trial>[]): string {
  const files = markdownReporter.render({ suite: suite(), trials });
  return files.find((f) => f.filename === 'suite.md')!.content;
}

describe('markdown reporter — confidence / perplexity / metrics (Feature B)', () => {
  it('renders llm-judge confidence + perplexity and per-metric confidence', () => {
    const md = render([
      trial({
        status: 'passed',
        verdict: { pass: true, score: 100, rationale: 'weighted mean 100' },
        evaluators: [
          { id: 'llm-judge', pass: true, score: 100, gate: false, details: 'great', confidenceLevel: 99, perplexityLevel: 42 },
          { id: 'external', pass: true, gate: false, details: 'ext', metrics: [{ name: 'files-changed', value: 2, confidenceLevel: 100 }] },
        ],
      }),
    ]);
    expect(md).toContain('## Evaluators (per trial)');
    // Judge levels present (integers render bare).
    expect(md).toMatch(/llm-judge \| pass \| 100\.0 \| no \| 99 \| 42 \|/);
    // Per-metric confidence surfaced on the nested metric row.
    expect(md).toContain('↳ files-changed');
    expect(md).toMatch(/files-changed \| — \| 2 \| — \| 100 \|/);
  });

  it('renders eval-error status like other error statuses and flags the errored evaluator', () => {
    const md = render([
      trial({
        status: 'eval-error',
        evaluators: [
          { id: 'llm-judge', pass: false, gate: false, details: 'evaluator "llm-judge" errored: insufficient_quota', error: true },
        ],
      }),
    ]);
    // Trials table shows the raw status; verdict/score columns are '—' (no verdict).
    expect(md).toContain('| c | claude-code | 1 | eval-error | — | — |');
    // The errored evaluator is flagged in the per-trial evaluator section.
    expect(md).toContain('llm-judge ⚠ error');
  });

  it('old run (empty evaluators, no new fields) still renders; no evaluator section', () => {
    const md = render([
      trial({ status: 'passed', verdict: { pass: true, score: 90, rationale: 'legacy' }, evaluators: [] }),
    ]);
    expect(md).toContain('Curiocity suite report');
    expect(md).not.toContain('## Evaluators (per trial)');
  });
});

describe('cell() — Markdown table-cell escaping helper', () => {
  it('escapes pipes so a details string cannot break the table row', () => {
    expect(cell('a | b || c')).toBe('a \\| b \\|\\| c');
  });

  it('collapses newlines (with surrounding whitespace) to single spaces', () => {
    expect(cell('line one\n  line two\r\n line three')).toBe('line one line two line three');
  });

  it('truncates long strings to max chars with an ellipsis', () => {
    const long = 'x'.repeat(150);
    const out = cell(long); // default max 100
    expect(out).toHaveLength(100);
    expect(out.endsWith('…')).toBe(true);
    expect(out.startsWith('x'.repeat(99))).toBe(true);
    // Custom max is honoured too.
    expect(cell('abcdef', 4)).toBe('abc…');
  });

  it('renders empty/absent values as an em dash', () => {
    expect(cell(undefined)).toBe('—');
    expect(cell(null)).toBe('—');
    expect(cell('')).toBe('—');
  });

  it('leaves short clean strings untouched', () => {
    expect(cell('all good')).toBe('all good');
  });
});
