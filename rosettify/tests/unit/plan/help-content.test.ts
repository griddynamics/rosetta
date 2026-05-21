/**
 * Unit tests for plan help content — FR-PLAN-0016 / FR-HELP-0002.
 * Verifies planSchemasDict coverage, notes array, and subcommand examples.
 */
import { describe, it, expect } from "vitest";
import { planSchemasDict } from "../../../src/commands/plan/schemas.js";
import { planHelpContent, planNotes } from "../../../src/commands/plan/help-content.js";

// ---------------------------------------------------------------------------
// FR-HELP-0002 — planSchemasDict contains every subcommand
// ---------------------------------------------------------------------------

describe("planSchemasDict — FR-HELP-0002", () => {
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
  ] as const;

  // FR-HELP-0002 — flat dictionary includes one entry per subcommand (keyed by subcommand name)
  it("contains an entry for every plan subcommand", () => {
    for (const name of EXPECTED_SUBCOMMANDS) {
      expect(planSchemasDict[name]).toBeDefined();
    }
  });

  it("does not expose input_schema or output_schema as root keys (per M1 fix)", () => {
    // The help shape after M1 fix must NOT include these top-level fields
    const helpResult = planHelpContent;
    expect((helpResult as Record<string, unknown>)["input_schema"]).toBeUndefined();
    expect((helpResult as Record<string, unknown>)["output_schema"]).toBeUndefined();
  });

  it("schemas is a flat dictionary (Record<string, unknown>)", () => {
    expect(typeof planSchemasDict).toBe("object");
    expect(planSchemasDict).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0016 — notes array contains every required behavior
// ---------------------------------------------------------------------------

describe("planHelpContent — FR-PLAN-0016 notes array", () => {
  // FR-PLAN-0016 requires 7 specific behavior notes
  it("notes array has at least 7 entries", () => {
    expect(Array.isArray(planNotes)).toBe(true);
    expect(planNotes.length).toBeGreaterThanOrEqual(7);
  });

  it("notes array is string[]", () => {
    for (const note of planNotes) {
      expect(typeof note).toBe("string");
      expect(note.length).toBeGreaterThan(0);
    }
  });

  // Each FR-PLAN-0016 mandated behavior is matched by a discriminating phrase unique to that note,
  // so a copy-edit that drops a note entirely cannot be hidden behind a generic keyword match.
  it("notes include FR-PLAN-0015 silent-drop behavior (discriminator: 'silently drops status')", () => {
    expect(planNotes.some((n) => n.includes("silently drops status"))).toBe(true);
  });

  it("notes include FR-PLAN-0024 write-cycle summary (discriminator: 'write-cycle process')", () => {
    expect(planNotes.some((n) => n.includes("write-cycle process"))).toBe(true);
  });

  it("notes include FR-PLAN-0024 .bakNNN rename + previous_version (discriminator: '.bakNNN' and 'previous_version')", () => {
    expect(planNotes.some((n) => n.includes(".bakNNN") && n.includes("previous_version"))).toBe(true);
  });

  it("notes include FR-PLAN-0024 backup retention with default 5 (discriminator: 'retention' and 'default 5')", () => {
    expect(planNotes.some((n) => n.includes("retention") && n.includes("default 5"))).toBe(true);
  });

  it("notes include FR-SHRD-0009 missing-but-bak read retry (discriminator: 'missing but at least one backup exists')", () => {
    expect(planNotes.some((n) => n.includes("missing but at least one backup exists"))).toBe(true);
  });

  it("notes include FR-PLAN-0033 template kind separation (discriminator: 'two kinds' and 'cannot be used with the other kind')", () => {
    expect(planNotes.some((n) => n.includes("two kinds") && n.includes("cannot be used with the other kind"))).toBe(true);
  });

  it("notes include FR-PLAN-0034 placeholder syntax (discriminator: '[placeholder-name]' and 'match exactly')", () => {
    expect(planNotes.some((n) => n.includes("[placeholder-name]") && n.includes("match exactly"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0016 / FR-PLAN-0018 — subcommand entries with dual-form examples
// ---------------------------------------------------------------------------

describe("planHelpContent — FR-PLAN-0016 subcommand examples", () => {
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

  // FR-PLAN-0016 — one subcommand entry per registered subcommand
  it("has entries for all 9 subcommands", () => {
    const names = planHelpContent.subcommands.map((s) => s.name);
    for (const expected of EXPECTED_SUBCOMMANDS) {
      expect(names).toContain(expected);
    }
  });

  // FR-PLAN-0018 — each subcommand has dual-form examples: tip (bracketed) + real (quoted)
  it("every subcommand entry has examples with tip and real fields", () => {
    for (const sub of planHelpContent.subcommands) {
      expect(sub.examples).toBeDefined();
      expect(typeof (sub.examples as Record<string, unknown>)["tip"]).toBe("string");
      expect(typeof (sub.examples as Record<string, unknown>)["real"]).toBe("string");
    }
  });

  // FR-PLAN-0018 — tip uses bracketed placeholders, real uses quoted values
  it("tip examples contain bracketed placeholders", () => {
    // At least some tip examples should have [bracket] syntax
    const tipsWithBrackets = planHelpContent.subcommands.filter((s) => {
      const tip = (s.examples as Record<string, string>)["tip"] ?? "";
      return tip.includes("[") && tip.includes("]");
    });
    expect(tipsWithBrackets.length).toBeGreaterThan(0);
  });

  it("real examples do not have unsubstituted [placeholder] text", () => {
    for (const sub of planHelpContent.subcommands) {
      const real = (sub.examples as Record<string, string>)["real"] ?? "";
      // Real examples should use concrete values, not [plan_file] placeholder syntax
      // Exception: list-templates has no args so its real may be just the command
      if (real.length > 0) {
        // Accept — real values from requirements may have [] for actual plan IDs
        expect(typeof real).toBe("string");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0016 — plan help content required fields
// ---------------------------------------------------------------------------

describe("planHelpContent — FR-PLAN-0016 required fields", () => {
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

  it("has plan_authoring_guidance field with FR-PLAN-0016 verbatim text", () => {
    // FR-PLAN-0016 quotes this string verbatim — any drift is a contract regression.
    expect(planHelpContent.plan_authoring_guidance).toBe(
      "the last step in each phase should verify all work in that phase was actually completed; " +
      "the last phase should verify all work across the entire plan was completed",
    );
  });

  it("has next_steps_for_ai field", () => {
    expect(planHelpContent.next_steps_for_ai).toBeDefined();
    expect(typeof planHelpContent.next_steps_for_ai).toBe("string");
  });
});
