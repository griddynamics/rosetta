import { buildEphemeralCase } from '../../cases/ephemeral';
import { discoverCases } from '../../cases/discovery';
import type { CaseDefinition } from '../../cases/types';
import { buildMatrix, type MatrixEntry } from '../../config/matrix';
import { resolveCaseConfig, resolveGlobals, type CliOverrides } from '../../config/merge';
import { loadTopLevelConfig } from '../../config/loader';
import type { PartialModelRoles } from '../../shared/models';
import { ConfigError } from '../../shared/errors';
import { ExitCode, NOT_IMPLEMENTED_EXIT } from '../exit-codes';

/**
 * `curiocity run` (§13, D4). One command; suite vs inline is a filter, not a second
 * code path. M1 resolves config + the trial matrix and, for `--dry-run`, prints
 * them; the actual pipeline (fork/PTY/interact/evaluate) is out of scope and the
 * command exits "not implemented" after resolution.
 */
export interface RunOptions {
  source?: string;
  prompt?: string;
  qna?: string;
  eval?: string;
  src?: string;
  agent?: string[];
  case?: string[];
  repeats?: number;
  concurrency?: number;
  timeout?: number;
  config?: string;
  out?: string;
  evaluate?: boolean;
  dryRun?: boolean;
  keepWorkspace?: boolean;
  mirror?: boolean;
  onlyEvaluator?: string[];
  skipEvaluator?: string[];
  fastModel?: string;
  workhorseModel?: string;
  judgeModel?: string;
}

/** Minimal glob (`*`, `?`) -> RegExp for `--case` filtering. */
function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${pattern}$`);
}

function cliModels(opts: RunOptions): PartialModelRoles {
  const models: PartialModelRoles = {};
  if (opts.fastModel) models.fast = opts.fastModel;
  if (opts.workhorseModel) models.workhorse = opts.workhorseModel;
  if (opts.judgeModel) models.judge = opts.judgeModel;
  return models;
}

function printMatrix(matrix: MatrixEntry[]): void {
  const out = process.stdout;
  out.write(`\nResolved trial matrix (${matrix.length} cell(s)):\n`);
  if (matrix.length === 0) {
    out.write('  (empty)\n');
    return;
  }
  for (const cell of matrix) {
    const models = Object.entries(cell.models)
      .map(([role, model]) => `${role}=${model}`)
      .join(', ');
    out.write(
      `  - ${cell.case} × ${cell.agent} × repeat ${cell.repeat}` +
        `  [timeout=${cell.timeoutSec}s, combiner=${cell.combiner}, evaluate=${cell.evaluate}` +
        (models ? `, models: ${models}` : '') +
        ']\n',
    );
  }
}

export function runRun(opts: RunOptions): number {
  const topLevel = loadTopLevelConfig(opts.config);

  const cli: CliOverrides = {
    ...(opts.agent && opts.agent.length > 0 ? { agents: opts.agent } : {}),
    ...(opts.repeats !== undefined ? { repeats: opts.repeats } : {}),
    ...(opts.timeout !== undefined ? { timeoutSec: opts.timeout } : {}),
    ...(opts.concurrency !== undefined ? { concurrency: opts.concurrency } : {}),
    ...(opts.out !== undefined ? { out: opts.out } : {}),
    ...(opts.evaluate !== undefined ? { evaluate: opts.evaluate } : {}),
    ...(opts.onlyEvaluator ? { onlyEvaluator: opts.onlyEvaluator } : {}),
    ...(opts.skipEvaluator ? { skipEvaluator: opts.skipEvaluator } : {}),
    models: cliModels(opts),
  };

  // --- Mode & case set (D4/D7) ---
  let cases: CaseDefinition[];
  let evaluateDefault: boolean; // D9: suite ON, inline OFF

  if (opts.prompt !== undefined) {
    evaluateDefault = false;
    const agents = opts.agent && opts.agent.length > 0 ? opts.agent : Object.keys(topLevel.codingagents);
    cases = [
      buildEphemeralCase({
        prompt: opts.prompt,
        ...(opts.qna !== undefined ? { qna: opts.qna } : {}),
        ...(opts.eval !== undefined ? { eval: opts.eval } : {}),
        ...(opts.src !== undefined ? { src: opts.src } : {}),
        agents,
        ...(opts.evaluate !== undefined ? { evaluate: opts.evaluate } : {}),
      }),
    ];
  } else if (opts.source !== undefined) {
    evaluateDefault = true;
    const discovered = discoverCases(opts.source);
    for (const s of discovered.skipped) {
      process.stderr.write(`skipping case ${s.name}: ${s.reason}\n`);
    }
    cases = discovered.valid;
    if (opts.case && opts.case.length > 0) {
      const patterns = opts.case.map(globToRegExp);
      cases = cases.filter((c) => patterns.some((re) => re.test(c.name)));
    }
  } else {
    throw new ConfigError('run requires either --source <dir> (suite) or --prompt <file|text> (inline).');
  }

  // --- Resolve config layers + build matrix ---
  const globals = resolveGlobals(topLevel, cli);
  const resolved = cases.map((c) =>
    resolveCaseConfig({
      caseName: c.name,
      topLevel,
      caseConfig: c.config,
      cli,
      evaluateDefault,
    }),
  );
  const matrix = buildMatrix({ topLevel, cases: resolved });

  if (opts.dryRun) {
    const out = process.stdout;
    out.write('curiocity run --dry-run\n');
    out.write(`\nresolved settings:\n`);
    out.write(`  out:         ${globals.out}\n`);
    out.write(`  concurrency: ${globals.concurrency}\n`);
    out.write(`  gate:        minScore=${globals.gate.minScore}, minPassRate=${globals.gate.minPassRate}, maxStddev=${globals.gate.maxStddev}\n`);
    out.write(`  cases:       ${resolved.length}\n`);
    printMatrix(matrix);
    if (matrix.length === 0) {
      process.stderr.write('\nerror: no runnable trials in the resolved matrix.\n');
      return ExitCode.CONFIG_ERROR;
    }
    return ExitCode.OK;
  }

  if (matrix.length === 0) {
    process.stderr.write('error: no runnable trials in the resolved matrix.\n');
    return ExitCode.CONFIG_ERROR;
  }

  process.stderr.write(
    `not implemented (M1): config + matrix (${matrix.length} cell(s)) resolved, ` +
      'but the run pipeline (fork/PTY/interact/evaluate) is not part of this milestone. ' +
      'Use --dry-run to inspect the matrix.\n',
  );
  return NOT_IMPLEMENTED_EXIT;
}
