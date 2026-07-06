import pLimit from 'p-limit';
import type { CaseDefinition } from '../cases/types';
import type { MatrixEntry } from '../config/matrix';
import type { ResolvedCaseConfig } from '../config/merge';
import type { GateConfig, PricingMap, TopLevelConfig } from '../config/schema';
import type { TrialSpec } from '../shared/ipc';
import type { MatrixCell } from '../shared/matrix';
import type { QnaEntry } from '../shared/trajectory';
import {
  SCHEMA_VERSION,
  suiteResultSchema,
  trialResultSchema,
  type StatBlock,
  type TrialResult,
} from '../results/schema';
import { createRunDir, writeReportFile, writeTrial } from '../results/store';
import { renderReports } from '../reporters';
import { runChildTrial, writeSynthesizedTrial } from './child';
import { buildChildEnv } from './env';
import { aggregate } from './aggregate';
import { type GateOutcome } from './gatekeeper';
import { buildTrialSpecs } from './spec';

/**
 * Suite runner (§4, §7, §13, §14). Builds specs, runs a bounded pool (p-limit),
 * forks one Curion per cell, aggregates `TrialResult`s, gates, and writes
 * `suite.json` + per-trial artifacts. The markdown reporter (`suite.md`) is M3.
 */

export interface RunSuiteArgs {
  topLevel: TopLevelConfig;
  cases: CaseDefinition[];
  resolvedCases: ResolvedCaseConfig[];
  matrix: MatrixEntry[];
  out: string;
  concurrency: number;
  gate: GateConfig;
  /** `--collect-cost` (§12/D9): compute the cost-rollup stat + $ from pricing. Default off. */
  collectCost?: boolean;
  /** Config `pricing` map (§12); enables $ in cost-rollup. */
  pricing?: PricingMap;
  /** Optional suite $ budget: over it → warn once, never abort (P7). */
  budgetUsd?: number;
  configDir: string;
  keepWorkspace: boolean;
  mirror: boolean;
  /** Provider → api key, resolved once at orchestrator startup (§4/§12). */
  keys?: Record<string, string>;
  /** Opaque config snapshot stored in suite.json. */
  configSnapshot: unknown;
  onLog?: (msg: string, fields?: Record<string, unknown>) => void;
  onQna?: (entry: QnaEntry, cell: MatrixCell) => void;
  onMirror?: (data: string, cell: MatrixCell) => void;
  /** Test-only hook to decorate a spec (e.g. attach a fakeRouter). */
  specDecorator?: (spec: TrialSpec) => TrialSpec;
}

export interface RunSuiteResult {
  runDir: string;
  trials: TrialResult[];
  gate: GateOutcome;
  exitCode: number;
}

function skippedResult(cell: MatrixCell): TrialResult {
  return trialResultSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    agent: cell.agent,
    case: cell.case,
    repeat: cell.repeat,
    status: 'skipped',
    evaluators: [],
    turnCount: 0,
    qna: [],
  });
}

export async function runSuite(args: RunSuiteArgs): Promise<RunSuiteResult> {
  const runDir = createRunDir(args.out);
  const { specs, skipped } = buildTrialSpecs({
    topLevel: args.topLevel,
    cases: args.cases,
    resolvedCases: args.resolvedCases,
    matrix: args.matrix,
    runDir,
    configDir: args.configDir,
    keepWorkspace: args.keepWorkspace,
    mirror: args.mirror,
    keys: args.keys ?? {},
  });

  const trials: TrialResult[] = [];

  // Skipped cells: record a `skipped` trial.json (§14) and include in aggregation.
  for (const s of skipped) {
    const result = skippedResult(s.cell);
    writeTrial(runDir, result);
    trials.push(result);
    args.onLog?.(`skipped ${s.cell.case}×${s.cell.agent}#${s.cell.repeat}: ${s.reason}`);
  }

  const childEnv = buildChildEnv();
  const limit = pLimit(args.concurrency);

  const runs = specs.map((raw) =>
    limit(async () => {
      const spec = args.specDecorator ? args.specDecorator(raw) : raw;
      const cell: MatrixCell = { case: spec.caseName, agent: spec.agentId, repeat: spec.repeat };
      const { result, wroteArtifacts } = await runChildTrial({
        spec,
        childEnv,
        timeoutMs: spec.timeoutSec * 1000,
        ...(args.onLog ? { onLog: args.onLog } : {}),
        ...(args.onQna ? { onQna: (entry) => args.onQna!(entry, cell) } : {}),
        ...(args.onMirror ? { onMirror: (data) => args.onMirror!(data, cell) } : {}),
      });
      if (!wroteArtifacts) writeSynthesizedTrial(runDir, result);
      return result;
    }),
  );

  const childResults = await Promise.all(runs);
  trials.push(...childResults);

  // Deterministic order for suite.json / gating.
  trials.sort(
    (a, b) => a.case.localeCompare(b.case) || a.agent.localeCompare(b.agent) || a.repeat - b.repeat,
  );

  const agg = aggregate({
    trials,
    gate: args.gate,
    ...(args.pricing ? { pricing: args.pricing } : {}),
    collectCost: args.collectCost ?? false,
  });

  // Cost warnings (§12, P7): tokens-only for unpriced models; over-budget warns,
  // never aborts.
  for (const model of agg.unpricedModels) {
    args.onLog?.(`cost: no pricing for model "${model}" — reporting tokens-only`);
  }
  if (args.budgetUsd !== undefined) {
    const total = totalUsd(agg.groups);
    if (total > args.budgetUsd) {
      args.onLog?.(
        `cost: suite $${total.toFixed(4)} exceeds budget $${args.budgetUsd.toFixed(4)} (continuing — P7)`,
      );
    }
  }

  const matrixCells: MatrixCell[] = args.matrix.map((m) => ({
    case: m.case,
    agent: m.agent,
    repeat: m.repeat,
  }));

  const suite = suiteResultSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    runDir,
    createdAt: new Date().toISOString(),
    config: args.configSnapshot,
    matrix: matrixCells,
    groups: agg.groups,
    gate: { passed: agg.gate.passed, exitCode: agg.gate.exitCode, failures: agg.gate.failures },
  });

  // suite.json (json reporter) + suite.md (markdown reporter), §14.
  for (const file of renderReports(['json', 'markdown'], { suite, trials })) {
    writeReportFile(runDir, file.filename, file.content);
  }

  return { runDir, trials, gate: agg.gate, exitCode: agg.gate.exitCode };
}

/** Sum priced $ across cost-rollup stat blocks (budget check). */
function totalUsd(groups: StatBlock[]): number {
  let total = 0;
  for (const g of groups) {
    if (g.id !== 'cost-rollup') continue;
    const usd = (g as Record<string, unknown>)['usd'];
    if (typeof usd === 'number') total += usd;
  }
  return total;
}
