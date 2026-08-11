/**
 * FR-SPECS-0023 / FR-SPECS-0025 — the shared markup grammar. This module is the single declaration
 * the emitter (render.ts) and the reader (req-parser.ts) both consume, so the round trip is only
 * safe while the data below holds. Everything here is asserted against HARDCODED literals taken
 * from the governing template
 * (instructions/r3/core/skills/requirements-authoring/assets/ra-requirement-unit.md) and the
 * DECIDED attribute order in plans/specs-template-update/SPECS-TEMPLATE-UPDATE-SPECS.md §6.1 —
 * never re-derived from the constants under test, which would be a tautology.
 *
 * Pure data: no filesystem, no shared mutable state, no ordering dependency between tests.
 */
import { describe, it, expect } from "vitest";
import {
  ROOT_ELEMENT,
  CRITERION_ELEMENT,
  ACCEPTANCE_ELEMENT,
  EVIDENCE_ELEMENT,
  CANONICAL_ATTR_LINES,
  CANONICAL_ATTR_ORDER,
  OPTIONAL_ATTRS,
  CRITERION_ATTR_ORDER,
  CONDITION_ATTRS,
  ELEMENT_FIELDS,
  MARKUP_TO_FIELD,
  FIELD_TO_MARKUP,
  EARS_CONDITION_WORD,
  EVIDENCE_SEPARATOR,
  ID_LIST_SEPARATOR,
} from "../../../src/commands/specs/markup-grammar.js";
import { EARS_PATTERNS, KNOWN_SPEC_FIELDS } from "../../../src/commands/specs/core.js";

/** Folds a markup name onto its spec field name exactly as both consumers do. */
function toField(markup: string): string {
  return (MARKUP_TO_FIELD as Record<string, string>)[markup] ?? markup;
}

describe("element names (FR-SPECS-0023)", () => {
  it("names the elements the canonical template uses", () => {
    expect(ROOT_ELEMENT).toBe("req");
    expect(CRITERION_ELEMENT).toBe("criteria");
    expect(ACCEPTANCE_ELEMENT).toBe("acceptance");
    expect(EVIDENCE_ELEMENT).toBe("evidence");
  });
});

describe("field-name maps are genuine inverses (FR-SPECS-0025)", () => {
  it("MARKUP_TO_FIELD lists exactly the three names that differ between the two vocabularies", () => {
    expect(MARKUP_TO_FIELD).toEqual({
      depends: "depends_on",
      ticketId: "ticket_id",
      implementationNotes: "implementation_notes",
    });
  });

  it("FIELD_TO_MARKUP is the exact inverse", () => {
    expect(FIELD_TO_MARKUP).toEqual({
      depends_on: "depends",
      ticket_id: "ticketId",
      implementation_notes: "implementationNotes",
    });
  });

  it("round-trips every markup name back to itself through the field name", () => {
    for (const [markup, field] of Object.entries(MARKUP_TO_FIELD)) {
      expect(FIELD_TO_MARKUP[field], `${markup} -> ${field} -> ?`).toBe(markup);
    }
  });

  it("round-trips every field name back to itself through the markup name", () => {
    for (const [field, markup] of Object.entries(FIELD_TO_MARKUP)) {
      expect(MARKUP_TO_FIELD[markup], `${field} -> ${markup} -> ?`).toBe(field);
    }
  });

  it("is injective in both directions — no two names collapse onto one", () => {
    expect(new Set(Object.values(MARKUP_TO_FIELD)).size).toBe(Object.keys(MARKUP_TO_FIELD).length);
    expect(new Set(Object.values(FIELD_TO_MARKUP)).size).toBe(Object.keys(FIELD_TO_MARKUP).length);
  });

  it("never maps a name onto itself — a self-mapping entry is redundant and would hide a typo", () => {
    for (const [markup, field] of Object.entries(MARKUP_TO_FIELD)) {
      expect(markup).not.toBe(field);
    }
  });

  it("every field a map names is a field the command actually accepts", () => {
    for (const field of Object.values(MARKUP_TO_FIELD)) {
      expect(KNOWN_SPEC_FIELDS.has(field), `${field} is not an accepted spec field`).toBe(true);
    }
  });
});

