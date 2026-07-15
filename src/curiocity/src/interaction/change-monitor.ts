/**
 * Change monitor (§6) — the shared machinery behind BOTH the stall detector and
 * the freeze watchdog: a rolling "how long has (rendered screen + transcript size)
 * been unchanged" measurement.
 *
 *  - Stall detector: unchanged for `stall.quietMs` → "output settled", may escalate
 *    to a screen-read / structured-question check.
 *  - Freeze watchdog: unchanged for `freeze.windowMs` → window 1; a second
 *    consecutive identical window → the deterministic `agent-hung` fail-safe.
 *
 * Pure and time-injected so it is deterministically unit-testable.
 */

/** djb2 — a fast, allocation-free content hash for the rendered screen. */
export function hashString(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

export interface ChangeSample {
  /** Rendered visible screen (ANSI-free). */
  screen: string;
  /** Transcript size in bytes (proxy for on-disk growth / mtime). */
  transcriptSize: number;
}

export class ChangeMonitor {
  private lastKey: string | null = null;
  private lastChangeAt = 0;

  /** Feed a sample taken at `now` (epoch ms). Records a change when the key moves. */
  update(sample: ChangeSample, now: number): void {
    const key = `${hashString(sample.screen)}:${sample.transcriptSize}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.lastChangeAt = now;
    }
  }

  /** Milliseconds since the last observed change (0 before the first sample). */
  unchangedMs(now: number): number {
    if (this.lastKey === null) return 0;
    return now - this.lastChangeAt;
  }

  /** Current content key (null before the first sample). */
  get key(): string | null {
    return this.lastKey;
  }

  /** Force the next sample to count as a change (call after injecting input). */
  reset(): void {
    this.lastKey = null;
  }
}
