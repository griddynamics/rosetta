/**
 * Unit tests for cmdQuery (FR-PLAN-0014).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdQuery } from "../../../src/commands/plan/query.js";
import { savePlan } from "../../../src/commands/plan/core.js";
import { fullPlan } from "../../fixtures/plans.js";
import type { Plan, Phase, Step } from "../../../src/commands/plan/core.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-query-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

function writePlan(name = "plan.json"): string {
  const file = planFile(name);
  savePlan(file, fullPlan());
  return file;
}

describe("cmdQuery — plan_not_found", () => {
  it("returns plan_not_found when file missing", async () => {
    const result = await cmdQuery("/tmp/nonexistent-query.json");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
  });
});

describe("cmdQuery — entire plan", () => {
  it("returns full plan when no target_id", async () => {
    const file = writePlan();
    const result = await cmdQuery(file);
    expect(result.ok).toBe(true);
    const plan = result.result as Plan;
    expect(plan.name).toBe("Test Plan");
    expect(plan.phases.length).toBe(2);
  });

  it("returns full plan for entire_plan target", async () => {
    const file = writePlan();
    const result = await cmdQuery(file, "entire_plan");
    expect(result.ok).toBe(true);
    const plan = result.result as Plan;
    expect(plan.phases).toBeDefined();
  });
});

describe("cmdQuery — phase target", () => {
  it("returns phase object for known phase id", async () => {
    const file = writePlan();
    const result = await cmdQuery(file, "p1");
    expect(result.ok).toBe(true);
    const phase = result.result as Phase;
    expect(phase.id).toBe("p1");
    expect(phase.steps.length).toBe(2);
  });

  it("returns phase object for phase 2", async () => {
    const file = writePlan();
    const result = await cmdQuery(file, "p2");
    expect(result.ok).toBe(true);
    const phase = result.result as Phase;
    expect(phase.id).toBe("p2");
  });
});

describe("cmdQuery — step target", () => {
  it("returns step object for known step id", async () => {
    const file = writePlan();
    const result = await cmdQuery(file, "s1");
    expect(result.ok).toBe(true);
    const step = result.result as Step;
    expect(step.id).toBe("s1");
    expect(step.name).toBe("Step 1");
  });

  it("returns step with depends_on populated", async () => {
    const file = writePlan();
    const result = await cmdQuery(file, "s2");
    expect(result.ok).toBe(true);
    const step = result.result as Step;
    expect(step.depends_on).toContain("s1");
  });
});

describe("cmdQuery — target_not_found", () => {
  it("returns target_not_found for unknown id", async () => {
    const file = writePlan();
    const result = await cmdQuery(file, "nonexistent-xyz");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("target_not_found");
  });
});

describe("cmdQuery — internal_error catch path", () => {
  it("returns internal_error when file contains invalid JSON", async () => {
    const file = planFile("bad.json");
    fs.writeFileSync(file, "{{invalid json{{");
    const result = await cmdQuery(file);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("internal_error");
  });
});
