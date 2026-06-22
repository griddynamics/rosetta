/**
 * Unit tests for atomicWritePlan (FR-SHRD-0006).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { atomicWritePlan } from "../../../src/shared/concurrency.js";
import { MAX_CONCURRENCY_RETRIES } from "../../../src/shared/constants.js";

afterEach(() => {
  vi.restoreAllMocks();
});

interface SimplePlan {
  updated_at: string;
  name: string;
}

describe("atomicWritePlan", () => {
  it("returns plan_not_found when read returns null", async () => {
    const read = vi.fn().mockReturnValue(null);
    const write = vi.fn();
    const result = await atomicWritePlan(read, write, "/fake/plan.json", () => ({
      ok: true,
      result: "x",
      updated: { updated_at: "2026-01-01T00:00:00.000Z", name: "x" },
    }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
    expect(write).not.toHaveBeenCalled();
  });

  it("returns fn error without writing when fn returns ok:false", async () => {
    const plan: SimplePlan = { updated_at: "2026-01-01T00:00:00.000Z", name: "test" };
    const read = vi.fn().mockReturnValue(plan);
    const write = vi.fn();
    const result = await atomicWritePlan(read, write, "/fake/plan.json", () => ({
      ok: false,
      error: "some_error",
    }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("some_error");
    expect(write).not.toHaveBeenCalled();
  });

  it("writes and returns ok:true when no concurrent modification", async () => {
    const plan: SimplePlan = { updated_at: "2026-01-01T00:00:00.000Z", name: "test" };
    // Both reads (initial + re-read) return same updated_at
    const read = vi.fn().mockReturnValue(plan);
    const write = vi.fn();
    const result = await atomicWritePlan(read, write, "/fake/plan.json", (p) => ({
      ok: true,
      result: { name: p.name },
      updated: { ...p, name: "updated" },
    }));
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ name: "test" });
    expect(write).toHaveBeenCalledOnce();
  });

  it("returns concurrent_write_conflict after max retries when updated_at always changes", async () => {
    let callCount = 0;
    // Each read returns a different updated_at so the conflict check always triggers
    const read = vi.fn().mockImplementation((): SimplePlan => {
      callCount++;
      return { updated_at: `2026-01-01T00:00:0${callCount}.000Z`, name: "plan" };
    });
    const write = vi.fn();

    const result = await atomicWritePlan(
      read,
      write,
      "/fake/plan.json",
      (p) => ({
        ok: true,
        result: "done",
        updated: p,
      }),
      MAX_CONCURRENCY_RETRIES,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("concurrent_write_conflict");
    expect(write).not.toHaveBeenCalled();
    // Each attempt does 2 reads (initial + re-read), and there are maxRetries+1 attempts
    // but we just confirm the conflict was returned after exhausting retries
  });

  it("returns concurrent_write_conflict when re-read returns null", async () => {
    const plan: SimplePlan = { updated_at: "2026-01-01T00:00:00.000Z", name: "test" };
    let firstCall = true;
    const read = vi.fn().mockImplementation(() => {
      if (firstCall) {
        firstCall = false;
        return plan;
      }
      // re-read returns null — simulates file deleted between read and write
      return null;
    });
    const write = vi.fn();

    const result = await atomicWritePlan(
      read,
      write,
      "/fake/plan.json",
      (p) => ({
        ok: true,
        result: "done",
        updated: p,
      }),
      0, // maxRetries=0 so it fails immediately on first conflict
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("concurrent_write_conflict");
    expect(write).not.toHaveBeenCalled();
  });

  it("succeeds on retry after transient conflict", async () => {
    const stableUpdatedAt = "2026-01-01T00:00:00.000Z";
    let readCallCount = 0;

    // First pair of reads: conflict (different updated_at on re-read)
    // Second pair of reads: success (same updated_at on re-read)
    const read = vi.fn().mockImplementation((): SimplePlan => {
      readCallCount++;
      if (readCallCount === 1) {
        // Initial read for attempt 0
        return { updated_at: stableUpdatedAt, name: "plan" };
      } else if (readCallCount === 2) {
        // Re-read for attempt 0 — different, causes conflict
        return { updated_at: "2026-01-01T00:00:01.000Z", name: "plan-modified" };
      } else if (readCallCount === 3) {
        // Initial read for attempt 1
        return { updated_at: stableUpdatedAt, name: "plan" };
      } else {
        // Re-read for attempt 1 — same, success
        return { updated_at: stableUpdatedAt, name: "plan" };
      }
    });
    const write = vi.fn();

    const result = await atomicWritePlan(
      read,
      write,
      "/fake/plan.json",
      (p) => ({
        ok: true,
        result: { name: p.name },
        updated: p,
      }),
      MAX_CONCURRENCY_RETRIES,
    );

    expect(result.ok).toBe(true);
    expect(write).toHaveBeenCalledOnce();
  });
});
