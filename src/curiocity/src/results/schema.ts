import { z } from 'zod';
import { matrixCellSchema } from '../shared/matrix';
import { qnaEntrySchema, usageSchema } from '../shared/trajectory';

/**
 * Results schemas (§14). `trial.json` and `suite.json` both carry `schemaVersion`
 * so `curiocity report` can load older runs. `report` recomputes stats + reporters
 * + gate from stored `TrialResult`s — it never re-runs agents/evaluators (D8).
 */
export const SCHEMA_VERSION = 1;

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

/** Itemized cost block (§12): agent tokens vs harness fast/workhorse/judge. */
export const costBlockSchema = z
  .object({
    agent: usageSchema.optional(),
    fast: usageSchema.optional(),
    workhorse: usageSchema.optional(),
    judge: usageSchema.optional(),
    usd: z.number().optional(),
    /** Resolved model string per harness role (for $ itemization by model, §12). */
    models: z.record(z.string()).optional(),
  })
  .passthrough();

/** Wall-clock breakdown (§12). */
export const timeBlockSchema = z
  .object({
    totalMs: z.number().nonnegative().optional(),
    agentMs: z.number().nonnegative().optional(),
    harnessLlmMs: z.number().nonnegative().optional(),
    checksMs: z.number().nonnegative().optional(),
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
