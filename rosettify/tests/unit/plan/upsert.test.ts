/**
 * Unit tests for cmdUpsert (FR-PLAN-0015).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpsert } from "../../../src/commands/plan/upsert.js";
import { savePlan, loadPlan } from "../../../src/commands/plan/core.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { fullPlan, minimalPlan } from "../../fixtures/plans.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-upsert-"));
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

describe("cmdUpsert — entire_plan on missing file (create)", () => {
  it("creates new plan file when it does not exist", async () => {
    const file = planFile("new.json");
    const result = await cmdUpsert(file, "entire_plan", { name: "Created" });
    expect(result.ok).toBe(true);
    expect(result.result!.id).toBe("entire_plan");
    expect(fs.existsSync(file)).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.name).toBe("Created");
  });
});

describe("cmdUpsert — entire_plan on existing file (merge)", () => {
  it("patches plan description", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", { description: "Updated desc" });
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.description).toBe("Updated desc");
    expect(plan.name).toBe("Test Plan"); // unchanged
  });

  it("merges phases by id", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", {
      phases: [{ id: "p1", name: "Phase 1 Updated" }],
    });
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.name).toBe("Phase 1 Updated");
  });
});

describe("cmdUpsert — update existing phase", () => {
  it("patches phase name", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "p1", { name: "Phase One Renamed" });
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.name).toBe("Phase One Renamed");
  });

  it("merges steps by id within a phase", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "p1", {
      steps: [{ id: "s1", name: "Step 1 Updated" }],
    });
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.steps[0]!.name).toBe("Step 1 Updated");
    expect(plan.phases[0]!.steps.length).toBe(2); // s2 preserved
  });
});

describe("cmdUpsert — update existing step", () => {
  it("patches step prompt", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "s1", { prompt: "New prompt for step 1" });
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.steps[0]!.prompt).toBe("New prompt for step 1");
  });
});

describe("cmdUpsert — insert new phase", () => {
  it("inserts new phase when kind=phase", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "p-new", { name: "New Phase", description: "added" }, "phase");
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const newPhase = plan.phases.find((p) => p.id === "p-new");
    expect(newPhase).toBeDefined();
    expect(newPhase!.name).toBe("New Phase");
  });
});

describe("cmdUpsert — insert new step", () => {
  it("inserts new step into parent phase when kind=step", async () => {
    const file = writePlan();
    const result = await cmdUpsert(
      file,
      "s-new",
      { name: "New Step", prompt: "Do new thing" },
      "step",
      "p1",
    );
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    const phase = plan.phases.find((p) => p.id === "p1")!;
    const newStep = phase.steps.find((s) => s.id === "s-new");
    expect(newStep).toBeDefined();
    expect(newStep!.name).toBe("New Step");
  });

  it("returns missing_kind when new item has no kind", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "totally-new-id", { name: "X" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_kind");
  });

  it("returns invalid_kind for unknown kind value", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "new-x", { name: "X" }, "invalid-kind");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_kind");
  });

  it("returns missing_phase_id when kind=step but no phase_id", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "s-orphan", { name: "Orphan" }, "step");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_phase_id");
  });

  it("returns phase_not_found when phase_id does not exist", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "s-ghost", { name: "Ghost" }, "step", "nonexistent-phase");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("phase_not_found");
  });
});

describe("cmdUpsert — status field stripping", () => {
  it("silently ignores status field in patch data", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "s1", { name: "Step 1 Renamed", status: "complete" });
    expect(result.ok).toBe(true);
    // status should NOT be changed via upsert
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.steps[0]!.status).toBe("open");
    // result should carry a message about ignored status
    expect(result.result!.message).toContain("update_status");
  });
});

describe("cmdUpsert — plan_not_found", () => {
  it("returns plan_not_found for missing file on non-entire_plan target", async () => {
    const result = await cmdUpsert("/tmp/nonexistent-upsert.json", "p1", { name: "X" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
  });
});

describe("cmdUpsert — returns plan_status", () => {
  it("returns plan_status in result", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", { description: "x" });
    expect(result.ok).toBe(true);
    expect(result.result!.plan_status).toBeDefined();
  });
});

describe("cmdUpsert — internal_error catch path (entire_plan path)", () => {
  it("returns internal_error when plan file contains invalid JSON on entire_plan target", async () => {
    const file = path.join(tmpDir, "bad-plan.json");
    fs.writeFileSync(file, "{{invalid json{{");
    // Use entire_plan target — triggers loadPlan synchronously in the try block
    const result = await cmdUpsert(file, "entire_plan", { name: "x" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("internal_error");
  });
});

describe("cmdUpsert — invalid_data (FR-PLAN-0015)", () => {
  it("returns invalid_data error when data is malformed JSON string", async () => {
    const file = writePlan();
    // Call via the plan run delegate which parses JSON strings
    const result = await planToolDef.run({
      subcommand: "upsert",
      plan_file: file,
      target_id: "entire_plan",
      data: "not-valid-json{{{",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_data");
  });
});

describe("cmdUpsert — immutable_id (FR-PLAN-0015)", () => {
  it("returns immutable_id when patch contains different id than target_id", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "s1", { id: "s-different" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("immutable_id");
  });

  it("allows patch with id matching target_id (no error)", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "s1", { id: "s1", name: "Same ID is OK" });
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.steps[0]!.name).toBe("Same ID is OK");
  });
});
