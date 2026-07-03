import type { StatBlock } from '../results/schema';
import type { ReportFile, Reporter, ReporterContext } from './types';

/**
 * `markdown` reporter (§14): the human `suite.md`. Renders the gate outcome, a
 * per-`(case×agent)` summary (pass-rate, mean score, stability), the full cost matrix
 * (one row per model × source, all token classes + $, §12), the time decomposition
 * (total vs measured agent-pure, side by side), and a per-trial status list (incl.
 * transcript source). Pure function of the computed SuiteResult + trials.
 */

type Block = StatBlock & Record<string, unknown>;

function num(v: unknown, digits = 1): string {
  return typeof v === 'number' ? v.toFixed(digits) : '—';
}

function int(v: unknown): string {
  return typeof v === 'number' ? String(Math.round(v)) : '—';
}

function ms(v: unknown): string {
  return typeof v === 'number' ? `${(v / 1000).toFixed(2)}s` : '—';
}

function indexGroups(groups: StatBlock[]): Map<string, Map<string, Block>> {
  const out = new Map<string, Map<string, Block>>();
  for (const g of groups) {
    const key = `${g.case ?? '?'}::${g.agent ?? '?'}`;
    const byStat = out.get(key) ?? new Map<string, Block>();
    byStat.set(g.id, g as Block);
    out.set(key, byStat);
  }
  return out;
}

interface RollupItem {
  source: string;
  model: string;
  usage: { input?: number; output?: number; reasoning?: number; cacheWrite?: number; cacheRead?: number; total?: number };
  usd?: number;
  unpriced?: boolean;
}

