import { isAbsolute, resolve } from 'node:path';
import type { CaseDefinition } from '../cases/types';
import type { MatrixEntry } from '../config/matrix';
import { mergeModels, type ResolvedCaseConfig } from '../config/merge';
import type { TopLevelConfig } from '../config/schema';
import { trialSpecSchema, type TrialSpec } from '../shared/ipc';
import type { MatrixCell } from '../shared/matrix';
import { resolveAgentProfile } from './profile';

/**
 * Build one `TrialSpec` per matrix cell (§4). Script paths resolve relative to the
 * file that declared them (§7 step 2): top-level scripts vs `configDir`, case
 * scripts vs the case folder. The effective agent profile is resolved via the D13
 * defaults layer (`resolveAgentProfile`): adapter built-in default < top-level
 * config, per-field. A cell whose agent has NEITHER a built-in default NOR a config
 * entry is not runnable → reported as a `skipped` cell (status `skipped`, not an
 * infra error).
 *
 * (m5-review R1) `TrialSpec.models` precedence is documented (`shared/ipc.ts`) as
 * "top-level < profile < case < CLI", but `MatrixEntry.models` (`config/matrix.ts`)
 * is built WITHOUT the adapter registry's `defaultProfile.models` — `config/`
 * cannot import the adapter registry (§3), so that rung isn't reachable there. It
 * IS reachable here, after `resolveAgentProfile` has already folded
 * `defaultProfile.models < topLevel.codingagents[agent].models` into `profile.models`.
 * Re-merging `profile.models` under `entry.models` (whose case/CLI rungs must keep
 * outranking it) restores the full documented chain for every role independently.
 * Currently latent (neither built-in default profile sets `models`), but a future
 * adapter default would otherwise be silently dropped at exactly this seam.
 */

export interface BuildSpecsArgs {
  topLevel: TopLevelConfig;
  cases: CaseDefinition[];
  resolvedCases: ResolvedCaseConfig[];
  matrix: MatrixEntry[];
  runDir: string;
  /** Directory of the top-level config file (base for its script paths). */
  configDir: string;
  keepWorkspace: boolean;
  mirror: boolean;
  /** Provider → api key (resolved once at startup, §4/§12); rides TrialSpec over IPC. */
  keys: Record<string, string>;
}

export interface SkippedCell {
  cell: MatrixCell;
  reason: string;
}

export interface BuiltSpecs {
  specs: TrialSpec[];
  skipped: SkippedCell[];
}

function resolveScript(script: string, base: string): string {
  return isAbsolute(script) ? script : resolve(base, script);
}

export function buildTrialSpecs(args: BuildSpecsArgs): BuiltSpecs {
  const specs: TrialSpec[] = [];
  const skipped: SkippedCell[] = [];

  const caseByName = new Map(args.cases.map((c) => [c.name, c]));
  const resolvedByName = new Map(args.resolvedCases.map((r) => [r.caseName, r]));

  for (const entry of args.matrix) {
    const cell: MatrixCell = { case: entry.case, agent: entry.agent, repeat: entry.repeat };
    const def = caseByName.get(entry.case);
    const resolved = resolvedByName.get(entry.case);

    if (!def || !resolved) {
      skipped.push({ cell, reason: `case "${entry.case}" not found` });
      continue;
    }
    // D13 defaults layer: adapter built-in default < top-level config (per-field).
    let profile = resolveAgentProfile(entry.agent, args.topLevel);
    if (!profile) {
      skipped.push({
        cell,
        reason: `no agent profile for "${entry.agent}" (no built-in default and none configured)`,
      });
      continue;
    }
    // agentModel precedence (§5.2, D13): profile (adapter default < top-level config,
    // already folded into `profile.agentModel` by `resolveAgentProfile`) < case
    // `agentModels[agent]` < CLI `--agent-model` (both folded into
    // `resolved.agentModels[agent]`). The resolved requested model overrides the
    // profile rung; it flows to the adapter's `buildLaunch` (rendered as `--model`/`-m`)
    // and is recorded as `agentModelRequested` in trial.json.
    const requestedModel = resolved.agentModels[entry.agent] ?? profile.agentModel;
    if (requestedModel !== undefined && requestedModel !== profile.agentModel) {
      profile = { ...profile, agentModel: requestedModel };
    }
    // agentEffort precedence (§5.2, D13): the SAME seam as agentModel — profile
    // (adapter default < top-level config) < case `agentEfforts[agent]` < CLI
    // `--agent-effort` (both folded into `resolved.agentEfforts[agent]`). Rendered by
    // the adapter's `buildLaunch` and recorded as `agentEffort.requested` in trial.json.
    const requestedEffort = resolved.agentEfforts[entry.agent] ?? profile.agentEffort;
    if (requestedEffort !== undefined && requestedEffort !== profile.agentEffort) {
      profile = { ...profile, agentEffort: requestedEffort };
    }

    const topSetup = args.topLevel.setup.map((s) => resolveScript(s, args.configDir));
    const topTeardown = args.topLevel.teardown.map((s) => resolveScript(s, args.configDir));
    const caseBase = def.dir ?? args.configDir;
    const caseSetup = def.config.setup.map((s) => resolveScript(s, caseBase));
    const caseTeardown = def.config.teardown.map((s) => resolveScript(s, caseBase));

    const spec = trialSpecSchema.parse({
      agentId: entry.agent,
      caseName: entry.case,
      repeat: entry.repeat,
      timeoutSec: entry.timeoutSec,
      prompt: def.prompt,
      qna: def.qna,
      ...(resolved.evaluate && def.evaluation !== undefined ? { evaluation: def.evaluation } : {}),
      // registry-default < top-level < case < CLI, per role (see the header note).
      models: mergeModels(profile.models, entry.models),
      keys: args.keys,
      provision: resolved.provision,
      setup: [...topSetup, ...caseSetup],
      teardown: [...topTeardown, ...caseTeardown],
      evaluators: resolved.evaluators,
      combiner: resolved.combiner,
      ...(def.dir !== undefined ? { caseDir: def.dir } : {}),
      ...(def.srcZipPath !== undefined ? { srcZipPath: def.srcZipPath } : {}),
      ...(def.srcDir !== undefined ? { srcDir: def.srcDir } : {}),
      profile,
      adapter: profile.adapter,
      runDir: args.runDir,
      keepWorkspace: args.keepWorkspace,
      mirror: args.mirror,
      evaluate: resolved.evaluate,
    });
    specs.push(spec);
  }

  return { specs, skipped };
}
