/**
 * Unit tests for plan/index.ts runPlan dispatch function.
 * Targets the branch coverage gaps from the coverage report.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { planToolDef } from "../../../src/commands/plan/index.js";
import { savePlan } from "../../../src/commands/plan/core.js";
import { fullPlan } from "../../fixtures/plans.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-index-"));
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

describe("planToolDef.run — no subcommand returns help", () => {
  it("returns planHelpContent when subcommand is missing", async () => {
    const result = await planToolDef.run({});
    expect(result.ok).toBe(true);
    const res = result.result as { subcommands?: unknown[] };
    expect(Array.isArray(res.subcommands)).toBe(true);
    // FR-PLAN-0016 — help has 9 subcommand entries
    expect((res.subcommands as unknown[]).length).toBe(9);
  });
});

describe("planToolDef.run — missing plan_file guard", () => {
  it("returns error for create without plan_file", async () => {
    const result = await planToolDef.run({ subcommand: "create", data: { name: "x" } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });

  it("returns error for next without plan_file", async () => {
    const result = await planToolDef.run({ subcommand: "next" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });

  it("returns error for update_status without plan_file", async () => {
    const result = await planToolDef.run({ subcommand: "update_status" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });

  it("returns error for show_status without plan_file", async () => {
    const result = await planToolDef.run({ subcommand: "show_status" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });

  it("returns error for query without plan_file", async () => {
    const result = await planToolDef.run({ subcommand: "query" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });

  it("returns error for upsert without plan_file", async () => {
    const result = await planToolDef.run({ subcommand: "upsert", data: { name: "x" } });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });
});

describe("planToolDef.run — missing data guard", () => {
  it("returns missing_data for create without data", async () => {
    const file = planFile();
    const result = await planToolDef.run({ subcommand: "create", plan_file: file });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_data");
  });

  it("returns missing_data for upsert without data", async () => {
    const file = writePlan();
    const result = await planToolDef.run({ subcommand: "upsert", plan_file: file, target_id: "entire_plan" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_data");
  });
});

describe("planToolDef.run — missing guards for update_status", () => {
  it("returns error when target_id missing", async () => {
    const file = writePlan();
    const result = await planToolDef.run({ subcommand: "update_status", plan_file: file });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing target_id");
  });

  it("returns error when new_status missing", async () => {
    const file = writePlan();
    const result = await planToolDef.run({ subcommand: "update_status", plan_file: file, target_id: "s1" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_new_status");
  });
});

describe("planToolDef.run — data as object (non-string)", () => {
  it("accepts data as an object for create", async () => {
    const file = planFile();
    const result = await planToolDef.run({
      subcommand: "create",
      plan_file: file,
      data: { name: "Object Data Plan" },
    });
    expect(result.ok).toBe(true);
  });

  it("accepts data as an object for upsert", async () => {
    const file = writePlan();
    const result = await planToolDef.run({
      subcommand: "upsert",
      plan_file: file,
      target_id: "entire_plan",
      data: { description: "updated via object" },
    });
    expect(result.ok).toBe(true);
  });
});

describe("planToolDef.run — full subcommand happy paths", () => {
  it("next returns ready steps", async () => {
    const file = writePlan();
    const result = await planToolDef.run({ subcommand: "next", plan_file: file });
    expect(result.ok).toBe(true);
    const res = result.result as { ready: unknown[]; count: number };
    expect(typeof res.count).toBe("number");
  });

  it("show_status returns plan summary", async () => {
    const file = writePlan();
    const result = await planToolDef.run({ subcommand: "show_status", plan_file: file });
    expect(result.ok).toBe(true);
    const res = result.result as { name: string };
    expect(res.name).toBe("Test Plan");
  });

  it("query returns plan data", async () => {
    const file = writePlan();
    const result = await planToolDef.run({ subcommand: "query", plan_file: file });
    expect(result.ok).toBe(true);
  });

  it("update_status updates step", async () => {
    const file = writePlan();
    const result = await planToolDef.run({
      subcommand: "update_status",
      plan_file: file,
      target_id: "s1",
      new_status: "complete",
    });
    expect(result.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0023 — unknown subcommand message lists ALL 9 valid subcommands
// ---------------------------------------------------------------------------

describe("planToolDef.run — unknown subcommand lists all 9 (FR-PLAN-0023)", () => {
  it("unknown_command message includes all 3 new subcommands", async () => {
    const result = await planToolDef.run({ subcommand: "totally_bogus" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("create-with-template");
    expect(result.error).toContain("upsert-with-template");
    expect(result.error).toContain("list-templates");
  });

  it("unknown_command message lists all original 6 subcommands too", async () => {
    const result = await planToolDef.run({ subcommand: "totally_bogus" });
    expect(result.error).toContain("create");
    expect(result.error).toContain("next");
    expect(result.error).toContain("update_status");
    expect(result.error).toContain("show_status");
    expect(result.error).toContain("query");
    expect(result.error).toContain("upsert");
  });
});

// ---------------------------------------------------------------------------
// FR-PLAN-0030 / FR-PLAN-0031 / FR-PLAN-0032 — new subcommand guards
// ---------------------------------------------------------------------------

describe("planToolDef.run — missing plan_file guard for new subcommands", () => {
  it("returns error for create-with-template without plan_file", async () => {
    const result = await planToolDef.run({
      subcommand: "create-with-template",
      template: "for-orchestrator",
      "plan-name": "X",
      "plan-description": "Y",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });

  it("returns error for upsert-with-template without plan_file", async () => {
    const result = await planToolDef.run({
      subcommand: "upsert-with-template",
      "phase-id": "ph-impl",
      template: "for-subagent",
      "phase-name": "Impl",
      "phase-description": "desc",
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing plan_file");
  });
});

describe("planToolDef.run — list-templates needs no plan_file", () => {
  it("list-templates returns catalog without plan_file", async () => {
    const result = await planToolDef.run({ subcommand: "list-templates" });
    expect(result.ok).toBe(true);
    const catalog = result.result as { create: unknown[]; upsert: unknown[] };
    expect(Array.isArray(catalog.create)).toBe(true);
    expect(Array.isArray(catalog.upsert)).toBe(true);
  });
});
