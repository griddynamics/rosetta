import { z } from 'zod';
import { matrixCellSchema } from '../shared/matrix';
import { qnaEntrySchema, usageSchema } from '../shared/trajectory';

/**
 * Results schemas (§14). `trial.json` and `suite.json` both carry `schemaVersion`
 * so `curiocity report` can load older runs. `report` recomputes stats + reporters
 * + gate from stored `TrialResult`s — it never re-runs agents/evaluators (D8).
 */
export const SCHEMA_VERSION = 2;

/** Trial statuses (§7). Only `passed`/`failed` carry verdicts; error statuses are
 *  reported separately and never enter score statistics (D14). */
export const trialStatusSchema = z.enum([
  'passed',
  'failed',
  'setup-error',
  'launch-error',
  'timeout',
  'agent-hung',
  'agent-crash',
  'skipped',
]);
export type TrialStatus = z.infer<typeof trialStatusSchema>;

/** One evaluator's result (mirrors `EvalResult`, §5.4). */
export const evalResultSchema = z.object({
  id: z.string(),
  pass: z.boolean(),
  score: z.number().optional(),
  gate: z.boolean(),
  details: z.string(),
  cost: usageSchema.optional(),
});
export type EvalResultRecord = z.infer<typeof evalResultSchema>;

/** Per-trial verdict from the combiner (§5.4). */
export const verdictSchema = z.object({
  pass: z.boolean(),
  score: z.number(),
  rationale: z.string(),
});
export type Verdict = z.infer<typeof verdictSchema>;

/** Itemized cost block (§12): agent tokens vs harness fast/workhorse/judge, each a
 *  full-breakdown usage record, keyed to a concrete `provider/model` id. */
export const costBlockSchema = z
  .object({
    agent: usageSchema.optional(),
    fast: usageSchema.optional(),
    workhorse: usageSchema.optional(),
    judge: usageSchema.optional(),
    usd: z.number().optional(),
    /** Resolved model string per source (`agent` + each harness role) — the model is
     *  the unit of account for $/token/time itemization (§12). */
    models: z.record(z.string()).optional(),
  })
  .passthrough();

/** One turn's raw timeline (§12): submitted → Stop signal → harness reply typed. */
export const turnTimingSchema = z.object({
  turnStart: z.number().nonnegative(),
  stopAt: z.number().nonnegative(),
  reactionDoneAt: z.number().nonnegative(),
});
export type TurnTiming = z.infer<typeof turnTimingSchema>;

/**
 * Full time decomposition (§12) — every leg MEASURED, not derived by subtraction.
 * Per-phase walls + a per-turn timeline; `agentPureMs` is measured from the timeline
 * (Σ stopAt − turnStart), and the harness-reaction time splits into per-model LLM time
 * vs overhead. Persisted raw so future stats can re-derive (D8). All fields optional so
 * `report` on a pre-bump run (which had only totalMs/agentMs/harnessLlmMs/checksMs)
 * still validates — missing legs render as zeros.
 */
export const timeBlockSchema = z
  .object({
    totalMs: z.number().nonnegative().optional(),
    // Per-phase walls (§7 lifecycle steps).
    workspaceMs: z.number().nonnegative().optional(),
    setupMs: z.number().nonnegative().optional(),
    provisionMs: z.number().nonnegative().optional(),
    launchMs: z.number().nonnegative().optional(),
    interactMs: z.number().nonnegative().optional(),
    collectMs: z.number().nonnegative().optional(),
    evaluateMs: z.number().nonnegative().optional(),
    teardownMs: z.number().nonnegative().optional(),
    // Interact decomposition (measured from the per-turn timeline).
    agentPureMs: z.number().nonnegative().optional(),
    harnessReactMs: z.number().nonnegative().optional(),
    harnessLlmMs: z.number().nonnegative().optional(),
    harnessOverheadMs: z.number().nonnegative().optional(),
    /** Per-model harness LLM wall-clock (ms) — same per-model keying as tokens/$. */
    harnessLlmByModel: z.record(z.number().nonnegative()).optional(),
    // Evaluate decomposition.
    checksMs: z.number().nonnegative().optional(),
    judgeLlmMs: z.number().nonnegative().optional(),
    /** Legacy (pre-bump) alias for agentPureMs; kept for backward-compat reads. */
    agentMs: z.number().nonnegative().optional(),
    /** Raw per-turn timeline (§12) — cheap to store, lets future stats re-derive. */
    timeline: z.array(turnTimingSchema).optional(),
  })
  .passthrough();

export const trialResultSchema = z.object({
  schemaVersion: z.number().int().positive(),
  agent: z.string(),
  case: z.string(),
  repeat: z.number().int().positive(),
  status: trialStatusSchema,
  verdict: verdictSchema.optional(),
  evaluators: z.array(evalResultSchema).default([]),
  turnCount: z.number().int().nonnegative().default(0),
  qna: z.array(qnaEntrySchema).default([]),
  cost: costBlockSchema.optional(),
  timings: timeBlockSchema.optional(),
  /** Which transcript source drove the trial (§10, Part 3.2): the injected capture
   *  hook (authoritative session-start payload) or the computed fallback location. */
  transcriptSource: z.enum(['hook', 'fallback']).optional(),
  /** Present when a workspace was kept (failed trials, or `--keep-workspace`). */
  workspacePath: z.string().optional(),
});
export type TrialResult = z.infer<typeof trialResultSchema>;
/** Input shape (pre-defaults) accepted by the store writer. */
export type TrialResultInput = z.input<typeof trialResultSchema>;

/** Per-`(case×agent)` stat block (§12). Kept structural; stat ids are open. */
export const statBlockSchema = z
  .object({
    id: z.string(),
    case: z.string().optional(),
    agent: z.string().optional(),
  })
  .passthrough();
export type StatBlock = z.infer<typeof statBlockSchema>;

/** Suite gate outcome (§13). */
export const gateOutcomeSchema = z.object({
  passed: z.boolean(),
  exitCode: z.number().int(),
  failures: z.array(z.string()).default([]),
});

export const suiteResultSchema = z.object({
  schemaVersion: z.number().int().positive(),
  runDir: z.string(),
  createdAt: z.string(),
  /** Snapshot of the resolved config for this run. */
  config: z.unknown(),
  matrix: z.array(matrixCellSchema),
  /** Per-group + suite-wide stats (populated by the stats layer). */
  groups: z.array(statBlockSchema).default([]),
  gate: gateOutcomeSchema.optional(),
});
export type SuiteResult = z.infer<typeof suiteResultSchema>;
/** Input shape (pre-defaults) accepted by the store writer. */
export type SuiteResultInput = z.input<typeof suiteResultSchema>;
