/**
 * Unit tests for shared/time.ts — nowUtcZ / formatLocal. FR-SPECS-0042.
 */
import { describe, it, expect } from "vitest";
import { nowUtcZ, formatLocal } from "../../../src/shared/time.js";

describe("nowUtcZ", () => {
  it("returns an ISO8601 string ending in Z", () => {
    const ts = nowUtcZ();
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("is parseable back into an equivalent Date", () => {
    const ts = nowUtcZ();
    expect(Number.isNaN(new Date(ts).getTime())).toBe(false);
  });
});

describe("formatLocal", () => {
  it("converts a stored UTC timestamp into a non-empty local-time string", () => {
    const local = formatLocal("2026-01-01T12:00:00.000Z");
    expect(typeof local).toBe("string");
    expect(local.length).toBeGreaterThan(0);
    expect(local).not.toBe("Invalid Date");
  });

  it("passes through unparseable input unchanged rather than throwing", () => {
    expect(formatLocal("not-a-date")).toBe("not-a-date");
  });

  it("passes through an empty string unchanged", () => {
    expect(formatLocal("")).toBe("");
  });

  it("matches new Date(iso).toLocaleString() exactly (timezone-agnostic pin — no hardcoded offset)", () => {
    const iso = "2026-01-01T12:00:00.000Z";
    expect(formatLocal(iso)).toBe(new Date(iso).toLocaleString());
  });
});
