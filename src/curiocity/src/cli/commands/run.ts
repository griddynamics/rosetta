import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildEphemeralCase } from '../../cases/ephemeral';
import { discoverCases } from '../../cases/discovery';
import type { CaseDefinition } from '../../cases/types';
import { buildMatrix, type MatrixEntry } from '../../config/matrix';
import { resolveCaseConfig, resolveGlobals, type CliOverrides } from '../../config/merge';
import { DEFAULT_CONFIG_PATH, loadTopLevelConfig } from '../../config/loader';
import { runSuite } from '../../orchestrator/run';
import { preflightAgentHomes } from '../../orchestrator/preflight';
import { resolveKeys } from '../../llm/keys';
import { evaluatorRegistry } from '../../evaluators';
import { evaluatorEntrySchema } from '../../config/schema';
import type { ResolvedCaseConfig } from '../../config/merge';
import type { PartialModelRoles } from '../../shared/models';
import { ConfigError } from '../../shared/errors';
import { ExitCode } from '../exit-codes';

/**
 * `curiocity run` (§13, D4). One command; suite vs inline is a filter, not a second
 * code path. Resolves config + the trial matrix, then (unless `--dry-run`) runs the
 * bounded pool via `runSuite` — fork/PTY/interact/collect + gating — and returns the
 * suite exit code. Evaluators + the LLM judge are the M3 layer (currently skipped).
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
  collectCost?: boolean;
  dryRun?: boolean;
  keepWorkspace?: boolean;
  mirror?: boolean;
  onlyEvaluator?: string[];
  skipEvaluator?: string[];
  fastModel?: string;
  workhorseModel?: string;
  judgeModel?: string;
  agentModel?: string[];
  agentEffort?: string[];
}

/**
 * Parse repeatable `--agent-model <agentId>=<model>` flags into a map. A malformed
 * entry (no `=`, empty id/model) is a `ConfigError` (exit 2) rather than a silent drop.
 */
export function parseAgentModels(raw: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of raw ?? []) {
    const eq = item.indexOf('=');
    const id = eq >= 0 ? item.slice(0, eq).trim() : '';
    const model = eq >= 0 ? item.slice(eq + 1).trim() : '';
    if (id === '' || model === '') {
      throw new ConfigError(`--agent-model must be "<agentId>=<model>", got "${item}".`);
    }
    out[id] = model;
  }
  return out;
}

/**
 * Parse repeatable `--agent-effort <agentId>=<v>` flags into a map (§5.2). Same shape
 * and error handling as `parseAgentModels`: a malformed entry is a `ConfigError` (exit 2).
 */
export function parseAgentEfforts(raw: string[] | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of raw ?? []) {
    const eq = item.indexOf('=');
    const id = eq >= 0 ? item.slice(0, eq).trim() : '';
    const effort = eq >= 0 ? item.slice(eq + 1).trim() : '';
    if (id === '' || effort === '') {
      throw new ConfigError(`--agent-effort must be "<agentId>=<effort>", got "${item}".`);
    }
    out[id] = effort;
  }
  return out;
}

/** Minimal glob (`*`, `?`) -> RegExp for `--case` filtering. */
function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${pattern}$`);
}

/**
 * Validate every evaluator entry's params against its `paramsSchema` at config load
 * (§5.4). Unknown evaluator ids and bad params fail fast as `ConfigError` (exit 2).
 */
function validateEvaluatorParams(resolved: ResolvedCaseConfig[]): void {
  for (const c of resolved) {
    for (const raw of c.evaluators) {
      const entry = evaluatorEntrySchema.parse(raw);
      const { use, gate: _gate, weight: _weight, ...params } = entry;
      let paramsSchema;
      try {
        paramsSchema = evaluatorRegistry.get(use).paramsSchema;
      } catch (err) {
        throw new ConfigError(`case "${c.caseName}": ${(err as Error).message}`);
      }
      const res = paramsSchema.safeParse(params);
      if (!res.success) {
        throw new ConfigError(
          `case "${c.caseName}" evaluator "${use}": invalid params:\n${res.error.message}`,
        );
      }
    }
  }
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

export async function runRun(opts: RunOptions): Promise<number> {
  const topLevel = loadTopLevelConfig(opts.config);
  const configPath = opts.config ? resolve(opts.config) : resolve(DEFAULT_CONFIG_PATH);
  const configDir = existsSync(configPath) ? dirname(configPath) : process.cwd();

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
    ...(() => {
      const agentModels = parseAgentModels(opts.agentModel);
      return Object.keys(agentModels).length > 0 ? { agentModels } : {};
    })(),
    ...(() => {
      const agentEfforts = parseAgentEfforts(opts.agentEffort);
      return Object.keys(agentEfforts).length > 0 ? { agentEfforts } : {};
    })(),
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
  // Evaluator params are validated at config load (§5.4), before anything runs.
  validateEvaluatorParams(resolved);

  const matrix = buildMatrix({ topLevel, cases: resolved });

  // D9: suite → cost ON, inline → OFF (same default as evaluate); CLI overrides.
  const collectCost = opts.collectCost ?? evaluateDefault;

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

  // P10 preflight (agent-home writeability): fail fast before spawning anything, so a
  // sandboxed harness (which silently produces zero transcripts) is caught up front.
  // Skipped for mock-only matrices.
  const pre = preflightAgentHomes(
    matrix.map((m) => m.agent),
    topLevel,
  );
  if (!pre.ok) {
    process.stderr.write('error: P10 preflight failed:\n');
    for (const e of pre.errors) process.stderr.write(`  - ${e}\n`);
    return ExitCode.CONFIG_ERROR;
  }

  // Resolve LLM keys ONCE at startup (§4/§12): CURIOCITY_<PROVIDER>_KEY → provider
  // standard var → cwd .env. Held in memory, shipped over IPC, never logged.
  const keys = resolveKeys();

  const out = process.stdout;
  const suite = await runSuite({
    topLevel,
    cases,
    resolvedCases: resolved,
    matrix,
    out: globals.out,
    concurrency: globals.concurrency,
    gate: globals.gate,
    collectCost,
    ...(topLevel.pricing ? { pricing: topLevel.pricing } : {}),
    ...(topLevel.budgetUsd !== undefined ? { budgetUsd: topLevel.budgetUsd } : {}),
    keys,
    configDir,
    keepWorkspace: opts.keepWorkspace === true,
    mirror: opts.mirror === true,
    // Snapshot pricing too so `report` can recompute $ retroactively without --config.
    configSnapshot: { globals, matrix, ...(topLevel.pricing ? { pricing: topLevel.pricing } : {}) },
    onLog: (msg) => process.stderr.write(`${msg}\n`),
    ...(opts.mirror ? { onMirror: (data: string) => out.write(data) } : {}),
  });

  out.write(`\nrun complete: ${suite.runDir}\n`);
  const counts = new Map<string, number>();
  for (const t of suite.trials) counts.set(t.status, (counts.get(t.status) ?? 0) + 1);
  for (const [status, n] of [...counts.entries()].sort()) out.write(`  ${status}: ${n}\n`);
  if (suite.gate.failures.length > 0) {
    out.write('\ngate failures:\n');
    for (const f of suite.gate.failures) out.write(`  - ${f}\n`);
  }
  out.write(`\nexit code: ${suite.exitCode}\n`);
  return suite.exitCode;
}
