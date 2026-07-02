import type { SuiteResult, TrialResult } from '../results/schema';

/**
 * Reporter contract (§5.5, §14). Renders a computed `SuiteResult` (+ the raw trials
 * for per-trial detail) into one or more output files. Built-ins: `json` (machine)
 * and `markdown` (human `suite.md`). Selected via `--reporter`.
 */
export interface ReportFile {
  filename: string;
  content: string;
}

export interface ReporterContext {
  suite: SuiteResult;
  trials: TrialResult[];
}

export interface Reporter {
  readonly id: string;
  render(ctx: ReporterContext): ReportFile[];
}
