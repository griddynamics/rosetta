/**
 * Unit tests for the help command (FR-HELP-0001, FR-HELP-0002).
 * Updated for Phase 9: asserts new shape (schemas, notes present; input_schema/output_schema absent).
 * For help plan: verifies templates, plan_file, concepts, subagent_fields, limits,
 * plan_authoring_guidance, next_steps_for_ai, subcommands with examples.
 */
import { describe, it, expect } from "vitest";
import { helpToolDef } from "../../../src/commands/help/index.js";
import type { HelpTopLevel, HelpCommandDetail } from "../../../src/registry/types.js";

describe("help — top-level listing (no subcommand)", () => {
  it("returns ok:true with tool and version", async () => {
    const result = await helpToolDef.run({});
    expect(result.ok).toBe(true);
    const r = result.result as HelpTopLevel;
    expect(r.tool).toBe("rosettify");
    expect(r.version).toBeDefined();
    expect(Array.isArray(r.commands)).toBe(true);
    expect(r.guidance).toContain("help");
  });

  it("lists plan and help commands", async () => {
    const result = await helpToolDef.run({});
    const r = result.result as HelpTopLevel;
    const names = r.commands.map((c) => c.name);
    expect(names).toContain("plan");
    expect(names).toContain("help");
  });

  it("each command entry has name and brief", async () => {
    const result = await helpToolDef.run({});
    const r = result.result as HelpTopLevel;
    for (const cmd of r.commands) {
      expect(typeof cmd.name).toBe("string");
      expect(typeof cmd.brief).toBe("string");
    }
  });
});

describe("help — command detail (subcommand=plan) — FR-HELP-0002", () => {
  it("returns plan detail — does NOT have input_schema or output_schema (M1 fix)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpCommandDetail;

    // FR-HELP-0002 — per M1 fix: input_schema and output_schema removed from result
    expect((r as Record<string, unknown>)["input_schema"]).toBeUndefined();
    expect((r as Record<string, unknown>)["output_schema"]).toBeUndefined();
  });

  it("returns plan detail with schemas dict (FR-HELP-0002)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpCommandDetail;

    // FR-HELP-0002 — schemas dict is present (sourced from planSchemasDict)
    expect(r.schemas).toBeDefined();
    expect(typeof r.schemas).toBe("object");
  });

  it("returns plan detail with notes array (FR-HELP-0002)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpCommandDetail;

    // FR-HELP-0002 — notes array present and non-empty
    expect(Array.isArray(r.notes)).toBe(true);
    expect((r.notes as string[]).length).toBeGreaterThanOrEqual(7);
  });

  it("returns plan detail with all 9 subcommands", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpCommandDetail;
    expect(r.name).toBe("plan");
    expect(r.brief).toBeDefined();
    expect(r.description).toBeDefined();
    expect(Array.isArray(r.subcommands)).toBe(true);
    const subNames = (r.subcommands as Array<{ name: string }>).map((s) => s.name);
    expect(subNames).toContain("create");
    expect(subNames).toContain("next");
    expect(subNames).toContain("update_status");
    expect(subNames).toContain("show_status");
    expect(subNames).toContain("query");
    expect(subNames).toContain("upsert");
    // FR-PLAN-0030 / FR-PLAN-0031 / FR-PLAN-0032 — new subcommands
    expect(subNames).toContain("create-with-template");
    expect(subNames).toContain("upsert-with-template");
    expect(subNames).toContain("list-templates");
  });

  // FR-PLAN-0016 — help plan has templates catalog
  it("returns plan detail with templates catalog (FR-PLAN-0016, FR-PLAN-0032)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    const templates = r["templates"] as { create: unknown[]; upsert: unknown[] } | undefined;
    expect(templates).toBeDefined();
    expect(Array.isArray(templates!.create)).toBe(true);
    expect(Array.isArray(templates!.upsert)).toBe(true);
  });

  // FR-PLAN-0016 — help plan has plan_file, concepts, subagent_fields, limits
  it("returns plan detail with plan_file field (FR-PLAN-0016)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    expect(r["plan_file"]).toBeDefined();
  });

  it("returns plan detail with concepts field (FR-PLAN-0016)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    expect(r["concepts"]).toBeDefined();
  });

  it("returns plan detail with subagent_fields field (FR-PLAN-0016)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    expect(r["subagent_fields"]).toBeDefined();
  });

  it("returns plan detail with limits field (FR-PLAN-0016)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    expect(r["limits"]).toBeDefined();
  });

  it("returns plan detail with plan_authoring_guidance field (FR-PLAN-0016)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    expect(r["plan_authoring_guidance"]).toBeDefined();
  });

  it("returns plan detail with next_steps_for_ai field (FR-PLAN-0016)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    expect(r["next_steps_for_ai"]).toBeDefined();
  });

  // FR-PLAN-0018 — subcommands have dual-form examples (tip + real)
  it("subcommand entries have examples with tip and real (FR-PLAN-0018)", async () => {
    const result = await helpToolDef.run({ subcommand: "plan" });
    const r = result.result as HelpCommandDetail;
    const subcommands = r.subcommands as Array<Record<string, unknown>>;
    for (const sub of subcommands) {
      expect(sub["examples"]).toBeDefined();
      const examples = sub["examples"] as Record<string, string>;
      expect(typeof examples["tip"]).toBe("string");
      expect(typeof examples["real"]).toBe("string");
    }
  });
});

describe("help — command detail (subcommand=help)", () => {
  it("returns help command detail", async () => {
    const result = await helpToolDef.run({ subcommand: "help" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpCommandDetail;
    expect(r.name).toBe("help");
  });
});

describe("help — unknown subcommand fallback", () => {
  it("falls back to top-level listing for unknown subcommand", async () => {
    const result = await helpToolDef.run({ subcommand: "nonexistent-cmd" });
    expect(result.ok).toBe(true);
    const r = result.result as HelpTopLevel;
    expect(r.tool).toBe("rosettify");
    expect(Array.isArray(r.commands)).toBe(true);
  });
});
