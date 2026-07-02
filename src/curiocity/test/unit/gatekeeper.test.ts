import { describe, it, expect } from 'vitest';
import { gatekeeper } from '../../src/orchestrator/gatekeeper';
import { ExitCode } from '../../src/cli/exit-codes';
import { SCHEMA_VERSION, trialResultSchema, type TrialResult, type TrialStatus } from '../../src/results/schema';

const GATE = { minScore: 60, minPassRate: 0.8, maxStddev: 10 };

function trial(overrides: {
  case?: string;
  agent?: string;
  repeat?: number;
  status: TrialStatus;
  score?: number;
  pass?: boolean;
}): TrialResult {
  return trialResultSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    case: overrides.case ?? 'c',
    agent: overrides.agent ?? 'mock',
    repeat: overrides.repeat ?? 1,
    status: overrides.status,
    ...(overrides.score !== undefined
      ? { verdict: { pass: overrides.pass ?? true, score: overrides.score, rationale: '' } }
      : {}),
  });
}

describe('gatekeeper (§13)', () => {
  it('vacuous-gate rule: all passed with NO verdict → exit 0 (§7)', () => {
    const out = gatekeeper([trial({ status: 'passed' }), trial({ status: 'passed', repeat: 2 })], GATE);
    expect(out.exitCode).toBe(ExitCode.OK);
    expect(out.failures).toEqual([]);
  });

  it('partial infra: a passed (no verdict) group + an error-status trial → exit 3', () => {
    const out = gatekeeper(
      [trial({ case: 'a', status: 'passed' }), trial({ case: 'b', status: 'timeout' })],
      GATE,
    );
    expect(out.exitCode).toBe(ExitCode.PARTIAL_INFRA);
  });

  it('gate failure on mean score below minScore → exit 1', () => {
    const out = gatekeeper([trial({ status: 'passed', score: 40, pass: true })], GATE);
    expect(out.exitCode).toBe(ExitCode.GATE_FAILURE);
    expect(out.failures.join(' ')).toContain('minScore');
  });

  it('gate failure on pass-rate below minPassRate → exit 1', () => {
    const trials = [
      trial({ status: 'passed', repeat: 1, score: 90, pass: true }),
      trial({ status: 'failed', repeat: 2, score: 90, pass: false }),
      trial({ status: 'failed', repeat: 3, score: 90, pass: false }),
    ];
    const out = gatekeeper(trials, GATE);
    expect(out.exitCode).toBe(ExitCode.GATE_FAILURE);
    expect(out.failures.join(' ')).toContain('pass-rate');
  });

  it('gate failure takes precedence over partial-infra (§13)', () => {
    const out = gatekeeper(
      [
        trial({ case: 'a', status: 'failed', score: 10, pass: false }),
        trial({ case: 'b', status: 'timeout' }),
      ],
      GATE,
    );
    expect(out.exitCode).toBe(ExitCode.GATE_FAILURE);
  });
});
