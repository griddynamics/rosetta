import { availableParallelism } from 'node:os';
import type { GateConfig, ProvisionSpec } from './schema';

/**
 * Built-in defaults — the lowest precedence layer (D13):
 *   defaults (code) < top-level config < case config.json < CLI flags
 */

/** Default per-trial repeat count (P6: first-class, default N=1). */
export const DEFAULT_REPEATS = 1;

/** Default per-trial wall-clock cap; matches the §9 case example. */
export const DEFAULT_TIMEOUT_SEC = 1800;

/** Default verdict combiner (§5.4). */
export const DEFAULT_COMBINER = 'gated-mean';

/** Default results output directory (§9). */
export const DEFAULT_OUT_DIR = './curiocity-results';

/** Default freeze-watchdog window (§6, §5.2). */
export const DEFAULT_FREEZE_WINDOW_MS = 10_000;

export const DEFAULT_GATE: GateConfig = {
  minScore: 60,
  minPassRate: 0.8,
  maxStddev: 10,
};

/** Bounded-pool default: `min(4, cores-1)`, floor 1 (§4). */
export function defaultConcurrency(): number {
  const cores = availableParallelism();
  return Math.max(1, Math.min(4, cores - 1));
}

export function emptyProvision(): ProvisionSpec {
  return { mcps: [], plugins: [] };
}
