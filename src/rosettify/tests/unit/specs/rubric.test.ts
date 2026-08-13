/**
 * Unit tests for commands/specs/rubric.ts — pure phrasing/structural matchers.
 * FR-SPECS-0006, 0021.
 */
import { describe, it, expect } from "vitest";
import {
  checkAcceptanceComplete,
  checkCriterionEars,
  checkCriterionIdFormat,
  checkEvidencePresence,
  checkMeasurableNfr,
  checkModalVerbs,
  checkRecommendedNfrArea,
  checkSingleConditionWord,
  findDuplicateStatements,
  findLocationGaps,
} from "../../../src/commands/specs/rubric.js";
import { RESERVED_NFR_AREAS } from "../../../src/commands/specs/core.js";
import { makeAcceptance, makeSpec } from "../../fixtures/specs.js";

// ---------------------------------------------------------------------------
// checkCriterionEars — FR-SPECS-0006 AC1/AC2. EARS conformance is decided per acceptance
// criterion from its declared `ears` and the condition word it carries; the statement text is no
// longer pattern-matched at all (the former statement-level `checkEars` is gone with the model).
// ---------------------------------------------------------------------------

describe("checkCriterionEars — the declared pattern's condition word", () => {
  it.each([
    ["event", "when"],
    ["state", "while"],
    ["optional", "where"],
    ["unwanted", "if"],
  ] as const)("passes %s carrying '%s'", (ears, word) => {
    const c = makeAcceptance({ ears, when: undefined, [word]: "some condition" });
    expect(checkCriterionEars(c)).toBe(true);
  });

  it.each([
    ["event", "while"],
    ["state", "when"],
    ["optional", "if"],
    ["unwanted", "where"],
  ] as const)("fails %s carrying '%s' instead of the word its pattern names", (ears, word) => {
    const c = makeAcceptance({ ears, when: undefined, [word]: "some condition" });
    expect(checkCriterionEars(c)).toBe(false);
  });

  it.each(["event", "state", "optional", "unwanted"] as const)("fails %s carrying no condition word at all", (ears) => {
    expect(checkCriterionEars(makeAcceptance({ ears, when: undefined }))).toBe(false);
  });

  it("passes ubiquitous carrying no condition word", () => {
    expect(checkCriterionEars(makeAcceptance({ ears: "ubiquitous", when: undefined }))).toBe(true);
  });

  it.each(["when", "while", "where", "if"] as const)("fails ubiquitous carrying '%s'", (word) => {
    expect(checkCriterionEars(makeAcceptance({ ears: "ubiquitous", when: undefined, [word]: "x" }))).toBe(false);
  });

  it("treats a whitespace-only condition word as absent", () => {
    expect(checkCriterionEars(makeAcceptance({ ears: "event", when: "   " }))).toBe(false);
  });

  it("passes ubiquitous whose condition word is present but whitespace-only", () => {
    expect(checkCriterionEars(makeAcceptance({ ears: "ubiquitous", when: "   " }))).toBe(true);
  });

  // The write path owns `invalid_ears` (core.ts validateCriteria) and FR-SPECS-0021 lists no
  // validate finding for it, so a pattern outside the enum deliberately passes here — the two
  // reports must not collide on one item.
  it("passes an ears outside the enum (that is the write path's invalid_ears)", () => {
    expect(checkCriterionEars(makeAcceptance({ ears: "continuous" as never }))).toBe(true);
  });

  it("passes a criterion whose ears is absent", () => {
    expect(checkCriterionEars(makeAcceptance({ ears: undefined as never }))).toBe(true);
  });

  // The per-pattern behaviour is pinned by the it.each cases above, whose condition words are
  // written out by hand. Building a criterion here from EARS_CONDITION_WORD — the very map the
  // matcher reads — could only ever fail by crashing, never by disagreeing.
  it("passes each pattern carrying the condition word written out here", () => {
    expect(checkCriterionEars(makeAcceptance({ ears: "ubiquitous", when: undefined }))).toBe(true);
    expect(checkCriterionEars(makeAcceptance({ ears: "event", when: "the cart changes" }))).toBe(true);
    expect(checkCriterionEars(makeAcceptance({ ears: "state", when: undefined, while: "a promotion runs" }))).toBe(true);
    expect(checkCriterionEars(makeAcceptance({ ears: "optional", when: undefined, where: "tax is present" }))).toBe(true);
    expect(checkCriterionEars(makeAcceptance({ ears: "unwanted", when: undefined, if: "a price is missing" }))).toBe(true);
  });
});

