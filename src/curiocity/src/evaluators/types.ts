import type { execa } from 'execa';
import type { z } from 'zod';
import type { ModelRouter } from '../shared/model-router';
import type { QnaEntry, TrajectoryEvent, Usage } from '../shared/trajectory';

/**
 * Evaluator contract (§5.4, §11). Each evaluator declares a zod `paramsSchema`
 * (validated at config load, not run time) and an `evaluate` that consumes the
 * assembled `EvalContext`. The four built-ins are in this folder; the verdict
 * combiner (default `gated-mean`) folds their results (§5.4).
 */

export interface EvalContext {
  /** Final workspace dir. */
  workspace: string;
  /** Unified diff vs the unzipped source. */
  workspaceDiff: string;
  /** Normalized trajectory. */
  events: TrajectoryEvent[];
  /** QnA audit log. */
  qnaLog: QnaEntry[];
  /** Case prose files. `evaluationMd` is the judge rubric, passed verbatim (§11). */
  caseFiles: { evaluationMd?: string; promptMd: string };
  /** Which agent produced this trial (resolves per-agent `trajectory-check` maps). */
  agentId: string;
  /** Router for `llm-judge` (judge role). */
  models: ModelRouter;
  /** `execa` for the `command` evaluator. */
  exec: typeof execa;
}

export interface EvalResult {
  pass: boolean;
  score?: number;
  gate: boolean;
  details: string;
  cost?: Usage;
}

export interface Evaluator {
  readonly id: string;
  /** Validated at config load (§5.4); each evaluator re-parses `params` internally. */
  readonly paramsSchema: z.ZodTypeAny;
  evaluate(ctx: EvalContext, params: unknown): Promise<EvalResult>;
}
