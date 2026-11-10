import { describe, it, expect } from 'vitest';
import { INFRA_ERROR_STATUSES } from '../../src/curion/status';
import { runEvaluatorPipeline } from '../../src/curion/evaluate';
import { NOT_RUN_STATUS, trialStatusSchema } from '../../src/results/schema';
import { UNCOMPLETED_STATUSES } from '../../src/stats/types';
import { FakeModelRouter } from '../../src/shared/model-router';

/**
 * #269: the two meanings once both spelled "skipped" carry distinct names, and the two
 * status sets (gate vs report) are pinned to their intended, deliberately different
 * contents. Behavior-preserving: the persisted status value is still `skipped`.
 */
describe('status sets (#269)', () => {
  it('the not-run trial status keeps its persisted spelling `skipped`', () => {
    expect(NOT_RUN_STATUS).toBe('skipped');
    expect(trialStatusSchema.parse(NOT_RUN_STATUS)).toBe('skipped');
  });

  it('INFRA_ERROR_STATUSES (gate exit 3) = attempted-and-infra-broke statuses, no not-run', () => {
    expect([...INFRA_ERROR_STATUSES].sort()).toEqual([
      'agent-crash',
      'agent-hung',
      'eval-error',
      'launch-error',
      'setup-error',
      'timeout',
    ]);
    expect(INFRA_ERROR_STATUSES.has(NOT_RUN_STATUS)).toBe(false);
  });

  it('UNCOMPLETED_STATUSES (report errors) = INFRA_ERROR_STATUSES + not-run', () => {
    expect([...UNCOMPLETED_STATUSES].sort()).toEqual([...INFRA_ERROR_STATUSES, NOT_RUN_STATUS].sort());
  });

  it('every trial status is either completed (passed/failed) or uncompleted, never both', () => {
    for (const s of trialStatusSchema.options) {
      const completed = s === 'passed' || s === 'failed';
      expect(UNCOMPLETED_STATUSES.has(s)).toBe(!completed);
    }
  });
});

describe('evaluation not run is not the not-run trial status (#269)', () => {
  it('a disabled pipeline reports `not-evaluated`, not `skipped`', async () => {
    const out = await runEvaluatorPipeline({
      enabled: false,
      workspace: '/nonexistent',
      workspaceDiff: '',
      events: [],
      qna: [],
      evaluators: [],
      combiner: 'gated-mean',
      caseFiles: { promptMd: 'p' },
      agentId: 'mock',
      router: new FakeModelRouter({ entries: [] }),
    });
    expect(out.status).toBe('not-evaluated');
    expect(out.verdict).toBeUndefined();
  });
});
