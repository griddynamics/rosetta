/**
 * Unit tests for commands/specs/get.ts (cmdGet). FR-SPECS-0011.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdGet } from "../../../src/commands/specs/get.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-get-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("cmdGet — found/missing partial reporting", () => {
  it("returns found for an existing id and missing for a nonexistent one, without erroring", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdGet(file, ["FR-CHK-0001", "FR-CHK-9999"]);
    expect(result.ok).toBe(true);
    expect(result.result!.found.map((s) => s.id)).toEqual(["FR-CHK-0001"]);
    expect(result.result!.missing).toEqual(["FR-CHK-9999"]);
  });

  it("returns the full spec unit for a found id", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", title: "Full unit" })] }));
    const result = await cmdGet(file, ["FR-CHK-0001"]);
    expect(result.result!.found[0]!.title).toBe("Full unit");
  });
});

describe("cmdGet — returns Removed specs when explicitly addressed", () => {
  it("includes a soft-deleted spec in found", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", status: "Removed" })] }));
    const result = await cmdGet(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(true);
    expect(result.result!.found).toHaveLength(1);
    expect(result.result!.found[0]!.status).toBe("Removed");
  });
});

describe("cmdGet — document errors", () => {
  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdGet(specsFile("nope.json"), ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });

  it("returns specs_file_corrupted for invalid JSON", async () => {
    const file = specsFile();
    fs.writeFileSync(file, "{{not json{{");
    const result = await cmdGet(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_file_corrupted");
  });
});

describe("cmdGet — empty ids", () => {
  it("returns found=[] missing=[] for an empty ids array", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdGet(file, []);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ found: [], missing: [] });
  });

  it("treats ids=undefined as an empty batch rather than throwing", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdGet(file, undefined as unknown as string[]);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ found: [], missing: [] });
  });
});

describe("cmdGet — defensive fallback for a document missing the specs key", () => {
  it("treats a document with specs missing from disk as empty (every id reported missing)", async () => {
    const file = specsFile();
    fs.writeFileSync(file, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdGet(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ found: [], missing: ["FR-CHK-0001"] });
  });
});
