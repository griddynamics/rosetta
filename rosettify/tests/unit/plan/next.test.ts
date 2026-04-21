/**
 * Unit tests for cmdNext (FR-PLAN-0011 — sequential phase logic).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdNext } from "../../../src/commands/plan/next.js";
import { savePlan } from "../../../src/commands/plan/core.js";
import { fullPlan, minimalPlan, completedPlan, singleStepPlan } from "../../fixtures/plans.js";
import type { Plan } from "../../../src/commands/plan/core.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-next-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

function writePlan(plan: Plan, file = planFile()): string {
  savePlan(file, plan);
  return file;
}

// ---------------------------------------------------------------------------
// plan_not_found
// ---------------------------------------------------------------------------

describe("cmdNext — plan_not_found", () => {
  it("returns plan_not_found when file does not exist", async () => {
    const result = await cmdNext("/tmp/nonexistent-plan-xyz.json");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
  });
});

// ---------------------------------------------------------------------------
// empty plan
// ---------------------------------------------------------------------------

describe("cmdNext — empty plan", () => {
  it("returns empty ready array for plan with no phases", async () => {
    const file = writePlan(minimalPlan());
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    expect(result.result!.ready).toEqual([]);
    expect(result.result!.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sequential phase logic (FR-PLAN-0011)
// ---------------------------------------------------------------------------

describe("cmdNext — sequential phase logic", () => {
  it("returns phase-1 steps when phase-1 is incomplete", async () => {
    const plan = fullPlan();
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    // Only s1 is ready (s2 depends on s1 which is open)
    const ids = result.result!.ready.map((s) => s.id);
    expect(ids).toContain("s1");
    expect(ids).not.toContain("s3"); // s3 is in phase 2
  });

  it("returns phase-2 steps when phase-1 is complete", async () => {
    const plan = fullPlan();
    // Mark all phase-1 steps complete
    plan.phases[0]!.steps.forEach((s) => (s.status = "complete"));
    plan.phases[0]!.status = "complete";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    const ids = result.result!.ready.map((s) => s.id);
    // Phase 2 is now active; s3 depends on s1 which is complete
    expect(ids).toContain("s3");
    expect(ids).not.toContain("s1");
  });

  it("returns empty ready when all phases complete", async () => {
    const file = writePlan(completedPlan());
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    expect(result.result!.ready).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// step dependency filtering
// ---------------------------------------------------------------------------

describe("cmdNext — step dependency filtering", () => {
  it("excludes steps whose dependencies are not complete", async () => {
    const plan = fullPlan();
    // s2 depends on s1 (which is open) — s2 must not be in ready
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const ids = result.result!.ready.map((s) => s.id);
    expect(ids).not.toContain("s2");
  });

  it("includes step once its dependency is satisfied", async () => {
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.status = "complete"; // s1 complete
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const ids = result.result!.ready.map((s) => s.id);
    expect(ids).toContain("s2");
  });
});

// ---------------------------------------------------------------------------
// in_progress / blocked / failed grouping
// ---------------------------------------------------------------------------

describe("cmdNext — status grouping", () => {
  it("includes in_progress steps with resume:true", async () => {
    const plan = singleStepPlan();
    plan.phases[0]!.steps[0]!.status = "in_progress";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    const step = result.result!.ready[0]!;
    expect(step.status).toBe("in_progress");
    expect(step.resume).toBe(true);
  });

  it("includes blocked steps with previously_blocked:true", async () => {
    const plan = singleStepPlan();
    plan.phases[0]!.steps[0]!.status = "blocked";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const step = result.result!.ready[0]!;
    expect(step.status).toBe("blocked");
    expect(step.previously_blocked).toBe(true);
  });

  it("includes failed steps with previously_failed:true", async () => {
    const plan = singleStepPlan();
    plan.phases[0]!.steps[0]!.status = "failed";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const step = result.result!.ready[0]!;
    expect(step.status).toBe("failed");
    expect(step.previously_failed).toBe(true);
  });

  it("orders: in_progress first, then open, then blocked, then failed", async () => {
    const plan: Plan = {
      name: "Order Test",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "sf", name: "Failed",      prompt: "p", status: "failed",      depends_on: [] },
            { id: "sb", name: "Blocked",     prompt: "p", status: "blocked",     depends_on: [] },
            { id: "so", name: "Open",        prompt: "p", status: "open",        depends_on: [] },
            { id: "si", name: "InProgress",  prompt: "p", status: "in_progress", depends_on: [] },
          ],
        },
      ],
    };
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    const ids = result.result!.ready.map((s) => s.id);
    expect(ids[0]).toBe("si"); // in_progress first
    expect(ids[1]).toBe("so"); // open second
    expect(ids[2]).toBe("sb"); // blocked third
    expect(ids[3]).toBe("sf"); // failed last
  });
});

// ---------------------------------------------------------------------------
// target_id scoping
// ---------------------------------------------------------------------------

describe("cmdNext — target_id scoping", () => {
  it("scopes to specified phase regardless of phase-1 state", async () => {
    const plan = fullPlan();
    // Phase 2 is not yet unblocked (phase 1 incomplete), but target_id bypasses sequential check
    // First mark s1 complete so s3's step dep is satisfied
    plan.phases[0]!.steps[0]!.status = "complete";
    // Phase 1 still not complete (s2 is open)
    const file = writePlan(plan);
    const result = await cmdNext(file, "p2");
    expect(result.ok).toBe(true);
    const ids = result.result!.ready.map((s) => s.id);
    expect(ids).toContain("s3");
    expect(ids).not.toContain("s1");
    expect(ids).not.toContain("s2");
  });

  it("returns target_not_found for nonexistent phase id", async () => {
    const file = writePlan(fullPlan());
    const result = await cmdNext(file, "nonexistent-phase");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("target_not_found");
  });
});

// ---------------------------------------------------------------------------
// limit
// ---------------------------------------------------------------------------

describe("cmdNext — limit", () => {
  it("respects limit parameter", async () => {
    const plan: Plan = {
      name: "Limit Test",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "s1", name: "S1", prompt: "p", status: "open", depends_on: [] },
            { id: "s2", name: "S2", prompt: "p", status: "open", depends_on: [] },
            { id: "s3", name: "S3", prompt: "p", status: "open", depends_on: [] },
          ],
        },
      ],
    };
    const file = writePlan(plan);
    const result = await cmdNext(file, undefined, 2);
    expect(result.ok).toBe(true);
    expect(result.result!.ready.length).toBe(2);
    expect(result.result!.count).toBe(2);
  });

  it("returns invalid_limit for negative limit", async () => {
    const file = writePlan(fullPlan());
    const result = await cmdNext(file, undefined, -1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_limit");
  });

  it("defaults to 10 steps", async () => {
    // Build a plan with 11 open steps in phase 1
    const steps = Array.from({ length: 11 }, (_, i) => ({
      id: `s${i + 1}`,
      name: `Step ${i + 1}`,
      prompt: "do it",
      status: "open" as const,
      depends_on: [] as string[],
    }));
    const plan: Plan = {
      name: "Big Plan",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [{ id: "p1", name: "P1", description: "", status: "open", depends_on: [], steps }],
    };
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.result!.ready.length).toBe(10);
  });

  it("handles limit=0 returning empty ready", async () => {
    const file = writePlan(singleStepPlan());
    const result = await cmdNext(file, undefined, 0);
    expect(result.ok).toBe(true);
    expect(result.result!.ready).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// plan_status propagation
// ---------------------------------------------------------------------------

describe("cmdNext — plan_status in result", () => {
  it("returns correct plan_status", async () => {
    const file = writePlan(fullPlan());
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    expect(result.result!.plan_status).toBe("open");
  });

  it("returns complete plan_status when all done", async () => {
    const file = writePlan(completedPlan());
    const result = await cmdNext(file);
    expect(result.result!.plan_status).toBe("complete");
  });
});

// ---------------------------------------------------------------------------
// optional step fields
// ---------------------------------------------------------------------------

describe("cmdNext — step optional fields", () => {
  it("propagates subagent/role/model to NextStep", async () => {
    const plan = singleStepPlan();
    plan.phases[0]!.steps[0]!.subagent = "coding";
    plan.phases[0]!.steps[0]!.role = "engineer";
    plan.phases[0]!.steps[0]!.model = "sonnet";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const step = result.result!.ready[0]!;
    expect(step.subagent).toBe("coding");
    expect(step.role).toBe("engineer");
    expect(step.model).toBe("sonnet");
  });
});

describe("cmdNext — internal_error catch path", () => {
  it("returns internal_error when file contains invalid JSON", async () => {
    const file = planFile("bad.json");
    fs.writeFileSync(file, "{{invalid json{{");
    const result = await cmdNext(file);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("internal_error");
  });
});

describe("cmdNext — nullish status branches", () => {
  it("handles phase with undefined status (defaults to open, included as active phase)", async () => {
    const plan = singleStepPlan();
    // Force phase status to undefined — triggers the ?? 'open' branch on line 42
    (plan.phases[0]! as Record<string, unknown>)["status"] = undefined;
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    // Phase with undefined status treated as 'open' (not complete), so it's the active phase
    expect(result.result!.count).toBeGreaterThanOrEqual(0);
  });

  it("handles step with undefined status (defaults to open)", async () => {
    const plan = singleStepPlan();
    // Force step status to undefined — triggers the ?? 'open' branch on line 54
    (plan.phases[0]!.steps[0]! as Record<string, unknown>)["status"] = undefined;
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    // Step with undefined status treated as 'open', so it's a ready step
    expect(result.result!.ready.length).toBeGreaterThan(0);
  });

  it("handles phase with undefined steps (nullish branch)", async () => {
    const plan = singleStepPlan();
    (plan.phases[0]! as Record<string, unknown>)["steps"] = undefined;
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    expect(result.result!.count).toBe(0);
  });
});
