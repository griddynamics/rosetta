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
