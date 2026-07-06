import { agentRegistry } from '../agents';
import { mergeModels } from '../config/merge';
import { agentProfileSchema, type AgentProfile, type TopLevelConfig } from '../config/schema';
import { ConfigError } from '../shared/errors';

/**
 * Agent-profile resolution — the D13 defaults layer wiring (§5.2). Lives at the
 * orchestrator/spec seam (NOT in `config/`, which never knows the adapter registry)
 * because the built-in `defaultProfile` is owned by the adapter, not by config.
 *
 * Precedence, merged PER-FIELD (later wins):
 *
 *   adapter registry `defaultProfile`  <  topLevel.codingagents[agent]
 *
 * (The per-case / CLI rungs above this apply only to `models`, which is folded
 * separately per matrix cell in `buildMatrix` — top-level < profile < case < CLI.
 * We keep that rung order here: the profile's `models` = defaultProfile.models <
 * config.models, and that resolved value continues to sit at the profile rung.)
 *
 * Returns `null` when the agent has neither a registry default nor a config entry —
 * the cell then stays `skipped` with the existing reason. A partial config entry
 * for an agent whose merged result is still incomplete is a genuine ConfigError.
 */
export function resolveAgentProfile(agentId: string, topLevel: TopLevelConfig): AgentProfile | null {
  const base: AgentProfile | undefined = agentRegistry.has(agentId)
    ? agentRegistry.get(agentId).defaultProfile
    : undefined;
  const override = topLevel.codingagents[agentId];

  if (!base && !override) return null;

  // Per-field merge: start from the default, then overlay each field the config set.
  const merged: Record<string, unknown> = { ...(base ?? {}) };
  if (override) {
    for (const [key, value] of Object.entries(override)) {
      if (value !== undefined) merged[key] = value;
    }
    // `models` keeps its existing per-role rung order (default < config), not a
    // whole-field replace, so a config that overrides only `fast` still inherits
    // the default's `workhorse`/`judge`.
    if (base?.models || override.models) {
      merged['models'] = mergeModels(base?.models, override.models);
    }
  }

  const parsed = agentProfileSchema.safeParse(merged);
  if (!parsed.success) {
    throw new ConfigError(
      `agent "${agentId}": profile is incomplete after merging the built-in default ` +
        `with top-level config:\n${parsed.error.message}`,
    );
  }
  return parsed.data;
}
