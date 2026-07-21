/**
 * Unit tests for commands/specs/reopen.ts (cmdReopen). FR-SPECS-0020.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdReopen } from "../../../src/commands/specs/reopen.js";
import { loadSpecs, saveSpecs, type StatusEnum } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-reopen-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

function seedOne(status: StatusEnum): string {
  const file = specsFile();
  saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", status, approved_by: "alice" })] }));
  return file;
}

describe("cmdReopen — Approved -> Draft, clears approved_by", () => {
  it("moves an Approved spec back to Draft and clears approved_by", async () => {
    const file = seedOne("Approved");
    const result = await cmdReopen(file, ["FR-CHK-0001"], "tester");
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft");
    expect(doc.specs[0]!.approved_by).toBe("");
    expect(doc.specs[0]!.changed_by).toBe("tester");
  });
});

describe("cmdReopen — defensive fallbacks for malformed inputs", () => {
  it("treats ids=undefined as an empty batch rather than throwing", async () => {
    const file = seedOne("Approved");
    const result = await cmdReopen(file, undefined as unknown as string[]);
    expect(result.ok).toBe(true);
    expect(result.result!.updated).toEqual([]);
  });
});

describe("cmdReopen — invalid transitions (not idempotent)", () => {
  it.each(["Draft", "Modified", "Deprecated", "Removed"] as StatusEnum[])(
    "returns invalid_transition for a %s target",
    async (status) => {
      const file = seedOne(status);
      const result = await cmdReopen(file, ["FR-CHK-0001"]);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("invalid_transition");
    },
  );

  it("returns target_not_found for a missing id", async () => {
    const file = seedOne("Approved");
    const result = await cmdReopen(file, ["FR-CHK-9999"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });
});
