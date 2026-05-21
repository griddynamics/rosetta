/**
 * Unit tests for cmdUpsertWithTemplate — FR-PLAN-0031.
 * Acceptance criteria: phase upserted; compressed-tree returned; previous_version non-null;
 * second invocation with different phase-id produces unique step IDs (FR-PLAN-0036).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpsertWithTemplate } from "../../../src/commands/plan/upsert-with-template.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { loadPlan, savePlan } from "../../../src/commands/plan/core.js";
import { cmdCreate } from "../../../src/commands/plan/create.js";
import type { CompressedPlanTree } from "../../../src/commands/plan/output.js";
import type { Plan } from "../../../src/commands/plan/core.js";

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
  // FR-PLAN-0031 — phase upserted; result is compressed-tree; previous_version non-null
  it("upserts a phase from for-subagent template and returns compressed-tree", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Implement the feature");

    expect(result.ok).toBe(true);
    const tree = result.result as CompressedPlanTree;

    // FR-PLAN-0040 — compressed-tree shape
    expect(tree.plan).toBeDefined();
    expect(tree.plan.status).toBeDefined();
    expect(Array.isArray(tree.phases)).toBe(true);

    // FR-PLAN-0024 — previous_version is set (non-null) after write
    expect(tree.previous_version).not.toBeNull();
    expect(typeof tree.previous_version).toBe("string");

    // Phase appears in the plan
    const phase = tree.phases.find((p) => p.id === "ph-impl");
    expect(phase).toBeDefined();
    expect(phase!.name).toBe("Implementation");
  });

  // FR-PLAN-0024 — .bak file created after upsert
  it("creates a .bak file after upsert", async () => {
    const file = planFile();
    await createPlanFile(file);

    const result = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Implementation", "Impl desc");

    expect(result.ok).toBe(true);
    const tree = result.result as CompressedPlanTree;
    expect(fs.existsSync(tree.previous_version!)).toBe(true);
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

describe("cmdUpsertWithTemplate — FR-PLAN-0031 previous_version tracking", () => {
  // FR-PLAN-0017 — previous_version advances with each write
  it("previous_version advances on each successive upsert", async () => {
    const file = planFile();
    await createPlanFile(file);

    const r1 = await cmdUpsertWithTemplate(file, "ph-impl", "for-subagent", "Impl", "desc1");
    expect(r1.ok).toBe(true);
    const v1 = (r1.result as CompressedPlanTree).previous_version;
    expect(v1).toContain(".bak000");

    const r2 = await cmdUpsertWithTemplate(file, "ph-test", "for-subagent", "Test", "desc2");
    expect(r2.ok).toBe(true);
    const v2 = (r2.result as CompressedPlanTree).previous_version;
    expect(v2).toContain(".bak001");

    // Each backup is a different file
    expect(v1).not.toBe(v2);
  });
});
