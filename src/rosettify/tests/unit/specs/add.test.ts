/**
 * Unit tests for commands/specs/add.ts (cmdAdd). FR-SPECS-0010.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdAdd } from "../../../src/commands/specs/add.js";
import { loadSpecs, saveSpecs } from "../../../src/commands/specs/core.js";
import { makeAddItem, makeDoc, makeSpec } from "../../fixtures/specs.js";
import type { SpecWriteResult } from "../../../src/commands/specs/output.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-add-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("cmdAdd — happy path", () => {
  it("appends a valid item, defaulting status=Draft, implementation=NotStarted, and stamps changed/changed_by", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem()], "tester");
    expect(result.ok).toBe(true);
    const write = result.result as SpecWriteResult;
    expect(write.affected).toEqual([{ id: "FR-CHK-0001", status: "Draft" }]);

    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1);
    const spec = doc.specs[0]!;
    expect(spec.status).toBe("Draft");
    expect(spec.implementation).toBe("NotStarted");
    expect(spec.approved_by).toBe("");
    expect(spec.changed_by).toBe("tester");
    expect(spec.changed).toMatch(/Z$/);
  });

  it("creates the document (and parent dirs) when it does not exist", async () => {
    const file = path.join(tmpDir, "nested", "specs.json");
    const result = await cmdAdd(file, [makeAddItem()]);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("appends a two-element array in one write", async () => {
    const file = specsFile();
    const items = [makeAddItem({ id: "FR-CHK-0001" }), makeAddItem({ id: "FR-CHK-0002" })];
    const result = await cmdAdd(file, items);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(2);
  });

  it("ignores a caller-supplied status/approved_by/implementation on add (guarded, FR-SPECS-0040)", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [
      makeAddItem({ status: "Approved", approved_by: "sneaky", implementation: "Implemented" }),
    ]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft");
    expect(doc.specs[0]!.approved_by).toBe("");
    expect(doc.specs[0]!.implementation).toBe("NotStarted");
  });

  it("returns the shared SpecWriteResult shape with document summary", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem()]);
    const write = result.result as SpecWriteResult;
    expect(write.document.component).toBe("");
    expect(write.document.total).toBe(1);
    expect(write.document.previous_version).toBeNull();
  });

  it("second add on an existing document surfaces a non-null previous_version", async () => {
    const file = specsFile();
    await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0001" })]);
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0002" })]);
    const write = result.result as SpecWriteResult;
    expect(write.document.previous_version).toContain(".bak000");
  });
});

describe("cmdAdd — field defaulting edge cases", () => {
  it("returns invalid_spec_field for a non-object item (e.g. a bare string)", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, ["not an object"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("returns invalid_spec_field for an array-shaped item", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [["nested", "array"]]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("honors an explicit non-empty level instead of the 'System' default", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ level: "Component" })]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.level).toBe("Component");
  });

  it("carries through ticket_id and classification when supplied", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ ticket_id: "CTORNDGAIN-9999", classification: "business" })]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.ticket_id).toBe("CTORNDGAIN-9999");
    expect(doc.specs[0]!.classification).toBe("business");
  });

  it("returns missing_required_field when statement is omitted (statement defaults to '' first)", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["statement"];
    const result = await cmdAdd(file, [item]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("returns missing_required_field when acceptance is omitted entirely (defaults to [])", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["acceptance"];
    const result = await cmdAdd(file, [item]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("appends to an existing document that is missing the specs key entirely (legacy/malformed)", async () => {
    const file = specsFile();
    fs.writeFileSync(
      file,
      JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [{ code: "CHK", name: "CHK" }] }),
    );
    const result = await cmdAdd(file, [makeAddItem()]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1);
  });
});

describe("cmdAdd — area self-registration (FR-SPECS-0004)", () => {
  it("registers a brand-new area on a fresh document instead of rejecting unknown_area", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CLI-0001" })]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.areas).toContainEqual({ code: "CLI", name: "CLI" });
  });

  it("leaves areas unchanged when the area is already registered", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ areas: [{ code: "CHK", name: "Checkout" }] }));
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0002" })]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.areas).toEqual([{ code: "CHK", name: "Checkout" }]);
  });
});

describe("cmdAdd — validation errors", () => {
  it("returns missing_id when an item lacks id", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["id"];
    const result = await cmdAdd(file, [item]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_id");
  });

  it("returns invalid_type for a bad type value, aggregated with the item's id", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ type: "GOAL" })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_type");
    expect(result.error).toContain("FR-CHK-0001");
  });

  it("returns invalid_spec_field for an unknown field", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ foo: "bar" })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("returns missing_required_field when title is omitted", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["title"];
    const result = await cmdAdd(file, [item]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("returns invalid_id_format for a malformed id", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-8" })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_id_format");
  });

  it("returns invalid_source for a bad source value", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ source: "Magic" })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_source");
  });

  it("returns invalid_priority for a bad priority value", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ priority: "Urgent" })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_priority");
  });

  it("returns invalid_verification for a bad verification value", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ verification: "Vibes" })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_verification");
  });

  it("returns duplicate_id when the id already exists in the document", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0001" })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("duplicate_id");
  });

  it("returns unknown_dependency when depends_on references a nonexistent id (not created in the same batch)", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ depends_on: ["FR-CHK-9999"] })]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("unknown_dependency");
  });

  it("succeeds when a single batch adds A and B where B depends_on A (FR-SPECS-0005)", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [
      makeAddItem({ id: "FR-CHK-0001" }),
      makeAddItem({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
    ]);
    expect(result.ok).toBe(true);
  });

  it("returns dependency_cycle for A depends_on B and B depends_on A in one batch", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [
      makeAddItem({ id: "FR-CHK-0001", depends_on: ["FR-CHK-0002"] }),
      makeAddItem({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("dependency_cycle");
  });

  it("all-or-nothing: nothing is written when the second of two items is invalid", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0001" }), { id: "FR-CHK-0002" }]);
    expect(result.ok).toBe(false);
    expect(fs.existsSync(file)).toBe(false);
  });

  it("all-or-nothing: a 3-item batch with 2 invalid items writes nothing and names BOTH failing refs and reasons", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [
      makeAddItem({ id: "FR-CHK-0001" }), // valid
      { id: "FR-CHK-0002" }, // invalid — no type at all
      makeAddItem({ id: "FR-CHK-0003", source: "Magic" }), // invalid — bad source enum
    ]);
    expect(result.ok).toBe(false);
    expect(fs.existsSync(file)).toBe(false); // nothing written — not even the one valid item
    // Both rejected items are named by id, each with its own distinct reason — a caller reading
    // this one string sees every problem at once, not just the first (FR-SPECS-0030).
    expect(result.error).toContain("FR-CHK-0002");
    expect(result.error).toContain("invalid_type");
    expect(result.error).toContain("FR-CHK-0003");
    expect(result.error).toContain("invalid_source");
    expect(result.error).not.toContain("FR-CHK-0001"); // the valid item is never named as a failure
  });

  it("returns missing_data for an empty items array", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, []);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_data");
    expect(result.include_help).toBe(true);
  });
});
