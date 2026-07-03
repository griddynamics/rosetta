import type { PartialModelRoles } from '../shared/models';
import {
  DEFAULT_COMBINER,
  DEFAULT_GATE,
  DEFAULT_OUT_DIR,
  DEFAULT_REPEATS,
  DEFAULT_TIMEOUT_SEC,
  defaultConcurrency,
  emptyProvision,
} from './defaults';
import type {
  CaseConfig,
  EvaluatorEntry,
  GateConfig,
  ProvisionItem,
  ProvisionSpec,
  TopLevelConfig,
} from './schema';

/**
 * Precedence merge (D13) + provisioning merge-by-name + setup/teardown CONCAT
 * (D14). The single source of truth for how the four config layers combine:
 *
 *   defaults (code) < top-level config < case config.json < CLI flags
 */

/** CLI-flag overrides (highest precedence). Only fields that override config. */
export interface CliOverrides {
  /** `--agent` (repeatable): limit to these agent ids. */
  agents?: string[];
  /** `--repeats <n>`. */
  repeats?: number;
  /** `--timeout <sec>`. */
  timeoutSec?: number;
  /** `--concurrency <n>` (suite-level). */
  concurrency?: number;
  /** `--out <dir>` (suite-level). */
  out?: string;
  /** `--evaluate` / `--no-evaluate`. */
  evaluate?: boolean;
  /** `--only-evaluator <id>` (repeatable). */
  onlyEvaluator?: string[];
  /** `--skip-evaluator <id>` (repeatable). */
  skipEvaluator?: string[];
  /** `--fast-model` / `--workhorse-model` / `--judge-model`. */
  models?: PartialModelRoles;
  /** `--agent-model <agentId>=<model>` (repeatable): agent CLI model per agent id.
   *  Highest precedence in the D13 agentModel chain (profile < case < CLI, §5.2). */
  agentModels?: Record<string, string>;
  /** `--agent-effort <agentId>=<v>` (repeatable): agent CLI reasoning effort per agent id.
   *  Highest precedence in the D13 agentEffort chain (profile < case < CLI, §5.2). */
  agentEfforts?: Record<string, string>;
}

/** Suite-wide settings resolved once per run. */
export interface ResolvedGlobals {
  out: string;
  concurrency: number;
  gate: GateConfig;
}

/** Per-case resolved settings feeding the trial matrix. */
export interface ResolvedCaseConfig {
  caseName: string;
  agents: string[];
  repeats: number;
  timeoutSec: number;
  provision: ProvisionSpec;
  setup: string[];
  teardown: string[];
  evaluators: EvaluatorEntry[];
  combiner: string;
  /** Model-role overrides ABOVE the per-agent profile rung (case < CLI). The full
   *  chain — top-level < profile < case < CLI — is folded per matrix cell in
   *  `buildMatrix`, because the profile override sits between top-level and case. */
  models: PartialModelRoles;
  /** Per-agent agent-CLI model override (§5.2): case `agentModels` map with CLI
   *  `--agent-model` folded on top (case < CLI). The profile rung below this is applied
   *  at the spec seam (`buildTrialSpecs`), where the resolved `AgentProfile` is known. */
  agentModels: Record<string, string>;
  /** Per-agent agent-CLI reasoning-effort override (§5.2): case `agentEfforts` map with
   *  CLI `--agent-effort` folded on top (case < CLI). The profile rung below this is
   *  applied at the spec seam (`buildTrialSpecs`), like `agentModels`. */
  agentEfforts: Record<string, string>;
  evaluate: boolean;
}

// --- D14: setup/teardown are CONCATENATED (top-level first), NEVER overridden ---
export function concatScripts(topLevel: string[], caseLevel: string[]): string[] {
  return [...topLevel, ...caseLevel];
}

// --- D13: provisioning merges by name (same name overrides, new name adds) ------
function mergeItemsByName(base: ProvisionItem[], override: ProvisionItem[]): ProvisionItem[] {
  const byName = new Map<string, ProvisionItem>();
  for (const item of base) byName.set(item.name, item);
  for (const item of override) byName.set(item.name, item); // same name -> override
  return [...byName.values()];
}