describe("condition-word map agrees with the EARS patterns (FR-SPECS-0025)", () => {
  it("maps each pattern to exactly the word it names, and ubiquitous to none", () => {
    expect(EARS_CONDITION_WORD).toEqual({
      ubiquitous: null,
      event: "when",
      state: "while",
      optional: "where",
      unwanted: "if",
    });
  });

  it("covers every EARS pattern and nothing else", () => {
    expect(new Set(Object.keys(EARS_CONDITION_WORD))).toEqual(new Set(EARS_PATTERNS));
  });

  it("gives ubiquitous no condition word", () => {
    expect(EARS_CONDITION_WORD.ubiquitous).toBeNull();
  });

  it("gives every other pattern a distinct, non-empty word", () => {
    const words = Object.entries(EARS_CONDITION_WORD)
      .filter(([pattern]) => pattern !== "ubiquitous")
      .map(([, word]) => word);
    expect(words).toHaveLength(4);
    for (const word of words) expect(typeof word).toBe("string");
    expect(new Set(words).size).toBe(4);
  });

  it("CONDITION_ATTRS is exactly the four words, derived from the map so it cannot drift", () => {
    expect(CONDITION_ATTRS).toEqual(["when", "while", "where", "if"]);
    expect(CONDITION_ATTRS).not.toContain(null);
  });

  it("CRITERION_ATTR_ORDER reads id, pattern, the four condition words, responder, outcome", () => {
    expect(CRITERION_ATTR_ORDER).toEqual(["id", "ears", "when", "while", "where", "if", "system", "shall"]);
  });

  it("places every condition word between ears and system, so a criterion always reads id, ears, condition, system, shall", () => {
    const earsAt = CRITERION_ATTR_ORDER.indexOf("ears");
    const systemAt = CRITERION_ATTR_ORDER.indexOf("system");
    for (const word of CONDITION_ATTRS) {
      const at = CRITERION_ATTR_ORDER.indexOf(word);
      expect(at, `${word} is absent from the criterion attribute order`).toBeGreaterThan(earsAt);
      expect(at, `${word} is emitted after system`).toBeLessThan(systemAt);
    }
  });

  it("orders the condition words the same way the patterns that name them are ordered", () => {
    const wordsInPatternOrder = EARS_PATTERNS.map((p) => EARS_CONDITION_WORD[p]).filter((w) => w !== null);
    expect(CONDITION_ATTRS).toEqual(wordsInPatternOrder);
  });
});

