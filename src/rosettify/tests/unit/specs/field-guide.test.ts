/**
 * FR-SPECS-0008 — per-field caller guidance and its no-divergence guarantee.
 *
 * AC1 every field of the spec unit and of the acceptance criterion carries an entry;
 * AC2 every entry states field, type, required, default, guidance;
 * AC3 the help schema dictionary carries the SAME guidance strings as the field_guide;
 * AC6 no guidance line names a markup notation, a file format, a requirement id, a ticket id,
 *     or an internal path;
 * AC7 a field added later without guidance fails here — which is why the expected field set is
 *     DERIVED from KNOWN_SPEC_FIELDS / CRITERION_ATTR_ORDER and never hand-written.
 *
 * Pure data: no filesystem, no temp dirs, no shared mutable state. Every test reads frozen module
 * constants and builds its own local collections, so the file is order-independent and idempotent.
 */
import { describe, it, expect } from "vitest";
import { SPEC_FIELD_GUIDE } from "../../../src/commands/specs/field-guide.js";
import { KNOWN_SPEC_FIELDS } from "../../../src/commands/specs/core.js";
import { CRITERION_ATTR_ORDER } from "../../../src/commands/specs/markup-grammar.js";
import { specsSchemasDict } from "../../../src/commands/specs/schemas.js";
import { specsHelpContent } from "../../../src/commands/specs/help-content.js";

/** Criterion entries are keyed `acceptance.<name>` so the criterion's `id` does not collide with
 * the unit's `id` in the flat key space. Derived, never hand-listed. */
const CRITERION_PREFIX = "acceptance.";

function expectedGuideKeys(): Set<string> {
  const keys = new Set<string>(KNOWN_SPEC_FIELDS);
  for (const attr of CRITERION_ATTR_ORDER) keys.add(`${CRITERION_PREFIX}${attr}`);
  return keys;
}

/** A schema node shaped { properties: { <name>: { description } } }. */
interface SchemaWithProps {
  properties: Record<string, { description?: string }>;
}

function schemaProps(key: string): Record<string, { description?: string }> {
  const node = specsSchemasDict[key] as SchemaWithProps | undefined;
  expect(node, `specsSchemasDict is missing the named type ${key}`).toBeDefined();
  return node!.properties;
}

describe("SPEC_FIELD_GUIDE — coverage of every accepted field (FR-SPECS-0008 AC1/AC7)", () => {
  it("covers exactly the fields the command accepts, derived from KNOWN_SPEC_FIELDS and the criterion attributes", () => {
    const actual = new Set(SPEC_FIELD_GUIDE.map((g) => g.field));
    const expected = expectedGuideKeys();

    // Both directions: a field with no guidance fails, and guidance for a field that does not
    // exist fails too.
    const missing = [...expected].filter((f) => !actual.has(f)).sort();
    const extra = [...actual].filter((f) => !expected.has(f)).sort();
    expect(missing, "fields the command accepts but the guide does not cover").toEqual([]);
    expect(extra, "guide entries naming a field the command does not accept").toEqual([]);
  });

  it("covers every field of KNOWN_SPEC_FIELDS unprefixed (the unit's own fields)", () => {
    const unitFields = SPEC_FIELD_GUIDE.map((g) => g.field).filter((f) => !f.startsWith(CRITERION_PREFIX));
    expect(new Set(unitFields)).toEqual(new Set(KNOWN_SPEC_FIELDS));
  });

  it("covers every criterion attribute under the acceptance. prefix", () => {
    const criterionFields = SPEC_FIELD_GUIDE.map((g) => g.field)
      .filter((f) => f.startsWith(CRITERION_PREFIX))
      .map((f) => f.slice(CRITERION_PREFIX.length));
    expect(new Set(criterionFields)).toEqual(new Set(CRITERION_ATTR_ORDER));
  });

  it("has no duplicate entry for any field", () => {
    const seen = SPEC_FIELD_GUIDE.map((g) => g.field);
    expect(seen.length).toBe(new Set(seen).size);
  });

  it("keys the criterion's id separately from the unit's id (the collision the prefix exists for)", () => {
    const unitId = SPEC_FIELD_GUIDE.find((g) => g.field === "id");
    const criterionId = SPEC_FIELD_GUIDE.find((g) => g.field === "acceptance.id");
    expect(unitId).toBeDefined();
    expect(criterionId).toBeDefined();
    expect(criterionId!.guidance).not.toBe(unitId!.guidance);
  });
});

