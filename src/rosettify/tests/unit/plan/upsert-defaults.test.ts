/**
 * Unit tests for the FR-PLAN-0001 defaults on the upsert write paths:
 * upsert-with-template, upsert entire_plan (first create and existing file),
 * and upsert of a phase whose patch carries steps.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpsert } from "../../../src/commands/plan/upsert.js";
import { cmdUpdateStatus } from "../../../src/commands/plan/update-status.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { savePlan, loadPlan, findPhase, findStep } from "../../../src/commands/plan/core.js";
import type { Plan, PlanNextResult } from "../../../src/commands/plan/core.js";
import { fullPlan } from "../../fixtures/plans.js";
import type { PlanWriteResult } from "../../../src/commands/plan/output.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-upsert-defaults-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

function writePlan(plan: Plan = fullPlan()): string {
  const file = planFile();
  savePlan(file, plan);
  return file;
}

// A step as a caller sends it: no depends_on, and a status that upsert must drop (FR-PLAN-0015).
const newStep = { id: "s-new", name: "New", prompt: "Do it", status: "complete" };

describe("upsert-with-template — FR-PLAN-0001 defaults", () => {
  // Issue reproduction: create, upsert-with-template, next --target
  it("stores status and depends_on on the seeded and the injected steps", async () => {
    const file = planFile();
    await planToolDef.run({ subcommand: "create", plan_file: file, data: '{"name":"T","phases":[]}' });
    const result = await planToolDef.run({
      subcommand: "upsert-with-template",
      plan_file: file,
      "phase-id": "p1",
      template: "for-subagent",
      "phase-name": "Impl",
      "phase-description": "do it",
      "phase-steps": '[{"id":"s-build","name":"Build","prompt":"Build"}]',
    });
    expect(result.ok).toBe(true);

    const steps = loadPlan(file)!.phases[0]!.steps;
    expect(steps.map((s) => s.id)).toEqual([
      "p1-s-read-docs",
      "p1-s-subagent-directives",
      "p1-s-execution-planning",
      "p1-s-execute-tasks",
      "p1-s-proceed-with-request",
      "s-build",
    ]);
    for (const step of steps) {
      expect(step.status).toBe("open");
      expect(step.depends_on).toEqual([]);
    }

    // FR-PLAN-0040 — every step summary carries status
    const tree = result.result as PlanWriteResult;
    expect(tree.phases[0]!.steps.map((s) => s.status)).toEqual(Array(6).fill("open"));

    // FR-PLAN-0011 — every step returned by next carries status
    const next = await planToolDef.run({ subcommand: "next", plan_file: file, target_id: "p1", limit: 10 });
    expect((next.result as PlanNextResult).next.map((s) => s.status)).toEqual(Array(6).fill("open"));
  });

  it("re-applied to an existing phase: the new step gets defaults, stored steps keep their status", async () => {
    const file = planFile();
    await planToolDef.run({ subcommand: "create", plan_file: file, data: '{"name":"T","phases":[]}' });
    const apply = (phaseSteps: string) => planToolDef.run({
      subcommand: "upsert-with-template",
      plan_file: file,
      "phase-id": "p1",
      template: "for-subagent",
      "phase-name": "Impl",
      "phase-description": "do it",
      "phase-steps": phaseSteps,
    });
    await apply("[]");
    await cmdUpdateStatus(file, "p1-s-read-docs", "complete");

    const result = await apply(JSON.stringify([newStep]));
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(findStep(plan, "p1-s-read-docs")!.step.status).toBe("complete");
    expect(findStep(plan, "s-new")!.step).toEqual({ status: "open", depends_on: [], id: "s-new", name: "New", prompt: "Do it" });
  });
});

describe("cmdUpsert — FR-PLAN-0001 defaults on a new step", () => {
  it.each([
    { path: "entire_plan, new phase", target: "entire_plan", data: { phases: [{ id: "p-new", name: "P", steps: [newStep] }] } },
    { path: "entire_plan, existing phase", target: "entire_plan", data: { phases: [{ id: "p2", steps: [newStep] }] } },
    { path: "phase with steps", target: "p2", data: { steps: [newStep] } },
    { path: "new phase with steps", target: "p-new", data: { name: "P", steps: [newStep] }, kind: "phase" },
    { path: "new step", target: "s-new", data: { name: "New", prompt: "Do it", status: "complete" }, kind: "step", phaseId: "p2" },
  ])("$path: stored as open with depends_on [], whatever status the patch carries", async ({ target, data, kind, phaseId }) => {
    const file = writePlan();
    const result = await cmdUpsert(file, target, data, kind, phaseId);
    expect(result.ok).toBe(true);

    const found = findStep(loadPlan(file)!, "s-new")!;
    expect(found.step).toEqual({ status: "open", depends_on: [], id: "s-new", name: "New", prompt: "Do it" });

    // FR-PLAN-0040 — the step summary carries the status
    const summary = result.result!.phases.find((p) => p.id === found.phase.id)!.steps.find((s) => s.id === "s-new");
    expect(summary).toEqual({ id: "s-new", name: "New", status: "open" });
  });

  it("entire_plan on a missing file: every phase and step gets defaults", async () => {
    const file = planFile("new.json");
    const result = await cmdUpsert(file, "entire_plan", {
      name: "N",
      phases: [{ id: "p-empty", name: "Empty" }, { id: "p-new", name: "P", steps: [newStep] }],
    });
    expect(result.ok).toBe(true);
    expect(loadPlan(file)!.phases).toEqual([
      { status: "open", depends_on: [], steps: [], id: "p-empty", name: "Empty" },
      { status: "open", depends_on: [], steps: [{ status: "open", depends_on: [], id: "s-new", name: "New", prompt: "Do it" }], id: "p-new", name: "P" },
    ]);
    expect(result.result!.phases).toEqual([
      { id: "p-empty", name: "Empty", status: "open", steps: [] },
      { id: "p-new", name: "P", status: "open", steps: [{ id: "s-new", name: "New", status: "open" }] },
    ]);
  });

  it("keeps the depends_on a new step is sent with", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "p1", { steps: [{ ...newStep, depends_on: ["s1"] }] });
    expect(result.ok).toBe(true);
    expect(findStep(loadPlan(file)!, "s-new")!.step.depends_on).toEqual(["s1"]);
  });
});

describe("cmdUpsert — FR-PLAN-0001 defaults on a new phase", () => {
  it("entire_plan on an existing file: a phase sent without steps gets status, depends_on and steps", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", { phases: [{ id: "p-empty", name: "Empty" }, { id: "p-last", name: "Last", steps: [newStep] }] });
    expect(result.ok).toBe(true);
    expect(findPhase(loadPlan(file)!, "p-empty")).toEqual({ status: "open", depends_on: [], steps: [], id: "p-empty", name: "Empty" });
    expect(result.result!.phases.find((p) => p.id === "p-empty")).toEqual({ id: "p-empty", name: "Empty", status: "open", steps: [] });

    // a step in a later phase stays reachable
    const status = await cmdUpdateStatus(file, "s-new", "complete");
    expect(status.result).toEqual({ id: "s-new", status: "complete", plan_status: "in_progress" });
  });
});

describe("a plan stored by an earlier version, without status, depends_on or steps", () => {
  function writeStoredPlan(): string {
    const file = planFile();
    fs.writeFileSync(file, JSON.stringify({
      name: "Stored",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      previous_version: null,
      phases: [
        { id: "p-empty", name: "Empty" },
        { id: "p1", name: "P1", steps: [{ id: "s1", name: "S1", prompt: "x" }] },
      ],
    }));
    return file;
  }

  it("upsert fills defaults on the added step only; the write result reports the stored step as open", async () => {
    const file = writeStoredPlan();
    const result = await cmdUpsert(file, "p1", { steps: [newStep] });
    expect(result.ok).toBe(true);

    const plan = loadPlan(file)!;
    expect(plan.phases[0]).toEqual({ id: "p-empty", name: "Empty" });
    expect(plan.phases[1]!.steps).toEqual([
      { id: "s1", name: "S1", prompt: "x" },
      { status: "open", depends_on: [], id: "s-new", name: "New", prompt: "Do it" },
    ]);
    expect("depends_on" in plan.phases[1]!).toBe(false);

    // FR-PLAN-0040 — summaries carry a status for stored items that have none
    expect(result.result!.phases).toEqual([
      { id: "p-empty", name: "Empty", status: "open", steps: [] },
      { id: "p1", name: "P1", status: "open", steps: [{ id: "s1", name: "S1", status: "open" }, { id: "s-new", name: "New", status: "open" }] },
    ]);
  });

  it("update_status reaches a step behind a phase stored without steps", async () => {
    const file = writeStoredPlan();
    const result = await cmdUpdateStatus(file, "s1", "complete");
    expect(result.error).toBeNull();
    expect(result.result).toEqual({ id: "s1", status: "complete", plan_status: "in_progress" });
  });
});
