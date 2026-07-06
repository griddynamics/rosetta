import type { Verdict } from '../results/schema';
import type { EvalResult } from '../evaluators/types';

/**
 * Verdict combiner (§5.4, D6). Folds per-evaluator results (with their config
 * weights) into the single per-trial `Verdict {pass, score, rationale}`. Registry
 * default is `gated-mean`.
 */

export interface CombineItem {
  result: EvalResult;
  /** Weight from the evaluator config entry (default 1). */
  weight: number;
}

export interface Combiner {
  readonly id: string;
  combine(items: CombineItem[], params?: unknown): Verdict;
}
