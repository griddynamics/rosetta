/**
 * Unit tests for commands/specs/implemented.ts (cmdImplemented). FR-SPECS-0015.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdImplemented } from "../../../src/commands/specs/implemented.js";
import { loadSpecs, saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-implemented-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

function seedOne(overrides: Parameters<typeof makeSpec>[0] = {}): string {
  const file = specsFile();
  saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", ...overrides })] }));
  return file;
}

describe("cmdImplemented — happy path", () => {
  it("sets implementation and notes, stamps changed/changed_by, never touches status", async () => {
    const file = seedOne({ status: "Draft", implementation: "NotStarted" });
    const result = await cmdImplemented(
      file,
      [{ id: "FR-CHK-0001", implementation: "Implemented", implementation_notes: "done in commands/specs" }],
      "tester",
    );
    expect(result.ok).toBe(true);
    expect(result.result!.updated).toEqual([{ id: "FR-CHK-0001", implementation: "Implemented" }]);
    const doc = loadSpecs(file)!;
    const spec = doc.specs[0]!;
    expect(spec.implementation).toBe("Implemented");
    expect(spec.implementation_notes).toBe("done in commands/specs");
    expect(spec.status).toBe("Draft");
    expect(spec.changed_by).toBe("tester");
  });

  it("sets implementation without notes when notes are omitted", async () => {
    const file = seedOne({ implementation_notes: "kept" });
    const result = await cmdImplemented(file, [{ id: "FR-CHK-0001", implementation: "Planned" }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.implementation).toBe("Planned");
    expect(doc.specs[0]!.implementation_notes).toBe("kept");
  });

  it("accepts every ImplEnum value", async () => {
    for (const value of ["NotStarted", "Implemented", "Planned", "ToBeModified", "ToBeRemoved"]) {
      const file = seedOne();
      const result = await cmdImplemented(file, [{ id: "FR-CHK-0001", implementation: value }]);
      expect(result.ok).toBe(true);
    }
  });
});

describe("cmdImplemented — malformed item shapes", () => {
  it("returns invalid_spec_field for a non-object item", async () => {
    const file = seedOne();
    const result = await cmdImplemented(file, ["not an object"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("returns missing_id when id is present but not a string", async () => {
    const file = seedOne();
    const result = await cmdImplemented(file, [{ id: 123, implementation: "Implemented" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_id");
  });

  it("treats a document with specs missing from disk as target_not_found", async () => {
    const file = specsFile();
    fs.writeFileSync(file, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdImplemented(file, [{ id: "FR-CHK-0001", implementation: "Implemented" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });
});

describe("cmdImplemented — errors", () => {
  it("returns invalid_implementation for a bad value", async () => {
    const file = seedOne();
    const result = await cmdImplemented(file, [{ id: "FR-CHK-0001", implementation: "Done" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_implementation");
  });

  it("returns target_not_found for a missing id", async () => {
    const file = seedOne();
    const result = await cmdImplemented(file, [{ id: "FR-CHK-9999", implementation: "Implemented" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });

  it("returns missing_implementation when implementation is omitted", async () => {
    const file = seedOne();
    const result = await cmdImplemented(file, [{ id: "FR-CHK-0001" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_implementation");
  });

  it("returns missing_implementation for an empty-string implementation", async () => {
    const file = seedOne();
    const result = await cmdImplemented(file, [{ id: "FR-CHK-0001", implementation: "" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_implementation");
  });

  it("returns missing_data for an empty items array", async () => {
    const file = seedOne();
    const result = await cmdImplemented(file, []);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_data");
  });

  it("all-or-nothing: nothing is written when one item in the batch is invalid", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", implementation: "NotStarted" }), makeSpec({ id: "FR-CHK-0002", implementation: "NotStarted" })] }),
    );
    const result = await cmdImplemented(file, [
      { id: "FR-CHK-0001", implementation: "Implemented" },
      { id: "FR-CHK-0002", implementation: "Bogus" },
    ]);
    expect(result.ok).toBe(false);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.implementation).toBe("NotStarted"); // the valid item was not applied either
    expect(doc.specs[1]!.implementation).toBe("NotStarted"); // the invalid item, unsurprisingly, also untouched
  });
});
