/**
 * Unit tests for cmdUpsertWithTemplate — FR-PLAN-0031 / FR-PLAN-0043.
 * Acceptance criteria: phase upserted; compressed-tree returned (no previous_version on result);
 * plan FILE's previous_version advances with each write; second invocation with different
 * phase-id produces unique step IDs (FR-PLAN-0036).
 * FR-PLAN-0043: phase-steps JSON array appended to seeded phase steps.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpsertWithTemplate } from "../../../src/commands/plan/upsert-with-template.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { loadPlan } from "../../../src/commands/plan/core.js";
import { cmdCreate } from "../../../src/commands/plan/create.js";
import type { PlanWriteResult } from "../../../src/commands/plan/output.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-uwt-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

async function createPlanFile(file: string): Promise<void> {
  await cmdCreate(file, { name: "Orchestrator Plan", description: "Base plan" });
}

// ---------------------------------------------------------------------------
// FR-PLAN-0031 — upsert-with-template acceptance criteria
// ---------------------------------------------------------------------------

describe("cmdUpsertWithTemplate — FR-PLAN-0031 happy path", () => {
  // FR-PLAN-0031 — phase upserted; result is compressed-tree (no previous_version on result)
  it("upserts a phase from for-subagent template and returns compressed-tree", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Implement the feature", "[]");

    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;

    // FR-PLAN-0040 — compressed-tree shape: plan + phases
    expect(tree.plan).toBeDefined();
    expect(tree.plan.status).toBeDefined();
    expect(Array.isArray(tree.phases)).toBe(true);

    // FR-PLAN-0040 — result.plan.previous_version is the backup path (non-null after write)
    expect(tree.plan.previous_version).not.toBeNull();
    // No previous_version at result root level
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();

    // Phase appears in the plan
    const phase = tree.phases.find((p) => p.id === "ph-impl");
    expect(phase).toBeDefined();
    expect(phase!.name).toBe("Implementation");
  });

  // FR-PLAN-0024 — .bak file created after upsert (visible on plan FILE, not on result)
  it("creates a .bak file after upsert", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Impl desc", "[]");

    expect(result.ok).toBe(true);
    // FR-PLAN-0024 — the plan FILE on disk has previous_version pointing to backup
    const planOnDisk = loadPlan(file)!;
    expect(planOnDisk.previous_version).not.toBeNull();
    expect(typeof planOnDisk.previous_version).toBe("string");
    expect(fs.existsSync(planOnDisk.previous_version!)).toBe(true);
  });

  // FR-PLAN-0031 — placeholder values substituted in upserted phase
  it("substitutes phase-id, phase-name, phase-description in upserted phase", async () => {
    const file = planFile();
    await createPlanFile(file);
    await cmdUpsertWithTemplate(file, "ph-review", "for-subagent", "Review Phase", "Code review", "[]");

    const plan = loadPlan(file)!;
    const phase = plan.phases.find((p) => p.id === "ph-review");
    expect(phase).toBeDefined();
    expect(phase!.name).toBe("Review Phase");
    expect(phase!.description).toBe("Code review");
  });

  // FR-PLAN-0036 — second invocation with different phase-id produces unique step IDs
  it("second invocation with different phase-id produces unique step IDs (FR-PLAN-0036)", async () => {
    const file = planFile();
    await createPlanFile(file);

    // First upsert: phase ph-impl
    await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Impl", "[]");

    // Second upsert: phase ph-test
    await cmdUpsertWithTemplate(file, "ph-test", "for-subagent", "Testing", "Test", "[]");

    const plan = loadPlan(file)!;
    const implPhase = plan.phases.find((p) => p.id === "ph-impl")!;
    const testPhase = plan.phases.find((p) => p.id === "ph-test")!;

    // Step IDs in ph-impl should start with ph-impl-s-
    for (const step of implPhase.steps) {
      expect(step.id).toMatch(/^ph-impl-s-/);
    }

    // Step IDs in ph-test should start with ph-test-s-
    for (const step of testPhase.steps) {
      expect(step.id).toMatch(/^ph-test-s-/);
    }

    // No duplicates across both phases
    const allIds = [...implPhase.steps, ...testPhase.steps].map((s) => s.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);
  });
});

describe("cmdUpsertWithTemplate — FR-PLAN-0031 error: invalid_template", () => {
  // FR-PLAN-0021 — invalid_template for unknown template name
  it("returns invalid_template for unknown template name", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "nonexistent-template", "Phase", "Desc", "[]");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_template");
  });

  // FR-PLAN-0031 — cross-kind lookup fails: for-orchestrator is create-kind, not upsert-kind
  it("returns invalid_template when using create-kind template name for upsert", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-orchestrator", "Phase", "Desc", "[]");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_template");
  });
});

describe("cmdUpsertWithTemplate — FR-PLAN-0031 error: missing_template_param via dispatcher", () => {
  // FR-PLAN-0034 — missing phase-id
  it("returns missing_template_param when phase-id is absent", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await planToolDef.run({
      subcommand: "upsert-with-template",
      plan_file: file,
      template: "for-subagent",
      // "phase-id" omitted
      "phase-name": "Phase",
      "phase-description": "Desc",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_template_param");
  });

  it("returns missing_template_param when phase-name is absent", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await planToolDef.run({
      subcommand: "upsert-with-template",
      plan_file: file,
      "phase-id": "ph-impl",
      template: "for-subagent",
      // "phase-name" omitted
      "phase-description": "Desc",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_template_param");
  });
});

describe("cmdUpsertWithTemplate — FR-PLAN-0031 previous_version tracking on FILE", () => {
  // FR-PLAN-0017 — plan FILE's previous_version advances with each write
  it("plan file's previous_version advances on each successive upsert", async () => {
    const file = planFile();
    await createPlanFile(file);

    const r1 = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Impl", "desc1", "[]");
    expect(r1.ok).toBe(true);
    const tree1 = r1.result as PlanWriteResult;
    // FR-PLAN-0040 — result.plan.previous_version is the backup path (non-null)
    expect(tree1.plan.previous_version).not.toBeNull();
    expect(tree1.plan.previous_version).toContain(".bak000");
    // No previous_version at result root level
    expect((r1.result as Record<string, unknown>)["previous_version"]).toBeUndefined();
    // FR-PLAN-0024 — plan FILE has previous_version pointing to .bak000; equals result.plan.previous_version
    const planV1 = loadPlan(file)!;
    expect(planV1.previous_version).toContain(".bak000");
    expect(tree1.plan.previous_version).toBe(planV1.previous_version);

    const r2 = await cmdUpsertWithTemplate(file, "ph-test", "for-subagent", "Test", "desc2", "[]");
    expect(r2.ok).toBe(true);
    const tree2 = r2.result as PlanWriteResult;
    // FR-PLAN-0040 — result.plan.previous_version advances to .bak001
    expect(tree2.plan.previous_version).toContain(".bak001");
    // FR-PLAN-0024 — plan FILE has previous_version advancing to .bak001; equals result.plan.previous_version
    const planV2 = loadPlan(file)!;
    expect(planV2.previous_version).toContain(".bak001");
    expect(tree2.plan.previous_version).toBe(planV2.previous_version);

    // Each backup is a different file
    expect(planV1.previous_version).not.toBe(planV2.previous_version);
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0043 — phase-steps injection for upsert-with-template
// ---------------------------------------------------------------------------

describe("cmdUpsertWithTemplate — FR-PLAN-0043 phase-steps injection", () => {
  // FR-PLAN-0043 — phase-steps array of 2 steps appended after 6 seeded steps; ids preserved exactly
  it("appends 2 injected steps after 6 seeded steps; injected ids preserved verbatim", async () => {
    const file = planFile();
    await createPlanFile(file);

    const injectedSteps = [
      { id: "ph-impl-x1", name: "Extra Step X1", prompt: "Do X1" },
      { id: "custom-step-2", name: "Custom Step 2", prompt: "Do custom 2" },
    ];

    const result = await cmdUpsertWithTemplate(
      file,
      "ph-impl",
      "for-subagent",
      "Implementation",
      "Implement the feature",
      JSON.stringify(injectedSteps),
    );

    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const phase = plan.phases.find((p) => p.id === "ph-impl")!;
    expect(phase).toBeDefined();
    // 5 seeded + 2 injected = 7 total
    expect(phase.steps.length).toBe(7);
    // Injected steps at positions 5 and 6 with exact IDs (NOT forced to ph-impl-s- pattern)
    const injected0 = phase.steps[5] as { id: string; name: string };
    const injected1 = phase.steps[6] as { id: string; name: string };
    expect(injected0.id).toBe("ph-impl-x1");
    expect(injected0.name).toBe("Extra Step X1");
    expect(injected1.id).toBe("custom-step-2");
    expect(injected1.name).toBe("Custom Step 2");
  });

  // FR-PLAN-0043 — phase-steps = "[]" → phase has exactly 5 seeded steps
  it("empty phase-steps leaves upserted phase with exactly 6 seeded steps", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(
      file,
      "ph-impl",
      "for-subagent",
      "Implementation",
      "Implement",
      "[]",
    );

    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const phase = plan.phases.find((p) => p.id === "ph-impl")!;
    expect(phase).toBeDefined();
    expect(phase.steps.length).toBe(5);
  });

  // FR-PLAN-0043 — backward compatibility: omitting phase-steps is treated as [] (not an error)
  it("via dispatcher omitting phase-steps succeeds with only the seeded phase steps", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await planToolDef.run({
      subcommand: "upsert-with-template",
      plan_file: file,
      "phase-id": "ph-impl",
      template: "for-subagent",
      "phase-name": "Implementation",
      "phase-description": "Implement the feature",
      // "phase-steps" intentionally omitted → treated as []
    });

    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const phase = plan.phases.find((p) => p.id === "ph-impl")!;
    expect(phase.steps).toHaveLength(5);
  });

  // FR-PLAN-0043 — phase-steps = "not json" → invalid_phase_steps
  it("invalid JSON phase-steps returns invalid_phase_steps", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(
      file,
      "ph-impl",
      "for-subagent",
      "Implementation",
      "desc",
      "not json",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_phase_steps");
  });

  // FR-PLAN-0043 — phase-steps = '{"a":1}' (valid JSON, not array) → invalid_phase_steps
  it("valid JSON but non-array phase-steps returns invalid_phase_steps", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(
      file,
      "ph-impl",
      "for-subagent",
      "Implementation",
      "desc",
      '{"a":1}',
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_phase_steps");
  });

  // FR-PLAN-0043 — injected step id duplicating a seeded id → downstream duplicate_id error
  it("injected step with id duplicating a seeded step id produces duplicate_id error", async () => {
    const file = planFile();
    await createPlanFile(file);

    // "ph-impl-s-read-docs" is a seeded step id when phase-id="ph-impl" (from for-subagent template)
    const duplicateStep = [
      { id: "ph-impl-s-read-docs", name: "Duplicate", prompt: "This duplicates a seeded step" },
    ];

    const result = await cmdUpsertWithTemplate(
      file,
      "ph-impl",
      "for-subagent",
      "Implementation",
      "desc",
      JSON.stringify(duplicateStep),
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("duplicate_id");
  });
});