export function mergeProvision(base: ProvisionSpec, override?: ProvisionSpec): ProvisionSpec {
  if (!override) return { mcps: [...base.mcps], plugins: [...base.plugins] };
  return {
    mcps: mergeItemsByName(base.mcps, override.mcps),
    plugins: mergeItemsByName(base.plugins, override.plugins),
  };
}

// --- D13: model roles merge per-role, later layer wins --------------------------
export function mergeModels(...layers: Array<PartialModelRoles | undefined>): PartialModelRoles {
  const out: PartialModelRoles = {};
  for (const layer of layers) {
    if (!layer) continue;
    if (layer.fast !== undefined) out.fast = layer.fast;
    if (layer.workhorse !== undefined) out.workhorse = layer.workhorse;
    if (layer.judge !== undefined) out.judge = layer.judge;
  }
  return out;
}

/** Resolve suite-wide settings: defaults < top-level < CLI. */
export function resolveGlobals(topLevel: TopLevelConfig, cli: CliOverrides = {}): ResolvedGlobals {
  return {
    out: cli.out ?? topLevel.out ?? DEFAULT_OUT_DIR,
    concurrency: cli.concurrency ?? topLevel.concurrency ?? defaultConcurrency(),
    gate: topLevel.gate ?? DEFAULT_GATE,
  };
}

function filterEvaluators(evaluators: EvaluatorEntry[], cli: CliOverrides): EvaluatorEntry[] {
  let out = evaluators;
  if (cli.onlyEvaluator && cli.onlyEvaluator.length > 0) {
    const only = new Set(cli.onlyEvaluator);
    out = out.filter((e) => only.has(e.use));
  }
  if (cli.skipEvaluator && cli.skipEvaluator.length > 0) {
    const skip = new Set(cli.skipEvaluator);
    out = out.filter((e) => !skip.has(e.use));
  }
  return out;
}

export interface ResolveCaseArgs {
  caseName: string;
  topLevel: TopLevelConfig;
  caseConfig: CaseConfig;
  cli?: CliOverrides;
  /** D9: suite mode -> true, inline mode -> false (before CLI --evaluate override). */
  evaluateDefault: boolean;
}

/**
 * Merge one case's config across all layers (D13/D14).
 * Agent selection: the case declares its agents; `--agent` narrows that list
 * (preserving declared order). Missing-profile filtering is a launch concern and
 * is intentionally not applied here.
 */
export function resolveCaseConfig(args: ResolveCaseArgs): ResolvedCaseConfig {
  const { caseName, topLevel, caseConfig, evaluateDefault } = args;
  const cli = args.cli ?? {};

  let agents = caseConfig.agents;
  if (cli.agents && cli.agents.length > 0) {
    const wanted = new Set(cli.agents);
    agents = agents.filter((a) => wanted.has(a));
  }

  const topProvision = topLevel.provision ?? emptyProvision();

  return {
    caseName,
    agents,
    repeats: cli.repeats ?? caseConfig.repeats ?? DEFAULT_REPEATS,
    timeoutSec: cli.timeoutSec ?? caseConfig.timeoutSec ?? DEFAULT_TIMEOUT_SEC,
    provision: mergeProvision(topProvision, caseConfig.provision),
    setup: concatScripts(topLevel.setup, caseConfig.setup),
    teardown: concatScripts(topLevel.teardown, caseConfig.teardown),
    evaluators: filterEvaluators(caseConfig.evaluators, cli),
    combiner: caseConfig.combiner ?? DEFAULT_COMBINER,
    models: mergeModels(caseConfig.models, cli.models),
    // agentModel precedence (§5.2): case map < CLI `--agent-model`, per agent id. The
    // profile rung sits below both and is applied at the spec seam.
    agentModels: { ...(caseConfig.agentModels ?? {}), ...(cli.agentModels ?? {}) },
    // agentEffort precedence (§5.2): case map < CLI `--agent-effort`, per agent id. The
    // profile rung sits below both and is applied at the spec seam (same as agentModels).
    agentEfforts: { ...(caseConfig.agentEfforts ?? {}), ...(cli.agentEfforts ?? {}) },
    evaluate: cli.evaluate ?? evaluateDefault,
  };
}
