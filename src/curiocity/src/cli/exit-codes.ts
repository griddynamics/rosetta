/**
 * CLI exit codes (§13). Gate failure (1) takes precedence over partial-infra (3).
 */
export const ExitCode = {
  /** All groups pass all gates; no error-status trials. */
  OK: 0,
  /** Gate failure (score / pass-rate / flakiness). */
  GATE_FAILURE: 1,
  /** Config error or total infrastructure failure (invalid config, no runnable trials, preflight failed). */
  CONFIG_ERROR: 2,
  /** Partial infra failure: some error-status trials, but every gate on completed trials passes. */
  PARTIAL_INFRA: 3,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
