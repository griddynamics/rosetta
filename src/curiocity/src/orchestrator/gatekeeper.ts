import type { GateConfig } from '../config/schema';
import { ExitCode } from '../cli/exit-codes';
import { ERROR_STATUSES } from '../curion/status';
import type { TrialResult } from '../results/schema';

/**
 * Suite gatekeeper (§13) — a PURE function of stored `TrialResult`s (D8), so
 * `report` can re-gate with changed thresholds. Gates are evaluated per
 * `(case×agent)` group: `minScore` vs mean score, `minPassRate` vs pass-rate,
 * `maxStddev` vs score stddev (only when repeats > 1). Any violating group fails
 * the suite.
 *
 * Vacuous-gate rule (§7): when a group has NO verdict-carrying trials (evaluation
 * skipped — the M2 default), the score-based gates (`minScore`, `maxStddev`)
 * evaluate vacuously (pass) and only statuses drive the outcome. `minPassRate`
 * still applies to passed/failed statuses (a `passed`-no-verdict trial counts as a
 * pass), so an all-passed suite passes the pass-rate gate too.
 *
 * Exit codes: gate failure → 1; else any error-status trial → 3; else 0. Gate
 * failure takes precedence over partial-infra (§13).
 */

export interface GateOutcome {
  passed: boolean;
  exitCode: number;
  failures: string[];
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

export function gatekeeper(trials: TrialResult[], gate: GateConfig): GateOutcome {
  const groups = new Map<string, TrialResult[]>();
  for (const t of trials) {
    const key = `${t.case}::${t.agent}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(t);
  }

  const failures: string[] = [];
  let anyError = false;

  for (const [key, group] of groups) {
    const completed = group.filter((t) => t.status === 'passed' || t.status === 'failed');
    const passed = completed.filter((t) => t.status === 'passed').length;
    const scored = completed
      .filter((t) => t.verdict !== undefined)
      .map((t) => t.verdict!.score);
    if (group.some((t) => ERROR_STATUSES.has(t.status))) anyError = true;

    // Score gates — vacuous when no verdicts (§7).
    if (scored.length > 0) {
      const m = mean(scored);
      if (m < gate.minScore) failures.push(`${key}: mean score ${m.toFixed(1)} < minScore ${gate.minScore}`);
      if (scored.length > 1) {
        const sd = stddev(scored);
        if (sd > gate.maxStddev) failures.push(`${key}: score stddev ${sd.toFixed(1)} > maxStddev ${gate.maxStddev}`);
      }
    }

    // Pass-rate gate — applies whenever there are completed (passed/failed) trials.
    if (completed.length > 0) {
      const passRate = passed / completed.length;
      if (passRate < gate.minPassRate) {
        failures.push(`${key}: pass-rate ${passRate.toFixed(2)} < minPassRate ${gate.minPassRate}`);
      }
    }
  }

  if (failures.length > 0) return { passed: false, exitCode: ExitCode.GATE_FAILURE, failures };
  if (anyError) return { passed: true, exitCode: ExitCode.PARTIAL_INFRA, failures: [] };
  return { passed: true, exitCode: ExitCode.OK, failures: [] };
}
