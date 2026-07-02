import { loadRun } from '../../results/loader';
import type { TrialStatus } from '../../results/schema';
import { NOT_IMPLEMENTED_EXIT } from '../exit-codes';

/**
 * `curiocity report <resultsDir>` (D8, §13). M1 loads + validates a stored run and
 * prints a status summary. Recomputing stats + reporters + gate is out of scope
 * (stats/reporters/gatekeeper layers) — the command exits "not implemented" after
 * loading.
 */
export interface ReportOptions {
  reporter?: string;
}

export function runReport(resultsDir: string, _opts: ReportOptions): number {
  const run = loadRun(resultsDir);

  const counts = new Map<TrialStatus, number>();
  for (const t of run.trials) {
    counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  }

  const out = process.stdout;
  out.write(`Loaded run: ${run.runDir}\n`);
  out.write(`  created:  ${run.suite.createdAt}\n`);
  out.write(`  matrix:   ${run.suite.matrix.length} cell(s)\n`);
  out.write(`  trials:   ${run.trials.length}\n`);
  for (const [status, n] of [...counts.entries()].sort()) {
    out.write(`    ${status}: ${n}\n`);
  }

  process.stderr.write(
    'not implemented (M1): stats + reporters + gate recomputation is not part of this milestone.\n',
  );
  return NOT_IMPLEMENTED_EXIT;
}
