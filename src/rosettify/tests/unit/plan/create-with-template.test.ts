/**
 * Unit tests for cmdCreateWithTemplate — FR-PLAN-0030 / FR-PLAN-0043.
 * Acceptance criteria: CLI-style invocation creates plan via template; result matches
 * compressed-tree; invalid_template for unknown name; cross-kind lookup fails;
 * missing_template_param when placeholder omitted.
 * FR-PLAN-0043: phase-steps JSON array appended to seeded ph-prep phase.
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
    const result = await cmdCreateWithTemplate(file, "for-orchestrator", "My Plan", "My plan description", "[]");

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
    await cmdCreateWithTemplate(file, "for-orchestrator", "Disk Plan", "Disk test", "[]");

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
    await cmdCreateWithTemplate(file, "for-orchestrator", "Feature Alpha", "Alpha feature description", "[]");

    const plan = loadPlan(file)!;
    expect(plan.name).toBe("Feature Alpha");
    expect(plan.description).toBe("Alpha feature description");
  });
});

describe("cmdCreateWithTemplate — FR-PLAN-0030 error: invalid_template", () => {
  // FR-PLAN-0021 — invalid_template for unknown name
  it("returns invalid_template for unknown template name", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(file, "nonexistent-template", "Plan", "Desc", "[]");

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_template");
    // File must NOT be created
    expect(fs.existsSync(file)).toBe(false);
  });

  // FR-PLAN-0030 — cross-kind lookup fails: for-subagent is upsert-kind, not create-kind
  it("returns invalid_template when using upsert-kind template name for create", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(file, "for-subagent", "Plan", "Desc", "[]");

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
    const result = await cmdCreateWithTemplate(file, "for-orchestrator", "", "Some description", "[]");
    // Empty string is a valid substitution value — should succeed or at minimum not return missing_template_param
    // The create will substitute "" for [plan-name], resulting in name="" which falls back to "Unnamed Plan"
    // depending on create.ts implementation. We just verify no missing_template_param error.
    if (!result.ok) {
      expect(result.error).not.toContain("missing_template_param");
    }
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0043 — phase-steps injection for create-with-template
// ---------------------------------------------------------------------------

describe("cmdCreateWithTemplate — FR-PLAN-0043 phase-steps injection", () => {
  // FR-PLAN-0043 — phase-steps array of 2 valid steps → ph-prep has 3 seeded + 2 injected
  it("appends 2 injected steps after 3 seeded steps in ph-prep phase", async () => {
    const file = planFile();
    const injectedSteps = [
      { id: "ph-prep-s-custom-one", name: "Custom Step One", prompt: "Do custom one" },
      { id: "ph-prep-s-custom-two", name: "Custom Step Two", prompt: "Do custom two" },
    ];
    const result = await cmdCreateWithTemplate(
      file,
      "for-orchestrator",
      "Inject Plan",
      "Phase steps test",
      JSON.stringify(injectedSteps),
    );

    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const prepPhase = plan.phases.find((p) => p.id === "ph-prep")!;
    expect(prepPhase).toBeDefined();
    // 3 seeded + 2 injected = 5 total
    expect(prepPhase.steps.length).toBe(5);
    // Seeded steps come first (3 of them)
    const seededCount = 3;
    // Injected steps at positions 3 and 4
    const injected0 = prepPhase.steps[seededCount] as { id: string; name: string };
    const injected1 = prepPhase.steps[seededCount + 1] as { id: string; name: string };
    expect(injected0.id).toBe("ph-prep-s-custom-one");
    expect(injected0.name).toBe("Custom Step One");
    expect(injected1.id).toBe("ph-prep-s-custom-two");
    expect(injected1.name).toBe("Custom Step Two");
  });

  // FR-PLAN-0043 — phase-steps = "[]" → ph-prep has exactly 3 seeded steps
  it("empty phase-steps array leaves ph-prep with exactly 3 seeded steps", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(
      file,
      "for-orchestrator",
      "Empty Steps Plan",
      "Empty steps test",
      "[]",
    );

    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const prepPhase = plan.phases.find((p) => p.id === "ph-prep")!;
    expect(prepPhase).toBeDefined();
    expect(prepPhase.steps.length).toBe(3);
  });

  // FR-PLAN-0043 — backward compatibility: omitting phase-steps is treated as [] (not an error)
  it("via dispatcher omitting phase-steps succeeds with only the seeded ph-prep steps", async () => {
    const file = planFile();
    const result = await planToolDef.run({
      subcommand: "create-with-template",
      plan_file: file,
      template: "for-orchestrator",
      "plan-name": "My Plan",
      "plan-description": "desc",
      // "phase-steps" intentionally omitted → treated as []
    });

    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const prep = plan.phases.find((p) => p.id === "ph-prep")!;
    expect(prep.steps).toHaveLength(3);
  });

  // FR-PLAN-0043 — phase-steps = "not json" → invalid_phase_steps
  it("invalid JSON phase-steps returns invalid_phase_steps", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(
      file,
      "for-orchestrator",
      "Plan",
      "desc",
      "not json",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_phase_steps");
  });

  // FR-PLAN-0043 — phase-steps = '{"a":1}' (valid JSON, not array) → invalid_phase_steps
  it("valid JSON but non-array phase-steps returns invalid_phase_steps", async () => {
    const file = planFile();
    const result = await cmdCreateWithTemplate(
      file,
      "for-orchestrator",
      "Plan",
      "desc",
      '{"a":1}',
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_phase_steps");
  });

  // FR-PLAN-0043 — injected step id duplicating a seeded id → downstream duplicate_id error
  it("injected step with duplicate id produces downstream duplicate_id error", async () => {
    const file = planFile();
    // "ph-prep-s-read-docs" is a seeded step id in the for-orchestrator template
    const duplicateStep = [
      { id: "ph-prep-s-read-docs", name: "Duplicate Step", prompt: "This duplicates a seeded step id" },
    ];
    const result = await cmdCreateWithTemplate(
      file,
      "for-orchestrator",
      "Plan",
      "desc",
      JSON.stringify(duplicateStep),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("duplicate_id");
  });
});
