/**
 * Unit tests for cmdUpsert (FR-PLAN-0015 / FR-PLAN-0040 / FR-PLAN-0024).
 * Updated for Phase 9: expects compressed-tree result, .bakNNN file after upsert,
 * previous_version non-null after write, status-strip via plan show_status.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdUpsert } from "../../../src/commands/plan/upsert.js";
import { savePlan, loadPlan } from "../../../src/commands/plan/core.js";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { fullPlan, minimalPlan } from "../../fixtures/plans.js";
import type { PlanWriteResult } from "../../../src/commands/plan/output.js";

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

// ---------------------------------------------------------------------------
// FR-PLAN-0015 / FR-PLAN-0040 — compressed-tree result shape
// ---------------------------------------------------------------------------

describe("cmdUpsert — FR-PLAN-0040 compressed-tree result", () => {
  // FR-PLAN-0040 — upsert returns compressed-tree shape
  it("returns compressed-tree shape after upsert", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", { description: "Updated desc" });
    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;

    expect(tree.plan).toBeDefined();
    expect(tree.plan.status).toBeDefined();
    expect(Array.isArray(tree.phases)).toBe(true);

    // No old-shape fields
    expect((tree as Record<string, unknown>)["id"]).toBeUndefined();
    expect((tree as Record<string, unknown>)["plan_status"]).toBeUndefined();
    expect((tree as Record<string, unknown>)["message"]).toBeUndefined();
  });

  // FR-PLAN-0040 — result.plan.previous_version is the backup path (FR-PLAN-0024)
  // FR-PLAN-0024 — .bakNNN file created after upsert on existing plan
  it("creates .bak000 file after upsert on existing plan; result.plan.previous_version equals backup path", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", { description: "Updated" });
    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;

    // FR-PLAN-0040 — previous_version surfaced inside plan summary
    expect(tree.plan.previous_version).not.toBeNull();
    expect(typeof tree.plan.previous_version).toBe("string");
    expect(tree.plan.previous_version).toContain(".bak000");
    // No previous_version at result root level
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();

    // FR-PLAN-0024 — the plan FILE on disk has previous_version pointing to the same backup
    const planOnDisk = loadPlan(file)!;
    expect(planOnDisk.previous_version).not.toBeNull();
    expect(typeof planOnDisk.previous_version).toBe("string");
    expect(fs.existsSync(planOnDisk.previous_version!)).toBe(true);
    expect(planOnDisk.previous_version).toContain(".bak000");
    // result.plan.previous_version equals the plan file's own previous_version
    expect(tree.plan.previous_version).toBe(planOnDisk.previous_version);
  });

  // FR-PLAN-0017 — previous_version in result.plan equals plan FILE's previous_version
  it("result.plan.previous_version equals plan file's previous_version after upsert", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "entire_plan", { description: "x" });
    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;
    // result.plan.previous_version is non-null
    expect(tree.plan.previous_version).not.toBeNull();
    // Plan file has same previous_version
    const planOnDisk = loadPlan(file)!;
    expect(planOnDisk.previous_version).not.toBeNull();
    expect(tree.plan.previous_version).toBe(planOnDisk.previous_version);
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0015 — existing subcommand behaviors (updated assertions)
// ---------------------------------------------------------------------------

describe("cmdUpsert — entire_plan on missing file (create)", () => {
  it("creates new plan file when it does not exist and returns compressed-tree", async () => {
    const file = planFile("new.json");
    const result = await cmdUpsert(file, "entire_plan", { name: "Created" });
    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;

    // Compressed-tree shape
    expect(tree.plan).toBeDefined();
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

// ---------------------------------------------------------------------------
// FR-PLAN-0015 — status field stripping (silently dropped)
// ---------------------------------------------------------------------------

describe("cmdUpsert — status field stripping (FR-PLAN-0015)", () => {
  // FR-PLAN-0015 — status fields in patch are silently stripped;
  // verify via show_status afterwards (per approved resolution from validator-phase7)
  it("silently ignores status field in patch data — status unchanged on disk", async () => {
    const file = writePlan();
    const result = await cmdUpsert(file, "s1", { name: "Step 1 Renamed", status: "complete" });
    expect(result.ok).toBe(true);

    // status should NOT be changed via upsert — verify on disk
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.steps[0]!.status).toBe("open");

    // The compressed-tree result should have no message field (it was removed in Phase 5)
    const tree = result.result as PlanWriteResult;
    expect((tree as Record<string, unknown>)["message"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0015 — plan_not_found
// ---------------------------------------------------------------------------

describe("cmdUpsert — plan_not_found", () => {
  it("returns plan_not_found for missing file on non-entire_plan target", async () => {
    const result = await cmdUpsert("/tmp/nonexistent-upsert.json", "p1", { name: "X" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0015 — internal_error catch path
// ---------------------------------------------------------------------------

describe("cmdUpsert — FR-PLAN-0021 plan_file_corrupted (entire_plan path)", () => {
  // FR-PLAN-0021 — invalid JSON on existing file SHALL return plan_file_corrupted (not internal_error).
  it("returns plan_file_corrupted when plan file contains invalid JSON on entire_plan target", async () => {
    const file = path.join(tmpDir, "bad-plan.json");
    fs.writeFileSync(file, "{{invalid json{{");
    const result = await cmdUpsert(file, "entire_plan", { name: "x" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_file_corrupted");
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0015 — invalid_data
// ---------------------------------------------------------------------------

describe("cmdUpsert — invalid_data (FR-PLAN-0015)", () => {
  it("returns invalid_data error when data is malformed JSON string", async () => {
    const file = writePlan();
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

// ---------------------------------------------------------------------------
// FR-PLAN-0015 — immutable_id
// ---------------------------------------------------------------------------

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
