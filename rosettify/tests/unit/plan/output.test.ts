/**
 * Unit tests for buildPlanWriteResult — PlanWriteResult output shape.
 * Verifies shape correctness: only allowed fields appear in the output.
 * Updated per FR-PLAN-0040: result has plan (with previous_version) + phases.
 */
import { describe, it, expect } from "vitest";
import { buildPlanWriteResult } from "../../../src/commands/plan/output.js";
import type { Plan } from "../../../src/commands/plan/core.js";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    name: "Test Plan",
    description: "A test",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    previous_version: null,
    phases: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// PlanWriteResult Output Shape
// ---------------------------------------------------------------------------

describe("buildPlanWriteResult — PlanWriteResult shape correctness", () => {
  // Empty plan: verify root shape with no phases (FR-PLAN-0040 — plan + phases)
  it("returns correct shape for empty plan (no phases)", () => {
    const plan = makePlan({ name: "Empty" });
    const tree = buildPlanWriteResult(plan, null);

    // Root fields only: plan and phases (no previous_version at root)
    expect(Object.keys(tree).sort()).toEqual(["phases", "plan"]);

    // plan sub-object: name, previous_version, status (FR-PLAN-0040)
    expect(Object.keys(tree.plan).sort()).toEqual(["name", "previous_version", "status"]);
    expect(tree.plan.name).toBe("Empty");
    expect(tree.plan.status).toBe("open");
    expect(tree.plan.previous_version).toBeNull();

    // No previous_version at result root (it lives inside plan sub-object)
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(tree.phases).toEqual([]);
  });

  // Multi-phase plan: each phase/step carries only id, name, status
  it("returns correct shape for multi-phase plan", () => {
    const plan = makePlan({
      name: "Full Plan",
      status: "in_progress",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "phase desc",
          status: "in_progress",
          depends_on: [],
          steps: [
            { id: "s1", name: "Step 1", prompt: "do it", status: "complete", depends_on: [] },
            { id: "s2", name: "Step 2", prompt: "do more", status: "open", depends_on: ["s1"] },
          ],
        },
        {
          id: "p2",
          name: "Phase 2",
          description: "second phase",
          status: "open",
          depends_on: ["p1"],
          steps: [],
        },
      ],
    });

    const tree = buildPlanWriteResult(plan, "/tmp/plan.json.bak007");

    // Root shape: only plan and phases (no previous_version at root)
    expect(Object.keys(tree).sort()).toEqual(["phases", "plan"]);
    expect(tree.plan.name).toBe("Full Plan");
    expect(tree.plan.status).toBe("in_progress");
    // previous_version surfaced inside plan summary (FR-PLAN-0040)
    expect(tree.plan.previous_version).toBe("/tmp/plan.json.bak007");

    // No previous_version at result root
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();

    // Phase shape: only id, name, status, steps
    expect(tree.phases.length).toBe(2);
    const p1 = tree.phases[0]!;
    expect(Object.keys(p1).sort()).toEqual(["id", "name", "status", "steps"]);
    expect(p1.id).toBe("p1");
    expect(p1.name).toBe("Phase 1");
    expect(p1.status).toBe("in_progress");

    // Step shape: only id, name, status
    expect(p1.steps.length).toBe(2);
    const s1 = p1.steps[0]!;
    expect(Object.keys(s1).sort()).toEqual(["id", "name", "status"]);
    expect(s1.id).toBe("s1");
    expect(s1.name).toBe("Step 1");
    expect(s1.status).toBe("complete");

    // No extra fields on step (no prompt, depends_on, etc.)
    expect((s1 as Record<string, unknown>)["prompt"]).toBeUndefined();
    expect((s1 as Record<string, unknown>)["depends_on"]).toBeUndefined();

    // No extra fields on phase (no description, depends_on, etc.)
    expect((p1 as Record<string, unknown>)["description"]).toBeUndefined();
    expect((p1 as Record<string, unknown>)["depends_on"]).toBeUndefined();

    // No extra fields on plan sub-object (no created_at, updated_at, etc.)
    expect((tree.plan as Record<string, unknown>)["created_at"]).toBeUndefined();
  });

  // Phase with no steps field handled safely (defaults to [])
  it("handles phase with undefined steps (defaults to empty array)", () => {
    const plan = makePlan({
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          status: "open",
          depends_on: [],
          steps: undefined as unknown as [],
        },
      ],
    });
    const tree = buildPlanWriteResult(plan, null);
    expect(tree.phases[0]!.steps).toEqual([]);
  });

  // previous_version is null on first create (FR-PLAN-0010); a backup path on subsequent writes
  it("plan summary previous_version is null when passed null (first create)", () => {
    const plan = makePlan({ name: "First" });
    const tree = buildPlanWriteResult(plan, null);
    expect(tree.plan.previous_version).toBeNull();
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Object.keys(tree).sort()).toEqual(["phases", "plan"]);
  });

  it("plan summary previous_version equals the passed backup path", () => {
    const bak = "/path/to/plan.json.bak042";
    const plan = makePlan({ name: "Updated" });
    const tree = buildPlanWriteResult(plan, bak);
    expect(tree.plan.previous_version).toBe(bak);
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Object.keys(tree).sort()).toEqual(["phases", "plan"]);
  });
});
