/**
 * Unit tests for commands/specs/update.ts (cmdUpdate). FR-SPECS-0013.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpdate } from "../../../src/commands/specs/update.js";
import { loadSpecs, saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-update-"));
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

describe("cmdUpdate — merge-patch happy path", () => {
  it("patches title, preserves other fields, stamps changed/changed_by", async () => {
    const file = seedOne({ title: "Old title", notes: "keep me" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", title: "New title" }], "tester");
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    const spec = doc.specs[0]!;
    expect(spec.title).toBe("New title");
    expect(spec.notes).toBe("keep me");
    expect(spec.changed_by).toBe("tester");
    expect(spec.changed).toMatch(/Z$/);
  });

  it("removes a key when the patch supplies null (RFC 7396)", async () => {
    const file = seedOne({ implementation_notes: "existing note" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", implementation_notes: null }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.implementation_notes).toBeUndefined();
  });

  it("applies two valid patches in one write", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002" })] }));
    const result = await cmdUpdate(file, [
      { id: "FR-CHK-0001", title: "A updated" },
      { id: "FR-CHK-0002", title: "B updated" },
    ]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.title).toBe("A updated");
    expect(doc.specs[1]!.title).toBe("B updated");
  });
});

describe("cmdUpdate — guarded fields silently dropped", () => {
  it("drops a status:Approved patch field, leaving status unchanged", async () => {
    const file = seedOne({ status: "Draft" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", status: "Approved" }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft");
  });

  it("drops approved_by/implementation/changed_by patch fields", async () => {
    const file = seedOne({ approved_by: "", implementation: "NotStarted" });
    const result = await cmdUpdate(file, [
      { id: "FR-CHK-0001", approved_by: "sneaky", implementation: "Implemented", changed_by: "sneaky" },
    ]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.approved_by).toBe("");
    expect(doc.specs[0]!.implementation).toBe("NotStarted");
    expect(doc.specs[0]!.changed_by).not.toBe("sneaky");
  });
});

describe("cmdUpdate — Approved -> Modified auto-transition (normative edit)", () => {
  it("moves an Approved spec's statement edit to Modified and clears approved_by", async () => {
    const file = seedOne({ status: "Approved", approved_by: "alice" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", statement: "The system shall do something new." }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Modified");
    expect(doc.specs[0]!.approved_by).toBe("");
  });

  it("moves an Approved spec's acceptance edit to Modified as well", async () => {
    const file = seedOne({ status: "Approved", approved_by: "alice" });
    const result = await cmdUpdate(file, [
      { id: "FR-CHK-0001", acceptance: [{ given: "g", when: "w", then: "t" }] },
    ]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Modified");
    expect(doc.specs[0]!.approved_by).toBe("");
  });

  it("leaves status unchanged for a cosmetic edit (notes only) on an Approved spec", async () => {
    const file = seedOne({ status: "Approved", approved_by: "alice" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", notes: "just a note" }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Approved");
    expect(doc.specs[0]!.approved_by).toBe("alice");
  });

  it("sets implementation to ToBeModified when a normative edit hits an Implemented spec", async () => {
    const file = seedOne({ status: "Approved", implementation: "Implemented" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", statement: "The system shall change." }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.implementation).toBe("ToBeModified");
  });

  it("leaves a Draft spec's status untouched on a normative edit (transition is Approved-only)", async () => {
    const file = seedOne({ status: "Draft" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", statement: "The system shall change." }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft");
  });
});

describe("cmdUpdate — mergePatch recursion edge cases (RFC 7396 generic merge)", () => {
  it("merges a nested object into a field whose existing value is a non-object (coerces target to {})", async () => {
    const file = seedOne({ notes: "a plain string note" });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", notes: { sub: "weird nested value" } }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.notes).toEqual({ sub: "weird nested value" });
  });

  it("merges a nested object into an optional field that was previously entirely absent", async () => {
    const file = specsFile();
    const spec = makeSpec({ id: "FR-CHK-0001" }) as Record<string, unknown>;
    delete spec["ticket_id"];
    saveSpecs(file, makeDoc({ specs: [spec as ReturnType<typeof makeSpec>] }));
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", ticket_id: "CTORNDGAIN-9999" }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.ticket_id).toBe("CTORNDGAIN-9999");
  });
});

describe("cmdUpdate — errors", () => {
  it("never changes a spec's id — the patch's id is always the lookup key, so the stored id is untouched by the patch body", async () => {
    // FR-SPECS-0013's immutable_id error is structurally unreachable under id-as-target
    // addressing (see update.ts's comment at the validateImmutableId call site): the patch's
    // `id` IS how the target is found, so there is no way to author a patch whose body carries
    // a "different" id than the one it targeted. What update.ts actually guarantees — and what
    // this test verifies directly — is the real-world contract: after any successful update,
    // the spec's id is exactly what it was before.
    const file = seedOne();
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", title: "changed the title, not the id" }]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.id).toBe("FR-CHK-0001");
  });

  it("returns target_not_found for a patch targeting a missing id", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [{ id: "FR-CHK-9999", title: "x" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });

  it("returns invalid_data for a non-object patch item (string)", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, ["a string patch"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_data");
  });

  it("returns invalid_data for a non-object patch item (number)", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [42]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_data");
  });

  it("returns missing_id for a patch object with no id", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [{ title: "no id here" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_id");
  });

  it("returns missing_data for an empty patches array", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, []);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_data");
    expect(result.include_help).toBe(true);
  });

  it("returns invalid_spec_field for an unknown key in the patch", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", bogus_field: "x" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("returns invalid_source for a patch that leaves an invalid source enum value", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", source: "Magic" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_source");
  });

  it("all-or-nothing: a batch with one bad patch writes nothing", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", title: "original" })] }));
    const result = await cmdUpdate(file, [
      { id: "FR-CHK-0001", title: "should not persist" },
      { id: "FR-CHK-9999", title: "missing target" },
    ]);
    expect(result.ok).toBe(false);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.title).toBe("original");
  });

  it("treats a document with specs missing from disk as having no targets (target_not_found)", async () => {
    const file = specsFile();
    fs.writeFileSync(file, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", title: "x" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });

  it("returns dependency_cycle when a patch introduces a depends_on cycle", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] })] }),
    );
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", depends_on: ["FR-CHK-0002"] }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("dependency_cycle");
  });
});
