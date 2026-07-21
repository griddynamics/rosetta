/**
 * Unit tests for commands/specs/delete.ts (cmdDelete — soft-delete). FR-SPECS-0014.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdDelete } from "../../../src/commands/specs/delete.js";
import { loadSpecs, saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-delete-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("cmdDelete — soft-delete", () => {
  it("sets status=Removed and retains the unit, reporting it in removed", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", status: "Draft" })] }));
    const result = await cmdDelete(file, ["FR-CHK-0001"], "tester");
    expect(result.ok).toBe(true);
    expect(result.result!.removed).toEqual(["FR-CHK-0001"]);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1);
    expect(doc.specs[0]!.status).toBe("Removed");
    expect(doc.specs[0]!.changed_by).toBe("tester");
  });

  it("is idempotent on an already-Removed spec", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", status: "Removed" })] }));
    const result = await cmdDelete(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(true);
    expect(result.result!.removed).toEqual(["FR-CHK-0001"]);
  });

  it("reports a nonexistent id in missing without erroring", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdDelete(file, ["FR-CHK-9999"]);
    expect(result.ok).toBe(true);
    expect(result.result!.missing).toEqual(["FR-CHK-9999"]);
    expect(result.result!.removed).toEqual([]);
  });

  it("handles a batch of both existing and missing ids", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdDelete(file, ["FR-CHK-0001", "FR-CHK-9999"]);
    expect(result.ok).toBe(true);
    expect(result.result!.removed).toEqual(["FR-CHK-0001"]);
    expect(result.result!.missing).toEqual(["FR-CHK-9999"]);
  });

  it("a soft-deleted spec remains a valid reference target (no unknown_dependency)", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] })] }),
    );
    const result = await cmdDelete(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(true);
  });
});

describe("cmdDelete — defensive fallbacks for malformed inputs", () => {
  it("treats ids=undefined as an empty batch rather than throwing", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdDelete(file, undefined as unknown as string[]);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ removed: [], missing: [] });
  });

  it("treats a document with specs missing from disk (legacy/malformed) as empty", async () => {
    const file = specsFile();
    fs.writeFileSync(file, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdDelete(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ removed: [], missing: ["FR-CHK-0001"] });
  });
});

describe("cmdDelete — document errors", () => {
  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdDelete(specsFile("nope.json"), ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });
});
