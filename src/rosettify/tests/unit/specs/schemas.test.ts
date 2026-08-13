/**
 * Unit tests for commands/specs/schemas.ts — FR-SPECS-0050 (named result types, recursively
 * $ref'd, no anonymous shape at any depth) / FR-SPECS-0060 (schema dictionary) / FR-HELP-0002.
 *
 * Guards against the specific regression this test was added for: `AreaEntry` was named in
 * FR-SPECS-0050's own statement as one of "the remaining named result types" required to be
 * "present in the help schema dictionary", but was missing from `specsSchemasDict` entirely.
 */
import { describe, it, expect } from "vitest";
import { specsSchemasDict } from "../../../src/commands/specs/schemas.js";
import { EARS_PATTERNS, LEVELS } from "../../../src/commands/specs/core.js";

/** The `properties` map of a dict entry, as a plain record. */
function propsOf(typeName: string): Record<string, { type?: string; enum?: string[]; items?: unknown }> {
  const entry = specsSchemasDict[typeName] as { properties?: Record<string, never> };
  return (entry.properties ?? {}) as Record<string, { type?: string; enum?: string[]; items?: unknown }>;
}

/** Recursively collects every `$ref` value reachable from `node` (properties, array `items`,
 * `oneOf` branches — walked generically, no schema-shape assumptions beyond "plain object/array"). */
function collectRefs(node: unknown, refs: Set<string>): void {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, refs);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj["$ref"] === "string") refs.add(obj["$ref"]);
  for (const value of Object.values(obj)) collectRefs(value, refs);
}

// FR-SPECS-0050's own statement — the explicit list of "remaining named result types" (beyond
// the two shared write/lifecycle results) that SHALL be present in the schema dictionary.
const FR_SPECS_0050_REQUIRED_TYPES = [
  "Spec",
  "AcceptanceCriterion",
  "AreaEntry",
  "SpecGetResult",
  "SpecQueryResult",
  "SpecDeleteResult",
  "SpecPurgeResult",
  "SpecImplementedResult",
  "SpecValidateResult",
  "SpecFinding",
  "SpecGraphResult",
  "SpecEdge",
  "SpecRenderResult",
  "SpecInfoResult",
  "SpecAreaInfo",
  "SpecTotals",
  "SpecNextId",
  "SpecMigrateResult",
  // Shared write/lifecycle results, named separately in the same requirement.
  "SpecWriteResult",
  "SpecLifecycleResult",
];

describe("specsSchemasDict — FR-SPECS-0050 required type list", () => {
  it.each(FR_SPECS_0050_REQUIRED_TYPES)("includes '%s'", (typeName) => {
    expect(specsSchemasDict).toHaveProperty(typeName);
  });

  it("includes AreaEntry specifically (regression guard — was missing entirely)", () => {
    expect(specsSchemasDict["AreaEntry"]).toBeDefined();
    expect(specsSchemasDict["AreaEntry"]).toMatchObject({
      type: "object",
      properties: { code: { type: "string" }, name: { type: "string" } },
    });
  });
});

// The dictionary is what tells a caller how to author a spec unit. Presence of the type NAME says
// nothing about its published FIELDS, so the criterion model's shape is pinned here directly:
// a schema that drifted from core.ts would otherwise ship wrong authoring instructions silently.
describe("specsSchemasDict — the published AcceptanceCriterion shape (FR-SPECS-0001)", () => {
  const props = () => propsOf("AcceptanceCriterion");

  it("publishes exactly the criterion's fields", () => {
    expect(Object.keys(props()).sort()).toEqual(["ears", "id", "if", "shall", "system", "when", "where", "while"]);
  });

  it("publishes no Given/When/Then field from the superseded model", () => {
    expect(props()).not.toHaveProperty("given");
    expect(props()).not.toHaveProperty("then");
  });

  it("constrains ears to the five EARS patterns, sourced from the same enum core.ts uses", () => {
    expect(props()["ears"]!.enum).toEqual([...EARS_PATTERNS]);
  });

  it.each(["when", "while", "where", "if"])("publishes the condition word '%s' as a string", (word) => {
    expect(props()[word]!.type).toBe("string");
  });

  it.each(["system", "shall"])("publishes the required %s field as a string", (field) => {
    expect(props()[field]!.type).toBe("string");
  });
});

