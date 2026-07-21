/**
 * Unit tests for commands/specs/rubric.ts — pure phrasing/structural matchers.
 * FR-SPECS-0006, 0021.
 */
import { describe, it, expect } from "vitest";
import {
  checkEars,
  checkMeasurableNfr,
  checkModalVerbs,
  findDuplicateStatements,
  checkAcceptanceComplete,
} from "../../../src/commands/specs/rubric.js";
import { makeAcceptance, makeSpec } from "../../fixtures/specs.js";

// ---------------------------------------------------------------------------
// checkEars — FR-SPECS-0006 ordered matching
// ---------------------------------------------------------------------------

describe("checkEars — event pattern (When X, Y shall Z)", () => {
  it("matches", () => {
    expect(checkEars("When the file is missing, the system shall return plan_not_found.")).toBe(true);
  });

  it("classifies as event, not ubiquitous, per ordered matching", () => {
    // A statement matching the event keyword form must not ALSO be treated as failing —
    // the ordered-matching contract guarantees this returns true via the event branch.
    expect(checkEars("When X, Y shall Z")).toBe(true);
  });
});

describe("checkEars — state pattern (While X, Y shall Z)", () => {
  it("matches", () => {
    expect(checkEars("While the cache is warm, the system shall serve from memory.")).toBe(true);
  });
});

describe("checkEars — optional pattern (Where X, Y shall Z)", () => {
  it("matches", () => {
    expect(checkEars("Where telemetry is enabled, the system shall emit metrics.")).toBe(true);
  });
});

describe("checkEars — unwanted pattern (If X, Y shall Z)", () => {
  it("matches", () => {
    expect(checkEars("If the disk is full, the system shall reject the write.")).toBe(true);
  });
});

describe("checkEars — ubiquitous pattern (fallback, <subject> shall <response>)", () => {
  it("matches a plain shall statement with no keyword", () => {
    expect(checkEars("The system shall log every write.")).toBe(true);
  });
});

describe("checkEars — non-conformant statements", () => {
  it("fails a statement with no 'shall' at all", () => {
    expect(checkEars("The system handles errors nicely.")).toBe(false);
  });

  it("fails an empty statement", () => {
    expect(checkEars("")).toBe(false);
  });

  it("fails a keyword-led statement missing the required comma (regression guard for the ubiquitous negative lookahead)", () => {
    // SPECS §11.2: the ubiquitous pattern's negative lookahead exists specifically so a
    // keyword-led statement that FAILS its own keyword pattern (here: no comma between the
    // "When ..." clause and "the system shall ...") does NOT fall through and get incorrectly
    // matched by the permissive ubiquitous fallback. Without the lookahead, this statement would
    // wrongly return true (it has "shall" and no comma-requirement of its own) — asserting false
    // here is what actually exercises the guard; every other test in this file would still pass
    // even with the lookahead deleted.
    expect(checkEars("When the disk is full the system shall reject the write.")).toBe(false);
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

  it("fails a spec whose criterion is missing 'then'", () => {
    expect(checkAcceptanceComplete(makeSpec({ acceptance: [makeAcceptance({ then: "" })] }))).toBe(false);
  });

  it("fails a spec whose criterion has whitespace-only 'given'", () => {
    expect(checkAcceptanceComplete(makeSpec({ acceptance: [makeAcceptance({ given: "   " })] }))).toBe(false);
  });

  it("fails a spec with acceptance literally undefined (no crash)", () => {
    const spec = { id: "FR-CHK-0001" } as unknown as ReturnType<typeof makeSpec>;
    expect(checkAcceptanceComplete(spec)).toBe(false);
  });
});