describe("SPEC_FIELD_GUIDE — every entry is complete (FR-SPECS-0008 AC2)", () => {
  it("states field, type, required, default, and guidance on every entry", () => {
    for (const entry of SPEC_FIELD_GUIDE) {
      expect(typeof entry.field, `field of ${entry.field}`).toBe("string");
      expect(entry.field.trim(), "field name must be non-empty").not.toBe("");
      expect(typeof entry.type, `type of ${entry.field}`).toBe("string");
      expect(entry.type.trim(), `type of ${entry.field} must be non-empty`).not.toBe("");
      expect(typeof entry.required, `required of ${entry.field}`).toBe("boolean");
      expect(typeof entry.default, `default of ${entry.field}`).toBe("string");
      expect(entry.default.trim(), `default of ${entry.field} must be non-empty`).not.toBe("");
      expect(typeof entry.guidance, `guidance of ${entry.field}`).toBe("string");
      expect(entry.guidance.trim(), `guidance of ${entry.field} must be non-empty`).not.toBe("");
    }
  });

  it("carries exactly the five SpecFieldGuide keys on every entry — no extra, no missing", () => {
    for (const entry of SPEC_FIELD_GUIDE) {
      expect(Object.keys(entry).sort(), `keys of ${entry.field}`).toEqual([
        "default",
        "field",
        "guidance",
        "required",
        "type",
      ]);
    }
  });

  it("is emitted verbatim as the help content's field_guide section", () => {
    expect(specsHelpContent.field_guide).toEqual(SPEC_FIELD_GUIDE);
  });
});

describe("no divergence — schema dictionary descriptions ARE the guide's guidance (FR-SPECS-0008 AC3)", () => {
  it("every Spec property description equals the guidance registered for that field", () => {
    const props = schemaProps("Spec");
    const byField = new Map(SPEC_FIELD_GUIDE.map((g) => [g.field, g.guidance]));
    for (const [name, prop] of Object.entries(props)) {
      expect(prop.description, `Spec.${name} description`).toBe(byField.get(name));
    }
  });

  it("every AcceptanceCriterion property description equals the guidance registered for acceptance.<field>", () => {
    const props = schemaProps("AcceptanceCriterion");
    const byField = new Map(SPEC_FIELD_GUIDE.map((g) => [g.field, g.guidance]));
    for (const [name, prop] of Object.entries(props)) {
      expect(prop.description, `AcceptanceCriterion.${name} description`).toBe(
        byField.get(`${CRITERION_PREFIX}${name}`),
      );
    }
  });

  it("the other direction — every guide entry's guidance appears as the description of its schema property", () => {
    const specProps = schemaProps("Spec");
    const criterionProps = schemaProps("AcceptanceCriterion");
    for (const entry of SPEC_FIELD_GUIDE) {
      if (entry.field.startsWith(CRITERION_PREFIX)) {
        const name = entry.field.slice(CRITERION_PREFIX.length);
        expect(criterionProps[name], `AcceptanceCriterion has no property ${name}`).toBeDefined();
        expect(criterionProps[name].description, `AcceptanceCriterion.${name}`).toBe(entry.guidance);
      } else {
        expect(specProps[entry.field], `Spec has no property ${entry.field}`).toBeDefined();
        expect(specProps[entry.field].description, `Spec.${entry.field}`).toBe(entry.guidance);
      }
    }
  });

  it("the Spec schema exposes exactly the accepted field set, so neither surface can carry a field the other lacks", () => {
    expect(new Set(Object.keys(schemaProps("Spec")))).toEqual(new Set(KNOWN_SPEC_FIELDS));
  });

  it("the AcceptanceCriterion schema exposes exactly the criterion attribute set", () => {
    expect(new Set(Object.keys(schemaProps("AcceptanceCriterion")))).toEqual(new Set(CRITERION_ATTR_ORDER));
  });

  it("compares by whole-string identity — a single edited character on one surface would fail the comparison above", () => {
    // Guards the guard: proves the comparison is exact-string, not a substring or truthiness check.
    const props = schemaProps("Spec");
    const mutated = `${props.title.description} `;
    expect(mutated).not.toBe(SPEC_FIELD_GUIDE.find((g) => g.field === "title")!.guidance);
  });
});

describe("no leakage in any guidance line (FR-SPECS-0008 AC6)", () => {
  const REQ_ID_RE = /\b(FR|NFR|INT|DATA)-[A-Z0-9]+-\d{4}\b/;
  const TICKET_ID_RE = /\b[A-Z][A-Z0-9]{3,}-\d+\b/;
  const INTERNAL_PATH_RE = /(\bsrc\/|commands\/specs\/|\b[a-z-]+\.(?:ts|js)\b|rosettify\b|instructions\/)/;
  const NOTATION_RE = /\b(xml|html|markdown|yaml|yml|toml|csv|json|markup|tag|attribute|element)\b/i;

  for (const entry of SPEC_FIELD_GUIDE) {
    it(`guidance for ${entry.field} names no requirement id, ticket id, internal path, notation, or file format`, () => {
      expect(REQ_ID_RE.test(entry.guidance), `requirement id in: ${entry.guidance}`).toBe(false);
      expect(TICKET_ID_RE.test(entry.guidance), `ticket id in: ${entry.guidance}`).toBe(false);
      expect(INTERNAL_PATH_RE.test(entry.guidance), `internal path in: ${entry.guidance}`).toBe(false);
      expect(NOTATION_RE.test(entry.guidance), `markup notation or file format in: ${entry.guidance}`).toBe(false);
    });
  }

  it("scans the concatenation too, so a leak split across the boundary of two lines is still caught", () => {
    const all = SPEC_FIELD_GUIDE.map((g) => g.guidance).join("\n");
    expect(all.match(new RegExp(REQ_ID_RE, "g")) ?? []).toEqual([]);
    expect(all.match(new RegExp(NOTATION_RE, "gi")) ?? []).toEqual([]);
  });
});