describe("specsSchemasDict — the published Spec shape (FR-SPECS-0001)", () => {
  const props = () => propsOf("Spec");

  it.each(["level", "subsystem", "component", "evidence"])("publishes the %s field added with the model", (field) => {
    expect(props()).toHaveProperty(field);
  });

  it("constrains level to the three levels, sourced from the same enum core.ts uses", () => {
    expect(props()["level"]!.enum).toEqual([...LEVELS]);
  });

  it("publishes evidence as an array of strings, one per source location", () => {
    expect(props()["evidence"]!.type).toBe("array");
    expect(props()["evidence"]!.items).toEqual({ type: "string" });
  });

  it.each(["subsystem", "component"])("publishes %s as a string", (field) => {
    expect(props()[field]!.type).toBe("string");
  });

  it("refs the named AcceptanceCriterion for acceptance items rather than inlining the shape", () => {
    expect(props()["acceptance"]!.items).toEqual({ $ref: "AcceptanceCriterion" });
  });
});

// FR-SPECS-0002 — the document holds one system's requirements; the summary names it `system`.
describe("specsSchemasDict — the published SpecDocumentSummary shape (FR-SPECS-0002)", () => {
  it("publishes the document's system, not the superseded component", () => {
    const props = propsOf("SpecDocumentSummary");
    expect(props).toHaveProperty("system");
    expect(props).not.toHaveProperty("component");
  });
});

// FR-SPECS-0008 AC3 — every property takes its description from SPEC_FIELD_GUIDE by lookup, so the
// schema dictionary and the help field_guide section are the same strings by construction.
describe("specsSchemasDict — every published field carries authoring guidance", () => {
  it.each(["Spec", "AcceptanceCriterion"])("gives every %s property a non-empty description", (typeName) => {
    const undescribed = Object.entries(propsOf(typeName))
      .filter(([, schema]) => typeof (schema as { description?: string }).description !== "string" || (schema as { description: string }).description.trim() === "")
      .map(([name]) => name);
    expect(undescribed).toEqual([]);
  });
});

describe("specsSchemasDict — recursive $ref completeness (FR-HELP-0002)", () => {
  it("every $ref anywhere in the dict resolves to a present key", () => {
    const refs = new Set<string>();
    collectRefs(specsSchemasDict, refs);
    expect(refs.size).toBeGreaterThan(0); // sanity — the dict does use $ref somewhere
    const missing = [...refs].filter((ref) => !(ref in specsSchemasDict));
    expect(missing).toEqual([]);
  });

  it("collects $ref transitively (each referenced schema's own $refs also resolve)", () => {
    // Walk outward from every entry point (not just top-level) so a $ref nested inside another
    // $ref'd schema (e.g. SpecWriteResult -> SpecDocumentSummary, SpecInfoResult -> SpecAreaInfo)
    // is included — collectRefs over the whole dict already does this since it recurses into
    // every value, but this test pins the specific multi-hop chains by name.
    const refs = new Set<string>();
    collectRefs(specsSchemasDict, refs);
    expect(refs.has("SpecDocumentSummary")).toBe(true);
    expect(refs.has("SpecRef")).toBe(true);
    expect(refs.has("SpecAreaInfo")).toBe(true);
    expect(refs.has("SpecTotals")).toBe(true);
    expect(refs.has("SpecNextId")).toBe(true);
    expect(refs.has("AcceptanceCriterion")).toBe(true);
    expect(refs.has("SpecFinding")).toBe(true);
    expect(refs.has("SpecEdge")).toBe(true);
    expect(refs.has("SpecImplementedItem")).toBe(true);
    expect(refs.has("SpecSkipped")).toBe(true);
  });
});
