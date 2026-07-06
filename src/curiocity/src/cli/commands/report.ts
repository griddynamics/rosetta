import { loadTopLevelConfig } from '../../config/loader';
import { gateSchema, pricingSchema, type GateConfig, type PricingMap } from '../../config/schema';
import { DEFAULT_GATE } from '../../config/defaults';
import { aggregate } from '../../orchestrator/aggregate';
import { renderReports } from '../../reporters';
import { loadRun, type LoadedRun } from '../../results/loader';
import { suiteResultSchema, type TrialStatus } from '../../results/schema';
import { writeReportFile } from '../../results/store';

/**
 * `curiocity report <resultsDir>` (D8, §13). Loads a stored run, recomputes stats +
 * reporters + gate from the stored `TrialResult`s (never re-runs agents/evaluators),
 * re-writes the report files, and returns the recomputed gate exit code. New stats /
 * reporters / gate thresholds apply retroactively.
 *
 * Gate + pricing precedence: explicit option (tests) < `--config` file < the run's
 * stored config snapshot < built-in defaults.
 */
export interface ReportOptions {
  reporter?: string;
  /** `--config <file>`: reload thresholds/pricing for retroactive re-gating. */
  config?: string;
  /** Programmatic overrides (highest precedence). */
  gate?: GateConfig;
  pricing?: PricingMap;
}

function storedGate(run: LoadedRun): GateConfig | undefined {
  const snapshot = run.suite.config as { globals?: { gate?: unknown } } | undefined;
  const parsed = gateSchema.safeParse(snapshot?.globals?.gate);
  return parsed.success ? parsed.data : undefined;
}

function storedPricing(run: LoadedRun): PricingMap | undefined {
  const snapshot = run.suite.config as { pricing?: unknown } | undefined;
  const parsed = pricingSchema.safeParse(snapshot?.pricing);
  return parsed.success ? parsed.data : undefined;
}

function resolveReportConfig(
  run: LoadedRun,
  opts: ReportOptions,
): { gate: GateConfig; pricing?: PricingMap } {
  const fromFile = opts.config ? loadTopLevelConfig(opts.config) : undefined;
  const gate = opts.gate ?? fromFile?.gate ?? storedGate(run) ?? DEFAULT_GATE;
  // Pricing recovers from the stored snapshot too (symmetric with gate), so a
  // re-render without --config keeps $ instead of regressing to tokens-only.
  const pricing = opts.pricing ?? fromFile?.pricing ?? storedPricing(run);
  return { gate, ...(pricing ? { pricing } : {}) };
}

export function runReport(resultsDir: string, opts: ReportOptions): number {
  const run = loadRun(resultsDir);
  const { gate, pricing } = resolveReportConfig(run, opts);

  const agg = aggregate({
    trials: run.trials,
    gate,
    ...(pricing ? { pricing } : {}),
    collectCost: true, // report is retroactive; always itemize cost if data is present.
  });

  const suite = suiteResultSchema.parse({
    ...run.suite,
    groups: agg.groups,
    gate: { passed: agg.gate.passed, exitCode: agg.gate.exitCode, failures: agg.gate.failures },
  });

  const reporterIds = (opts.reporter ?? 'json,markdown')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== '');
  for (const file of renderReports(reporterIds, { suite, trials: run.trials })) {
    writeReportFile(run.runDir, file.filename, file.content);
  }

  const out = process.stdout;
  const counts = new Map<TrialStatus, number>();
  for (const t of run.trials) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  out.write(`Recomputed run: ${run.runDir}\n`);
  out.write(`  trials:   ${run.trials.length}\n`);
  for (const [status, n] of [...counts.entries()].sort()) out.write(`    ${status}: ${n}\n`);
  out.write(`  gate:     ${agg.gate.passed ? 'PASS' : 'FAIL'} (exit ${agg.gate.exitCode})\n`);
  for (const f of agg.gate.failures) out.write(`    - ${f}\n`);

  return agg.gate.exitCode;
}
