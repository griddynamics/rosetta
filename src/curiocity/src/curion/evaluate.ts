import { execa } from 'execa';
import { evaluatorEntrySchema } from '../config/schema';
import { combinerRegistry } from '../combiners';
import { evaluatorRegistry, type EvalContext, type EvalResult } from '../evaluators';
import type { CombineItem } from '../combiners/types';
import type { ModelRouter } from '../shared/model-router';
import type { QnaEntry, TrajectoryEvent } from '../shared/trajectory';
import type { EvalResultRecord, Verdict } from '../results/schema';

/**
 * Evaluator pipeline (§7 step 7, §11). Runs each configured evaluator over the
 * assembled `EvalContext`, then folds the results with the named combiner (default
 * `gated-mean`, §5.4) into the per-trial verdict. Evaluator params were validated at
 * config load (§5.4); each evaluator re-parses defensively. The `gate` flag on each
 * result comes from the config entry (not the evaluator).
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
  /** Evaluator config entries (opaque over IPC; parsed here). */
  evaluators: unknown[];
  /** Combiner id (default `gated-mean`). */
  combiner: string;
  /** Case prose: rubric (evaluation.md, verbatim) + prompt. */
  caseFiles: { evaluationMd?: string; promptMd: string };
  agentId: string;
  /** External-evaluator context (§11): on-disk transcript path + identity. */
  rawTranscriptPath?: string;
  caseDir?: string;
  agentModel?: string;
  sessionId?: string;
  router: ModelRouter;
}

export async function runEvaluatorPipeline(args: EvaluatePipelineArgs): Promise<EvaluationOutcome> {
  if (!args.enabled || args.evaluators.length === 0) {
    return { status: 'skipped', evaluators: [] };
  }

  const ctx: EvalContext = {
    workspace: args.workspace,
    workspaceDiff: args.workspaceDiff,
    events: args.events,
    qnaLog: args.qna,
    caseFiles: args.caseFiles,
    agentId: args.agentId,
    ...(args.rawTranscriptPath !== undefined ? { rawTranscriptPath: args.rawTranscriptPath } : {}),
    ...(args.caseDir !== undefined ? { caseDir: args.caseDir } : {}),
    ...(args.agentModel !== undefined ? { agentModel: args.agentModel } : {}),
    ...(args.sessionId !== undefined ? { sessionId: args.sessionId } : {}),
    models: args.router,
    exec: execa,
  };

  const records: EvalResultRecord[] = [];
  const items: CombineItem[] = [];

  for (const raw of args.evaluators) {
    const entry = evaluatorEntrySchema.parse(raw);
    const { use, gate, weight, ...params } = entry;
    const evaluator = evaluatorRegistry.get(use);

    let result: EvalResult;
    try {
      result = await evaluator.evaluate(ctx, params);
    } catch (err) {
      // A failed check (e.g. judge/command error) is a non-passing result, not an
      // infra crash — record it and let the combiner decide the verdict.
      result = { pass: false, gate: false, details: `evaluator "${use}" errored: ${(err as Error).message}` };
    }

    // The gate flag is authoritative from config, not the evaluator.
    const gated = gate === true;
    const finalResult: EvalResult = { ...result, gate: gated };

    records.push({
      id: use,
      pass: finalResult.pass,
      ...(finalResult.score !== undefined ? { score: finalResult.score } : {}),
      gate: gated,
      details: finalResult.details,
      ...(finalResult.cost ? { cost: finalResult.cost } : {}),
      ...(finalResult.metrics && finalResult.metrics.length > 0 ? { metrics: finalResult.metrics } : {}),
    });
    items.push({ result: finalResult, weight: weight ?? 1 });
  }

  const combiner = combinerRegistry.get(args.combiner);
  const verdict = combiner.combine(items);

  return { status: 'evaluated', verdict, evaluators: records };
}
