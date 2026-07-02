import { reporterRegistry } from './registry';
import { jsonReporter } from './json';
import { markdownReporter } from './markdown';
import type { ReportFile, ReporterContext } from './types';

/**
 * Reporter layer entry (§5.5/§14). Registering a built-in = one line here (D5).
 * Built-ins: `json` (suite.json) and `markdown` (suite.md).
 */
if (!reporterRegistry.has('json')) reporterRegistry.register(jsonReporter);
if (!reporterRegistry.has('markdown')) reporterRegistry.register(markdownReporter);

export { reporterRegistry };
export * from './types';
export { jsonReporter, markdownReporter };

/** Render the selected reporters into their output files. Unknown ids throw. */
export function renderReports(reporterIds: string[], ctx: ReporterContext): ReportFile[] {
  const files: ReportFile[] = [];
  for (const id of reporterIds) files.push(...reporterRegistry.get(id).render(ctx));
  return files;
}
