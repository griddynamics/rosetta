/**
 * Unit tests for commands/specs/core.ts — types, enums, validators, plain document I/O.
 * FR-SPECS-0001..0007, 0040.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  ID_RE,
  parseId,
  validateIdFormat,
  validateAreaRegistration,
  autoRegisterAreas,
  validateType,
  validateLevel,
  validateEars,
  validateIdTypeConsistency,
  validateCriteria,
  assignCriterionIds,
  ensureReservedAreas,
  validateSource,
  validatePriority,
  validateVerification,
  validateKnownFields,
  validateRequired,
  validateUniqueIds,
  validateReferences,
  validateDependsAcyclic,
  validateSizeLimits,
  stripGuarded,
  loadSpecs,
  saveSpecs,
  newDocument,
  GUARDED_FIELDS,
  EARS_PATTERNS,
  EARS_CONDITION_WORD,
  LEVELS,
  RESERVED_NFR_AREAS,
} from "../../../src/commands/specs/core.js";
import {
  SPECS_MAX_SPECS,
  SPECS_MAX_DEPENDENCIES_PER_SPEC,
  SPECS_MAX_ACCEPTANCE_PER_SPEC,
  SPECS_MAX_EVIDENCE_PER_SPEC,
  SPECS_MAX_NAME_LENGTH,
  SPECS_MAX_STRING_LENGTH,
} from "../../../src/shared/constants.js";
import { makeAcceptance, makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-core-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

// ---------------------------------------------------------------------------
// ID_RE / parseId / validateIdFormat — FR-SPECS-0004
// ---------------------------------------------------------------------------

describe("ID_RE / validateIdFormat — FR-SPECS-0004", () => {
  it.each([
    ["FR-CHK-0001", true],
    ["NFR-SPECS-0007", true],
    ["INT-API-0123", true],
    ["DATA-CORE-9999", true],
  ])("accepts valid id %s", (id) => {
    expect(ID_RE.test(id)).toBe(true);
    expect(validateIdFormat(id)).toBeNull();
  });

  it("rejects a short/non-4-digit sequence (FR-SPECS-8)", () => {
    expect(ID_RE.test("FR-SPECS-8")).toBe(false);
    expect(validateIdFormat("FR-SPECS-8")).toBe("invalid_id_format");
  });

  it("rejects a non-4-digit (5-digit) sequence", () => {
    expect(validateIdFormat("FR-SPECS-00001")).toBe("invalid_id_format");
  });

  it("rejects an unknown prefix", () => {
    expect(validateIdFormat("GOAL-CHK-0001")).toBe("invalid_id_format");
  });

  it("rejects lowercase area", () => {
    expect(validateIdFormat("FR-chk-0001")).toBe("invalid_id_format");
  });

  it("rejects missing area segment", () => {
    expect(validateIdFormat("FR-0001")).toBe("invalid_id_format");
  });
});

describe("parseId — FR-SPECS-0004", () => {
  it("parses prefix/area/seq from a valid id", () => {
    expect(parseId("FR-CHK-0012")).toEqual({ prefix: "FR", area: "CHK", seq: 12 });
  });

  it("returns null for a malformed id", () => {
    expect(parseId("not-an-id")).toBeNull();
  });

  it("parses a multi-char area mnemonic", () => {
    expect(parseId("NFR-SPECS-0001")).toEqual({ prefix: "NFR", area: "SPECS", seq: 1 });
  });
});

// ---------------------------------------------------------------------------
// validateAreaRegistration / autoRegisterAreas — FR-SPECS-0004
// ---------------------------------------------------------------------------

// FR-SPECS-0021 — validate-only now: on every write path autoRegisterAreas() registers a
// brand-new area before this could ever fire, so the boolean it returns is read only by
// validate's area_registration check (see validate.test.ts for that reachable path).
describe("validateAreaRegistration — FR-SPECS-0004/0021", () => {
  it("returns false when the area is registered", () => {
    const doc = makeDoc({ areas: [{ code: "CHK", name: "Checkout" }] });
    const spec = makeSpec({ id: "FR-CHK-0001" });
    expect(validateAreaRegistration(spec, doc)).toBe(false);
  });

  it("returns true when the area is not registered", () => {
    const doc = makeDoc({ areas: [] });
    const spec = makeSpec({ id: "FR-XYZ-0001" });
    expect(validateAreaRegistration(spec, doc)).toBe(true);
  });

  it("returns false (defers to validateIdFormat) for an unparseable id", () => {
    const doc = makeDoc({ areas: [] });
    const spec = makeSpec({ id: "not-an-id" });
    expect(validateAreaRegistration(spec, doc)).toBe(false);
  });

  // FR-SPECS-0004 AC4 — the nine reserved codes count as registered even in a legacy document
  // whose registry has not materialised them, so a read-only pass stays clean.
  it.each(RESERVED_NFR_AREAS.map((a) => a.code))("returns false for reserved code %s even when areas is empty", (code) => {
    const doc = makeDoc({ areas: [] });
    const spec = makeSpec({ id: `NFR-${code}-0001`, type: "NFR" });
    expect(validateAreaRegistration(spec, doc)).toBe(false);
  });
});

describe("autoRegisterAreas — FR-SPECS-0004 (add/migrate self-registration)", () => {
  it("registers a brand-new area with name=code on a fresh document", () => {
    const doc = makeDoc({ areas: [] });
    autoRegisterAreas(doc, ["FR-CLI-0001"]);
    expect(doc.areas).toEqual([{ code: "CLI", name: "CLI" }]);
  });

  it("leaves an already-registered area's areas array unchanged", () => {
    const doc = makeDoc({ areas: [{ code: "CHK", name: "Checkout" }] });
    autoRegisterAreas(doc, ["FR-CHK-0002"]);
    expect(doc.areas).toEqual([{ code: "CHK", name: "Checkout" }]);
  });

  it("does not register duplicates for two ids sharing the same new area", () => {
    const doc = makeDoc({ areas: [] });
    autoRegisterAreas(doc, ["FR-CLI-0001", "FR-CLI-0002"]);
    expect(doc.areas).toEqual([{ code: "CLI", name: "CLI" }]);
  });

  it("skips ids that fail ID_RE (left to validateIdFormat)", () => {
    const doc = makeDoc({ areas: [] });
    autoRegisterAreas(doc, ["not-an-id"]);
    expect(doc.areas).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// validateType / validateSource / validatePriority / validateVerification — FR-SPECS-0001/0003
// ---------------------------------------------------------------------------

describe("validateType — FR-SPECS-0003", () => {
  it.each(["FR", "NFR", "INT", "DATA"])("accepts %s", (t) => {
    expect(validateType(t)).toBeNull();
  });

  it("rejects an unknown type", () => {
    expect(validateType("GOAL")).toBe("invalid_type");
  });

  it("rejects a non-string type", () => {
    expect(validateType(123)).toBe("invalid_type");
  });
});

// ---------------------------------------------------------------------------
// validateLevel / validateEars / validateIdTypeConsistency — FR-SPECS-0001, 0009
// ---------------------------------------------------------------------------

describe("validateLevel — FR-SPECS-0001", () => {
  it.each(["System", "Subsystem", "Component"])("accepts %s", (l) => {
    expect(validateLevel(l)).toBeNull();
  });

  it("exposes exactly the three levels", () => {
    expect(LEVELS).toEqual(["System", "Subsystem", "Component"]);
  });

  it("rejects an unknown level", () => {
    expect(validateLevel("Module")).toBe("invalid_level");
  });

  it("rejects a level differing only in case", () => {
    expect(validateLevel("system")).toBe("invalid_level");
  });

  it("rejects a non-string level", () => {
    expect(validateLevel(1)).toBe("invalid_level");
  });

  it("rejects an omitted level", () => {
    expect(validateLevel(undefined)).toBe("invalid_level");
  });
});

describe("validateEars — FR-SPECS-0001", () => {
  it.each(["ubiquitous", "event", "state", "optional", "unwanted"])("accepts %s", (e) => {
    expect(validateEars(e)).toBeNull();
  });

  it("exposes exactly the five EARS patterns", () => {
    expect(EARS_PATTERNS).toEqual(["ubiquitous", "event", "state", "optional", "unwanted"]);
  });

  it("rejects a pattern outside the enum", () => {
    expect(validateEars("continuous")).toBe("invalid_ears");
  });

  it("rejects a non-string ears", () => {
    expect(validateEars(null)).toBe("invalid_ears");
  });

  // FR-SPECS-0006 — the condition word each pattern names, the single source shared by the write
  // check, the validate check and the markup round trip.
  it("maps each EARS pattern to exactly the condition word it names", () => {
    expect(EARS_CONDITION_WORD).toEqual({
      ubiquitous: null,
      event: "when",
      state: "while",
      optional: "where",
      unwanted: "if",
    });
  });

  it("covers every pattern in EARS_PATTERNS with a condition-word entry", () => {
    for (const pattern of EARS_PATTERNS) {
      expect(EARS_CONDITION_WORD).toHaveProperty(pattern);
    }
  });
});

describe("validateIdTypeConsistency — FR-SPECS-0009", () => {
  it.each([
    ["FR-CHK-0001", "FR"],
    ["NFR-PERF-0001", "NFR"],
    ["INT-CHK-0001", "INT"],
    ["DATA-CHK-0001", "DATA"],
  ])("returns null when %s agrees with type %s", (id, type) => {
    expect(validateIdTypeConsistency(id, type)).toBeNull();
  });

  it("returns id_type_mismatch when the id prefix disagrees with the type", () => {
    expect(validateIdTypeConsistency("FR-CHK-0001", "NFR")).toBe("id_type_mismatch");
  });

  it("does not confuse the NFR prefix with the FR prefix", () => {
    expect(validateIdTypeConsistency("NFR-PERF-0001", "FR")).toBe("id_type_mismatch");
  });

  it("returns null (defers to validateIdFormat) for an unparseable id", () => {
    expect(validateIdTypeConsistency("not-an-id", "FR")).toBeNull();
  });

  it("returns null (defers to validateType) for a type outside the enum", () => {
    expect(validateIdTypeConsistency("FR-CHK-0001", "GOAL")).toBeNull();
  });

  it("returns null (defers to validateType) for a non-string type", () => {
    expect(validateIdTypeConsistency("FR-CHK-0001", 42)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateCriteria / assignCriterionIds — FR-SPECS-0001 AC3..AC6
// ---------------------------------------------------------------------------

describe("validateCriteria — FR-SPECS-0001 AC4/AC5/AC6", () => {
  it("returns null for a well-formed criterion", () => {
    expect(validateCriteria(makeSpec())).toBeNull();
  });

  it("returns null for a spec whose acceptance is literally undefined", () => {
    expect(validateCriteria(makeSpec({ acceptance: undefined as never }))).toBeNull();
  });

  it("returns invalid_ears when a criterion declares a pattern outside the enum", () => {
    const spec = makeSpec({ acceptance: [makeAcceptance({ ears: "continuous" as never })] });
    expect(validateCriteria(spec)).toBe("invalid_ears");
  });

  it("returns invalid_ears when a criterion omits ears entirely", () => {
    const spec = makeSpec({ acceptance: [makeAcceptance({ ears: undefined as never })] });
    expect(validateCriteria(spec)).toBe("invalid_ears");
  });

  it.each(["system", "shall"] as const)("returns missing_required_field when %s is empty", (field) => {
    const spec = makeSpec({ acceptance: [makeAcceptance({ [field]: "" })] });
    expect(validateCriteria(spec)).toBe("missing_required_field");
  });

  it.each(["system", "shall"] as const)("returns missing_required_field when %s is whitespace only", (field) => {
    const spec = makeSpec({ acceptance: [makeAcceptance({ [field]: "   " })] });
    expect(validateCriteria(spec)).toBe("missing_required_field");
  });

  it.each(["system", "shall"] as const)("returns missing_required_field when %s is absent", (field) => {
    const criterion = makeAcceptance();
    delete (criterion as Record<string, unknown>)[field];
    expect(validateCriteria(makeSpec({ acceptance: [criterion] }))).toBe("missing_required_field");
  });

  it("returns duplicate_criterion_id when two criteria in one unit share an id", () => {
    const spec = makeSpec({
      acceptance: [makeAcceptance({ id: "FR-CHK-0001.AC1" }), makeAcceptance({ id: "FR-CHK-0001.AC1" })],
    });
    expect(validateCriteria(spec)).toBe("duplicate_criterion_id");
  });

  it("accepts two criteria carrying distinct ids", () => {
    const spec = makeSpec({
      acceptance: [makeAcceptance({ id: "FR-CHK-0001.AC1" }), makeAcceptance({ id: "FR-CHK-0001.AC2" })],
    });
    expect(validateCriteria(spec)).toBeNull();
  });

  it("does not treat two id-less criteria as duplicates (the write path assigns their ids)", () => {
    const spec = makeSpec({
      acceptance: [makeAcceptance({ id: "" }), makeAcceptance({ id: "" })],
    });
    expect(validateCriteria(spec)).toBeNull();
  });

  // FR-SPECS-0006 — a condition word disagreeing with the declared pattern is a validate finding,
  // deliberately NOT a write refusal, so the two reports never collide on one item.
  it("accepts a criterion whose condition word disagrees with its pattern (validate's concern)", () => {
    const spec = makeSpec({
      acceptance: [makeAcceptance({ ears: "state", when: "an action occurs", while: undefined })],
    });
    expect(validateCriteria(spec)).toBeNull();
  });
});

describe("assignCriterionIds — FR-SPECS-0001 AC3", () => {
  it("fills an omitted id with <specId>.AC1", () => {
    const assigned = assignCriterionIds("FR-CHK-0001", [makeAcceptance({ id: "" })]);
    expect(assigned[0]!.id).toBe("FR-CHK-0001.AC1");
  });

  it("numbers several omitted ids in array order", () => {
    const assigned = assignCriterionIds("FR-CHK-0001", [
      makeAcceptance({ id: "" }),
      makeAcceptance({ id: "" }),
      makeAcceptance({ id: "" }),
    ]);
    expect(assigned.map((c) => c.id)).toEqual(["FR-CHK-0001.AC1", "FR-CHK-0001.AC2", "FR-CHK-0001.AC3"]);
  });

  it("never renumbers a supplied id", () => {
    const assigned = assignCriterionIds("FR-CHK-0001", [makeAcceptance({ id: "FR-CHK-0001.AC7" })]);
    expect(assigned[0]!.id).toBe("FR-CHK-0001.AC7");
  });

  it("skips numbers already claimed by a supplied id, whatever the array order", () => {
    const assigned = assignCriterionIds("FR-CHK-0001", [
      makeAcceptance({ id: "" }),
      makeAcceptance({ id: "FR-CHK-0001.AC1" }),
      makeAcceptance({ id: "" }),
    ]);
    expect(assigned.map((c) => c.id)).toEqual(["FR-CHK-0001.AC2", "FR-CHK-0001.AC1", "FR-CHK-0001.AC3"]);
  });

  it("treats a whitespace-only id as omitted", () => {
    const assigned = assignCriterionIds("FR-CHK-0001", [makeAcceptance({ id: "   " })]);
    expect(assigned[0]!.id).toBe("FR-CHK-0001.AC1");
  });

  it("derives the prefix from the spec id it is given", () => {
    const assigned = assignCriterionIds("NFR-PERF-0009", [makeAcceptance({ id: "" })]);
    expect(assigned[0]!.id).toBe("NFR-PERF-0009.AC1");
  });

  it("preserves every other field of the criterion it fills", () => {
    const criterion = makeAcceptance({ id: "", ears: "unwanted", when: undefined, if: "the card is declined" });
    const assigned = assignCriterionIds("FR-CHK-0001", [criterion]);
    expect(assigned[0]).toEqual({ ...criterion, id: "FR-CHK-0001.AC1" });
  });

  it("is pure — it neither mutates nor returns the input array", () => {
    const input = [makeAcceptance({ id: "" })];
    const assigned = assignCriterionIds("FR-CHK-0001", input);
    expect(assigned).not.toBe(input);
    expect(input[0]!.id).toBe("");
  });

  it("returns an empty array for an empty input", () => {
    expect(assignCriterionIds("FR-CHK-0001", [])).toEqual([]);
  });

  it("returns an empty array when the input is literally undefined", () => {
    expect(assignCriterionIds("FR-CHK-0001", undefined as never)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// ensureReservedAreas — FR-SPECS-0004 AC4/AC7
// ---------------------------------------------------------------------------

describe("ensureReservedAreas — FR-SPECS-0004 AC7", () => {
  it("registers all nine quality-characteristic codes on a document that has none", () => {
    const doc = makeDoc({ areas: [] });
    ensureReservedAreas(doc);
    expect(doc.areas).toEqual([...RESERVED_NFR_AREAS]);
  });

  it("pre-registers exactly the nine expected codes", () => {
    expect(RESERVED_NFR_AREAS.map((a) => a.code)).toEqual(["PERF", "SEC", "REL", "USE", "MAIN", "PORT", "COMP", "FUNC", "SAFE"]);
  });

  it("preserves an existing unrelated area and appends the nine after it", () => {
    const doc = makeDoc({ areas: [{ code: "CHK", name: "Checkout" }] });
    ensureReservedAreas(doc);
    expect(doc.areas[0]).toEqual({ code: "CHK", name: "Checkout" });
    expect(doc.areas).toHaveLength(1 + RESERVED_NFR_AREAS.length);
  });

  it("keeps a document's own name for a reserved code it already renamed", () => {
    const doc = makeDoc({ areas: [{ code: "SEC", name: "our security bucket" }] });
    ensureReservedAreas(doc);
    expect(doc.areas.filter((a) => a.code === "SEC")).toEqual([{ code: "SEC", name: "our security bucket" }]);
  });

  it("is idempotent — a second call adds nothing", () => {
    const doc = makeDoc({ areas: [] });
    ensureReservedAreas(doc);
    const afterFirst = [...doc.areas];
    ensureReservedAreas(doc);
    expect(doc.areas).toEqual(afterFirst);
  });

  it("initializes doc.areas when it is literally undefined", () => {
    const doc = {} as unknown as Parameters<typeof ensureReservedAreas>[0];
    ensureReservedAreas(doc);
    expect(doc.areas).toEqual([...RESERVED_NFR_AREAS]);
  });
});

describe("validateSource — FR-SPECS-0001", () => {
  it.each(["User", "Inferred", "Sources", "Documentation"])("accepts %s", (s) => {
    expect(validateSource(s)).toBeNull();
  });

  it("rejects an unknown source", () => {
    expect(validateSource("Magic")).toBe("invalid_source");
  });
});

describe("validatePriority — FR-SPECS-0001", () => {
  it.each(["Must", "Should", "Could", "Wont"])("accepts %s", (p) => {
    expect(validatePriority(p)).toBeNull();
  });

  it("rejects an unknown priority", () => {
    expect(validatePriority("Urgent")).toBe("invalid_priority");
  });
});

describe("validateVerification — FR-SPECS-0001", () => {
  it.each(["Test", "Analysis", "Inspection", "Demo"])("accepts %s", (v) => {
    expect(validateVerification(v)).toBeNull();
  });

  it("rejects an unknown verification method", () => {
    expect(validateVerification("Vibes")).toBe("invalid_verification");
  });
});

// ---------------------------------------------------------------------------
// validateKnownFields / validateRequired — FR-SPECS-0001
// ---------------------------------------------------------------------------

describe("validateKnownFields — FR-SPECS-0001", () => {
  it("returns null for an item with only known fields", () => {
    expect(validateKnownFields({ id: "x", type: "FR" })).toBeNull();
  });

  it("returns invalid_spec_field for an unknown key", () => {
    expect(validateKnownFields({ id: "x", foo: "bar" })).toBe("invalid_spec_field");
  });
});

describe("validateRequired — FR-SPECS-0001", () => {
  it("returns null for a fully-populated spec", () => {
    expect(validateRequired(makeSpec())).toBeNull();
  });

  it.each(["id", "type", "title", "statement", "source", "priority", "verification"] as const)(
    "returns missing_required_field when %s is empty",
    (field) => {
      const spec = makeSpec({ [field]: "" } as never);
      expect(validateRequired(spec)).toBe("missing_required_field");
    },
  );

  it("returns missing_required_field when a required field is undefined", () => {
    const spec = makeSpec();
    delete (spec as Record<string, unknown>)["title"];
    expect(validateRequired(spec)).toBe("missing_required_field");
  });

  it("returns missing_required_field when acceptance is an empty array", () => {
    const spec = makeSpec({ acceptance: [] });
    expect(validateRequired(spec)).toBe("missing_required_field");
  });

  it("returns missing_required_field when acceptance is not an array", () => {
    const spec = makeSpec({ acceptance: undefined as never });
    expect(validateRequired(spec)).toBe("missing_required_field");
  });
});

// ---------------------------------------------------------------------------
// validateUniqueIds — FR-SPECS-0005
// ---------------------------------------------------------------------------

describe("validateUniqueIds — FR-SPECS-0005", () => {
  it("returns null when all ids are unique", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002" })] });
    expect(validateUniqueIds(doc)).toBeNull();
  });

  it("returns duplicate_id when two specs share an id", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0001" })] });
    expect(validateUniqueIds(doc)).toBe("duplicate_id");
  });

  it("returns null for an empty specs array", () => {
    const doc = makeDoc({ specs: [] });
    expect(validateUniqueIds(doc)).toBeNull();
  });

  // FR-SPECS-0009/0016 — purge erases a spec's content, deliberately not its identity: a purged
  // id is never reusable, and this is the single enforcement point every write path reaches.
  it("returns duplicate_id when a live id collides with a purged one", () => {
    const doc = makeDoc({ purged_ids: ["FR-CHK-0001"], specs: [makeSpec({ id: "FR-CHK-0001" })] });
    expect(validateUniqueIds(doc)).toBe("duplicate_id");
  });

  it("returns null when a live id differs from every purged one", () => {
    const doc = makeDoc({ purged_ids: ["FR-CHK-0009"], specs: [makeSpec({ id: "FR-CHK-0001" })] });
    expect(validateUniqueIds(doc)).toBeNull();
  });

  it("treats a doc whose purged_ids is literally undefined as an empty registry", () => {
    const doc = makeDoc({ specs: [makeSpec()] });
    delete (doc as Record<string, unknown>)["purged_ids"];
    expect(validateUniqueIds(doc)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateReferences — FR-SPECS-0005 (unknown_dependency over BOTH depends_on and related)
// ---------------------------------------------------------------------------

describe("validateReferences — FR-SPECS-0005", () => {
  it("returns null when every depends_on/related target exists", () => {
    const doc = makeDoc({
      specs: [
        makeSpec({ id: "FR-CHK-0001", depends_on: [], related: [] }),
        makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"], related: ["FR-CHK-0001"] }),
      ],
    });
    expect(validateReferences(doc)).toBeNull();
  });

  it("returns unknown_dependency when depends_on references a missing id", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", depends_on: ["FR-CHK-9999"] })] });
    expect(validateReferences(doc)).toBe("unknown_dependency");
  });

  it("returns unknown_dependency when related references a missing id", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", related: ["FR-CHK-9999"] })] });
    expect(validateReferences(doc)).toBe("unknown_dependency");
  });

  it("treats a soft-deleted (Removed) spec as a valid reference target", () => {
    const doc = makeDoc({
      specs: [
        makeSpec({ id: "FR-CHK-0001", status: "Removed" }),
        makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
      ],
    });
    expect(validateReferences(doc)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateDependsAcyclic — FR-SPECS-0005 (depends_on cycle rejected; related NOT checked)
// ---------------------------------------------------------------------------

describe("validateDependsAcyclic — FR-SPECS-0005", () => {
  it("returns null for an acyclic depends_on graph", () => {
    const doc = makeDoc({
      specs: [
        makeSpec({ id: "FR-CHK-0001", depends_on: [] }),
        makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
      ],
    });
    expect(validateDependsAcyclic(doc)).toBeNull();
  });

  it("returns dependency_cycle for a two-node depends_on cycle", () => {
    const doc = makeDoc({
      specs: [
        makeSpec({ id: "FR-CHK-0001", depends_on: ["FR-CHK-0002"] }),
        makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
      ],
    });
    expect(validateDependsAcyclic(doc)).toBe("dependency_cycle");
  });

  it("returns dependency_cycle for a self-dependency", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", depends_on: ["FR-CHK-0001"] })] });
    expect(validateDependsAcyclic(doc)).toBe("dependency_cycle");
  });

  it("returns null for a related cycle (related is excluded from cycle detection)", () => {
    const doc = makeDoc({
      specs: [
        makeSpec({ id: "FR-CHK-0001", depends_on: [], related: ["FR-CHK-0002"] }),
        makeSpec({ id: "FR-CHK-0002", depends_on: [], related: ["FR-CHK-0001"] }),
      ],
    });
    expect(validateDependsAcyclic(doc)).toBeNull();
  });

  it("returns null for a self-related spec (related may self-reference)", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", depends_on: [], related: ["FR-CHK-0001"] })] });
    expect(validateDependsAcyclic(doc)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateSizeLimits — FR-SPECS-0007
// ---------------------------------------------------------------------------

describe("validateSizeLimits — FR-SPECS-0007", () => {
  it("returns null for a document within all limits", () => {
    const doc = makeDoc({ specs: [makeSpec()] });
    expect(validateSizeLimits(doc)).toBeNull();
  });

  it(`returns size_limit_exceeded when specs.length exceeds ${SPECS_MAX_SPECS}`, () => {
    const specs = Array.from({ length: SPECS_MAX_SPECS + 1 }, (_, i) => makeSpec({ id: `FR-CHK-${String(i).padStart(4, "0")}` }));
    const doc = makeDoc({ specs });
    expect(validateSizeLimits(doc)).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when depends_on exceeds ${SPECS_MAX_DEPENDENCIES_PER_SPEC}`, () => {
    const deps = Array.from({ length: SPECS_MAX_DEPENDENCIES_PER_SPEC + 1 }, (_, i) => `FR-CHK-${String(i).padStart(4, "0")}`);
    const doc = makeDoc({ specs: [makeSpec({ depends_on: deps })] });
    expect(validateSizeLimits(doc)).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when related exceeds ${SPECS_MAX_DEPENDENCIES_PER_SPEC}`, () => {
    const rel = Array.from({ length: SPECS_MAX_DEPENDENCIES_PER_SPEC + 1 }, (_, i) => `FR-CHK-${String(i).padStart(4, "0")}`);
    const doc = makeDoc({ specs: [makeSpec({ related: rel })] });
    expect(validateSizeLimits(doc)).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when acceptance exceeds ${SPECS_MAX_ACCEPTANCE_PER_SPEC}`, () => {
    const acceptance = Array.from({ length: SPECS_MAX_ACCEPTANCE_PER_SPEC + 1 }, () => makeAcceptance());
    const doc = makeDoc({ specs: [makeSpec({ acceptance })] });
    expect(validateSizeLimits(doc)).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when evidence exceeds ${SPECS_MAX_EVIDENCE_PER_SPEC}`, () => {
    const evidence = Array.from({ length: SPECS_MAX_EVIDENCE_PER_SPEC + 1 }, (_, i) => `src/cart.ts:${i + 1}-${i + 2}`);
    const doc = makeDoc({ specs: [makeSpec({ evidence })] });
    expect(validateSizeLimits(doc)).toBe("size_limit_exceeded");
  });

  it("returns null when evidence length is exactly at the limit", () => {
    const evidence = Array.from({ length: SPECS_MAX_EVIDENCE_PER_SPEC }, (_, i) => `src/cart.ts:${i + 1}-${i + 2}`);
    const doc = makeDoc({ specs: [makeSpec({ evidence })] });
    expect(validateSizeLimits(doc)).toBeNull();
  });

  it("treats a spec whose evidence is literally undefined as empty", () => {
    const spec = makeSpec();
    delete (spec as Record<string, unknown>)["evidence"];
    expect(validateSizeLimits(makeDoc({ specs: [spec] }))).toBeNull();
  });

  // FR-SPECS-0007 — purged_ids is deliberately uncapped: its growth is bounded by deliberate
  // human action, not by input size.
  it("does not cap purged_ids", () => {
    const purged = Array.from({ length: SPECS_MAX_SPECS + 1 }, (_, i) => `FR-CHK-${String(i).padStart(4, "0")}`);
    expect(validateSizeLimits(makeDoc({ purged_ids: purged }))).toBeNull();
  });

  it(`returns size_limit_exceeded when the document's system name exceeds ${SPECS_MAX_NAME_LENGTH} characters`, () => {
    expect(validateSizeLimits(makeDoc({ system: "x".repeat(SPECS_MAX_NAME_LENGTH + 1) }))).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when a criterion's system name exceeds ${SPECS_MAX_NAME_LENGTH} characters`, () => {
    const acceptance = [makeAcceptance({ system: "x".repeat(SPECS_MAX_NAME_LENGTH + 1) })];
    expect(validateSizeLimits(makeDoc({ specs: [makeSpec({ acceptance })] }))).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when a criterion's shall exceeds ${SPECS_MAX_STRING_LENGTH} characters`, () => {
    const acceptance = [makeAcceptance({ shall: "x".repeat(SPECS_MAX_STRING_LENGTH + 1) })];
    expect(validateSizeLimits(makeDoc({ specs: [makeSpec({ acceptance })] }))).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when title exceeds ${SPECS_MAX_NAME_LENGTH} characters`, () => {
    const doc = makeDoc({ specs: [makeSpec({ title: "x".repeat(SPECS_MAX_NAME_LENGTH + 1) })] });
    expect(validateSizeLimits(doc)).toBe("size_limit_exceeded");
  });

  it(`returns size_limit_exceeded when a long string field exceeds SPECS_MAX_STRING_LENGTH`, () => {
    const doc = makeDoc({ specs: [makeSpec({ statement: "x".repeat(20_001) })] });
    expect(validateSizeLimits(doc)).toBe("size_limit_exceeded");
  });

  it("returns null when title is exactly at the name length limit", () => {
    const doc = makeDoc({ specs: [makeSpec({ title: "x".repeat(SPECS_MAX_NAME_LENGTH) })] });
    expect(validateSizeLimits(doc)).toBeNull();
  });

  // Two-sided boundaries — each limit above only tests the "over the limit -> rejected" side;
  // these pin the "exactly at the limit -> accepted" side too, so an off-by-one regression in
  // either direction (> vs >=) would be caught.
  it("returns null when specs.length is exactly at the limit", () => {
    const specs = Array.from({ length: SPECS_MAX_SPECS }, (_, i) => makeSpec({ id: `FR-CHK-${String(i).padStart(4, "0")}` }));
    const doc = makeDoc({ specs });
    expect(validateSizeLimits(doc)).toBeNull();
  });

  it("returns null when depends_on length is exactly at the limit", () => {
    const deps = Array.from({ length: SPECS_MAX_DEPENDENCIES_PER_SPEC }, (_, i) => `FR-CHK-${String(i).padStart(4, "0")}`);
    const doc = makeDoc({ specs: [makeSpec({ depends_on: deps })] });
    expect(validateSizeLimits(doc)).toBeNull();
  });

  it("returns null when acceptance length is exactly at the limit", () => {
    const acceptance = Array.from({ length: SPECS_MAX_ACCEPTANCE_PER_SPEC }, () => makeAcceptance());
    const doc = makeDoc({ specs: [makeSpec({ acceptance })] });
    expect(validateSizeLimits(doc)).toBeNull();
  });

  it("returns null when a long string field is exactly at SPECS_MAX_STRING_LENGTH", () => {
    const doc = makeDoc({ specs: [makeSpec({ statement: "x".repeat(SPECS_MAX_STRING_LENGTH) })] });
    expect(validateSizeLimits(doc)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Defensive `?? []` fallbacks — undefined (not merely empty-array) optional fields
// ---------------------------------------------------------------------------

describe("validators — defensive fallback when optional array fields are literally undefined", () => {
  it("validateAreaRegistration treats a doc with areas undefined as unregistered", () => {
    const doc = { specs: [] } as unknown as Parameters<typeof validateAreaRegistration>[1];
    expect(validateAreaRegistration(makeSpec({ id: "FR-CHK-0001" }), doc)).toBe(true);
  });

  it("autoRegisterAreas initializes doc.areas when it is undefined", () => {
    const doc = {} as unknown as Parameters<typeof autoRegisterAreas>[0];
    autoRegisterAreas(doc, ["FR-CHK-0001"]);
    expect((doc as { areas: unknown[] }).areas).toEqual([{ code: "CHK", name: "CHK" }]);
  });

  it("validateUniqueIds treats a doc with specs undefined as empty (no error)", () => {
    const doc = {} as unknown as Parameters<typeof validateUniqueIds>[0];
    expect(validateUniqueIds(doc)).toBeNull();
  });

  it("validateReferences treats a doc with specs undefined as empty (no error)", () => {
    const doc = {} as unknown as Parameters<typeof validateReferences>[0];
    expect(validateReferences(doc)).toBeNull();
  });

  it("validateReferences treats a spec with depends_on/related undefined as empty", () => {
    const spec = { id: "FR-CHK-0001" } as unknown as ReturnType<typeof makeSpec>;
    const doc = { specs: [spec] } as unknown as Parameters<typeof validateReferences>[0];
    expect(validateReferences(doc)).toBeNull();
  });

  it("validateDependsAcyclic treats a doc with specs undefined as empty (no error)", () => {
    const doc = {} as unknown as Parameters<typeof validateDependsAcyclic>[0];
    expect(validateDependsAcyclic(doc)).toBeNull();
  });

  it("validateDependsAcyclic treats a spec with depends_on undefined as no dependencies", () => {
    const spec = { id: "FR-CHK-0001" } as unknown as ReturnType<typeof makeSpec>;
    const doc = { specs: [spec] } as unknown as Parameters<typeof validateDependsAcyclic>[0];
    expect(validateDependsAcyclic(doc)).toBeNull();
  });

  it("validateSizeLimits treats a doc with specs undefined as empty (no error)", () => {
    const doc = {} as unknown as Parameters<typeof validateSizeLimits>[0];
    expect(validateSizeLimits(doc)).toBeNull();
  });

  it("validateSizeLimits treats a spec with depends_on/related/acceptance undefined as empty", () => {
    const spec = { id: "FR-CHK-0001", title: "x" } as unknown as ReturnType<typeof makeSpec>;
    const doc = { specs: [spec] } as unknown as Parameters<typeof validateSizeLimits>[0];
    expect(validateSizeLimits(doc)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stripGuarded — FR-SPECS-0040
// ---------------------------------------------------------------------------

describe("stripGuarded — FR-SPECS-0040", () => {
  it("drops all four guarded fields", () => {
    const item = {
      id: "FR-CHK-0001",
      title: "x",
      status: "Approved",
      approved_by: "someone",
      implementation: "Implemented",
      changed_by: "someone",
    };
    const stripped = stripGuarded(item);
    for (const field of GUARDED_FIELDS) {
      expect(stripped).not.toHaveProperty(field);
    }
    expect(stripped["id"]).toBe("FR-CHK-0001");
    expect(stripped["title"]).toBe("x");
  });

  it("leaves a non-guarded-only item unchanged (same keys/values)", () => {
    const item = { id: "x", title: "y" };
    expect(stripGuarded(item)).toEqual(item);
  });

  it("returns an empty object for an all-guarded item", () => {
    expect(stripGuarded({ status: "Draft", approved_by: "", implementation: "NotStarted", changed_by: "" })).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// loadSpecs / saveSpecs / newDocument — FR-SPECS-0002, 0071
// ---------------------------------------------------------------------------

describe("loadSpecs / saveSpecs — FR-SPECS-0002/0071", () => {
  it("returns null for a nonexistent file", () => {
    expect(loadSpecs(specsFile("nope.json"))).toBeNull();
  });

  it("round-trips a saved document", () => {
    const file = specsFile();
    const doc = makeDoc({ system: "checkout", specs: [makeSpec()] });
    saveSpecs(file, doc);
    const loaded = loadSpecs(file)!;
    expect(loaded.system).toBe("checkout");
    expect(loaded.specs).toHaveLength(1);
  });

  it("round-trips a spec's new location, evidence and criterion fields verbatim", () => {
    const file = specsFile();
    const spec = makeSpec({
      level: "Component",
      subsystem: "checkout",
      component: "cart",
      evidence: ["src/cart.ts:10-24", "src/total.ts:3-8"],
      acceptance: [makeAcceptance({ id: "FR-CHK-0001.AC1", ears: "unwanted", when: undefined, if: "the card is declined" })],
    });
    saveSpecs(file, makeDoc({ specs: [spec], purged_ids: ["FR-CHK-0999"] }));
    const loaded = loadSpecs(file)!;
    expect(loaded.specs[0]).toEqual(spec);
    expect(loaded.purged_ids).toEqual(["FR-CHK-0999"]);
  });

  it("creates parent directories on save", () => {
    const file = path.join(tmpDir, "nested", "dir", "specs.json");
    saveSpecs(file, makeDoc());
    expect(fs.existsSync(file)).toBe(true);
  });

  it("injects previous_version:null for a legacy document lacking the field", () => {
    const file = specsFile();
    const legacy = { system: "x", description: "", created_at: "t", updated_at: "t", areas: [], specs: [] };
    fs.writeFileSync(file, JSON.stringify(legacy));
    const loaded = loadSpecs(file)!;
    expect(loaded.previous_version).toBeNull();
  });

  // FR-SPECS-0002 — legacy documents predate the purged-id registry; the read boundary normalises
  // the shape once so no downstream site has to guard for its absence.
  it("injects purged_ids:[] for a legacy document lacking the field", () => {
    const file = specsFile();
    const legacy = { system: "x", description: "", created_at: "t", updated_at: "t", previous_version: null, areas: [], specs: [] };
    fs.writeFileSync(file, JSON.stringify(legacy));
    expect(loadSpecs(file)!.purged_ids).toEqual([]);
  });

  it("preserves a stored purged_ids registry rather than resetting it", () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ purged_ids: ["FR-CHK-0001"] }));
    expect(loadSpecs(file)!.purged_ids).toEqual(["FR-CHK-0001"]);
  });

  it("saveSpecs updates updated_at to the current time", () => {
    const file = specsFile();
    const doc = makeDoc({ updated_at: "2020-01-01T00:00:00.000Z" });
    saveSpecs(file, doc);
    const loaded = loadSpecs(file)!;
    expect(loaded.updated_at).not.toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("newDocument — FR-SPECS-0002", () => {
  it("returns an empty document with previous_version null", () => {
    const doc = newDocument("checkout");
    expect(doc.system).toBe("checkout");
    expect(doc.previous_version).toBeNull();
    expect(doc.specs).toEqual([]);
    expect(doc.created_at).toBe(doc.updated_at);
  });

  it("defaults system to empty string when omitted", () => {
    expect(newDocument().system).toBe("");
  });

  // FR-SPECS-0004 AC7 — the nine quality-characteristic codes are pre-registered in every
  // document, so a freshly created one is never area-empty.
  it("pre-registers the nine quality-characteristic areas", () => {
    expect(newDocument().areas).toEqual([...RESERVED_NFR_AREAS]);
  });

  it("starts the purged-id registry empty", () => {
    expect(newDocument().purged_ids).toEqual([]);
  });

  it("accepts an NFR against a reserved area with no further registration", () => {
    const doc = newDocument("checkout");
    expect(validateAreaRegistration(makeSpec({ id: "NFR-PERF-0001", type: "NFR" }), doc)).toBe(false);
  });
});
