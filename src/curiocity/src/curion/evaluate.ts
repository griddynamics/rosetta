import type { QnaEntry, TrajectoryEvent } from '../shared/trajectory';
import type { EvalResultRecord, Verdict } from '../results/schema';

/**
 * Evaluator pipeline — M2 STUB (§7 step 7). Real evaluators, the LLM judge and the
 * verdict combiner are M3; here the pipeline deterministically returns `skipped`,
 * so a cleanly-completed trial gets status `passed` with NO verdict and score gates
 * evaluate vacuously (§7). The seam matches the M3 shape so wiring it later is a
 * drop-in.
 */

export interface EvaluationOutcome {
  status: 'skipped' | 'evaluated';
  verdict?: Verdict;
  evaluators: EvalResultRecord[];
}

export interface EvaluatePipelineArgs {
  enabled: boolean;
  workspace: string;
  workspaceDiff: string;
  events: TrajectoryEvent[];
  qna: QnaEntry[];
}

export async function runEvaluatorPipeline(_args: EvaluatePipelineArgs): Promise<EvaluationOutcome> {
  // M2: evaluators are not implemented. Always skipped (no verdict).
  return { status: 'skipped', evaluators: [] };
}
