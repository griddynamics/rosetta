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
      if (verdict === undefined) return 'passed'; // evaluation skipped → passed, no verdict (§7)
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
  'timeout',
  'agent-hung',
  'agent-crash',
]);

export function shouldKeepWorkspace(status: TrialStatus, keepFlag: boolean): boolean {
  return keepFlag || RETAINED_STATUSES.has(status);
}

/** Error statuses that trigger the partial-infra exit code 3 (§13). */
export const ERROR_STATUSES = new Set<TrialStatus>([
  'setup-error',
  'launch-error',
  'timeout',
  'agent-hung',
  'agent-crash',
]);
