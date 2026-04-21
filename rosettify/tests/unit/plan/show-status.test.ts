/**
 * Unit tests for cmdShowStatus (FR-PLAN-0013).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdShowStatus } from "../../../src/commands/plan/show-status.js";
import { savePlan } from "../../../src/commands/plan/core.js";
import { fullPlan, minimalPlan } from "../../fixtures/plans.js";
import type { ShowStatusPlanResult, ShowStatusPhaseResult, ShowStatusStepResult } from "../../../src/commands/plan/core.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-show-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

function writePlan(name = "plan.json") {
  const file = planFile(name);
  savePlan(file, fullPlan());
  return file;
}

describe("cmdShowStatus — plan_not_found", () => {
  it("returns plan_not_found when file missing", async () => {
    const result = await cmdShowStatus("/tmp/nonexistent-show.json");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
  });
});

describe("cmdShowStatus — entire plan", () => {
  it("returns full plan status summary without target_id", async () => {
    const file = writePlan();
    const result = await cmdShowStatus(file);
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusPlanResult;
    expect(r.name).toBe("Test Plan");
    expect(r.status).toBeDefined();
    expect(r.phases).toBeDefined();
    expect(r.steps).toBeDefined();
    expect(Array.isArray(r.phase_summary)).toBe(true);
  });

  it("returns full plan status summary with entire_plan target", async () => {
    const file = writePlan();
    const result = await cmdShowStatus(file, "entire_plan");
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusPlanResult;
    expect(r.name).toBe("Test Plan");
  });

  it("totals reflect actual step counts", async () => {
    const file = writePlan();
    const result = await cmdShowStatus(file);
    const r = result.result as ShowStatusPlanResult;
    // fullPlan has 3 steps total (s1, s2, s3) across 2 phases
    expect(r.steps.total).toBe(3);
    expect(r.steps.open).toBe(3);
    expect(r.phases.total).toBe(2);
  });

  it("computes progress_pct correctly", async () => {
    const file = planFile();
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.status = "complete"; // 1 of 3 steps complete
    savePlan(file, plan);
    const result = await cmdShowStatus(file);
    const r = result.result as ShowStatusPlanResult;
    // 1/3 = 33.3%
    expect(r.steps.progress_pct).toBeCloseTo(33.3, 1);
  });

  it("returns zero progress_pct for empty plan", async () => {
    const file = planFile("empty.json");
    savePlan(file, minimalPlan());
    const result = await cmdShowStatus(file);
    const r = result.result as ShowStatusPlanResult;
    expect(r.steps.progress_pct).toBe(0);
    expect(r.steps.total).toBe(0);
  });
});

describe("cmdShowStatus — phase target", () => {
  it("returns phase status for known phase id", async () => {
    const file = writePlan();
    const result = await cmdShowStatus(file, "p1");
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusPhaseResult;
    expect(r.id).toBe("p1");
    expect(r.name).toBe("Phase 1");
    expect(Array.isArray(r.steps)).toBe(true);
  });
});

describe("cmdShowStatus — step target", () => {
  it("returns step status for known step id", async () => {
    const file = writePlan();
    const result = await cmdShowStatus(file, "s1");
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusStepResult;
    expect(r.id).toBe("s1");
    expect(r.name).toBe("Step 1");
    expect(r.status).toBe("open");
    expect(Array.isArray(r.depends_on)).toBe(true);
  });
});

describe("cmdShowStatus — target_not_found", () => {
  it("returns target_not_found for unknown id", async () => {
    const file = writePlan();
    const result = await cmdShowStatus(file, "nonexistent-id");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("target_not_found");
  });
});

describe("cmdShowStatus — nullish status fields (branch coverage)", () => {
  it("handles step with undefined status (defaults to open)", async () => {
    const file = planFile("null-status.json");
    // Write plan JSON manually with status absent from step
    const planJson = {
      name: "Test Plan",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          // status absent — will be undefined on read
          depends_on: [],
          steps: [
            {
              id: "s1",
              name: "Step 1",
              prompt: "x",
              // status absent — will be undefined on read
              depends_on: [],
            },
          ],
        },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(planJson, null, 2));
    const result = await cmdShowStatus(file);
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusPlanResult;
    expect(r.phase_summary[0]!.steps[0]!.status).toBe("open");
    expect(r.phase_summary[0]!.status).toBe("open");
  });

  it("handles plan without phases field (defaults to [])", async () => {
    const file = planFile("no-phases.json");
    // Write plan JSON manually without phases field
    const planJson = {
      name: "No Phases Plan",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      // phases absent
    };
    fs.writeFileSync(file, JSON.stringify(planJson, null, 2));
    const result = await cmdShowStatus(file);
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusPlanResult;
    expect(r.phases.total).toBe(0);
    expect(r.steps.total).toBe(0);
  });

  it("handles phase with undefined status (defaults to open) for phase target", async () => {
    const file = planFile("null-phase-status.json");
    const planJson = {
      name: "Test Plan",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          // status absent
          depends_on: [],
          steps: [{ id: "s1", name: "Step 1", prompt: "x", depends_on: [] }],
        },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(planJson, null, 2));
    const result = await cmdShowStatus(file, "p1");
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusPhaseResult;
    expect(r.status).toBe("open");
  });

  it("handles phase without steps field for phase target", async () => {
    const file = planFile("no-steps.json");
    const planJson = {
      name: "Test Plan",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [{ id: "p1", name: "Phase 1", description: "", depends_on: [] }],
    };
    fs.writeFileSync(file, JSON.stringify(planJson, null, 2));
    const result = await cmdShowStatus(file, "p1");
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusPhaseResult;
    expect(r.steps).toEqual([]);
  });

  it("handles step with undefined status for step target", async () => {
    const file = planFile("null-step-status.json");
    const planJson = {
      name: "Test Plan",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          depends_on: [],
          steps: [{ id: "s1", name: "Step 1", prompt: "x", depends_on: [] }],
        },
      ],
    };
    fs.writeFileSync(file, JSON.stringify(planJson, null, 2));
    const result = await cmdShowStatus(file, "s1");
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusStepResult;
    expect(r.status).toBe("open");
  });
});

describe("cmdShowStatus — internal_error catch path", () => {
  it("returns internal_error when file contains invalid JSON", async () => {
    const file = planFile("bad.json");
    fs.writeFileSync(file, "{{invalid json{{");
    const result = await cmdShowStatus(file);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("internal_error");
  });
});

describe("cmdShowStatus — step with subagent/role/model fields", () => {
  it("includes subagent, role, model when present on step", async () => {
    const file = planFile("sub.json");
    const plan = fullPlan();
    plan.phases[0]!.steps[0]!.subagent = "my-agent";
    plan.phases[0]!.steps[0]!.role = "engineer";
    plan.phases[0]!.steps[0]!.model = "claude-opus";
    savePlan(file, plan);
    const result = await cmdShowStatus(file, "s1");
    expect(result.ok).toBe(true);
    const r = result.result as ShowStatusStepResult;
    expect(r.subagent).toBe("my-agent");
    expect(r.role).toBe("engineer");
    expect(r.model).toBe("claude-opus");
  });
});
