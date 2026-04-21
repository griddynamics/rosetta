/**
 * Unit tests for cmdCreate (FR-PLAN-0010).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdCreate } from "../../../src/commands/plan/create.js";
import { loadPlan } from "../../../src/commands/plan/core.js";

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

describe("cmdCreate", () => {
  it("creates a minimal plan file", async () => {
    const file = planFile();
    const result = await cmdCreate(file, { name: "My Plan" });
    expect(result.ok).toBe(true);
    expect(result.result!.name).toBe("My Plan");
    expect(result.result!.status).toBe("open");
    expect(result.result!.plan_file).toBe(file);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("creates plan with phases and steps", async () => {
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
    expect(result.result!.name).toBe("Unnamed Plan");
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

  it("sets timestamps", async () => {
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
    await cmdCreate(file, data);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.status).toBe("open");
    expect(plan.status).toBe("open");
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
          // no 'steps' field — triggers the false branch of Array.isArray(p["steps"])
        },
      ],
    };
    const result = await cmdCreate(file, data);
    expect(result.ok).toBe(true);
    const plan = loadPlan(file)!;
    expect(plan.phases[0]!.steps).toEqual([]);
  });

  it("internal_error: returns internal_error for non-Error thrown", async () => {
    // Simulate an uncaught throw by using an invalid path that causes mkdir to fail
    // Actually easier: mock savePlan to throw by writing a directory at the path
    const dirPath = path.join(tmpDir, "dir-not-file");
    fs.mkdirSync(dirPath, { recursive: true });
    // savePlan will try to write a file at dirPath (which is a directory) and throw
    const result = await cmdCreate(dirPath, { name: "Fail" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("internal_error");
  });

  it("idempotent: second create overwrites with new name (NFR-REL-0002)", async () => {
    const file = planFile();

    // First call: create the plan
    const first = await cmdCreate(file, { name: "Original Plan" });
    expect(first.ok).toBe(true);
    expect(first.result!.name).toBe("Original Plan");

    // Second call: overwrite with a different name
    const second = await cmdCreate(file, { name: "Replaced Plan" });
    expect(second.ok).toBe(true);
    expect(second.result!.name).toBe("Replaced Plan");

    // File should reflect the new name
    const plan = loadPlan(file)!;
    expect(plan.name).toBe("Replaced Plan");
  });
});
