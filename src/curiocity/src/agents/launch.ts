import { accessSync, constants, statSync } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';
import { minimatch } from './minimatch';
import { AGENT_API_KEY_ALLOWLIST } from '../orchestrator/env';
import type { AgentAdapter, CanonicalHookSpec, LaunchFragment, LaunchPlan, TrialContext } from './types';

/**
 * Core-owned launch-pipeline glue (§5.2). Template substitution, env filtering
 * (`envRemove` globs + `envSet`), and the ordered merge of the three render
 * fragments into a single `LaunchPlan`. The standard `prepare()` for every adapter
 * is just `composeLaunchPlan(this, ctx, hookSpec)` — the flow is identical; only
 * the per-step rendering is agent-specific.
 */

/** Substitute `{prompt} {sessionId} {workspace} {ctrlDir}` (§5.2 template vars). */
export function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : whole,
  );
}

export function templateVars(ctx: TrialContext): Record<string, string> {
  return {
    prompt: ctx.prompt,
    sessionId: ctx.sessionId,
    workspace: ctx.workspace,
    ctrlDir: ctx.ctrlDir,
  };
}

/**
 * Build the agent PTY env from a base env by applying `envRemove` glob patterns
 * (stripped) then `envSet` (added/overridden). This is the ONLY env the agent
 * process sees; the base is already the Curion's allow-listed env (§4), so secrets
 * cannot reach the agent even by accident.
 *
 * Keys in `AGENT_API_KEY_ALLOWLIST` (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`) are always
 * kept, overriding any `envRemove` pattern that would otherwise strip them — this is
 * what lets the agent authenticate via a forwarded key in CI, where there is no
 * interactive OAuth session.
 */
export function filterAgentEnv(
  base: Record<string, string>,
  envRemove: string[],
  envSet: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (AGENT_API_KEY_ALLOWLIST.has(key)) {
      out[key] = value;
      continue;
    }
    if (envRemove.some((pattern) => minimatch(key, pattern))) continue;
    out[key] = value;
  }
  if (envSet) {
    for (const [key, value] of Object.entries(envSet)) out[key] = value;
  }
  return out;
}

/** Is `p` an existing regular (or symlinked) file that is executable by us? */
function isExecutableFile(p: string): boolean {
  try {
    if (!statSync(p).isFile()) return false;
    accessSync(p, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Launch preflight (§7 step 4): resolve the agent `command` to an executable path
 * BEFORE spawning the PTY, using the same PATH the agent process will see. A command
 * with a path separator is checked as a literal path; a bare name is looked up on
 * `env.PATH`. Returns the resolved path, or `null` when unresolvable.
 *
 * Rationale: `node-pty` does NOT throw for a missing binary — it spawns a PTY that
 * immediately exits nonzero, which the interaction engine would otherwise report as
 * `agent-crash`. Resolving up front lets the lifecycle report the accurate
 * `launch-error` status (the agent never launched) instead.
 */
export function resolveCommand(command: string, env: Record<string, string>): string | null {
  // Explicit path (absolute or containing a separator): check it literally.
  if (isAbsolute(command) || command.includes('/') || command.includes('\\')) {
    return isExecutableFile(command) ? command : null;
  }
  // Bare name: search PATH in order.
  const pathVar = env.PATH ?? env.Path ?? '';
  for (const dir of pathVar.split(delimiter)) {
    if (dir === '') continue;
    const candidate = join(dir, command);
    if (isExecutableFile(candidate)) return candidate;
  }
  return null;
}

function mergeFragments(command: string, fragments: LaunchFragment[]): LaunchPlan {
  const plan: LaunchPlan = { command, args: [], env: {}, files: [], commands: [] };
  for (const f of fragments) {
    if (f.args) plan.args.push(...f.args);
    if (f.env) Object.assign(plan.env, f.env);
    if (f.files) plan.files.push(...f.files);
    if (f.commands) plan.commands.push(...f.commands);
  }
  return plan;
}

/**
 * The standard `prepare()` body (§5.2): renderHooks → renderProvisioning →
 * buildLaunch, merged in that order. The command is the templated `profile.command`.
 */
export async function composeLaunchPlan(
  adapter: AgentAdapter,
  ctx: TrialContext,
  hookSpec: CanonicalHookSpec,
): Promise<LaunchPlan> {
  const hooks = await adapter.renderHooks(hookSpec, ctx);
  const provisioning = await adapter.renderProvisioning(ctx.provision, ctx);
  const launch = adapter.buildLaunch(ctx);
  const command = applyTemplate(ctx.profile.command, templateVars(ctx));
  return mergeFragments(command, [hooks, provisioning, launch]);
}
