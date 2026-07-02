import { minimatch } from './minimatch';
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
 */
export function filterAgentEnv(
  base: Record<string, string>,
  envRemove: string[],
  envSet: Record<string, string> | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(base)) {
    if (envRemove.some((pattern) => minimatch(key, pattern))) continue;
    out[key] = value;
  }
  if (envSet) {
    for (const [key, value] of Object.entries(envSet)) out[key] = value;
  }
  return out;
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
