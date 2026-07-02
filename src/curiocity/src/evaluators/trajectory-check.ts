import { z } from 'zod';
import { ConfigError } from '../shared/errors';
import type { EvalContext, EvalResult, Evaluator } from './types';

/**
 * `trajectory-check` (§11): assert that `tool_call` events matching a pattern
 * occurred — the "did our plugin actually run" gate. `toolPattern` is either a
 * single regex OR a per-agent map (tool vocabularies differ across agents); the map
 * is resolved by the trial's `agentId`.
 */
export const trajectoryCheckParamsSchema = z.object({
  toolPattern: z.union([z.string().min(1), z.record(z.string().min(1))]),
});

/** Resolve the effective regex source for this agent (per-agent map or single). */
export function resolveToolPattern(
  toolPattern: string | Record<string, string>,
  agentId: string,
): string {
  if (typeof toolPattern === 'string') return toolPattern;
  const pattern = toolPattern[agentId];
  if (pattern === undefined) {
    throw new ConfigError(
      `trajectory-check: no toolPattern configured for agent "${agentId}". ` +
        `Configured agents: ${Object.keys(toolPattern).join(', ') || '(none)'}.`,
    );
  }
  return pattern;
}

export const trajectoryCheck: Evaluator = {
  id: 'trajectory-check',
  paramsSchema: trajectoryCheckParamsSchema,

  async evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult> {
    const p = trajectoryCheckParamsSchema.parse(params);
    const source = resolveToolPattern(p.toolPattern, ctx.agentId);
    const re = new RegExp(source);

    const matched = ctx.events.filter(
      (e) => e.kind === 'tool_call' && e.name !== undefined && re.test(e.name),
    );
    const pass = matched.length > 0;
    return {
      pass,
      gate: false,
      details: pass
        ? `matched ${matched.length} tool_call(s) against /${source}/ (e.g. ${matched[0]!.name})`
        : `no tool_call matched /${source}/ for agent "${ctx.agentId}"`,
    };
  },
};
