import type { ReportFile, Reporter, ReporterContext } from './types';

/** `json` reporter (§8/§14): the machine-readable `suite.json` (the SuiteResult). */
export const jsonReporter: Reporter = {
  id: 'json',
  render(ctx: ReporterContext): ReportFile[] {
    return [{ filename: 'suite.json', content: `${JSON.stringify(ctx.suite, null, 2)}\n` }];
  },
};
