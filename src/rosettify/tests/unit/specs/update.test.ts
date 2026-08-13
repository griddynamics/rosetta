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
      { id: "FR-CHK-0001", acceptance: [{ ears: "event", when: "an item is added", system: "the system", shall: "recompute" }] },
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
    // FR-SPECS-0009's immutable-id guarantee is structurally enforced, not checked, under
    // id-as-target addressing (see update.ts's comment where the target is resolved): the
    // patch's `id` IS how the target is found, so there is no way to author a patch whose body
    // carries a "different" id than the one it targeted. What update.ts actually guarantees — and
    // what this test verifies directly — is the real-world contract: after any successful update,
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

  // FR-SPECS-0001 — `level` is a fixed value set, so a patch that leaves the merged spec outside
  // the enum is rejected rather than persisted.
  it("returns invalid_level for a patch that leaves an invalid level value", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", level: "Module" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_level");
  });

  it("accepts a patch that moves the spec to a valid level", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", level: "Subsystem" }]);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.level).toBe("Subsystem");
  });

  // FR-SPECS-0009 — the id can never change, so a patch may not leave `type` disagreeing with the
  // spec's own id prefix; such a pair could only be deleted and re-authored.
  it("returns id_type_mismatch for a patch whose type disagrees with the immutable id prefix", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", type: "NFR" }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("id_type_mismatch");
  });

  it("returns invalid_ears when a replacement criterion declares a pattern outside the five", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [
      { id: "FR-CHK-0001", acceptance: [{ ears: "continuous", system: "the system", shall: "act" }] },
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_ears");
  });

  it("returns duplicate_criterion_id when a patch supplies two criteria sharing an id", async () => {
    const file = seedOne();
    const criterion = { id: "FR-CHK-0001.AC1", ears: "ubiquitous", system: "the system", shall: "act" };
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", acceptance: [criterion, { ...criterion }] }]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("duplicate_criterion_id");
  });

  it("returns missing_required_field when a replacement criterion names no outcome", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [
      { id: "FR-CHK-0001", acceptance: [{ ears: "ubiquitous", system: "the system", shall: "" }] },
    ]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  // `acceptance` replaces wholesale under merge-patch, so a patch that carried it gets the same id
  // assignment as on add.
  it("assigns ids to the criteria a patch supplies without them", async () => {
    const file = seedOne();
    const result = await cmdUpdate(file, [
      {
        id: "FR-CHK-0001",
        acceptance: [
          { ears: "ubiquitous", system: "the system", shall: "act" },
          { ears: "event", when: "a trigger arrives", system: "the system", shall: "respond" },
        ],
      },
    ]);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.acceptance.map((c) => c.id)).toEqual(["FR-CHK-0001.AC1", "FR-CHK-0001.AC2"]);
  });

  // A patch that left `acceptance` alone is deliberately not re-validated — a partial patch is not
  // an authoring event, and completeness checks belong to add.
  it("does not re-validate stored criteria when the patch did not touch acceptance", async () => {
    const file = seedOne({ acceptance: [{ id: "hand-edited", ears: "ubiquitous", system: "the system", shall: "act" }] });
    const result = await cmdUpdate(file, [{ id: "FR-CHK-0001", notes: "just a note" }]);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.acceptance[0]!.id).toBe("hand-edited");
  });

  it("patches subsystem, component and evidence like any other field", async () => {
    const file = seedOne({ subsystem: "", component: "", evidence: [] });
    const result = await cmdUpdate(file, [
      { id: "FR-CHK-0001", subsystem: "checkout", component: "cart", evidence: ["src/cart.ts:10-24"] },
    ]);
    expect(result.ok).toBe(true);
    const spec = loadSpecs(file)!.specs[0]!;
    expect(spec.subsystem).toBe("checkout");
    expect(spec.component).toBe("cart");
    expect(spec.evidence).toEqual(["src/cart.ts:10-24"]);
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
    fs.writeFileSync(file, JSON.stringify({ system: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
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
