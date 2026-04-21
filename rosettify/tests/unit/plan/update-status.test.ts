/**
 * Unit tests for cmdUpdateStatus (FR-PLAN-0012).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpdateStatus } from "../../../src/commands/plan/update-status.js";
import { savePlan, loadPlan } from "../../../src/commands/plan/core.js";
import { fullPlan, singleStepPlan } from "../../fixtures/plans.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-update-"));
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

describe("cmdUpdateStatus", () => {
  it("updates a step status to complete", async () => {
    const file = writePlan();
    const result = await cmdUpdateStatus(file, "s1", "complete");
    expect(result.ok).toBe(true);
    expect(result.result!.id).toBe("s1");
    expect(result.result!.status).toBe("complete");
  });

  it("propagates plan_status after update", async () => {
    const file = planFile();
    const plan = singleStepPlan();
    savePlan(file, plan);
    const result = await cmdUpdateStatus(file, "s1", "complete");
    expect(result.ok).toBe(true);
    expect(result.result!.plan_status).toBe("complete");
  });

  it("returns plan_not_found when file missing", async () => {
    const result = await cmdUpdateStatus("/tmp/nonexistent-xyz.json", "s1", "complete");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
  });

  it("returns target_not_found for nonexistent step", async () => {
    const file = writePlan();
    const result = await cmdUpdateStatus(file, "nonexistent-step", "complete");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("target_not_found");
  });

  it("returns invalid_status for unknown status value", async () => {
    const file = writePlan();
    const result = await cmdUpdateStatus(file, "s1", "invalid-status-xyz");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_status");
  });

  it("returns phase_status_is_derived when targeting a phase id", async () => {
    const file = writePlan();
    const result = await cmdUpdateStatus(file, "p1", "complete");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("phase_status_is_derived");
  });

  it("returns invalid_target for entire_plan target", async () => {
    const file = writePlan();
    const result = await cmdUpdateStatus(file, "entire_plan", "complete");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_target");
  });

  it("accepts all valid status values", async () => {
    const validStatuses = ["open", "in_progress", "complete", "blocked", "failed"] as const;
    for (const status of validStatuses) {
      const file = planFile(`plan-${status}.json`);
      savePlan(file, fullPlan());
      const result = await cmdUpdateStatus(file, "s1", status);
      expect(result.ok).toBe(true);
      expect(result.result!.status).toBe(status);
    }
  });

  it("persists status change to disk", async () => {
    const file = writePlan();
    await cmdUpdateStatus(file, "s1", "in_progress");
    const plan = loadPlan(file)!;
    const s1 = plan.phases[0]!.steps[0]!;
    expect(s1.status).toBe("in_progress");
  });

  it("returns missing_new_status when new_status is empty string", async () => {
    const file = writePlan();
    const result = await cmdUpdateStatus(file, "s1", "");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_new_status");
  });

});
