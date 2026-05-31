/**
 * Unit tests for cmdUpsertWithTemplate — FR-PLAN-0031.
 * Acceptance criteria: phase upserted; compressed-tree returned (no previous_version on result);
 * plan FILE's previous_version advances with each write; second invocation with different
 * phase-id produces unique step IDs (FR-PLAN-0036).
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

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Implement the feature");

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

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Impl desc");

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
    await cmdUpsertWithTemplate(file, "ph-review", "for-subagent", "Review Phase", "Code review");

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
    await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Impl");

    // Second upsert: phase ph-test
    await cmdUpsertWithTemplate(file, "ph-test", "for-subagent", "Testing", "Test");

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

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "nonexistent-template", "Phase", "Desc");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_template");
  });

  // FR-PLAN-0031 — cross-kind lookup fails: for-orchestrator is create-kind, not upsert-kind
  it("returns invalid_template when using create-kind template name for upsert", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-orchestrator", "Phase", "Desc");
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

    const r1 = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Impl", "desc1");
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

    const r2 = await cmdUpsertWithTemplate(file, "ph-test", "for-subagent", "Test", "desc2");
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
