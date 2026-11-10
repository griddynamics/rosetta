export const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
/** Retry a transient API failure up to this many times (exponential backoff) before giving up. */
export const MAX_RETRIES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  sleepFn: (ms: number) => Promise<void> = sleep,
): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      const status = (err as { status?: number } | undefined)?.status;
      if (attempt > retries || (status !== undefined && !RETRYABLE_STATUS.has(status))) {
        throw err;
      }
      const backoffMs = Math.min(1000 * 2 ** attempt, 15_000) + Math.random() * 250;
      await sleepFn(backoffMs);
    }
  }
}
