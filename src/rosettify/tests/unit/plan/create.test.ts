/**
 * Unit tests for cmdCreate (FR-PLAN-0010 / FR-PLAN-0040).
 * Updated for Phase 9: expects compressed-tree result shape, previous_version field,
 * and pretty-formatted file on disk.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdCreate } from "../../../src/commands/plan/create.js";
import { loadPlan } from "../../../src/commands/plan/core.js";
import { cmdUpdateStatus } from "../../../src/commands/plan/update-status.js";
import { PLAN_BACKUP_RETENTION } from "../../../src/shared/constants.js";
import type { PlanWriteResult } from "../../../src/commands/plan/output.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-create-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

describe("cmdCreate — FR-PLAN-0010 / FR-PLAN-0040", () => {
  it("returns backup_create_failed on lock exhaustion and leaves the file unchanged", async () => {
    const file = planFile();
    expect((await cmdCreate(file, { name: "Original" })).ok).toBe(true);
    const before = fs.readFileSync(file);
    fs.mkdirSync(file + ".lock");
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    try {
      const pending = cmdCreate(file, { name: "Replacement" });
      await vi.runAllTimersAsync();
      const result = await pending;
      expect(result.ok).toBe(false);
      expect(result.error).toBe("backup_create_failed");
      expect(fs.readFileSync(file)).toEqual(before);
      expect(fs.readdirSync(tmpDir).sort()).toEqual(["plan.json", "plan.json.lock"]);
    } finally {
      vi.useRealTimers();
    }
  });

  // FR-PLAN-0040 — create returns compressed-tree shape
  it("returns compressed-tree result on first create", async () => {
    const file = planFile();
    const result = await cmdCreate(file, { name: "My Plan" });

    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;

    // FR-PLAN-0040 — root fields
    expect(tree.plan).toBeDefined();
    expect(tree.plan.name).toBe("My Plan");
    expect(tree.plan.status).toBe("open");
    expect(Array.isArray(tree.phases)).toBe(true);

    // No old-shape fields (plan_file, name at root, status at root)
    expect((tree as Record<string, unknown>)["plan_file"]).toBeUndefined();
    expect((tree as Record<string, unknown>)["name"]).toBeUndefined();
    expect((tree as Record<string, unknown>)["status"]).toBeUndefined();
  });

  // FR-PLAN-0040 — plan summary previous_version is null on first create (FR-PLAN-0010)
  it("plan.previous_version is null on first create (FR-PLAN-0010)", async () => {
    const file = planFile();
    const result = await cmdCreate(file, { name: "My Plan" });

    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;
    // FR-PLAN-0040 — previous_version is null on first create, surfaced in plan summary
    expect(tree.plan.previous_version).toBeNull();
    // No previous_version at result root level
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();

    // FR-PLAN-0017 — plan FILE on disk has previous_version=null on first create
    const plan = loadPlan(file)!;
    expect(plan.previous_version).toBeNull();
  });

  // FR-PLAN-0026 — plan file is pretty-formatted on disk
  it("plan file is pretty-formatted on disk (2-space indent)", async () => {
    const file = planFile();
    await cmdCreate(file, { name: "Pretty Plan" });

    expect(fs.existsSync(file)).toBe(true);
    const raw = fs.readFileSync(file, "utf8");
    // Pretty-formatted: starts with { and has newlines
    expect(raw.trim()).toMatch(/^\{/);
    expect(raw).toContain("\n");
  });

  // FR-PLAN-0040 — phases in compressed-tree carry only id, name, status, steps
  it("creates plan with phases and steps in compressed-tree", async () => {
    const file = planFile();
    const data = {
      name: "Full Plan",
      description: "test",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "first",
          steps: [
            { id: "s1", name: "Step 1", prompt: "Do it" },
          ],
        },
      ],
    };
    const result = await cmdCreate(file, data);
    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;

    expect(tree.phases.length).toBe(1);
    const phase = tree.phases[0]!;
    expect(phase.id).toBe("p1");
    expect(phase.name).toBe("Phase 1");
    expect(phase.status).toBe("open");
    expect(phase.steps.length).toBe(1);
    expect(phase.steps[0]!.id).toBe("s1");
    expect(phase.steps[0]!.status).toBe("open");

    // No extra fields on compressed-tree phase
    expect((phase as Record<string, unknown>)["description"]).toBeUndefined();

    // Plan still on disk correctly
    const plan = loadPlan(file);
    expect(plan).not.toBeNull();
    expect(plan!.phases.length).toBe(1);
    expect(plan!.phases[0]!.steps.length).toBe(1);
    expect(plan!.phases[0]!.steps[0]!.status).toBe("open");
  });

  it("defaults name to Unnamed Plan when missing", async () => {
    const file = planFile();
    const result = await cmdCreate(file, {});
    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;
    expect(tree.plan.name).toBe("Unnamed Plan");
  });

  it.each(["", "   ", 123, {}])("rejects an invalid plan name %#", async (name) => {
    const file = planFile();
    const result = await cmdCreate(file, { name });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("size_limit_exceeded");
    expect(fs.existsSync(file)).toBe(false);
  });

  it("rejects plan with duplicate ids", async () => {
    const file = planFile();
    const data = {
      name: "Dup",
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          steps: [
            { id: "s1", name: "S1", prompt: "x" },
            { id: "s1", name: "S1 dup", prompt: "y" },
          ],
        },
      ],
    };
    const result = await cmdCreate(file, data);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("duplicate_id");
    expect(fs.existsSync(file)).toBe(false);
  });

  it("rejects plan with unknown dependency", async () => {
    const file = planFile();
    const data = {
      name: "Bad Deps",
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          steps: [
            { id: "s1", name: "S1", prompt: "x", depends_on: ["nonexistent"] },
          ],
        },
      ],
    };
    const result = await cmdCreate(file, data);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown_dependency");
  });

  it("rejects plan with cyclic dependencies", async () => {
    const file = planFile();
    const data = {
      name: "Cycle",
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          depends_on: ["p1"], // self-cycle
          steps: [],
        },
      ],
    };
    const result = await cmdCreate(file, data);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("dependency_cycle");
  });

  it("sets timestamps on created plan", async () => {
    const file = planFile();
    const before = Date.now();
    await cmdCreate(file, { name: "Time Test" });
    const after = Date.now();
    const plan = loadPlan(file)!;
    const created = new Date(plan.created_at).getTime();
    expect(created).toBeGreaterThanOrEqual(before);
    expect(created).toBeLessThanOrEqual(after);
  });

  it("propagates status after creation", async () => {
    const file = planFile();
    const data = {
      name: "Status Test",
      phases: [
        {
          id: "p1",
          name: "P1",
          description: "",
          steps: [{ id: "s1", name: "S1", prompt: "x" }],
        },
      ],
    };
    const result = await cmdCreate(file, data);
    expect(result.ok).toBe(true);
    const tree = result.result as PlanWriteResult;
    expect(tree.plan.status).toBe("open");
    expect(tree.phases[0]!.status).toBe("open");
  });

  it("creates parent directories if needed", async () => {
    const nested = path.join(tmpDir, "sub", "dir", "plan.json");
    const result = await cmdCreate(nested, { name: "Nested" });
    expect(result.ok).toBe(true);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it("creates plan with phases that have no steps field", async () => {
    const file = planFile();
    const data = {
      name: "No Steps Phase",
      phases: [
        {
          id: "p1",
          name: "Phase Without Steps",
          description: "",
          // no 'steps' field
        },
      ],
    };
    const result = await cmdCreate(file, data);
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.steps).toEqual([]);
  });

  it("internal_error: returns internal_error for non-Error thrown", async () => {
    const dirPath = path.join(tmpDir, "dir-not-file");
    fs.mkdirSync(dirPath, { recursive: true });
    fs.writeFileSync(path.join(dirPath, "keep.txt"), "untouched");
    const result = await cmdCreate(dirPath, { name: "Fail" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("internal_error");
    expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    expect(fs.readFileSync(path.join(dirPath, "keep.txt"), "utf8")).toBe("untouched");
    expect(fs.readdirSync(tmpDir)).toEqual(["dir-not-file"]);
  });

  it("idempotent: second create overwrites with new name (NFR-REL-0002)", async () => {
    const file = planFile();

    const first = await cmdCreate(file, { name: "Original Plan" });
    expect(first.ok).toBe(true);
    expect((first.result as PlanWriteResult).plan.name).toBe("Original Plan");

    const second = await cmdCreate(file, { name: "Replaced Plan" });
    expect(second.ok).toBe(true);
    expect((second.result as PlanWriteResult).plan.name).toBe("Replaced Plan");

    const plan = loadPlan(file)!;
    expect(plan.name).toBe("Replaced Plan");
    expect(plan.previous_version).toBe(file + ".bak000");
    expect((second.result as PlanWriteResult).plan.previous_version).toBe(plan.previous_version);
    expect(loadPlan(plan.previous_version!)!.name).toBe("Original Plan");
  });

  it("re-create backs up the latest status and links it in the result and file", async () => {
    const file = planFile();
    await cmdCreate(file, { name: "Original", phases: [
      { id: "p1", name: "P1", steps: [{ id: "s1", name: "S1", prompt: "do" }] },
    ] });
    expect((await cmdUpdateStatus(file, "s1", "complete")).ok).toBe(true);
    const latest = fs.readFileSync(file, "utf8");
    const result = await cmdCreate(file, { name: "Replacement" });
    expect(result.ok).toBe(true);
    expect(result.result!.plan.previous_version).toBe(file + ".bak001");
    expect(loadPlan(file)!.previous_version).toBe(file + ".bak001");
    expect(fs.readFileSync(file + ".bak001", "utf8")).toBe(latest);
    expect(loadPlan(file + ".bak001")!.phases[0]!.steps[0]!.status).toBe("complete");
  });

  it("replaces corrupted content while preserving its exact bytes", async () => {
    const file = planFile();
    const corrupted = Buffer.from([0xff, 0x00, 0x7b, 0x0a]);
    fs.writeFileSync(file, corrupted);
    const result = await cmdCreate(file, { name: "Recovered" });
    expect(result.ok).toBe(true);
    expect(result.result!.plan.previous_version).toBe(file + ".bak000");
    expect(loadPlan(file)!.previous_version).toBe(file + ".bak000");
    expect(fs.readFileSync(file + ".bak000")).toEqual(corrupted);
  });

  it("a rejected re-create leaves the original file unchanged with no backup", async () => {
    const file = planFile();
    await cmdCreate(file, { name: "Keep" });
    const before = fs.readFileSync(file);
    const result = await cmdCreate(file, { name: "" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("size_limit_exceeded");
    expect(fs.readFileSync(file)).toEqual(before);
    expect(fs.readdirSync(tmpDir)).toEqual(["plan.json"]);
  });

  it("six re-creates retain only the newest backups", async () => {
    const file = planFile();
    await cmdCreate(file, { name: "v0" });
    for (let i = 1; i <= 6; i++) {
      expect((await cmdCreate(file, { name: `v${i}` })).ok).toBe(true);
    }
    const backups = fs.readdirSync(tmpDir).filter((name) => name.includes(".bak"));
    expect(backups).toHaveLength(PLAN_BACKUP_RETENTION);
    expect(backups).toEqual(Array.from({ length: PLAN_BACKUP_RETENTION }, (_, i) => `plan.json.bak00${i + 1}`));
    expect(loadPlan(file)!.previous_version).toBe(file + ".bak005");
    expect(loadPlan(file + ".bak001")!.name).toBe("v1");
  });

  it("waits for the lock and backs up a file created while waiting", async () => {
    const file = planFile();
    fs.mkdirSync(file + ".lock");
    const pending = cmdCreate(file, { name: "Second" });
    expect(fs.existsSync(file)).toBe(false);
    const first = '{"name":"First"}';
    fs.writeFileSync(file, first);
    fs.rmdirSync(file + ".lock");
    const result = await pending;
    expect(result.ok).toBe(true);
    expect(result.result!.plan.previous_version).toBe(file + ".bak000");
    expect(fs.readFileSync(file + ".bak000", "utf8")).toBe(first);
    expect(loadPlan(file)!.previous_version).toBe(file + ".bak000");
    expect(fs.existsSync(file + ".lock")).toBe(false);
  });
});