describe("canonical attribute order matches the approved template (FR-SPECS-0023)", () => {
  // Literal pin, from tech specs §6.1 (DECIDED): identity, then placement, then tracking, then
  // provenance, then handling, then the approval group on one line, then relationships, then
  // implementation state.
  const EXPECTED_LINES = [
    ["id", "type", "level", "subsystem", "component"],
    ["ticketId", "classification"],
    ["source"],
    ["priority", "verification"],
    ["status", "approved_by", "changed"],
    ["depends", "related"],
    ["implementation"],
  ];
  const EXPECTED_ORDER = EXPECTED_LINES.flat();

  it("emits the attribute lines in the approved grouping", () => {
    expect(CANONICAL_ATTR_LINES.map((line) => [...line])).toEqual(EXPECTED_LINES);
  });

  it("flattens to the approved attribute sequence", () => {
    expect([...CANONICAL_ATTR_ORDER]).toEqual(EXPECTED_ORDER);
  });

  it("keeps CANONICAL_ATTR_ORDER as exactly the flattening of the lines", () => {
    expect([...CANONICAL_ATTR_ORDER]).toEqual(CANONICAL_ATTR_LINES.flat());
  });

  it("keeps the approval group together on one line, so an approval is a one-line difference", () => {
    const approvalLines = CANONICAL_ATTR_LINES.filter((line) => line.includes("status"));
    expect(approvalLines).toHaveLength(1);
    expect([...approvalLines[0]]).toEqual(["status", "approved_by", "changed"]);
  });

  it("puts subsystem and component immediately after level", () => {
    const at = (name: string) => CANONICAL_ATTR_ORDER.indexOf(name);
    expect(at("subsystem")).toBe(at("level") + 1);
    expect(at("component")).toBe(at("subsystem") + 1);
  });

  it("puts depends and related after the approval group and before implementation", () => {
    const at = (name: string) => CANONICAL_ATTR_ORDER.indexOf(name);
    expect(at("depends")).toBeGreaterThan(at("changed"));
    expect(at("related")).toBe(at("depends") + 1);
    expect(at("implementation")).toBeGreaterThan(at("related"));
  });

  it("names each attribute exactly once", () => {
    expect(CANONICAL_ATTR_ORDER.length).toBe(new Set(CANONICAL_ATTR_ORDER).size);
  });

  it("omits only the attributes that may legitimately be empty", () => {
    expect([...OPTIONAL_ATTRS]).toEqual(["subsystem", "component", "ticketId", "classification", "depends", "related"]);
    for (const attr of OPTIONAL_ATTRS) {
      expect(CANONICAL_ATTR_ORDER, `${attr} is optional but never emitted`).toContain(attr);
    }
  });

  it("never makes an approval-group attribute optional — the group must stay a stable diff", () => {
    for (const attr of ["status", "approved_by", "changed"]) {
      expect(OPTIONAL_ATTRS).not.toContain(attr);
    }
  });
});

describe("attributes and elements partition the accepted field set (FR-SPECS-0023)", () => {
  it("carries prose and structured fields as elements", () => {
    expect([...ELEMENT_FIELDS]).toEqual([
      "title",
      "statement",
      "rationale",
      "evidence",
      "acceptance",
      "implementationNotes",
      "notes",
    ]);
  });

  it("never carries a field as both an attribute and an element", () => {
    const asFields = new Set(CANONICAL_ATTR_ORDER.map(toField));
    for (const element of ELEMENT_FIELDS) {
      expect(asFields.has(toField(element)), `${element} is carried twice`).toBe(false);
    }
  });

  it("covers every accepted spec field except changed_by, which the markup carries by design nowhere", () => {
    const carried = new Set([...CANONICAL_ATTR_ORDER, ...ELEMENT_FIELDS].map(toField));
    const uncovered = [...KNOWN_SPEC_FIELDS].filter((f) => !carried.has(f)).sort();
    expect(uncovered).toEqual(["changed_by"]);
  });

  it("carries no name that is not an accepted spec field", () => {
    for (const name of [...CANONICAL_ATTR_ORDER, ...ELEMENT_FIELDS]) {
      expect(KNOWN_SPEC_FIELDS.has(toField(name)), `${name} folds to an unknown field`).toBe(true);
    }
  });
});

describe("list separators (FR-SPECS-0023/0025)", () => {
  it("joins evidence locations and id lists with a comma and a space", () => {
    expect(EVIDENCE_SEPARATOR).toBe(", ");
    expect(ID_LIST_SEPARATOR).toBe(", ");
  });

  it("splits back to the same parts it joins", () => {
    const parts = ["FR-CHK-0001", "FR-CHK-0002"];
    expect(parts.join(ID_LIST_SEPARATOR).split(ID_LIST_SEPARATOR)).toEqual(parts);
    const locations = ["a/b.ts:1-9", "c/d.ts:11-20"];
    expect(locations.join(EVIDENCE_SEPARATOR).split(EVIDENCE_SEPARATOR)).toEqual(locations);
  });
});
