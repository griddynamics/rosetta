import type { StatBlock } from '../results/schema';
import type { ReportFile, Reporter, ReporterContext } from './types';

/**
 * `markdown` reporter (§14): the human `suite.md`. Renders the gate outcome, a
 * per-`(case×agent)` summary (pass-rate, mean score, stability), a cost breakdown,
 * and a per-trial status list. Pure function of the computed SuiteResult + trials.
 */

type Block = StatBlock & Record<string, unknown>;

function num(v: unknown, digits = 1): string {
  return typeof v === 'number' ? v.toFixed(digits) : '—';
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

function usageStr(u: unknown): string {
  const usage = u as { inputTokens?: number; outputTokens?: number } | undefined;
  if (!usage) return '0 in / 0 out';
  return `${usage.inputTokens ?? 0} in / ${usage.outputTokens ?? 0} out`;
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

      // Cost breakdown (present only when cost-rollup ran).
      const costBlocks = suite.groups.filter((g) => g.id === 'cost-rollup') as Block[];
      if (costBlocks.length > 0) {
        lines.push('## Cost', '');
        lines.push('| Case | Agent | Agent usage | Harness (fast/workhorse/judge) | $ |');
        lines.push('|---|---|---|---|---|');
        for (const c of costBlocks) {
          const harness = c['harness'] as Record<string, unknown> | undefined;
          const h = harness
            ? `${usageStr(harness['fast'])} · ${usageStr(harness['workhorse'])} · ${usageStr(harness['judge'])}`
            : '—';
          const usd = typeof c['usd'] === 'number' ? `$${(c['usd'] as number).toFixed(4)}` : 'tokens-only';
          lines.push(`| ${c.case ?? '?'} | ${c.agent ?? '?'} | ${usageStr(c['agentUsage'])} | ${h} | ${usd} |`);
        }
        const unpriced = new Set<string>();
        for (const c of costBlocks) for (const m of (c['unpricedModels'] as string[]) ?? []) unpriced.add(m);
        if (unpriced.size > 0) {
          lines.push('', `> Unpriced models (tokens-only): ${[...unpriced].join(', ')}`);
        }
        lines.push('');
      }
    }

    // Per-trial detail.
    lines.push('## Trials', '');
    lines.push('| Case | Agent | Repeat | Status | Score | Verdict |');
    lines.push('|---|---|---|---|---|---|');
    for (const t of trials) {
      lines.push(
        `| ${t.case} | ${t.agent} | ${t.repeat} | ${t.status} | ` +
          `${t.verdict ? num(t.verdict.score) : '—'} | ${t.verdict ? (t.verdict.pass ? 'pass' : 'fail') : '—'} |`,
      );
    }
    lines.push('');

    return [{ filename: 'suite.md', content: lines.join('\n') }];
  },
};
