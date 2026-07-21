/**
 * Unit tests for commands/specs/deprecate.ts (cmdDeprecate). FR-SPECS-0018.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdDeprecate } from "../../../src/commands/specs/deprecate.js";
import { loadSpecs, saveSpecs, type StatusEnum } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-deprecate-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

function seedOne(status: StatusEnum): string {
  const file = specsFile();
  saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", status })] }));
  return file;
}

describe("cmdDeprecate — valid source statuses", () => {
  it.each(["Draft", "Modified", "Approved"] as StatusEnum[])("moves %s to Deprecated, retaining the unit", async (status) => {
    const file = seedOne(status);
    const result = await cmdDeprecate(file, ["FR-CHK-0001"], "tester");
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1);
    expect(doc.specs[0]!.status).toBe("Deprecated");
    expect(doc.specs[0]!.changed_by).toBe("tester");
  });
});

describe("cmdDeprecate — defensive fallbacks for malformed inputs", () => {
  it("treats ids=undefined as an empty batch rather than throwing", async () => {
    const file = seedOne("Draft");
    const result = await cmdDeprecate(file, undefined as unknown as string[]);
    expect(result.ok).toBe(true);
    expect(result.result!.updated).toEqual([]);
  });

  it("treats a document with specs missing from disk as empty (target_not_found)", async () => {
    const file = specsFile();
    fs.writeFileSync(file, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdDeprecate(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });
});

describe("cmdDeprecate — idempotency and invalid transitions", () => {
  it("is idempotent on an already-Deprecated spec", async () => {
    const file = seedOne("Deprecated");
    const result = await cmdDeprecate(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(true);
    expect(result.result!.updated).toEqual([{ id: "FR-CHK-0001", status: "Deprecated" }]);
  });

  it("returns invalid_transition for a Removed target", async () => {
    const file = seedOne("Removed");
    const result = await cmdDeprecate(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_transition");
  });

  it("returns target_not_found for a missing id", async () => {
    const file = seedOne("Draft");
    const result = await cmdDeprecate(file, ["FR-CHK-9999"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });
});
