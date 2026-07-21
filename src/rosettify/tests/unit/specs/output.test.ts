/**
 * Unit tests for commands/specs/output.ts (buildSpecWriteResult / buildSpecLifecycleResult /
 * withPreviousVersion — the sole authors of the two shared write/lifecycle result shapes).
 * FR-SPECS-0050.
 */
import { describe, it, expect } from "vitest";
import { buildSpecWriteResult, buildSpecLifecycleResult, withPreviousVersion } from "../../../src/commands/specs/output.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

describe("buildSpecWriteResult", () => {
  it("builds document summary and resolves affected ids to their post-write {id,status}", () => {
    const doc = makeDoc({ component: "checkout", specs: [makeSpec({ id: "FR-CHK-0001", status: "Draft" })] });
    const result = buildSpecWriteResult(doc, ["FR-CHK-0001"], "backup/path.bak000");
    expect(result).toEqual({
      document: { component: "checkout", total: 1, previous_version: "backup/path.bak000" },
      affected: [{ id: "FR-CHK-0001", status: "Draft" }],
    });
  });

  it("drops an affected id that no longer exists in doc.specs", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] });
    const result = buildSpecWriteResult(doc, ["FR-CHK-0001", "FR-CHK-9999"], null);
    expect(result.affected).toEqual([{ id: "FR-CHK-0001", status: "Draft" }]);
  });

  it("treats a doc with specs missing entirely as zero total / no affected", () => {
    const doc = { component: "x" } as unknown as Parameters<typeof buildSpecWriteResult>[0];
    const result = buildSpecWriteResult(doc, ["FR-CHK-0001"], null);
    expect(result.document.total).toBe(0);
    expect(result.affected).toEqual([]);
  });
});

describe("buildSpecLifecycleResult", () => {
  it("resolves affected ids to their post-write {id,status}", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", status: "Approved" })] });
    expect(buildSpecLifecycleResult(doc, ["FR-CHK-0001"])).toEqual({ updated: [{ id: "FR-CHK-0001", status: "Approved" }] });
  });

  it("returns updated:[] for an empty affected list", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] });
    expect(buildSpecLifecycleResult(doc, [])).toEqual({ updated: [] });
  });
});

describe("withPreviousVersion", () => {
  it("injects the resolved backup path into document.previous_version", () => {
    const base = buildSpecWriteResult(makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }), ["FR-CHK-0001"], null);
    const injected = withPreviousVersion(base, "some/backup.bak003");
    expect(injected.document.previous_version).toBe("some/backup.bak003");
    expect(injected.affected).toEqual(base.affected); // unrelated fields untouched
  });

  it("can inject null (first-write case)", () => {
    const base = buildSpecWriteResult(makeDoc(), [], "placeholder");
    const injected = withPreviousVersion(base, null);
    expect(injected.document.previous_version).toBeNull();
  });
});