describe("checkSingleConditionWord — FR-SPECS-0006 AC3", () => {
  it("passes a criterion carrying exactly one condition word", () => {
    expect(checkSingleConditionWord(makeAcceptance({ ears: "event", when: "x" }))).toBe(true);
  });

  it("passes a criterion carrying none", () => {
    expect(checkSingleConditionWord(makeAcceptance({ ears: "ubiquitous", when: undefined }))).toBe(true);
  });

  it("fails a criterion carrying two condition words", () => {
    expect(checkSingleConditionWord(makeAcceptance({ ears: "event", when: "x", while: "y" }))).toBe(false);
  });

  it("fails a criterion carrying all four", () => {
    expect(checkSingleConditionWord(makeAcceptance({ ears: "event", when: "a", while: "b", where: "c", if: "d" }))).toBe(false);
  });

  it("does not count a whitespace-only second word", () => {
    expect(checkSingleConditionWord(makeAcceptance({ ears: "event", when: "x", while: "  " }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkCriterionIdFormat — FR-SPECS-0021
// ---------------------------------------------------------------------------

describe("checkCriterionIdFormat", () => {
  it("passes an id reading <specId>.AC<n>", () => {
    expect(checkCriterionIdFormat("FR-CHK-0001", makeAcceptance({ id: "FR-CHK-0001.AC1" }))).toBe(true);
  });

  it("passes a multi-digit criterion number", () => {
    expect(checkCriterionIdFormat("FR-CHK-0001", makeAcceptance({ id: "FR-CHK-0001.AC12" }))).toBe(true);
  });

  it("fails an id belonging to a different spec", () => {
    expect(checkCriterionIdFormat("FR-CHK-0001", makeAcceptance({ id: "FR-CHK-0002.AC1" }))).toBe(false);
  });

  it("fails an id with no .AC segment", () => {
    expect(checkCriterionIdFormat("FR-CHK-0001", makeAcceptance({ id: "FR-CHK-0001" }))).toBe(false);
  });

  it("fails an id whose suffix is not numeric", () => {
    expect(checkCriterionIdFormat("FR-CHK-0001", makeAcceptance({ id: "FR-CHK-0001.ACx" }))).toBe(false);
  });

  it("fails an empty id", () => {
    expect(checkCriterionIdFormat("FR-CHK-0001", makeAcceptance({ id: "" }))).toBe(false);
  });

  it("fails an id that is literally undefined (no crash)", () => {
    expect(checkCriterionIdFormat("FR-CHK-0001", makeAcceptance({ id: undefined as never }))).toBe(false);
  });

  // The spec id is compared literally rather than spliced into a pattern, so metacharacters in it
  // cannot widen the match.
  it("compares the spec id literally, so a regex metacharacter cannot alter the match", () => {
    expect(checkCriterionIdFormat("FR-C.K-0001", makeAcceptance({ id: "FR-CXK-0001.AC1" }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findLocationGaps — FR-SPECS-0006 AC10-AC12. Empty means the author did not know the name,
// never that it does not apply, so an absence is always reported.
// ---------------------------------------------------------------------------

describe("findLocationGaps", () => {
  it("reports nothing for a Component naming both subsystem and component", () => {
    expect(findLocationGaps(makeSpec({ level: "Component" }))).toEqual([]);
  });

  it("reports both names as errors for a Component naming neither", () => {
    const gaps = findLocationGaps(makeSpec({ level: "Component", subsystem: "", component: "" }));
    expect(gaps).toEqual([
      { field: "subsystem", severity: "error" },
      { field: "component", severity: "error" },
    ]);
  });

  it("reports only the missing name for a Component naming one of the two", () => {
    expect(findLocationGaps(makeSpec({ level: "Component", subsystem: "" }))).toEqual([{ field: "subsystem", severity: "error" }]);
  });

  it("reports a subsystem error for a Subsystem naming none", () => {
    expect(findLocationGaps(makeSpec({ level: "Subsystem", subsystem: "", component: "" }))).toEqual([
      { field: "subsystem", severity: "error" },
    ]);
  });

  it("does not require a component name at Subsystem level", () => {
    expect(findLocationGaps(makeSpec({ level: "Subsystem", component: "" }))).toEqual([]);
  });

  it("warns once for a System naming neither name", () => {
    expect(findLocationGaps(makeSpec({ level: "System", subsystem: "", component: "" }))).toEqual([
      { field: "subsystem", severity: "warning" },
    ]);
  });

  it.each(["subsystem", "component"] as const)("clears the System recommendation when only %s is named", (field) => {
    const spec = makeSpec({ level: "System", subsystem: "", component: "", [field]: "named" });
    expect(findLocationGaps(spec)).toEqual([]);
  });

  it("treats a whitespace-only name as absent", () => {
    expect(findLocationGaps(makeSpec({ level: "Subsystem", subsystem: "   " }))).toEqual([{ field: "subsystem", severity: "error" }]);
  });

  it("treats names that are literally undefined as absent", () => {
    const spec = makeSpec({ level: "Component" });
    delete (spec as Record<string, unknown>)["subsystem"];
    delete (spec as Record<string, unknown>)["component"];
    expect(findLocationGaps(spec)).toHaveLength(2);
  });

  // A gap measured against an unknown level would be noise — that defect belongs to level_enum.
  it("reports no gap for a level outside the enum", () => {
    expect(findLocationGaps(makeSpec({ level: "Module" as never, subsystem: "", component: "" }))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkEvidencePresence — FR-SPECS-0021 AC4
// ---------------------------------------------------------------------------

describe("checkEvidencePresence", () => {
  it("fails a Sources-derived spec whose evidence is empty", () => {
    expect(checkEvidencePresence(makeSpec({ source: "Sources", evidence: [] }))).toBe(false);
  });

  it("passes a Sources-derived spec citing a location", () => {
    expect(checkEvidencePresence(makeSpec({ source: "Sources", evidence: ["src/cart.ts:10-24"] }))).toBe(true);
  });

  it.each(["User", "Inferred", "Documentation"] as const)("passes a %s-sourced spec with empty evidence", (source) => {
    expect(checkEvidencePresence(makeSpec({ source, evidence: [] }))).toBe(true);
  });

  it("fails a Sources-derived spec whose evidence is literally undefined", () => {
    const spec = makeSpec({ source: "Sources" });
    delete (spec as Record<string, unknown>)["evidence"];
    expect(checkEvidencePresence(spec)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkRecommendedNfrArea — FR-SPECS-0004. The nine codes are recommended, never mandatory.
// ---------------------------------------------------------------------------

describe("checkRecommendedNfrArea", () => {
  it.each(RESERVED_NFR_AREAS.map((a) => a.code))("passes an NFR in recommended area %s", (code) => {
    expect(checkRecommendedNfrArea(makeSpec({ id: `NFR-${code}-0001`, type: "NFR" }))).toBe(true);
  });

  it("fails an NFR in an area outside the nine", () => {
    expect(checkRecommendedNfrArea(makeSpec({ id: "NFR-CHK-0001", type: "NFR" }))).toBe(false);
  });

  it("passes an unparseable id (that is the id_format finding's concern)", () => {
    expect(checkRecommendedNfrArea(makeSpec({ id: "not-an-id" }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// checkMeasurableNfr — FR-SPECS-0021 heuristic
// ---------------------------------------------------------------------------

describe("checkMeasurableNfr", () => {
  it("passes a statement with a quantified metric and threshold token", () => {
    expect(checkMeasurableNfr("validate shall complete within 500 ms for 1000 specs.")).toBe(true);
  });

  it("passes a percentage threshold", () => {
    expect(checkMeasurableNfr("The cache hit rate shall be at least 95%.")).toBe(true);
  });

  it("fails a statement with no digit", () => {
    expect(checkMeasurableNfr("The system shall be fast.")).toBe(false);
  });

  it("fails a statement with a digit but no unit/threshold token", () => {
    expect(checkMeasurableNfr("The system shall support 5 users.")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// checkModalVerbs
// ---------------------------------------------------------------------------

describe("checkModalVerbs", () => {
  it.each(["The system shall log.", "The system should log.", "The system may log."])(
    "passes '%s'",
    (s) => {
      expect(checkModalVerbs(s)).toBe(true);
    },
  );

  it("fails a statement with no modal verb", () => {
    expect(checkModalVerbs("The system logs everything.")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// findDuplicateStatements
// ---------------------------------------------------------------------------

describe("findDuplicateStatements", () => {
  it("groups two specs sharing a normalized statement", () => {
    const specs = [
      makeSpec({ id: "FR-CHK-0001", statement: "The system shall log writes." }),
      makeSpec({ id: "FR-CHK-0002", statement: "the system   shall log writes.  " }),
      makeSpec({ id: "FR-CHK-0003", statement: "Something else entirely shall happen." }),
    ];
    const groups = findDuplicateStatements(specs);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.ids.sort()).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
  });

  it("returns no groups when every statement is unique", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", statement: "A" }), makeSpec({ id: "FR-CHK-0002", statement: "B" })];
    expect(findDuplicateStatements(specs)).toEqual([]);
  });

  it("ignores specs with an empty statement", () => {
    const specs = [makeSpec({ id: "FR-CHK-0001", statement: "" }), makeSpec({ id: "FR-CHK-0002", statement: "" })];
    expect(findDuplicateStatements(specs)).toEqual([]);
  });

  it("treats a spec with statement literally undefined as empty (no crash)", () => {
    const spec = { id: "FR-CHK-0001" } as unknown as ReturnType<typeof makeSpec>;
    expect(findDuplicateStatements([spec])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// checkAcceptanceComplete
// ---------------------------------------------------------------------------

describe("checkAcceptanceComplete", () => {
  it("passes a spec with at least one fully-populated criterion", () => {
    expect(checkAcceptanceComplete(makeSpec({ acceptance: [makeAcceptance()] }))).toBe(true);
  });

  it("fails a spec with an empty acceptance array", () => {
    expect(checkAcceptanceComplete(makeSpec({ acceptance: [] }))).toBe(false);
  });

  it("fails a spec whose criterion is missing its outcome ('shall')", () => {
    expect(checkAcceptanceComplete(makeSpec({ acceptance: [makeAcceptance({ shall: "" })] }))).toBe(false);
  });

  it("fails a spec whose criterion has a whitespace-only responder ('system')", () => {
    expect(checkAcceptanceComplete(makeSpec({ acceptance: [makeAcceptance({ system: "   " })] }))).toBe(false);
  });

  it("fails when only one of several criteria is incomplete", () => {
    const acceptance = [makeAcceptance({ id: "FR-CHK-0001.AC1" }), makeAcceptance({ id: "FR-CHK-0001.AC2", shall: "" })];
    expect(checkAcceptanceComplete(makeSpec({ acceptance }))).toBe(false);
  });

  // A criterion carrying no condition word is complete: `ubiquitous` names none, and the
  // condition word is not part of completeness.
  it("passes a ubiquitous criterion carrying no condition word", () => {
    const acceptance = [makeAcceptance({ ears: "ubiquitous", when: undefined })];
    expect(checkAcceptanceComplete(makeSpec({ acceptance }))).toBe(true);
  });

  it("fails a spec with acceptance literally undefined (no crash)", () => {
    const spec = { id: "FR-CHK-0001" } as unknown as ReturnType<typeof makeSpec>;
    expect(checkAcceptanceComplete(spec)).toBe(false);
  });
});
