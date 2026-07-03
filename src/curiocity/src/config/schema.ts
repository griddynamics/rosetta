import { z } from 'zod';
import { modelRolesSchema, partialModelRolesSchema } from '../shared/models';

/**
 * zod schemas for all configuration surfaces (§5.2, §9). Everything is validated
 * at boundaries; nothing downstream trusts raw JSON.
 */

// --- AgentProfile (§5.2) -----------------------------------------------------

export const strategySchema = z.enum(['json-only', 'screen-reader', 'hybrid']);

export const submitSchema = z.enum(['enter', 'paste+enter', 'type+enter']);

/** Deterministic startup-dialog rule: screen `pattern` (regex) -> `send` keystrokes (§6). */
export const dialogRuleSchema = z.object({
  pattern: z.string().min(1),
  send: z.string(),
});
export type DialogRule = z.infer<typeof dialogRuleSchema>;

export const readinessSchema = z.object({
  bannerPattern: z.string().optional(),
  quietMs: z.number().int().nonnegative(),
});

export const stallSchema = z.object({
  quietMs: z.number().int().nonnegative(),
});

export const freezeSchema = z.object({
  windowMs: z.number().int().positive().default(10_000),
});

export const agentProfileSchema = z.object({
  adapter: z.string().min(1), // registry id: 'claude-code' | 'codex' | 'mock'
  command: z.string().min(1),
  args: z.array(z.string()),
  envRemove: z.array(z.string()).default([]),
  envSet: z.record(z.string()).optional(),
  /** Model the agent CLI itself runs (§5.2): claude renders `--model <id>`, codex
   *  `-m <id>`, mock accepts+records as a no-op. D13-mergeable; per-case override via
   *  the case `agentModels` map and CLI `--agent-model <agentId>=<model>` sit above it. */
  agentModel: z.string().min(1).optional(),
  /** Reasoning effort the agent CLI runs at (§5.2) — a SEPARATE dimension from the model,
   *  same D13/agentEfforts-map/CLI plumbing as `agentModel`. Rendered per adapter: claude
   *  `--effort <v>`, codex `-c model_reasoning_effort="<v>"`, mock accepts+records as a
   *  no-op. An adapter with no effort surface warns + omits (never fails the trial). */
  agentEffort: z.string().min(1).optional(),
  strategy: strategySchema,
  readiness: readinessSchema,
  submit: submitSchema,
  stall: stallSchema,
  freeze: freezeSchema.default({ windowMs: 10_000 }),
  dialogPatterns: z.array(dialogRuleSchema).optional(),
  models: partialModelRolesSchema.optional(),
});
export type AgentProfile = z.infer<typeof agentProfileSchema>;

/**
 * Config `codingagents` OVERRIDE layer (D13, §5.2): every field is optional. An
 * adapter's registry `defaultProfile` supplies the base and this partial overrides
 * it per-field; the merge happens at the orchestrator/spec seam (not here), which
 * then re-validates the result with `agentProfileSchema`. A full profile still
 * satisfies this schema (all fields present), so existing configs are unaffected;
 * omitting fields simply inherits them from the adapter default.
 */
export const agentProfileOverrideSchema = agentProfileSchema.partial();
export type AgentProfileOverride = z.infer<typeof agentProfileOverrideSchema>;

// --- Provisioning (§9, D13, P11) ---------------------------------------------
// Items are identified by `name`; extra fields (command, args, path, …) pass
// through. Per-case provisioning merges by name onto the top-level defaults.
export const provisionItemSchema = z.object({ name: z.string().min(1) }).passthrough();
export type ProvisionItem = z.infer<typeof provisionItemSchema>;

export const provisionSchema = z.object({
  mcps: z.array(provisionItemSchema).default([]),
  plugins: z.array(provisionItemSchema).default([]),
});
export type ProvisionSpec = z.infer<typeof provisionSchema>;

// --- Pricing & gate (§9, §12) ------------------------------------------------
export const pricingEntrySchema = z.object({
  inputPer1M: z.number().nonnegative(),
  outputPer1M: z.number().nonnegative(),
  /** Optional tiered rates (§12). Absent cache rates fall back to `inputPer1M`
   *  (no discount); absent `reasoningPer1M` falls back to `outputPer1M`. */
  cacheWritePer1M: z.number().nonnegative().optional(),
  cacheReadPer1M: z.number().nonnegative().optional(),
  reasoningPer1M: z.number().nonnegative().optional(),
});
export const pricingSchema = z.record(pricingEntrySchema);
export type PricingMap = z.infer<typeof pricingSchema>;

export const gateSchema = z.object({
  minScore: z.number(),
  minPassRate: z.number().min(0).max(1),
  maxStddev: z.number().nonnegative(),
});
export type GateConfig = z.infer<typeof gateSchema>;

// --- Evaluator config entry (§9, §11) ----------------------------------------
// The evaluator layer (out of scope for M1) owns per-evaluator param schemas; at
// the config layer we only require `use`, with the rest passing through.
export const evaluatorEntrySchema = z
  .object({
    use: z.string().min(1),
    gate: z.boolean().optional(),
    weight: z.number().optional(),
  })
  .passthrough();
export type EvaluatorEntry = z.infer<typeof evaluatorEntrySchema>;

// --- Top-level config (§9) ---------------------------------------------------
// `models` is optional so that `validate` and `run --dry-run` work with no config
// file present; a real (LLM-executing) run requires it in a later milestone.
export const topLevelConfigSchema = z.object({
  // Partial overrides (D13): each entry merges per-field OVER the adapter's built-in
  // `defaultProfile` at the orchestrator/spec seam. A full profile still validates.
  codingagents: z.record(agentProfileOverrideSchema).default({}),
  models: modelRolesSchema.optional(),
  pricing: pricingSchema.optional(),
  provision: provisionSchema.optional(),
  setup: z.array(z.string()).default([]),
  teardown: z.array(z.string()).default([]),
  gate: gateSchema.optional(),
  concurrency: z.number().int().positive().optional(),
  out: z.string().optional(),
  /** Optional suite $ budget (§12): over it → warn once, never abort (P7). */
  budgetUsd: z.number().nonnegative().optional(),
});
export type TopLevelConfig = z.infer<typeof topLevelConfigSchema>;

// --- Case config.json (§9) ---------------------------------------------------
export const caseConfigSchema = z.object({
  agents: z.array(z.string().min(1)).min(1),
  timeoutSec: z.number().int().positive().optional(),
  repeats: z.number().int().positive().optional(),
  provision: provisionSchema.optional(),
  setup: z.array(z.string()).default([]),
  teardown: z.array(z.string()).default([]),
  evaluators: z.array(evaluatorEntrySchema).default([]),
  combiner: z.string().optional(),
  models: partialModelRolesSchema.optional(),
  /** Per-agent agent-CLI model override (§5.2): `{ "<agentId>": "<model>" }`. Overrides
   *  the profile's `agentModel`; CLI `--agent-model` overrides this in turn (profile <
   *  case < CLI, D13). */
  agentModels: z.record(z.string()).optional(),
  /** Per-agent agent-CLI reasoning-effort override (§5.2): `{ "<agentId>": "<effort>" }`.
   *  Overrides the profile's `agentEffort`; CLI `--agent-effort` overrides this in turn
   *  (profile < case < CLI, D13) — same seam as `agentModels`. */
  agentEfforts: z.record(z.string()).optional(),
});
export type CaseConfig = z.infer<typeof caseConfigSchema>;
