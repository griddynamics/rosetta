/**
 * Unit tests for commands/specs/restore.ts (cmdRestore). FR-SPECS-0019.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdRestore } from "../../../src/commands/specs/restore.js";
import { loadSpecs, saveSpecs, type StatusEnum } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-restore-"));
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

describe("cmdRestore — Removed -> Draft", () => {
  it("moves a Removed spec back to Draft", async () => {
    const file = seedOne("Removed");
    const result = await cmdRestore(file, ["FR-CHK-0001"], "tester");
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft");
    expect(doc.specs[0]!.changed_by).toBe("tester");
  });
});

describe("cmdRestore — defensive fallbacks for malformed inputs", () => {
  it("treats ids=undefined as an empty batch rather than throwing", async () => {
    const file = seedOne("Removed");
    const result = await cmdRestore(file, undefined as unknown as string[]);
    expect(result.ok).toBe(true);
    expect(result.result!.updated).toEqual([]);
  });
});

describe("cmdRestore — invalid transitions (not idempotent)", () => {
  it.each(["Draft", "Modified", "Approved", "Deprecated"] as StatusEnum[])(
    "returns invalid_transition for a %s target (restore is not a no-op)",
    async (status) => {
      const file = seedOne(status);
      const result = await cmdRestore(file, ["FR-CHK-0001"]);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("invalid_transition");
    },
  );

  it("returns target_not_found for a missing id", async () => {
    const file = seedOne("Removed");
    const result = await cmdRestore(file, ["FR-CHK-9999"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });
});
