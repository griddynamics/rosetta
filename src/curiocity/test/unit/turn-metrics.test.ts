import { describe, it, expect } from 'vitest';
import { computeTurnMetrics } from '../../src/results/turn-metrics';
import { turnMetricsStat } from '../../src/stats/turn-metrics';
import { trialResultSchema, type TrialResultInput } from '../../src/results/schema';

/**
 * Turn metrics (§12): turnsTotal, questionTurns (once per turn regardless of question
 * count within), interruptions (maximal runs of CONSECUTIVE question-turns collapsed to
 * one each). The collapse semantics are the load-bearing part — tested on the pure
 * helper with synthetic timelines, then through the rollup stat.
 */

/** Build a timeline of Q (question turn) / N (non-question turn) markers. */
function timeline(marks: Array<'Q' | 'N'>) {
  return marks.map((m) => ({ question: m === 'Q' }));
}

describe('computeTurnMetrics (§12 collapse semantics)', () => {
  it('3 CONSECUTIVE question-turns → 1 interruption', () => {
    expect(computeTurnMetrics(timeline(['Q', 'Q', 'Q']))).toEqual({
      turnsTotal: 3,
      questionTurns: 3,
      interruptions: 1,
    });
  });

  it('3 question-turns SPREAD across the run → 3 interruptions', () => {
    expect(computeTurnMetrics(timeline(['Q', 'N', 'Q', 'N', 'Q']))).toEqual({
      turnsTotal: 5,
      questionTurns: 3,
      interruptions: 3,
    });
  });

  it('mixed runs collapse per maximal consecutive block', () => {
    // QQ | N | QQQ → 2 interruptions, 5 question turns, 6 total.
    expect(computeTurnMetrics(timeline(['Q', 'Q', 'N', 'Q', 'Q', 'Q']))).toEqual({
      turnsTotal: 6,
      questionTurns: 5,
      interruptions: 2,
    });
  });

  it('no question turns → zero questionTurns and interruptions', () => {
    expect(computeTurnMetrics(timeline(['N', 'N']))).toEqual({
      turnsTotal: 2,
      questionTurns: 0,
      interruptions: 0,
    });
  });

  it('empty timeline → all zero', () => {
    expect(computeTurnMetrics([])).toEqual({ turnsTotal: 0, questionTurns: 0, interruptions: 0 });
  });

  it('a single turn flagged as a question (a multi-question turn) counts ONCE', () => {
    // One turn where the harness answered — regardless of how many questions it bundled.
    expect(computeTurnMetrics(timeline(['Q']))).toEqual({
      turnsTotal: 1,
      questionTurns: 1,
      interruptions: 1,
    });
  });
});

describe('turn-metrics stat (rollup)', () => {
  function trial(over: Partial<TrialResultInput>): ReturnType<typeof trialResultSchema.parse> {
    return trialResultSchema.parse({
      schemaVersion: 2,
      agent: 'mock',
      case: 'c',
      repeat: 1,
      status: 'passed',
      ...over,
    });
  }

  it('sums totals and computes per-trial means from stored turnMetrics', () => {
    const group = [
      trial({ repeat: 1, turnMetrics: { turnsTotal: 4, questionTurns: 2, interruptions: 1 } }),
      trial({ repeat: 2, turnMetrics: { turnsTotal: 2, questionTurns: 0, interruptions: 0 } }),
    ];
    const block = turnMetricsStat.compute(group, { gate: { minScore: 0, minPassRate: 0, maxStddev: 0 } }) as Record<string, unknown>;
    expect(block['turnsTotal']).toBe(6);
    expect(block['questionTurns']).toBe(2);
    expect(block['interruptions']).toBe(1);
    expect(block['meanTurnsTotal']).toBe(3);
    expect(block['meanQuestionTurns']).toBe(1);
    expect(block['trials']).toBe(2);
  });

  it('falls back to deriving from the persisted timeline when turnMetrics absent (D8)', () => {
    const group = [
      trial({
        timings: {
          timeline: [
            { turnStart: 0, stopAt: 1, reactionDoneAt: 2, question: true },
            { turnStart: 2, stopAt: 3, reactionDoneAt: 3, question: false },
          ],
        },
      }),
    ];
    const block = turnMetricsStat.compute(group, { gate: { minScore: 0, minPassRate: 0, maxStddev: 0 } }) as Record<string, unknown>;
    expect(block['turnsTotal']).toBe(2);
    expect(block['questionTurns']).toBe(1);
    expect(block['interruptions']).toBe(1);
  });
});
