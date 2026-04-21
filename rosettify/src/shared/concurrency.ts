import type { RunEnvelope } from "../registry/types.js";
import { err } from "./envelope.js";
import { MAX_CONCURRENCY_RETRIES } from "./constants.js";

/**
 * atomicWritePlan — optimistic concurrency for plan file mutations (FR-SHRD-0006).
 *
 * Reads the plan, calls fn(plan), and if fn succeeds:
 *   - Checks that updated_at hasn't changed on disk since the read.
 *   - If unchanged: writes the mutated plan and returns ok(result).
 *   - If changed: retries up to maxRetries times, then returns concurrent_write_conflict.
 *
 * fn returns either:
 *   { ok: true; result: T; updated: Plan }  — mutation succeeded, write the plan
 *   { ok: false; error: string; include_help?: boolean }  — operation error, do not write
 */
export async function atomicWritePlan<Plan extends { updated_at: string }, T>(
  read: (filePath: string) => Plan | null,
  write: (filePath: string, plan: Plan) => void,
  filePath: string,
  fn: (plan: Plan) => { ok: true; result: T; updated: Plan } | { ok: false; error: string; include_help?: boolean },
  maxRetries = MAX_CONCURRENCY_RETRIES,
): Promise<RunEnvelope<T>> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const current = read(filePath);
    if (!current) return err("plan_not_found");

    const capturedUpdatedAt = current.updated_at;
    const fnResult = fn(current);

    if (!fnResult.ok) {
      return err(fnResult.error, fnResult.include_help ?? false);
    }

    // Re-read to detect concurrent modification
    const reread = read(filePath);
    if (!reread || reread.updated_at !== capturedUpdatedAt) {
      if (attempt >= maxRetries) return err("concurrent_write_conflict");
      continue;
    }

    const now = new Date().toISOString();
    const toWrite = Object.assign({}, fnResult.updated, { updated_at: now }) as Plan;
    write(filePath, toWrite);
    return { ok: true, result: fnResult.result, error: null, include_help: false };
  }

  return err("concurrent_write_conflict");
}
