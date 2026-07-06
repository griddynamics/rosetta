import { z } from 'zod';
import type { Verdict } from '../results/schema';
import type { CombineItem, Combiner } from './types';

/**
 * `gated-mean` (§5.4, default). All `gate:true` results must pass, else the verdict
 * is a fail with the score capped (default 40). Otherwise the score is the
 * weighted mean of the scored results, and the trial passes iff score ≥
 * `passThreshold` (default 60). `passThreshold` decides the PER-TRIAL verdict; suite
 * gating is separate (§13).
 */

export const DEFAULT_CAP = 40;
export const DEFAULT_PASS_THRESHOLD = 60;

export const gatedMeanParamsSchema = z.object({
  cap: z.number().default(DEFAULT_CAP),
  passThreshold: z.number().default(DEFAULT_PASS_THRESHOLD),
});

function weightedMean(items: CombineItem[]): number | undefined {
  const scored = items.filter((i) => i.result.score !== undefined);
  if (scored.length === 0) return undefined;
  let num = 0;
  let den = 0;
  for (const i of scored) {
    const w = i.weight > 0 ? i.weight : 0;
    num += i.result.score! * w;
    den += w;
  }
  if (den === 0) return undefined;
  return num / den;
}

export const gatedMean: Combiner = {
  id: 'gated-mean',

  combine(items: CombineItem[], params?: unknown): Verdict {
    const { cap, passThreshold } = gatedMeanParamsSchema.parse(params ?? {});

    const gates = items.filter((i) => i.result.gate);
    const failedGates = gates.filter((i) => !i.result.pass);
    const mean = weightedMean(items);

    if (failedGates.length > 0) {
      const base = mean ?? 0;
      const score = Math.min(base, cap);
      const failed = failedGates.map((i) => i.result.details).join('; ');
      return {
        pass: false,
        score,
        rationale: `gate(s) failed → score capped at ${cap}: ${failed}`,
      };
    }

    // All gates passed (or none). Score = weighted mean of scored results; when
    // there is nothing scored, the passing gates alone carry a full score.
    const score = mean ?? 100;
    const pass = score >= passThreshold;
    const scoredCount = items.filter((i) => i.result.score !== undefined).length;
    const rationale =
      scoredCount === 0
        ? `no scored evaluators; all ${gates.length} gate(s) passed`
        : `weighted mean ${score.toFixed(1)} ${pass ? '≥' : '<'} passThreshold ${passThreshold}`;
    return { pass, score, rationale };
  },
};
