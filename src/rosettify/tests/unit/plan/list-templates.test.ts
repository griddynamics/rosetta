/**
 * Unit tests for cmdListTemplates — FR-PLAN-0032.
 * Acceptance criteria: returns {create: [...], upsert: [...]} with {name, brief, placeholders} per entry.
 */
import { describe, it, expect } from "vitest";
import { cmdListTemplates } from "../../../src/commands/plan/list-templates.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { buildTemplateCatalog } from "../../../src/commands/plan/templates/index.js";

// ---------------------------------------------------------------------------
// FR-PLAN-0032 — list-templates acceptance criteria
// ---------------------------------------------------------------------------

describe("cmdListTemplates — FR-PLAN-0032 acceptance", () => {
  // FR-PLAN-0032 — returns {create: [...], upsert: [...]}
  it("returns catalog with create and upsert arrays", async () => {
    const result = await cmdListTemplates();

    expect(result.ok).toBe(true);
    const catalog = result.result!;
    expect(Array.isArray(catalog.create)).toBe(true);
    expect(Array.isArray(catalog.upsert)).toBe(true);
  });

  // FR-PLAN-0032 — each entry has name, brief, placeholders, produces
  it("each create entry has name, brief, placeholders, and non-empty produces", async () => {
    const result = await cmdListTemplates();
    for (const entry of result.result!.create) {
      expect(typeof entry.name).toBe("string");
      expect(typeof entry.brief).toBe("string");
      expect(Array.isArray(entry.placeholders)).toBe(true);
      // FR-PLAN-0032 — produces is a non-empty string
      expect(typeof entry.produces).toBe("string");
      expect((entry.produces as string).length).toBeGreaterThan(0);
    }
  });

  it("each upsert entry has name, brief, placeholders, and non-empty produces", async () => {
    const result = await cmdListTemplates();
    for (const entry of result.result!.upsert) {
      expect(typeof entry.name).toBe("string");
      expect(typeof entry.brief).toBe("string");
      expect(Array.isArray(entry.placeholders)).toBe(true);
      // FR-PLAN-0032 — produces is a non-empty string
      expect(typeof entry.produces).toBe("string");
      expect((entry.produces as string).length).toBeGreaterThan(0);
    }
  });

  // FR-PLAN-0032 — for-orchestrator in create, for-subagent in upsert
  it("for-orchestrator appears in create catalog with correct placeholders", async () => {
    const result = await cmdListTemplates();
    const entry = result.result!.create.find((e) => e.name === "for-orchestrator");
    expect(entry).toBeDefined();
    expect(Array.from(entry!.placeholders)).toContain("plan-name");
    expect(Array.from(entry!.placeholders)).toContain("plan-description");
  });

  it("for-subagent appears in upsert catalog with correct placeholders", async () => {
    const result = await cmdListTemplates();
    const entry = result.result!.upsert.find((e) => e.name === "for-subagent");
    expect(entry).toBeDefined();
    expect(Array.from(entry!.placeholders)).toContain("phase-id");
    expect(Array.from(entry!.placeholders)).toContain("phase-name");
    expect(Array.from(entry!.placeholders)).toContain("phase-description");
  });

  // FR-PLAN-0032 — catalog matches the help templates catalog
  it("result matches buildTemplateCatalog output", async () => {
    const result = await cmdListTemplates();
    const catalog = buildTemplateCatalog();

    expect(result.result!.create.map((e) => e.name)).toEqual(catalog.create.map((e) => e.name));
    expect(result.result!.upsert.map((e) => e.name)).toEqual(catalog.upsert.map((e) => e.name));
  });
});

describe("cmdListTemplates — FR-PLAN-0032 via plan dispatcher", () => {
  // FR-PLAN-0032 — list-templates via plan tool run delegate
  it("list-templates via planToolDef.run returns same catalog", async () => {
    const result = await planToolDef.run({ subcommand: "list-templates" });

    expect(result.ok).toBe(true);
    const catalog = result.result as { create: unknown[]; upsert: unknown[] };
    expect(Array.isArray(catalog.create)).toBe(true);
    expect(Array.isArray(catalog.upsert)).toBe(true);
    expect(catalog.create.length).toBeGreaterThan(0);
    expect(catalog.upsert.length).toBeGreaterThan(0);
  });
});
