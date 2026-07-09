import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { BenchConfig, BenchReport, RunResult, VariantSummary } from './types.js';
import { computeFieldStats } from './stats.js';

function summarizeVariant(suiteId: string, variantId: string, label: string | undefined, runs: RunResult[]): VariantSummary {
  const scoped = runs.filter((r) => r.suiteId === suiteId && r.variantId === variantId);
  const successes = scoped.filter((r) => !r.error);
  const failures = scoped.length - successes.length;
  const evalItems = successes.flatMap((r) => r.evalResult ?? []);
  const evalErrors = successes.filter((r) => r.evalError).length;

  return {
    suiteId,
    variantId,
    label,
    successes: successes.length,
    failures,
    evalPasses: evalItems.filter((r) => r.passed === 'pass').length,
    evalPartials: evalItems.filter((r) => r.passed === 'partial').length,
    evalFailures: evalItems.filter((r) => r.passed === 'fail').length,
    evalErrors,
    evalConfidence: computeFieldStats(evalItems.map((r) => r.confidence)),
    inputTokens: computeFieldStats(successes.map((r) => r.totals.inputTokens)),
    outputTokens: computeFieldStats(successes.map((r) => r.totals.outputTokens)),
    thinkingTokens: computeFieldStats(
      successes.map((r) => r.totals.thinkingTokens).filter((v): v is number => v !== null),
    ),
    costUsd: computeFieldStats(
      successes.map((r) => r.totals.costUsd).filter((v): v is number => v !== null),
    ),
    latencyMs: computeFieldStats(successes.map((r) => r.totals.latencyMs)),
  };
}

export function buildReport(config: BenchConfig, runs: RunResult[]): BenchReport {
  const summaries: VariantSummary[] = [];
  for (const suite of config.suites) {
    for (const variant of suite.variants) {
      summaries.push(summarizeVariant(suite.id, variant.id, variant.label, runs));
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    config,
    runs,
    summaries,
  };
}

function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function fmtStats(stats: VariantSummary['inputTokens'], digits = 0): string {
  if (!stats) return '—';
  return `${fmtNum(stats.mean, digits)} (±${fmtNum(stats.stdev, digits)}, ${fmtNum(stats.min, digits)}–${fmtNum(stats.max, digits)})`;
}

export function renderMarkdownReport(report: BenchReport): string {
  const lines: string[] = [];
  lines.push('# rosettify-prompts bench report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');

  for (const suite of report.config.suites) {
    lines.push(`## Suite: ${suite.id}`);
    if (suite.description) lines.push(`${suite.description}`);
    lines.push('');
    lines.push(
      '| Variant | n (ok/fail) | Eval pass/partial/fail/error | Eval confidence | Input tok | Output tok | Thinking tok | Cost (USD) | Latency (ms) |',
    );
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const variant of suite.variants) {
      const s = report.summaries.find((x) => x.suiteId === suite.id && x.variantId === variant.id);
      if (!s) continue;
      lines.push(
        `| ${variant.label ?? variant.id} | ${s.successes}/${s.failures} | ${s.evalPasses}/${s.evalPartials}/${s.evalFailures}/${s.evalErrors} | ${fmtStats(s.evalConfidence, 1)} | ${fmtStats(s.inputTokens)} | ${fmtStats(s.outputTokens)} | ${fmtStats(s.thinkingTokens)} | ${fmtStats(s.costUsd, 4)} | ${fmtStats(s.latencyMs)} |`,
      );
    }
    lines.push('');

    if (suite.eval) {
      lines.push('### Eval reasons and suggestions (repetition 0)');
      lines.push('');
      for (const variant of suite.variants) {
        const run = report.runs.find(
          (r) => r.suiteId === suite.id && r.variantId === variant.id && r.repetition === 0,
        );
        lines.push(`**${variant.label ?? variant.id}**`);
        if (run?.evalError) {
          lines.push(`_eval error: ${run.evalError}_`);
        } else if (!run?.evalResult?.length) {
          lines.push('_no eval result_');
        } else {
          for (const item of run.evalResult) {
            lines.push(
              `- ${item.text}: ${item.passed}, confidence ${fmtNum(item.confidence, 1)}. Reasons: ${item.reasons} Suggestions: ${item.suggestions}`,
            );
          }
        }
        lines.push('');
      }
    }

    lines.push('### Sample final replies (repetition 0)');
    lines.push('');
    for (const variant of suite.variants) {
      const run = report.runs.find(
        (r) => r.suiteId === suite.id && r.variantId === variant.id && r.repetition === 0,
      );
      lines.push(`**${variant.label ?? variant.id}**`);
      if (!run) {
        lines.push('_no run found_');
      } else if (run.error) {
        lines.push(`_error: ${run.error}_`);
      } else {
        const last = run.turns[run.turns.length - 1];
        lines.push('```');
        lines.push(last?.assistantText ?? '(empty)');
        lines.push('```');
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function writeReportFiles(report: BenchReport, outDir: string): { jsonPath: string; markdownPath: string } {
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, 'report.json');
  const markdownPath = path.join(outDir, 'report.md');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');
  writeFileSync(markdownPath, renderMarkdownReport(report), 'utf-8');
  return { jsonPath, markdownPath };
}
