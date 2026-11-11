/**
 * Unit tests for cmdUpsert entire_plan on an existing phase — FR-PLAN-0015 (2) and (3):
 * a steps array in the phase patch is merged by ID, as on the phase-target path.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpsert } from "../../../src/commands/plan/upsert.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { savePlan, loadPlan } from "../../../src/commands/plan/core.js";
import type { Plan } from "../../../src/commands/plan/core.js";
import { fullPlan } from "../../fixtures/plans.js";
import type { PlanWriteResult } from "../../../src/commands/plan/output.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-upsert-plan-steps-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writePlan(name = "plan.json", plan: Plan = fullPlan()): string {
  const file = path.join(tmpDir, name);
  savePlan(file, plan);
  return file;
}

// fullPlan with s1 complete, so a lost status is visible
function planWithCompleteStep(): Plan {
  const plan = fullPlan();
  plan.phases[0]!.steps[0]!.status = "complete";
  plan.phases[0]!.status = "in_progress";
  plan.status = "in_progress";
  return plan;
}

const stepIds = (plan: Plan, phaseId: string) => plan.phases.find((p) => p.id === phaseId)!.steps.map((s) => s.id);

describe("cmdUpsert — entire_plan merges the steps of an existing phase by id", () => {
  // Issue reproduction: create, update_status, upsert entire_plan
  it("keeps a complete step, keeps a step the patch does not mention, appends a new step", async () => {
    const file = path.join(tmpDir, "e.json");
    await planToolDef.run({
      subcommand: "create",
      plan_file: file,
      data: '{"name":"E","phases":[{"id":"p1","name":"P1","steps":[{"id":"s1","name":"S1","prompt":"x"},{"id":"s2","name":"S2","prompt":"x"}]}]}',
    });
    await planToolDef.run({ subcommand: "update_status", plan_file: file, target_id: "s1", new_status: "complete" });
    const before = loadPlan(file)!.phases[0]!.steps;

    const result = await planToolDef.run({
      subcommand: "upsert",
      plan_file: file,
      target_id: "entire_plan",
      data: '{"phases":[{"id":"p1","steps":[{"id":"s3","name":"S3","prompt":"x"}]}]}',
    });
    expect(result.ok).toBe(true);

    const steps = loadPlan(file)!.phases[0]!.steps;
    expect(steps.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(steps[0]).toEqual(before[0]);
    expect(steps[0]!.status).toBe("complete");
    expect(steps[1]).toEqual(before[1]);
    expect(steps[2]).toMatchObject({ id: "s3", name: "S3", prompt: "x" });

    const tree = result.result as PlanWriteResult;
    expect(tree.plan.status).toBe("in_progress");
    expect(tree.phases[0]!.steps.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    expect(tree.phases[0]!.steps[0]!.status).toBe("complete");
  });

  it("patches a step the patch names, and the phase fields sent with it", async () => {
    const file = writePlan("plan.json", planWithCompleteStep());
    const result = await cmdUpsert(file, "entire_plan", { phases: [{ id: "p1", description: "Changed", steps: [{ id: "s1", name: "Renamed" }] }] });
    expect(result.ok).toBe(true);
    const phase = loadPlan(file)!.phases[0]!;
    expect(phase.name).toBe("Phase 1");
    expect(phase.description).toBe("Changed");
    expect(phase.steps).toEqual([
      { id: "s1", name: "Renamed", prompt: "Do step 1", status: "complete", depends_on: [] },
      { id: "s2", name: "Step 2", prompt: "Do step 2", status: "open", depends_on: ["s1"] },
    ]);
  });

  it.each([
    { phase: "an existing phase", id: "p2", file: "plan.json", stored: ["s3"] },
    { phase: "a new phase", id: "p-new", file: "plan.json", stored: [] },
    { phase: "a new phase of a new file", id: "p-new", file: "missing.json", stored: [] },
  ])("applies two patches for $phase in order", async ({ id, file, stored }) => {
    writePlan();
    const step = (stepId: string) => ({ id: stepId, name: stepId, prompt: "x" });
    const result = await cmdUpsert(path.join(tmpDir, file), "entire_plan", {
      name: "Two patches",
      phases: [{ id, name: "First", steps: [step("s-a")] }, { id, name: "Second", steps: [step("s-b")] }],
    });
    expect(result.ok).toBe(true);
    const plan = loadPlan(path.join(tmpDir, file))!;
    expect(plan.phases.filter((p) => p.id === id).map((p) => p.name)).toEqual(["Second"]);
    expect(stepIds(plan, id)).toEqual([...stored, "s-a", "s-b"]);
  });

  it("appends a new phase whole, next to a patched one", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", {
      phases: [
        { id: "p2", steps: [{ id: "s-a", name: "A", prompt: "x" }] },
        { id: "p-new", name: "New", steps: [{ id: "s-b", name: "B", prompt: "x" }] },
      ],
    });
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases.map((p) => p.id)).toEqual(["p1", "p2", "p-new"]);
    expect(stepIds(plan, "p2")).toEqual(["s3", "s-a"]);
    expect(plan.phases[2]).toMatchObject({ id: "p-new", name: "New", steps: [{ id: "s-b", name: "B", prompt: "x" }] });
  });
});

describe("cmdUpsert — entire_plan and the phase target patch an existing phase the same way", () => {
  it.each([
    { patch: "a new step", data: { steps: [{ id: "s-new", name: "New", prompt: "x" }] } },
    { patch: "a named step and a phase field", data: { name: "Phase 1 renamed", steps: [{ id: "s2", prompt: "Changed" }] } },
    { patch: "an empty steps array", data: { steps: [] } },
    { patch: "a removed field, no steps", data: { description: null } },
    { patch: "a step without id", data: { steps: [{ name: "No id", prompt: "x" }] } },
    { patch: "a step id of another phase", data: { steps: [{ id: "s3", name: "Taken", prompt: "x" }] } },
  ])("$patch", async ({ data }) => {
    const viaPhase = writePlan("phase.json", planWithCompleteStep());
    const viaPlan = writePlan("plan.json", planWithCompleteStep());
    const phaseResult = await cmdUpsert(viaPhase, "p1", data);
    const planResult = await cmdUpsert(viaPlan, "entire_plan", { phases: [{ id: "p1", ...data }] });

    expect(planResult.error).toBe(phaseResult.error);
    expect(loadPlan(viaPlan)!.phases).toEqual(loadPlan(viaPhase)!.phases);
  });
});

describe("cmdUpsert — entire_plan missing_id (FR-PLAN-0015)", () => {
  it.each([
    { item: "a step of an existing phase", data: { phases: [{ id: "p1", steps: [{ name: "No id", prompt: "x" }] }] } },
    { item: "a phase", data: { phases: [{ name: "No id" }] } },
  ])("rejects $item without id and leaves the file and its folder unchanged", async ({ data }) => {
    const file = writePlan();
    const before = fs.readFileSync(file, "utf8");
    const result = await cmdUpsert(file, "entire_plan", data);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_id");
    expect(fs.readFileSync(file, "utf8")).toBe(before);
    expect(fs.readdirSync(tmpDir)).toEqual(["plan.json"]);
  });
});
