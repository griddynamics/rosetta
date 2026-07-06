import type { TurnMetrics, TurnTiming } from './schema';

/**
 * Turn metrics (§12), derived purely from the persisted per-turn timeline (D8 — so
 * `report` re-derives them retroactively). A pure reducer over `results/schema` types,
 * so it lives here (not in `interaction/`): the `stats/` reducer must consume it without
 * crossing the §3 module-dependency floor (stats imports only shared/ + results types).
 *
 *   - `turnsTotal`    — every recorded turn.
 *   - `questionTurns` — turns flagged as a question turn (the harness answered ≥1
 *                       question); counted ONCE per turn regardless of how many
 *                       questions that turn contained ("how many times the agent asked").
 *   - `interruptions` — maximal runs of CONSECUTIVE question-turns collapsed to one each
 *                       (choppiness): 3 questions back-to-back = 1; 3 spread out = 3.
 */
export function computeTurnMetrics(timeline: Array<Pick<TurnTiming, 'question'>>): TurnMetrics {
  let questionTurns = 0;
  let interruptions = 0;
  let inRun = false;
  for (const t of timeline) {
    if (t.question === true) {
      questionTurns += 1;
      if (!inRun) {
        interruptions += 1;
        inRun = true;
      }
    } else {
      inRun = false;
    }
  }
  return { turnsTotal: timeline.length, questionTurns, interruptions };
}
