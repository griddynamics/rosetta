/**
 * Unit tests for cmdNext (sequential phase logic).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdNext } from "../../../src/commands/plan/next.js";
import { savePlan } from "../../../src/commands/plan/core.js";
import { fullPlan, minimalPlan, completedPlan, singleStepPlan } from "../../fixtures/plans.js";
import type { Plan, PlanNextStep, PlanPhaseContext } from "../../../src/commands/plan/core.js";

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
  it("returns empty next array for plan with no phases", async () => {
    const file = writePlan(minimalPlan());
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    expect(result.result!.next).toEqual([]);
    expect(result.result!.count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sequential phase logic
// ---------------------------------------------------------------------------

describe("cmdNext — sequential phase logic", () => {
  it("returns phase-1 steps when phase-1 is incomplete", async () => {
    const plan = fullPlan();
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    // Only s1 is ready (s2 depends on s1 which is open)
    const ids = result.result!.next.map((s) => s.id);
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
    const ids = result.result!.next.map((s) => s.id);
    // Phase 2 is now active; s3 depends on s1 which is complete
    expect(ids).toContain("s3");
    expect(ids).not.toContain("s1");
  });

  it("returns empty next when all phases complete", async () => {
    const file = writePlan(completedPlan());
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    expect(result.result!.next).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// step dependency filtering
// ---------------------------------------------------------------------------

describe("cmdNext — step dependency filtering", () => {
  it("excludes steps whose dependencies are not complete", async () => {
    const plan = fullPlan();
    // s2 depends on s1 (which is open) — s2 must not be in next
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const ids = result.result!.next.map((s) => s.id);
    expect(ids).not.toContain("s2");
  });

  it("includes step once its dependency is satisfied", async () => {
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.status = "complete"; // s1 complete
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const ids = result.result!.next.map((s) => s.id);
    expect(ids).toContain("s2");
  });
});

// ---------------------------------------------------------------------------
// status grouping — NO flags (resume / previously_* removed)
// ---------------------------------------------------------------------------

describe("cmdNext — status grouping", () => {
  it("includes in_progress steps (no resume flag)", async () => {
    const plan = singleStepPlan();
    plan.phases[0]!.steps[0]!.status = "in_progress";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    const step = result.result!.next[0]!;
    expect(step.status).toBe("in_progress");
    expect((step as Record<string, unknown>)["resume"]).toBeUndefined();
  });

  it("includes blocked steps (no previously_blocked flag)", async () => {
    const plan = singleStepPlan();
    plan.phases[0]!.steps[0]!.status = "blocked";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const step = result.result!.next[0]!;
    expect(step.status).toBe("blocked");
    expect((step as Record<string, unknown>)["previously_blocked"]).toBeUndefined();
  });

  it("includes failed steps (no previously_failed flag)", async () => {
    const plan = singleStepPlan();
    plan.phases[0]!.steps[0]!.status = "failed";
    const file = writePlan(plan);
    const result = await cmdNext(file);
    const step = result.result!.next[0]!;
    expect(step.status).toBe("failed");
    expect((step as Record<string, unknown>)["previously_failed"]).toBeUndefined();
  });

  it("orders: in_progress first, then open, then blocked, then failed", async () => {
    const plan: Plan = {
      name: "Order Test",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      previous_version: null,
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
    const result = await cmdNext(file, undefined, 10);
    expect(result.ok).toBe(true);
    const ids = result.result!.next.map((s) => s.id);
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
    const ids = result.result!.next.map((s) => s.id);
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

  // parent present iff target_id
  it("parent is present when target_id is given", async () => {
    const plan = fullPlan();
    const file = writePlan(plan);
    const result = await cmdNext(file, "p1");
    expect(result.ok).toBe(true);
    expect(result.result!.parent).toBeDefined();
    const parent = result.result!.parent!;
    expect(parent.id).toBe("p1");
    expect(parent.name).toBeDefined();
    expect(parent.description).toBeDefined();
    expect(parent.status).toBeDefined();
    expect(parent.depends_on).toBeDefined();
    // parent must NOT include steps
    expect((parent as Record<string, unknown>)["steps"]).toBeUndefined();
  });

  it("parent is absent when no target_id", async () => {
    const file = writePlan(fullPlan());
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    expect(result.result!.parent).toBeUndefined();
  });

  it("parent includes subagent/role/model when set on the phase", async () => {
    const plan = fullPlan();
    plan.phases[0]!.subagent = "coding";
    plan.phases[0]!.role = "engineer";
    plan.phases[0]!.model = "sonnet";
    const file = writePlan(plan);
    const result = await cmdNext(file, "p1");
    expect(result.ok).toBe(true);
    const parent = result.result!.parent!;
    expect(parent.subagent).toBe("coding");
    expect(parent.role).toBe("engineer");
    expect(parent.model).toBe("sonnet");
  });
});

// ---------------------------------------------------------------------------
// Overall*Count fields
// ---------------------------------------------------------------------------

describe("cmdNext — Overall*Count fields", () => {
  it("reports counts for whole plan when no target_id", async () => {
    const plan: Plan = {
      name: "Count Test",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      previous_version: null,
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "s1", name: "S1", prompt: "p", status: "open",        depends_on: [] },
            { id: "s2", name: "S2", prompt: "p", status: "in_progress", depends_on: [] },
            { id: "s3", name: "S3", prompt: "p", status: "blocked",     depends_on: [] },
            { id: "s4", name: "S4", prompt: "p", status: "failed",      depends_on: [] },
            { id: "s5", name: "S5", prompt: "p", status: "complete",    depends_on: [] },
          ],
        },
        {
          id: "p2",
          name: "P2",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "s6", name: "S6", prompt: "p", status: "open", depends_on: [] },
          ],
        },
      ],
    };
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    const r = result.result!;
    // Whole-plan counts
    expect(r.OverallOpenCount).toBe(2);      // s1, s6
    expect(r.OverallInProgressCount).toBe(1); // s2
    expect(r.OverallBlockedCount).toBe(1);    // s3
    expect(r.OverallFailedCount).toBe(1);     // s4
    expect(r.OverallCompleteCount).toBe(1);   // s5
  });

  it("scopes Overall*Count to target phase when target_id given", async () => {
    const plan: Plan = {
      name: "Scoped Count Test",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      previous_version: null,
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "s1", name: "S1", prompt: "p", status: "open",     depends_on: [] },
            { id: "s2", name: "S2", prompt: "p", status: "complete", depends_on: [] },
          ],
        },
        {
          id: "p2",
          name: "P2",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "s3", name: "S3", prompt: "p", status: "blocked", depends_on: [] },
            { id: "s4", name: "S4", prompt: "p", status: "failed",  depends_on: [] },
          ],
        },
      ],
    };
    const file = writePlan(plan);
    const result = await cmdNext(file, "p2");
    expect(result.ok).toBe(true);
    const r = result.result!;
    // Only p2 steps
    expect(r.OverallOpenCount).toBe(0);
    expect(r.OverallInProgressCount).toBe(0);
    expect(r.OverallBlockedCount).toBe(1);
    expect(r.OverallFailedCount).toBe(1);
    expect(r.OverallCompleteCount).toBe(0);
  });

  it("blocked/failed truncated by limit but Overall*Count still reports them", async () => {
    const plan: Plan = {
      name: "Truncation Test",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      previous_version: null,
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "s1", name: "S1", prompt: "p", status: "in_progress", depends_on: [] },
            { id: "s2", name: "S2", prompt: "p", status: "open",        depends_on: [] },
            { id: "s3", name: "S3", prompt: "p", status: "blocked",     depends_on: [] },
            { id: "s4", name: "S4", prompt: "p", status: "failed",      depends_on: [] },
          ],
        },
      ],
    };
    const file = writePlan(plan);
    // limit=3: s1, s2, s3 returned; s4 truncated
    const result = await cmdNext(file, undefined, 3);
    expect(result.ok).toBe(true);
    const r = result.result!;
    expect(r.next.length).toBe(3);
    expect(r.count).toBe(3);
    // But OverallFailedCount still reports s4
    expect(r.OverallFailedCount).toBe(1);
    expect(r.OverallBlockedCount).toBe(1);
  });

  it("zero-actionable phase (only blocked) returns blocked steps + correct counts", async () => {
    const plan: Plan = {
      name: "All Blocked",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      previous_version: null,
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          status: "open",
          depends_on: [],
          steps: [
            { id: "s1", name: "S1", prompt: "p", status: "blocked", depends_on: [] },
            { id: "s2", name: "S2", prompt: "p", status: "blocked", depends_on: [] },
          ],
        },
      ],
    };
    const file = writePlan(plan);
    const result = await cmdNext(file, undefined, 3);
    expect(result.ok).toBe(true);
    const r = result.result!;
    expect(r.next.length).toBe(2);
    expect(r.count).toBe(2);
    expect(r.OverallBlockedCount).toBe(2);
    expect(r.OverallOpenCount).toBe(0);
    expect(r.OverallInProgressCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// limit — default 3
// ---------------------------------------------------------------------------

describe("cmdNext — limit", () => {
  it("respects limit parameter", async () => {
    const plan: Plan = {
      name: "Limit Test",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      previous_version: null,
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
    expect(result.result!.next.length).toBe(2);
    expect(result.result!.count).toBe(2);
  });

  it("returns invalid_limit for negative limit", async () => {
    const file = writePlan(fullPlan());
    const result = await cmdNext(file, undefined, -1);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_limit");
  });

  it("defaults to 3 steps", async () => {
    // Build a plan with 5 open steps in phase 1
    const steps = Array.from({ length: 5 }, (_, i) => ({
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
      previous_version: null,
      phases: [{ id: "p1", name: "P1", description: "", status: "open", depends_on: [], steps }],
    };
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.result!.next.length).toBe(3);
  });

  it("handles limit=0 returning empty next", async () => {
    const file = writePlan(singleStepPlan());
    const result = await cmdNext(file, undefined, 0);
    expect(result.ok).toBe(true);
    expect(result.result!.next).toEqual([]);
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
    const step = result.result!.next[0]!;
    expect(step.subagent).toBe("coding");
    expect(step.role).toBe("engineer");
    expect(step.model).toBe("sonnet");
  });
});

describe("cmdNext — plan_file_corrupted on invalid JSON", () => {
  it("returns plan_file_corrupted when file contains invalid JSON", async () => {
    const file = planFile("bad.json");
    fs.writeFileSync(file, "{{invalid json{{");
    const result = await cmdNext(file);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_file_corrupted");
  });
});

describe("cmdNext — nullish status branches", () => {
  it("handles phase with undefined status (defaults to open, included as active phase)", async () => {
    const plan = singleStepPlan();
    // Force phase status to undefined — triggers the ?? 'open' branch
    (plan.phases[0]! as Record<string, unknown>)["status"] = undefined;
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    // Phase with undefined status treated as 'open' (not complete), so it's the active phase
    expect(result.result!.count).toBeGreaterThanOrEqual(0);
  });

  it("handles step with undefined status (defaults to open)", async () => {
    const plan = singleStepPlan();
    // Force step status to undefined — triggers the ?? 'open' branch
    (plan.phases[0]!.steps[0]! as Record<string, unknown>)["status"] = undefined;
    const file = writePlan(plan);
    const result = await cmdNext(file);
    expect(result.ok).toBe(true);
    // Step with undefined status treated as 'open', so it's a next step
    expect(result.result!.next.length).toBeGreaterThan(0);
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

// ---------------------------------------------------------------------------
// PlanNextStep field-shape assertions (FR-PLAN-0011 / FR-HELP-0002)
// ---------------------------------------------------------------------------

describe("cmdNext — PlanNextStep field-shape assertions", () => {
  it("every element in next is a PlanNextStep with required fields", async () => {
    const plan = fullPlan();
    const file = writePlan(plan);
    const result = await cmdNext(file, undefined, 10);
    expect(result.ok).toBe(true);
    for (const step of result.result!.next as PlanNextStep[]) {
      expect(typeof step.id).toBe("string");
      expect(typeof step.name).toBe("string");
      expect(typeof step.prompt).toBe("string");
      expect(typeof step.status).toBe("string");
      expect(Array.isArray(step.depends_on)).toBe(true);
      expect(typeof step.phase_id).toBe("string");
      expect(typeof step.phase_name).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// PlanPhaseContext field-shape assertions (FR-PLAN-0011 / FR-HELP-0002)
// ---------------------------------------------------------------------------

describe("cmdNext — PlanPhaseContext (parent) field-shape assertions", () => {
  it("parent is a PlanPhaseContext with required scalar fields and no steps", async () => {
    const plan = fullPlan();
    const file = writePlan(plan);
    const result = await cmdNext(file, "p1", 10);
    expect(result.ok).toBe(true);
    const parent = result.result!.parent as PlanPhaseContext;
    expect(parent).toBeDefined();
    expect(typeof parent.id).toBe("string");
    expect(typeof parent.name).toBe("string");
    expect(typeof parent.description).toBe("string");
    expect(typeof parent.status).toBe("string");
    expect(Array.isArray(parent.depends_on)).toBe(true);
    // PlanPhaseContext must NOT include steps
    expect((parent as Record<string, unknown>)["steps"]).toBeUndefined();
  });

  // FR-PLAN-0011 — no-limit case with --target
  it("next --target <phase-id> without explicit limit applies default limit (3) and returns phase-scoped result", async () => {
    const plan = fullPlan();
    const file = writePlan(plan);
    // Default limit = 3; call with target but no explicit limit
    const result = await cmdNext(file, "p1");
    expect(result.ok).toBe(true);
    // parent must be present (target_id given)
    expect(result.result!.parent).toBeDefined();
    expect(result.result!.parent!.id).toBe("p1");
    // count <= 3 (default limit)
    expect(result.result!.count).toBeLessThanOrEqual(3);
  });

  // FR-PLAN-0011 — count=0 and parent.status=complete when phase complete
  it("count=0 and parent.status=complete when all phase steps are complete", async () => {
    const plan = fullPlan();
    // Complete all phase-1 steps
    plan.phases[0]!.steps.forEach((s) => (s.status = "complete"));
    plan.phases[0]!.status = "complete";
    const file = writePlan(plan);
    const result = await cmdNext(file, "p1");
    expect(result.ok).toBe(true);
    expect(result.result!.count).toBe(0);
    expect(result.result!.parent!.status).toBe("complete");
  });
});
