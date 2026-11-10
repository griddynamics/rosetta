import type { InteractionOutcome } from '../interaction/engine';
import type { TrialStatus, Verdict } from '../results/schema';

/**
 * Trial status derivation (§7). Pure + unit-tested. `timeout` when the PARENT
 * process-tree-kills a child is assigned by the orchestrator (the child never
 * returns in that case); the child self-reports `timeout` only via its internal
 * wall-clock backstop.
 */

/** Map a completed interaction (+ optional verdict) to a final status (§7). */
export function deriveCompletedStatus(outcome: InteractionOutcome, verdict?: Verdict): TrialStatus {
  switch (outcome) {
    case 'agent-hung':
      return 'agent-hung';
    case 'agent-crash':
      return 'agent-crash';
    case 'timeout':
      return 'timeout';
    case 'done':
      if (verdict === undefined) return 'passed'; // evaluation not run → passed, no verdict (§7)
      return verdict.pass ? 'passed' : 'failed';
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

/** Error/failed statuses whose workspaces are retained by default (§7 step 8). */
const RETAINED_STATUSES = new Set<TrialStatus>([
  'failed',
  'setup-error',
  'launch-error',
  'eval-error',
  'timeout',
  'agent-hung',
  'agent-crash',
]);

export function shouldKeepWorkspace(status: TrialStatus, keepFlag: boolean): boolean {
  return keepFlag || RETAINED_STATUSES.has(status);
}

/**
 * Infra-error statuses: the trial was ATTEMPTED and the harness/infra broke before a
 * valid verdict (setup, launch, evaluator crash, timeout, hang, crash). Any of these
 * drives the gatekeeper's partial-infra exit code 3 (§13).
 *
 * The not-run status (`skipped`, see `NOT_RUN_STATUS`) is deliberately absent: a cell
 * that was never attempted is a configuration outcome, not an infrastructure failure.
 * It stays non-fatal at the gate when other trials ran; an all-not-run suite exits 2
 * ("no runnable trials", #326). Compare `UNCOMPLETED_STATUSES` (stats/types.ts), the
 * report's `errors` count, which DOES include not-run trials.
 */
export const INFRA_ERROR_STATUSES: ReadonlySet<TrialStatus> = new Set<TrialStatus>([
  'setup-error',
  'launch-error',
  'eval-error',
  'timeout',
  'agent-hung',
  'agent-crash',
]);
