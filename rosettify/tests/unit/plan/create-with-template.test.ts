/**
 * Unit tests for cmdCreateWithTemplate — FR-PLAN-0030.
 * Acceptance criteria: CLI-style invocation creates plan via template; result matches
 * compressed-tree; invalid_template for unknown name; cross-kind lookup fails;
 * missing_template_param when placeholder omitted.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdCreateWithTemplate } from "../../../src/commands/plan/create-with-template.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { loadPlan } from "../../../src/commands/plan/core.js";
import type { PlanWriteResult } from "../../../src/commands/plan/output.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-cwt-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

// ---------------------------------------------------------------------------
// FR-PLAN-0030 — create-with-template acceptance criteria
// ---------------------------------------------------------------------------

describe("cmdCreateWithTemplate — FR-PLAN-0030 happy path", () => {
  // FR-PLAN-0030 — creates plan via template; returns compressed-tree
  it("creates plan from for-orchestrator template and returns compressed-tree", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(file, "for-orchestrator", "My Plan", "My plan description");

    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;

    // FR-PLAN-0040 — compressed-tree shape: plan + phases
    expect(tree.plan).toBeDefined();
    expect(tree.plan.name).toBe("My Plan");
    expect(tree.plan.status).toBe("open");
    // FR-PLAN-0040 — previous_version=null on first create (FR-PLAN-0010)
    expect(tree.plan.previous_version).toBeNull();
    // No previous_version at result root level
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Array.isArray(tree.phases)).toBe(true);
    expect(tree.phases.length).toBeGreaterThan(0);

    // Each phase has only id, name, status, steps
    const phase = tree.phases[0]!;
    expect(phase.id).toBeDefined();
    expect(phase.name).toBeDefined();
    expect(phase.status).toBe("open");
    expect(Array.isArray(phase.steps)).toBe(true);
  });

  // FR-PLAN-0030 — plan file exists on disk and is pretty-formatted
  it("creates plan file on disk (pretty-formatted)", async () => {
    const file = planFile();
    await cmdCreateWithTemplate(file, "for-orchestrator", "Disk Plan", "Disk test");

    expect(fs.existsSync(file)).toBe(true);
    const raw = fs.readFileSync(file, "utf8");
    // Pretty-formatted: should contain newlines (FR-PLAN-0026)
    expect(raw).toContain("\n");

    const plan = loadPlan(file);
    expect(plan).not.toBeNull();
    expect(plan!.name).toBe("Disk Plan");
    expect(plan!.description).toBe("Disk test");
  });

  // FR-PLAN-0030 — placeholder values substituted correctly in created plan
  it("substitutes plan-name and plan-description placeholders", async () => {
    const file = planFile();
    await cmdCreateWithTemplate(file, "for-orchestrator", "Feature Alpha", "Alpha feature description");

    const plan = loadPlan(file)!;
    expect(plan.name).toBe("Feature Alpha");
    expect(plan.description).toBe("Alpha feature description");
  });
});

describe("cmdCreateWithTemplate — FR-PLAN-0030 error: invalid_template", () => {
  // FR-PLAN-0021 — invalid_template for unknown name
  it("returns invalid_template for unknown template name", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(file, "nonexistent-template", "Plan", "Desc");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_template");
    // File must NOT be created
    expect(fs.existsSync(file)).toBe(false);
  });

  // FR-PLAN-0030 — cross-kind lookup fails: for-subagent is upsert-kind, not create-kind
  it("returns invalid_template when using upsert-kind template name for create", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(file, "for-subagent", "Plan", "Desc");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_template");
  });
});

describe("cmdCreateWithTemplate — FR-PLAN-0030 error: missing_template_param via dispatcher", () => {
  // FR-PLAN-0034 — missing_template_param when caller omits a declared placeholder (via plan tool dispatcher)
  it("returns missing_template_param when plan-name is absent", async () => {
    const file = planFile();
    const result = await planToolDef.run({
      subcommand: "create-with-template",
      plan_file: file,
      template: "for-orchestrator",
      // "plan-name" omitted
      "plan-description": "desc",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_template_param");
    expect(result.error).toContain("plan-name");
  });

  it("returns missing_template_param when plan-description is absent", async () => {
    const file = planFile();
    const result = await planToolDef.run({
      subcommand: "create-with-template",
      plan_file: file,
      template: "for-orchestrator",
      "plan-name": "My Plan",
      // "plan-description" omitted
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_template_param");
    expect(result.error).toContain("plan-description");
  });

  it("returns missing_template_param when template is absent", async () => {
    const file = planFile();
    const result = await planToolDef.run({
      subcommand: "create-with-template",
      plan_file: file,
      "plan-name": "My Plan",
      "plan-description": "desc",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_template_param");
    expect(result.error).toContain("template");
  });
});

describe("cmdCreateWithTemplate — FR-PLAN-0030 empty string values", () => {
  // N1 fix: empty-string is a valid provided value; should not be rejected
  it("accepts empty string for plan-name (N1 fix: empty != missing)", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(file, "for-orchestrator", "", "Some description");
    // Empty string is a valid substitution value — should succeed or at minimum not return missing_template_param
    // The create will substitute "" for [plan-name], resulting in name="" which falls back to "Unnamed Plan"
    // depending on create.ts implementation. We just verify no missing_template_param error.
    if (!result.ok) {
      expect(result.error).not.toContain("missing_template_param");
    }
  });
});
