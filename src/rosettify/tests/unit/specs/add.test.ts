/**
 * Unit tests for commands/specs/add.ts (cmdAdd). FR-SPECS-0010.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdAdd } from "../../../src/commands/specs/add.js";
import { loadSpecs, saveSpecs, RESERVED_NFR_AREAS } from "../../../src/commands/specs/core.js";
import { SPECS_MAX_EVIDENCE_PER_SPEC } from "../../../src/shared/constants.js";
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

// FR-SPECS-0002 — creating a document now requires a caller-supplied system; every call below
// that targets a file which does not yet exist carries this constant so the test still exercises
// the behavior it was written for, rather than tripping missing_system first.
const SYSTEM = "checkout";

describe("cmdAdd — happy path", () => {
  it("appends a valid item, defaulting status=Draft, implementation=NotStarted, and stamps changed/changed_by", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem()], "tester", SYSTEM);
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
    const result = await cmdAdd(file, [makeAddItem()], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("appends a two-element array in one write", async () => {
    const file = specsFile();
    const items = [makeAddItem({ id: "FR-CHK-0001" }), makeAddItem({ id: "FR-CHK-0002" })];
    const result = await cmdAdd(file, items, undefined, SYSTEM);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(2);
  });

  it("ignores a caller-supplied status/approved_by/implementation on add (guarded, FR-SPECS-0040)", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ status: "Approved", approved_by: "sneaky", implementation: "Implemented" })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft");
    expect(doc.specs[0]!.approved_by).toBe("");
    expect(doc.specs[0]!.implementation).toBe("NotStarted");
  });

  it("returns the shared SpecWriteResult shape with document summary", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem()], undefined, SYSTEM);
    const write = result.result as SpecWriteResult;
    expect(write.document.system).toBe(SYSTEM);
    expect(write.document.total).toBe(1);
    expect(write.document.previous_version).toBeNull();
  });

  it("second add on an existing document surfaces a non-null previous_version", async () => {
    const file = specsFile();
    await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0001" })], undefined, SYSTEM);
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0002" })]);
    const write = result.result as SpecWriteResult;
    expect(write.document.previous_version).toContain(".bak000");
  });
});

describe("cmdAdd — field defaulting edge cases", () => {
  it("returns invalid_spec_field for a non-object item (e.g. a bare string)", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, ["not an object"], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("returns invalid_spec_field for an array-shaped item", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [["nested", "array"]], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("honors an explicit non-empty level instead of the 'System' default", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ level: "Component" })], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.level).toBe("Component");
  });

  // FR-SPECS-0001 AC3 — the command assigns an omitted criterion id, so a caller may supply some
  // and leave the rest to the tool; a supplied id is never renumbered, only checked.
  it("assigns <spec-id>.AC<n> to a criterion supplied without an id", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem()], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.acceptance[0]!.id).toBe("FR-CHK-0001.AC1");
  });

  it("numbers several id-less criteria in order", async () => {
    const file = specsFile();
    const criterion = { ears: "ubiquitous", system: "the system", shall: "act" };
    const result = await cmdAdd(file, [makeAddItem({ acceptance: [criterion, { ...criterion }] })], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.acceptance.map((c) => c.id)).toEqual(["FR-CHK-0001.AC1", "FR-CHK-0001.AC2"]);
  });

  it("never renumbers a criterion id the caller supplied", async () => {
    const file = specsFile();
    const supplied = { id: "FR-CHK-0001.AC5", ears: "ubiquitous", system: "the system", shall: "act" };
    const bare = { ears: "event", when: "a trigger arrives", system: "the system", shall: "respond" };
    const result = await cmdAdd(file, [makeAddItem({ acceptance: [supplied, bare] })], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.acceptance.map((c) => c.id)).toEqual(["FR-CHK-0001.AC5", "FR-CHK-0001.AC1"]);
  });

  it("stores a criterion's condition word alongside its pattern", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ acceptance: [{ ears: "unwanted", if: "the card is declined", system: "the system", shall: "hold the order" }] })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.acceptance[0]).toEqual({
      id: "FR-CHK-0001.AC1",
      ears: "unwanted",
      if: "the card is declined",
      system: "the system",
      shall: "hold the order",
    });
  });

  // FR-SPECS-0001 — an empty subsystem/component means the author did not know the location,
  // never that none applies, so both default to empty rather than being required.
  it("defaults subsystem, component and evidence when they are omitted", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem()], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    const spec = loadSpecs(file)!.specs[0]!;
    expect(spec.subsystem).toBe("");
    expect(spec.component).toBe("");
    expect(spec.evidence).toEqual([]);
  });

  it("carries subsystem, component and evidence through when supplied", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ level: "Component", subsystem: "checkout", component: "cart", evidence: ["src/cart.ts:10-24"] })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(true);
    const spec = loadSpecs(file)!.specs[0]!;
    expect(spec.subsystem).toBe("checkout");
    expect(spec.component).toBe("cart");
    expect(spec.evidence).toEqual(["src/cart.ts:10-24"]);
  });

  it("carries through ticket_id and classification when supplied", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ ticket_id: "CTORNDGAIN-9999", classification: "business" })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.ticket_id).toBe("CTORNDGAIN-9999");
    expect(doc.specs[0]!.classification).toBe("business");
  });

  it("returns missing_required_field when statement is omitted (statement defaults to '' first)", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["statement"];
    const result = await cmdAdd(file, [item], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("returns missing_required_field when acceptance is omitted entirely (defaults to [])", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["acceptance"];
    const result = await cmdAdd(file, [item], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("appends to an existing document that is missing the specs key entirely (legacy/malformed)", async () => {
    const file = specsFile();
    fs.writeFileSync(
      file,
      JSON.stringify({ system: "x", description: "", created_at: "t", updated_at: "t", areas: [{ code: "CHK", name: "CHK" }] }),
    );
    const result = await cmdAdd(file, [makeAddItem()]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1);
  });
});

describe("cmdAdd — area self-registration (FR-SPECS-0004)", () => {
  it("registers a brand-new area on a fresh document rather than refusing the write", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CLI-0001" })], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.areas).toContainEqual({ code: "CLI", name: "CLI" });
  });

  it("does not re-register or rename an area that is already registered", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ areas: [{ code: "CHK", name: "Checkout" }] }));
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0002" })]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    // The author's own name for CHK survives, and the code appears exactly once — autoRegisterAreas
    // must not append a second {code:"CHK", name:"CHK"} beside it.
    expect(doc.areas.filter((a) => a.code === "CHK")).toEqual([{ code: "CHK", name: "Checkout" }]);
  });

  // FR-SPECS-0004 AC7 — an existing document is never re-created, so the write path backfills the
  // nine pre-registered quality-characteristic codes onto it.
  it("backfills the nine reserved areas onto an existing document that lacks them", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ areas: [{ code: "CHK", name: "Checkout" }] }));
    await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0002" })]);
    const doc = loadSpecs(file)!;
    expect(doc.areas).toEqual([{ code: "CHK", name: "Checkout" }, ...RESERVED_NFR_AREAS]);
  });

  it("accepts an NFR against a reserved area without registering anything new", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "NFR-PERF-0001", type: "NFR" })], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.areas).toEqual([...RESERVED_NFR_AREAS]);
  });
});

describe("cmdAdd — validation errors", () => {
  it("returns missing_id when an item lacks id", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["id"];
    const result = await cmdAdd(file, [item], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_id");
  });

  it("returns invalid_type for a bad type value, aggregated with the item's id", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ type: "GOAL" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_type");
    expect(result.error).toContain("FR-CHK-0001");
  });

  it("returns invalid_spec_field for an unknown field", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ foo: "bar" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_spec_field");
  });

  it("returns missing_required_field when title is omitted", async () => {
    const file = specsFile();
    const item = makeAddItem();
    delete (item as Record<string, unknown>)["title"];
    const result = await cmdAdd(file, [item], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("returns invalid_id_format for a malformed id", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-8" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_id_format");
  });

  it("returns invalid_source for a bad source value", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ source: "Magic" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_source");
  });

  it("returns invalid_priority for a bad priority value", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ priority: "Urgent" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_priority");
  });

  it("returns invalid_verification for a bad verification value", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ verification: "Vibes" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_verification");
  });

  // FR-SPECS-0001 — a supplied level is held to the enum exactly like `type`, so a typo is
  // refused rather than silently laundered into the "System" default.
  it("returns invalid_level for a level outside the enum", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ level: "Module" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_level");
    expect(result.error).toContain("FR-CHK-0001");
  });

  it("defaults level to System when it is omitted entirely", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem()], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.level).toBe("System");
  });

  it("defaults level to System when it is supplied as an empty string", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ level: "" })], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.level).toBe("System");
  });

  // FR-SPECS-0009 — the id prefix and `type` must agree, because the id can never change
  // afterwards and a disagreeing pair could only be deleted and re-authored.
  it("returns id_type_mismatch when the type disagrees with the id prefix", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "NFR-PERF-0001", type: "FR" })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("id_type_mismatch");
  });

  it("returns invalid_ears when a criterion declares a pattern outside the five", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ acceptance: [{ ears: "continuous", system: "the system", shall: "act" }] })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_ears");
  });

  it("returns missing_required_field when a criterion names no responder", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ acceptance: [{ ears: "ubiquitous", system: "", shall: "act" }] })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("returns missing_required_field when a criterion names no outcome", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ acceptance: [{ ears: "ubiquitous", system: "the system", shall: "" }] })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_required_field");
  });

  it("returns duplicate_criterion_id when two criteria in one unit share an id", async () => {
    const file = specsFile();
    const criterion = { id: "FR-CHK-0001.AC1", ears: "ubiquitous", system: "the system", shall: "act" };
    const result = await cmdAdd(file, [makeAddItem({ acceptance: [criterion, { ...criterion }] })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("duplicate_criterion_id");
  });

  it("returns size_limit_exceeded when a spec cites more than the maximum evidence locations", async () => {
    const file = specsFile();
    const evidence = Array.from({ length: SPECS_MAX_EVIDENCE_PER_SPEC + 1 }, (_, i) => `src/cart.ts:${i + 1}-${i + 2}`);
    const result = await cmdAdd(file, [makeAddItem({ evidence })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("size_limit_exceeded");
  });

  it("accepts a spec citing exactly the maximum evidence locations", async () => {
    const file = specsFile();
    const evidence = Array.from({ length: SPECS_MAX_EVIDENCE_PER_SPEC }, (_, i) => `src/cart.ts:${i + 1}-${i + 2}`);
    const result = await cmdAdd(file, [makeAddItem({ evidence })], undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.specs[0]!.evidence).toHaveLength(SPECS_MAX_EVIDENCE_PER_SPEC);
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
    const result = await cmdAdd(file, [makeAddItem({ depends_on: ["FR-CHK-9999"] })], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("unknown_dependency");
  });

  it("succeeds when a single batch adds A and B where B depends_on A (FR-SPECS-0005)", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [makeAddItem({ id: "FR-CHK-0001" }), makeAddItem({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] })],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(true);
  });

  it("returns dependency_cycle for A depends_on B and B depends_on A in one batch", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [
        makeAddItem({ id: "FR-CHK-0001", depends_on: ["FR-CHK-0002"] }),
        makeAddItem({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
      ],
      undefined,
      SYSTEM,
    );
    expect(result.ok).toBe(false);
    expect(result.error).toContain("dependency_cycle");
  });

  it("all-or-nothing: nothing is written when the second of two items is invalid", async () => {
    const file = specsFile();
    const result = await cmdAdd(file, [makeAddItem({ id: "FR-CHK-0001" }), { id: "FR-CHK-0002" }], undefined, SYSTEM);
    expect(result.ok).toBe(false);
    expect(fs.existsSync(file)).toBe(false);
  });

  it("all-or-nothing: a 3-item batch with 2 invalid items writes nothing and names BOTH failing refs and reasons", async () => {
    const file = specsFile();
    const result = await cmdAdd(
      file,
      [
        makeAddItem({ id: "FR-CHK-0001" }), // valid
        { id: "FR-CHK-0002" }, // invalid — no type at all
        makeAddItem({ id: "FR-CHK-0003", source: "Magic" }), // invalid — bad source enum
      ],
      undefined,
      SYSTEM,
    );
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
