import type { MatrixCell } from '../shared/matrix';
import type { PartialModelRoles } from '../shared/models';
import { mergeModels, type ResolvedCaseConfig } from './merge';
import type { TopLevelConfig } from './schema';

/**
 * Pure trial-matrix resolution (D16): expand each resolved case into
 * `(agent × case × repeat)` cells. This is the read-only projection the CLI prints
 * for `--dry-run`; the bounded pool that actually dispatches cells lives in
 * `orchestrator/` (out of scope for M1).
 */

export interface MatrixEntry extends MatrixCell {
  timeoutSec: number;
  /** Effective model roles for this cell: top-level < profile < case < CLI (D13). */
  models: PartialModelRoles;
  combiner: string;
  evaluate: boolean;
}

export interface BuildMatrixArgs {
  topLevel: TopLevelConfig;
  cases: ResolvedCaseConfig[];
}

export function buildMatrix(args: BuildMatrixArgs): MatrixEntry[] {
  const { topLevel, cases } = args;
  const entries: MatrixEntry[] = [];

  for (const c of cases) {
    for (const agent of c.agents) {
      // Per-agent profile `models` override slots between top-level and case (D13).
      // `c.models` already folds top-level < case < CLI; re-fold with the profile
      // override placed at its correct precedence rung.
      const profileModels = topLevel.codingagents[agent]?.models;
      const effectiveModels = mergeModels(topLevel.models, profileModels, c.models);
      for (let repeat = 1; repeat <= c.repeats; repeat++) {
        entries.push({
          case: c.caseName,
          agent,
          repeat,
          timeoutSec: c.timeoutSec,
          models: effectiveModels,
          combiner: c.combiner,
          evaluate: c.evaluate,
        });
      }
    }
  }

  return entries;
}
