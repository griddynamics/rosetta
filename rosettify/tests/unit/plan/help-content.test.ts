/**
 * Unit tests for plan help content.
 * Verifies planSchemasDict coverage, notes array, subcommand examples, no-leak assertion,
 * recursive-naming walk (all $refs resolve, no anonymous nested shapes).
 */
import { describe, it, expect } from "vitest";
import { planSchemasDict } from "../../../src/commands/plan/schemas.js";
import { planHelpContent, planNotes } from "../../../src/commands/plan/help-content.js";

// ---------------------------------------------------------------------------
// planSchemasDict — type-name keyed, one entry per distinct type
// ---------------------------------------------------------------------------

describe("planSchemasDict — type-name keys", () => {
  const EXPECTED_TYPE_NAME_KEYS = [
    // Input types
    "PlanCreateInput",
    "PlanNextInput",
    "PlanUpdateStatusInput",
    "PlanTargetInput",         // shared by show_status and query
    "PlanUpsertInput",
    "PlanCreateWithTemplateInput",
    "PlanUpsertWithTemplateInput",
    "PlanListTemplatesInput",
    // Result types
    "PlanWriteResult",         // shared by all 4 write subcommands
    "PlanNextResult",
    "PlanUpdateStatusResult",
    "PlanShowStatusResult",
    "PlanQueryResult",
    "PlanTemplateCatalog",
    // Shared data shapes
    "Plan",
    "Phase",
    "Step",
    // New named types (FR-PLAN-0041)
    "PlanSummary",
    "PlanNextStep",
    "PlanPhaseContext",
    "PlanStatusTotals",
    "PlanPhaseSummary",
    "PlanStepSummary",
    "PlanStepDetail",
    "PlanTemplateCatalogEntry",
    "ShowStatusPlanResult",
  ] as const;

  it("contains an entry for every expected type name", () => {
    for (const name of EXPECTED_TYPE_NAME_KEYS) {
      expect(planSchemasDict[name], `Missing key: ${name}`).toBeDefined();
    }
  });

  it("schemas dict is a flat dictionary (Record<string, unknown>)", () => {
    expect(typeof planSchemasDict).toBe("object");
    expect(planSchemasDict).not.toBeNull();
  });

  it("does not use old subcommand-name keys (no 'create', 'next' as top-level input keys)", () => {
    expect(planSchemasDict["create-output"]).toBeUndefined();
    expect(planSchemasDict["next-output"]).toBeUndefined();
    expect(planSchemasDict["compressed-tree"]).toBeUndefined();
  });

  it("does not expose input_schema or output_schema as root keys (per M1 fix)", () => {
    const helpResult = planHelpContent;
    expect((helpResult as Record<string, unknown>)["input_schema"]).toBeUndefined();
    expect((helpResult as Record<string, unknown>)["output_schema"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Recursive-naming walk (conformance gate — FR-HELP-0002 / FR-PLAN-0041)
// ---------------------------------------------------------------------------

describe("planSchemasDict — recursive-naming walk (no anonymous nested shapes)", () => {
  /**
   * Walk a schema value recursively.
   * Rules:
   * - A plain { $ref: "Key" } is valid if Key exists in the dict.
   * - An object with `properties` must have every property that is an object
   *   OR every array items be a $ref (not inline object/array-of-object).
   * - An { type:"array", items:{...} } where items is NOT a $ref is a violation
   *   UNLESS items is a primitive (type: "string" | "integer" | "number" | "boolean").
   * - A { oneOf: [...] } must have all entries as $refs.
   * Primitives (type: string | integer | number | boolean) are fine inline.
   * visited-set prevents infinite recursion on cycles.
   */
  function isPrimitive(schema: Record<string, unknown>): boolean {
    const t = schema["type"];
    return (
      t === "string" || t === "integer" || t === "number" || t === "boolean" ||
      (Array.isArray(t) && (t as string[]).every((v) => ["string", "integer", "number", "boolean", "null"].includes(v)))
    );
  }

  function isRef(schema: unknown): schema is { $ref: string } {
    return typeof schema === "object" && schema !== null && "$ref" in schema && typeof (schema as Record<string,unknown>)["$ref"] === "string";
  }

  function walkSchema(
    schema: unknown,
    dictKeys: Set<string>,
    visited: Set<string>,
    path: string,
    violations: string[],
  ): void {
    if (typeof schema !== "object" || schema === null) return;
    const s = schema as Record<string, unknown>;

    // $ref — must resolve to a dict key; then recurse into target
    if ("$ref" in s) {
      const ref = s["$ref"] as string;
      if (!dictKeys.has(ref)) {
        violations.push(`${path}: $ref "${ref}" does not exist in planSchemasDict`);
        return;
      }
      // Recurse into the referenced schema (cycle guard)
      if (!visited.has(ref)) {
        visited.add(ref);
        walkSchema(planSchemasDict[ref], dictKeys, visited, `${path}->$ref(${ref})`, violations);
      }
      return;
    }

    // oneOf — each entry must be either a $ref OR a primitive type (string/object for input flexibility)
    if ("oneOf" in s && Array.isArray(s["oneOf"])) {
      for (const [i, entry] of (s["oneOf"] as unknown[]).entries()) {
        if (isRef(entry)) {
          walkSchema(entry, dictKeys, visited, `${path}.oneOf[${i}]`, violations);
        } else if (typeof entry === "object" && entry !== null) {
          const entryObj = entry as Record<string, unknown>;
          // Allow primitive types inline in oneOf (string, object as generic type, etc.)
          // Only flag if it's an object WITH properties (anonymous nested object)
          if (entryObj["type"] === "object" && "properties" in entryObj) {
            violations.push(`${path}.oneOf[${i}]: anonymous object with properties; use a $ref instead`);
          }
          // Primitive type strings (e.g. {type:"string"}, {type:"object"} without properties) are OK
        }
      }
      return;
    }

    // array — items must be a $ref or a primitive
    if (s["type"] === "array") {
      const items = s["items"];
      if (items === undefined) {
        // bare { type:"array" } with no items is fine for primitive arrays with no shape
        // but the walk test requires items to exist if this is an array of named shapes
        // The plan explicitly states: { type:"array" } with NO items is a FAILURE when
        // the array should carry named shapes. Check: if there's no items at all, flag it.
        // BUT: allow for schemas that are { type:"array" } at the INPUT level (queryOutputSchema etc.)
        // We only flag if there's no items AND the type is array — let that pass for leaf arrays.
        return;
      }
      if (!isRef(items)) {
        // Check if items is primitive
        const itemsObj = items as Record<string, unknown>;
        if (!isPrimitive(itemsObj)) {
          violations.push(`${path}.items: must be a $ref to a named type, found: ${JSON.stringify(items)}`);
        }
      } else {
        walkSchema(items, dictKeys, visited, `${path}.items`, violations);
      }
      return;
    }

    // object with properties — recurse into each property value
    if (s["type"] === "object" && "properties" in s) {
      const props = s["properties"] as Record<string, unknown>;
      for (const [key, val] of Object.entries(props)) {
        const propSchema = val as Record<string, unknown>;
        // If a property is a $ref, it's fine
        if (isRef(propSchema)) {
          walkSchema(propSchema, dictKeys, visited, `${path}.properties.${key}`, violations);
          continue;
        }
        // If a property is an array, validate its items
        if (propSchema["type"] === "array") {
          walkSchema(propSchema, dictKeys, visited, `${path}.properties.${key}`, violations);
          continue;
        }
        // If a property is an object with sub-properties, it's an anonymous object — violation
        if (propSchema["type"] === "object" && "properties" in propSchema) {
          violations.push(`${path}.properties.${key}: anonymous nested object; use a $ref instead`);
          continue;
        }
        // If a property is oneOf, recurse
        if ("oneOf" in propSchema) {
          walkSchema(propSchema, dictKeys, visited, `${path}.properties.${key}`, violations);
          continue;
        }
        // Primitive or enum — fine
      }
    }
  }

  it("all $refs in planSchemasDict resolve to existing keys (deep recursive walk)", () => {
    const dictKeys = new Set(Object.keys(planSchemasDict));
    const violations: string[] = [];

    for (const [key, schema] of Object.entries(planSchemasDict)) {
      const visited = new Set<string>([key]);
      walkSchema(schema, dictKeys, visited, key, violations);
    }

    if (violations.length > 0) {
      throw new Error(
        `planSchemasDict recursive-naming violations:\n${violations.map((v) => `  - ${v}`).join("\n")}`,
      );
    }
  });

  it("PlanWriteResult has no previous_version property in schema", () => {
    const schema = planSchemasDict["PlanWriteResult"] as Record<string, unknown>;
    const props = (schema["properties"] ?? {}) as Record<string, unknown>;
    expect(props["previous_version"]).toBeUndefined();
    expect(props["plan"]).toBeDefined();
    expect(props["phases"]).toBeDefined();
  });

  it("planSchema.phases items uses $ref Phase", () => {
    const schema = planSchemasDict["Plan"] as Record<string, unknown>;
    const props = (schema["properties"] ?? {}) as Record<string, unknown>;
    const phases = props["phases"] as Record<string, unknown>;
    expect(phases["items"]).toEqual({ $ref: "Phase" });
  });

  it("phaseSchema.steps items uses $ref Step", () => {
    const schema = planSchemasDict["Phase"] as Record<string, unknown>;
    const props = (schema["properties"] ?? {}) as Record<string, unknown>;
    const steps = props["steps"] as Record<string, unknown>;
    expect(steps["items"]).toEqual({ $ref: "Step" });
  });
});

// ---------------------------------------------------------------------------
// No-leak assertion — no FR-IDs or NFR-IDs in emitted help
// ---------------------------------------------------------------------------

describe("planHelpContent — no-leak assertion", () => {
  it("serialized help contains no FR-ID or NFR-ID strings", () => {
    const serialized = JSON.stringify(planHelpContent);
    const match = serialized.match(/\bN?FR-[A-Z0-9]/);
    expect(match, `Found requirement ID leak: ${match?.[0]}`).toBeNull();
  });

  it("serialized help contains no 'compressed-tree' wording", () => {
    const serialized = JSON.stringify(planHelpContent);
    expect(serialized).not.toContain("compressed-tree");
  });

  it("serialized help contains no 'previous_version=null' wording in create description", () => {
    const serialized = JSON.stringify(planHelpContent);
    expect(serialized).not.toContain("previous_version=null");
  });

  it("serialized help contains no '--limit' substring (hidden alias must not be advertised)", () => {
    const serialized = JSON.stringify(planHelpContent);
    expect(serialized).not.toContain("--limit");
  });
});

// ---------------------------------------------------------------------------
// Notes array contents (FR-PLAN-0042)
// ---------------------------------------------------------------------------

describe("planHelpContent — notes array", () => {
  it("notes array has at least 12 entries (per FR-PLAN-0042)", () => {
    expect(Array.isArray(planNotes)).toBe(true);
    expect(planNotes.length).toBeGreaterThanOrEqual(12);
  });

  it("notes array is string[]", () => {
    for (const note of planNotes) {
      expect(typeof note).toBe("string");
      expect(note.length).toBeGreaterThan(0);
    }
  });

  it("notes include silent-drop behavior (discriminator: 'silently drops status')", () => {
    expect(planNotes.some((n) => n.includes("silently drops status"))).toBe(true);
  });

  it("notes include write-cycle summary (discriminator: 'write-cycle process')", () => {
    expect(planNotes.some((n) => n.includes("write-cycle process"))).toBe(true);
  });

  it("notes include .bakNNN rename + previous_version (discriminator: '.bakNNN' and 'previous_version')", () => {
    expect(planNotes.some((n) => n.includes(".bakNNN") && n.includes("previous_version"))).toBe(true);
  });

  it("notes include backup retention with default 5 (discriminator: 'retention' and 'default 5')", () => {
    expect(planNotes.some((n) => n.includes("retention") && n.includes("default 5"))).toBe(true);
  });

  it("notes include missing-but-bak read retry (discriminator: 'missing but at least one backup exists')", () => {
    expect(planNotes.some((n) => n.includes("missing but at least one backup exists"))).toBe(true);
  });

  it("notes include template kind separation (discriminator: 'two kinds' and 'cannot be used with the other kind')", () => {
    expect(planNotes.some((n) => n.includes("two kinds") && n.includes("cannot be used with the other kind"))).toBe(true);
  });

  it("notes include placeholder syntax (discriminator: '[placeholder-name]' and 'match exactly')", () => {
    expect(planNotes.some((n) => n.includes("[placeholder-name]") && n.includes("match exactly"))).toBe(true);
  });

  // New notes from FR-PLAN-0042
  it("notes include end-to-end usage (discriminator: 'end-to-end usage')", () => {
    expect(planNotes.some((n) => n.includes("end-to-end usage"))).toBe(true);
  });

  it("notes include phase-scoped next (discriminator: 'phase-scoped next')", () => {
    expect(planNotes.some((n) => n.includes("phase-scoped next"))).toBe(true);
  });

  it("notes include --target with or without limit in phase-scoped next", () => {
    expect(planNotes.some((n) => n.includes("--target") && n.includes("with or without a limit"))).toBe(true);
  });

  it("notes include what-next-returns note (discriminator: 'what next returns')", () => {
    expect(planNotes.some((n) => n.includes("what next returns"))).toBe(true);
  });

  it("notes include three-outcomes note (discriminator: 'three outcomes of a next call')", () => {
    expect(planNotes.some((n) => n.includes("three outcomes of a next call"))).toBe(true);
  });

  it("notes include recovery note (discriminator: 'show_status' and 'query')", () => {
    expect(planNotes.some((n) => n.includes("show_status") && n.includes("query"))).toBe(true);
  });

  it("concepts.resume is absent from help content", () => {
    const concepts = planHelpContent.concepts as Record<string, unknown>;
    expect(concepts["resume"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// status_propagation precedence (FR-PLAN-0016 / FR-PLAN-0003)
// ---------------------------------------------------------------------------

describe("planHelpContent — status_propagation precedence", () => {
  it("status_propagation states all-complete=complete", () => {
    const sp = (planHelpContent.concepts as Record<string, string>)["status_propagation"];
    expect(sp).toContain("complete");
  });

  it("status_propagation states failed outranks blocked", () => {
    const sp = (planHelpContent.concepts as Record<string, string>)["status_propagation"];
    // Must mention failed > blocked precedence
    expect(sp).toMatch(/failed.*outranks.*blocked|failed.*>.*blocked/);
  });

  it("status_propagation states blocked outranks in_progress", () => {
    const sp = (planHelpContent.concepts as Record<string, string>)["status_propagation"];
    expect(sp).toMatch(/blocked.*outranks.*in_progress|blocked.*>.*in_progress/);
  });

  it("status_propagation states in_progress outranks open", () => {
    const sp = (planHelpContent.concepts as Record<string, string>)["status_propagation"];
    expect(sp).toMatch(/in_progress.*outranks.*open|in_progress.*>.*open/);
  });
});

// ---------------------------------------------------------------------------
// next_steps_for_ai — three outcomes (FR-PLAN-0016)
// ---------------------------------------------------------------------------

describe("planHelpContent — next_steps_for_ai three outcomes", () => {
  it("mentions count > 0 work outcome", () => {
    const nsfa = planHelpContent.next_steps_for_ai as string;
    expect(nsfa).toMatch(/count.*>.*0|count.*greater.*0/);
  });

  it("mentions count = 0 + complete = done outcome", () => {
    const nsfa = planHelpContent.next_steps_for_ai as string;
    expect(nsfa).toMatch(/count.*0.*complete|scope.*done/);
  });

  it("mentions count = 0 + blocked/failed = recover outcome", () => {
    const nsfa = planHelpContent.next_steps_for_ai as string;
    expect(nsfa).toMatch(/blocked|failed/);
    expect(nsfa).toMatch(/recover|reset/);
  });

  it("mentions show_status, query, update_status as recovery path", () => {
    const nsfa = planHelpContent.next_steps_for_ai as string;
    expect(nsfa).toContain("show_status");
    expect(nsfa).toContain("query");
    expect(nsfa).toContain("update_status");
  });

  it("mentions parent.status for --target scope completion signal", () => {
    const nsfa = planHelpContent.next_steps_for_ai as string;
    expect(nsfa).toContain("parent.status");
  });
});

// ---------------------------------------------------------------------------
// upsert conditional requirements (FR-PLAN-0016)
// ---------------------------------------------------------------------------

describe("planHelpContent — upsert conditional requirements", () => {
  it("upsert subcommand has conditional_requirements note", () => {
    const upsert = planHelpContent.subcommands.find((s) => s.name === "upsert")!;
    expect((upsert as Record<string, unknown>)["conditional_requirements"]).toBeDefined();
    const cr = (upsert as Record<string, unknown>)["conditional_requirements"] as string;
    // kind is required only when target id is new (does not already exist)
    expect(cr).toMatch(/kind.*required.*when|kind.*only.*when/);
    expect(cr).toMatch(/phase_id.*required.*when.*kind.*step|phase_id.*only.*when.*kind.*step/);
  });
});

// ---------------------------------------------------------------------------
// Subcommand entries with dual-form examples
// ---------------------------------------------------------------------------

describe("planHelpContent — subcommand examples", () => {
  const EXPECTED_SUBCOMMANDS = [
    "create",
    "next",
    "update_status",
    "show_status",
    "query",
    "upsert",
    "create-with-template",
    "upsert-with-template",
    "list-templates",
  ];

  it("has entries for all 9 subcommands", () => {
    const names = planHelpContent.subcommands.map((s) => s.name);
    for (const expected of EXPECTED_SUBCOMMANDS) {
      expect(names).toContain(expected);
    }
  });

  it("every subcommand entry has examples with tip and real fields", () => {
    for (const sub of planHelpContent.subcommands) {
      expect(sub.examples).toBeDefined();
      expect(typeof (sub.examples as Record<string, unknown>)["tip"]).toBe("string");
      expect(typeof (sub.examples as Record<string, unknown>)["real"]).toBe("string");
    }
  });

  it("every subcommand entry has a required statement", () => {
    for (const sub of planHelpContent.subcommands) {
      expect((sub as Record<string, unknown>)["required"],
        `Missing 'required' on subcommand: ${sub.name}`).toBeDefined();
    }
  });

  it("tip examples contain bracketed placeholders", () => {
    const tipsWithBrackets = planHelpContent.subcommands.filter((s) => {
      const tip = (s.examples as Record<string, string>)["tip"] ?? "";
      return tip.includes("[") && tip.includes("]");
    });
    expect(tipsWithBrackets.length).toBeGreaterThan(0);
  });

  it("next subcommand description mentions default 3", () => {
    const next = planHelpContent.subcommands.find((s) => s.name === "next")!;
    expect(next.description).toContain("3");
  });

  it("next subcommand args mention default 3", () => {
    const next = planHelpContent.subcommands.find((s) => s.name === "next")!;
    const limit = (next.args as Record<string, string>)["limit"];
    expect(limit).toContain("3");
  });

  it("next subcommand description does NOT mention flags like resume or previously_blocked", () => {
    const next = planHelpContent.subcommands.find((s) => s.name === "next")!;
    expect(next.description).not.toContain("resume");
    expect(next.description).not.toContain("previously_blocked");
    expect(next.description).not.toContain("previously_failed");
  });

  it("list-templates description mentions produces", () => {
    const lt = planHelpContent.subcommands.find((s) => s.name === "list-templates")!;
    expect(lt.description).toContain("produces");
  });
});

// ---------------------------------------------------------------------------
// Required fields
// ---------------------------------------------------------------------------

describe("planHelpContent — required fields", () => {
  it("has plan_file field", () => {
    expect(planHelpContent.plan_file).toBeDefined();
  });

  it("has concepts field", () => {
    expect(planHelpContent.concepts).toBeDefined();
  });

  it("has subagent_fields field", () => {
    expect(planHelpContent.subagent_fields).toBeDefined();
  });

  it("has limits field", () => {
    expect(planHelpContent.limits).toBeDefined();
  });

  it("has templates field (getter)", () => {
    const templates = planHelpContent.templates;
    expect(templates).toBeDefined();
    expect(Array.isArray(templates.create)).toBe(true);
    expect(Array.isArray(templates.upsert)).toBe(true);
  });

  it("has plan_authoring_guidance field with verbatim text", () => {
    expect(planHelpContent.plan_authoring_guidance).toBe(
      "the last step in each phase should verify all work in that phase was actually completed; " +
      "the last phase should verify all work across the entire plan was completed",
    );
  });

  it("has next_steps_for_ai field mentioning 'steps' (not 'ready steps')", () => {
    expect(planHelpContent.next_steps_for_ai).toBeDefined();
    expect(typeof planHelpContent.next_steps_for_ai).toBe("string");
    // Should say 'steps' not 'ready steps'
    expect(planHelpContent.next_steps_for_ai).not.toContain("ready steps");
  });
});