export const markdownReporter: Reporter = {
  id: 'markdown',
  render(ctx: ReporterContext): ReportFile[] {
    const { suite, trials } = ctx;
    const lines: string[] = [];

    lines.push('# Curiocity suite report', '');
    lines.push(`- Run: \`${suite.runDir}\``);
    lines.push(`- Created: ${suite.createdAt}`);
    lines.push(`- Trials: ${trials.length} · Matrix cells: ${suite.matrix.length}`, '');

    // Gate outcome.
    const gate = suite.gate;
    if (gate) {
      lines.push('## Gate', '');
      lines.push(`- Result: **${gate.passed ? 'PASS' : 'FAIL'}** (exit ${gate.exitCode})`);
      if (gate.failures.length > 0) {
        lines.push('- Failures:');
        for (const f of gate.failures) lines.push(`  - ${f}`);
      }
      lines.push('');
    }

    // Per-group summary.
    const byGroup = indexGroups(suite.groups);
    if (byGroup.size > 0) {
      lines.push('## Groups (case × agent)', '');
      lines.push('| Case | Agent | Trials | Passed | Failed | Errors | Pass-rate | Mean score | Stability |');
      lines.push('|---|---|---|---|---|---|---|---|---|');
      for (const [key, byStat] of byGroup) {
        const [caseName, agent] = key.split('::');
        const pr = byStat.get('pass-rate');
        const ss = byStat.get('score-stats');
        const st = byStat.get('stability');
        lines.push(
          `| ${caseName} | ${agent} | ${(st?.['repeats'] as number | undefined) ?? '—'} | ` +
            `${(pr?.['passed'] as number | undefined) ?? '—'} | ${(pr?.['failed'] as number | undefined) ?? '—'} | ` +
            `${(pr?.['errors'] as number | undefined) ?? '—'} | ${num(pr?.['passRate'], 2)} | ` +
            `${num(ss?.['mean'])} | ${(st?.['classification'] as string | undefined) ?? '—'} |`,
        );
      }
      lines.push('');
    }

    // Cost matrix — ONE ROW PER MODEL × SOURCE, all token classes + $ (§12). No
    // cross-model token sums; only the $ total is additive.
    const costBlocks = suite.groups.filter((g) => g.id === 'cost-rollup') as Block[];
    if (costBlocks.length > 0) {
      lines.push('## Cost (per model × source)', '');
      lines.push('| Case | Agent | Source | Model | Input | Output | Reasoning | Cache write | Cache read | Total | $ |');
      lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
      const unpriced = new Set<string>();
      for (const c of costBlocks) {
        const items = (c['items'] as RollupItem[] | undefined) ?? [];
        for (const it of items) {
          const u = it.usage ?? {};
          const usd = typeof it.usd === 'number' ? `$${it.usd.toFixed(5)}` : 'tokens-only';
          lines.push(
            `| ${c.case ?? '?'} | ${c.agent ?? '?'} | ${it.source} | ${it.model || '—'} | ` +
              `${int(u.input)} | ${int(u.output)} | ${int(u.reasoning)} | ${int(u.cacheWrite)} | ` +
              `${int(u.cacheRead)} | ${int(u.total)} | ${usd} |`,
          );
        }
        for (const m of (c['unpricedModels'] as string[]) ?? []) unpriced.add(m);
      }
      // $ total (additive across models — the only permitted cross-model sum).
      let totalUsd = 0;
      let anyPriced = false;
      for (const c of costBlocks) {
        if (typeof c['usd'] === 'number') {
          totalUsd += c['usd'] as number;
          anyPriced = true;
        }
      }
      if (anyPriced) lines.push('', `- **Suite $ total: $${totalUsd.toFixed(5)}** (additive across models)`);
      if (unpriced.size > 0) {
        lines.push('', `> Unpriced models (tokens-only): ${[...unpriced].join(', ')}`);
      }
      lines.push('');
    }

    // Time decomposition — total vs measured agent-pure side by side (§12).
    const timeBlocks = suite.groups.filter((g) => g.id === 'time-rollup') as Block[];
    if (timeBlocks.length > 0) {
      lines.push('## Time (total vs agent-pure)', '');
      lines.push('| Case | Agent | Total | Agent (pure) | Harness react | — LLM | — overhead | Checks | Judge LLM |');
      lines.push('|---|---|---|---|---|---|---|---|---|');
      for (const t of timeBlocks) {
        lines.push(
          `| ${t.case ?? '?'} | ${t.agent ?? '?'} | ${ms(t['totalMs'])} | ${ms(t['agentPureMs'])} | ` +
            `${ms(t['harnessReactMs'])} | ${ms(t['harnessLlmMs'])} | ${ms(t['harnessOverheadMs'])} | ` +
            `${ms(t['checksMs'])} | ${ms(t['judgeLlmMs'])} |`,
        );
      }
      lines.push('');
    }

    // Turn metrics (§12): total turns, question turns (once per turn), interruptions
    // (consecutive question-turns collapsed). Total vs per-trial mean.
    const turnBlocks = suite.groups.filter((g) => g.id === 'turn-metrics') as Block[];
    if (turnBlocks.length > 0) {
      lines.push('## Turn metrics', '');
      lines.push('| Case | Agent | Turns | Question turns | Interruptions | Mean turns | Mean q-turns | Mean interruptions |');
      lines.push('|---|---|---|---|---|---|---|---|');
      for (const t of turnBlocks) {
        lines.push(
          `| ${t.case ?? '?'} | ${t.agent ?? '?'} | ${int(t['turnsTotal'])} | ${int(t['questionTurns'])} | ` +
            `${int(t['interruptions'])} | ${num(t['meanTurnsTotal'])} | ${num(t['meanQuestionTurns'])} | ` +
            `${num(t['meanInterruptions'])} |`,
        );
      }
      lines.push('');
    }

    // External-evaluator metrics (§11): per metric name, mean/min/max/stddev per group.
    const metricBlocks = suite.groups.filter((g) => g.id === 'metrics') as Block[];
    const metricRows: string[] = [];
    for (const b of metricBlocks) {
      const named = (b['metrics'] as Record<string, { mean: number; min: number; max: number; stddev: number; count: number }>) ?? {};
      for (const [name, s] of Object.entries(named)) {
        metricRows.push(
          `| ${b.case ?? '?'} | ${b.agent ?? '?'} | ${name} | ${num(s.mean)} | ${num(s.min)} | ` +
            `${num(s.max)} | ${num(s.stddev)} | ${s.count} |`,
        );
      }
    }
    if (metricRows.length > 0) {
      lines.push('## External metrics', '');
      lines.push('| Case | Agent | Metric | Mean | Min | Max | Stddev | Count |');
      lines.push('|---|---|---|---|---|---|---|---|');
      lines.push(...metricRows);
      lines.push('');
    }

    // Per-trial detail.
    lines.push('## Trials', '');
    lines.push('| Case | Agent | Repeat | Status | Score | Verdict | Transcript |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const t of trials) {
      lines.push(
        `| ${t.case} | ${t.agent} | ${t.repeat} | ${t.status} | ` +
          `${t.verdict ? num(t.verdict.score) : '—'} | ${t.verdict ? (t.verdict.pass ? 'pass' : 'fail') : '—'} | ` +
          `${t.transcriptSource ?? '—'} |`,
      );
    }
    lines.push('');

    return [{ filename: 'suite.md', content: lines.join('\n') }];
  },
};
