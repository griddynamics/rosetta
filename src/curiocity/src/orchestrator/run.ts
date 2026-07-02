import pLimit from 'p-limit';
import type { CaseDefinition } from '../cases/types';
import type { MatrixEntry } from '../config/matrix';
import type { ResolvedCaseConfig } from '../config/merge';
import type { GateConfig, TopLevelConfig } from '../config/schema';
import type { TrialSpec } from '../shared/ipc';
import type { MatrixCell } from '../shared/matrix';
import type { QnaEntry } from '../shared/trajectory';
import { SCHEMA_VERSION, trialResultSchema, type TrialResult } from '../results/schema';
import { createRunDir, writeSuite, writeTrial } from '../results/store';
import { runChildTrial, writeSynthesizedTrial } from './child';
import { buildChildEnv } from './env';
import { gatekeeper, type GateOutcome } from './gatekeeper';
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
  configDir: string;
  keepWorkspace: boolean;
  mirror: boolean;
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

  const gate = gatekeeper(trials, args.gate);

  const matrixCells: MatrixCell[] = args.matrix.map((m) => ({
    case: m.case,
    agent: m.agent,
    repeat: m.repeat,
  }));

  writeSuite(runDir, {
    schemaVersion: SCHEMA_VERSION,
    runDir,
    createdAt: new Date().toISOString(),
    config: args.configSnapshot,
    matrix: matrixCells,
    groups: [],
    gate: { passed: gate.passed, exitCode: gate.exitCode, failures: gate.failures },
  });

  return { runDir, trials, gate, exitCode: gate.exitCode };
}
