/**
 * CLI E2E tests — spawns the built rosettify binary as a subprocess.
 *
 * Requires: npm run build must have been run first.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../");
const BIN = path.join(REPO_ROOT, "dist/bin/rosettify.js");
const NODE = process.execPath;

let tmpDir: string;

beforeAll(() => {
  if (!fs.existsSync(BIN)) {
    throw new Error(`Binary not found: ${BIN}. Run 'npm run build --prefix rosettify' first.`);
  }
});

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-e2e-cli-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

interface SpawnResult {
  stdout: string;
  stderr: string;
  status: number | null;
  json: unknown;
}

function run(args: string[]): SpawnResult {
  const result = spawnSync(NODE, [BIN, ...args], { encoding: "utf8", timeout: 15000 });
  let json: unknown = null;
  const out = result.stdout ?? "";
  try {
    json = JSON.parse(out);
  } catch {
    // not JSON — that's ok for some cases
  }
  return {
    stdout: out,
    stderr: result.stderr ?? "",
    status: result.status,
    json,
  };
}

// ---------------------------------------------------------------------------
// help command
// ---------------------------------------------------------------------------

describe("CLI — help command", () => {
  it("rosettify help returns top-level listing", () => {
    const r = run(["help"]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly (no envelope wrapper)
    expect((r.json as any).ok).toBeUndefined();
    expect((r.json as any).include_help).toBeUndefined();
    const res = r.json as { tool: string; version: string; commands: { name: string }[] };
    expect(res.tool).toBe("rosettify");
    expect(res.version).toBeDefined();
    expect(Array.isArray(res.commands)).toBe(true);
  });

  it("rosettify help plan returns plan detail with subcommands", () => {
    const r = run(["help", "plan"]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { name: string; subcommands: { name: string }[] };
    expect(res.name).toBe("plan");
    expect(Array.isArray(res.subcommands)).toBe(true);
    const subNames = res.subcommands.map((s) => s.name);
    expect(subNames).toContain("create");
    expect(subNames).toContain("next");
  });

  it("rosettify --help returns top-level help", () => {
    const r = run(["--help"]);
    expect(r.status).toBe(0);
    const res = r.json as { tool: string };
    expect(res.tool).toBe("rosettify");
  });
});

// ---------------------------------------------------------------------------
// plan — no args (show help)
// ---------------------------------------------------------------------------

describe("CLI — plan no args", () => {
  it("rosettify plan returns plan help content", () => {
    const r = run(["plan"]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly (no envelope wrapper)
    expect((r.json as any).ok).toBeUndefined();
    expect((r.json as any).include_help).toBeUndefined();
    // planHelpContent must contain all required guidance fields (FR-PLAN-0022)
    const res = r.json as {
      plan_file?: unknown;
      concepts?: unknown;
      schemas?: unknown;
      limits?: unknown;
      next_steps_for_ai?: unknown;
      plan_authoring_guidance?: unknown;
      subcommands?: unknown[];
    };
    expect(res).toBeDefined();
    expect(res.plan_file).toBeDefined();
    expect(res.concepts).toBeDefined();
    expect(res.schemas).toBeDefined();
    expect(res.limits).toBeDefined();
    expect(res.next_steps_for_ai).toBeDefined();
    expect(res.plan_authoring_guidance).toBeDefined();
    expect(Array.isArray(res.subcommands)).toBe(true);
    expect(res.subcommands!.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// plan create
// ---------------------------------------------------------------------------

describe("CLI — plan create", () => {
  it("creates a plan file and exits 0", () => {
    const file = planFile();
    const data = JSON.stringify({ name: "CLI Test Plan" });
    const r = run(["plan", "create", file, data]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly (compressed-tree shape)
    expect((r.json as any).ok).toBeUndefined();
    expect((r.json as any).include_help).toBeUndefined();
    const res = r.json as { plan: { name: string; status: string; previous_version: unknown }; phases: unknown[] };
    expect(res.plan.name).toBe("CLI Test Plan");
    expect(res.plan.status).toBe("open");
    // FR-PLAN-0040 — previous_version=null on first create (FR-PLAN-0010)
    expect(res.plan.previous_version).toBeNull();
    // No previous_version at result root level
    expect((res as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Array.isArray(res.phases)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("exits 1 when data is missing", () => {
    const file = planFile();
    const r = run(["plan", "create", file]);
    // Commander will error about missing argument
    expect(r.status).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// plan next
// ---------------------------------------------------------------------------

describe("CLI — plan next", () => {
  function createPlan(file: string): void {
    const data = JSON.stringify({
      name: "Next Test",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          steps: [{ id: "s1", name: "Step 1", prompt: "Do it" }],
        },
      ],
    });
    run(["plan", "create", file, data]);
  }

  function createPlanWithManySteps(file: string): void {
    const steps = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i + 1}`,
      name: `Step ${i + 1}`,
      prompt: `Do step ${i + 1}`,
    }));
    const data = JSON.stringify({
      name: "Many Steps Test",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          steps,
        },
      ],
    });
    run(["plan", "create", file, data]);
  }

  it("returns steps and exits 0", () => {
    const file = planFile();
    createPlan(file);
    const r = run(["plan", "next", file]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { next: { id: string }[]; count: number };
    expect(Array.isArray(res.next)).toBe(true);
    expect(res.next[0]!.id).toBe("s1");
    expect(res.count).toBe(1);
  });

  it("returns plan_not_found and exits 1 for missing file", () => {
    const r = run(["plan", "next", "/tmp/nonexistent-cli-next.json"]);
    expect(r.status).toBe(1);
    // Failure: r.json IS the error payload {error: "..."}
    expect((r.json as any).ok).toBeUndefined();
    const payload = r.json as { error: string };
    expect(payload.error).toBe("plan_not_found");
  });

  it("next <file> with >3 actionable steps returns exactly 3 (default is 3, not 10)", () => {
    const file = planFile();
    createPlanWithManySteps(file);
    const r = run(["plan", "next", file]);
    expect(r.status).toBe(0);
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { next: unknown[]; count: number };
    expect(res.count).toBe(3);
    expect(res.next.length).toBe(3);
  });

  it("next <file> 2 (positional) returns 2", () => {
    const file = planFile();
    createPlanWithManySteps(file);
    const r = run(["plan", "next", file, "2"]);
    expect(r.status).toBe(0);
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { next: unknown[]; count: number };
    expect(res.count).toBe(2);
    expect(res.next.length).toBe(2);
  });

  it("next <file> --limit 2 (hidden flag) returns 2", () => {
    const file = planFile();
    createPlanWithManySteps(file);
    const r = run(["plan", "next", file, "--limit", "2"]);
    expect(r.status).toBe(0);
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { next: unknown[]; count: number };
    expect(res.count).toBe(2);
    expect(res.next.length).toBe(2);
  });

  it("next <file> 2 --limit 5 (both given) positional wins: returns 2", () => {
    const file = planFile();
    createPlanWithManySteps(file);
    const r = run(["plan", "next", file, "2", "--limit", "5"]);
    expect(r.status).toBe(0);
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { next: unknown[]; count: number };
    expect(res.count).toBe(2);
    expect(res.next.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// plan show_status
// ---------------------------------------------------------------------------

describe("CLI — plan show_status", () => {
  function createPlan(file: string): void {
    const data = JSON.stringify({
      name: "Status Test",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          steps: [{ id: "s1", name: "Step 1", prompt: "Do it" }],
        },
      ],
    });
    run(["plan", "create", file, data]);
  }

  it("returns status summary and exits 0", () => {
    const file = planFile();
    createPlan(file);
    const r = run(["plan", "show_status", file]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { name: string; status: string };
    expect(res.name).toBe("Status Test");
    expect(res.status).toBe("open");
  });
});

// ---------------------------------------------------------------------------
// plan update_status
// ---------------------------------------------------------------------------

describe("CLI — plan update_status", () => {
  function createAndGetFile(): string {
    const file = planFile();
    const data = JSON.stringify({
      name: "Update Test",
      phases: [
        {
          id: "p1",
          name: "Phase 1",
          description: "",
          steps: [{ id: "s1", name: "Step 1", prompt: "Do it" }],
        },
      ],
    });
    run(["plan", "create", file, data]);
    return file;
  }

  it("updates step status and exits 0", () => {
    const file = createAndGetFile();
    const r = run(["plan", "update_status", file, "s1", "complete"]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { id: string; status: string; plan_status: string };
    expect(res.id).toBe("s1");
    expect(res.status).toBe("complete");
    expect(res.plan_status).toBe("complete");
  });

  it("returns error and exits 1 for invalid status", () => {
    const file = createAndGetFile();
    const r = run(["plan", "update_status", file, "s1", "invalid-status"]);
    expect(r.status).toBe(1);
    // Failure: r.json IS the error payload {error: "..."}
    expect((r.json as any).ok).toBeUndefined();
    const payload = r.json as { error: string };
    expect(typeof payload.error).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// plan list-templates (FR-PLAN-0032)
// ---------------------------------------------------------------------------

describe("CLI — plan list-templates (FR-PLAN-0032)", () => {
  it("returns template catalog without plan_file and exits 0", () => {
    const r = run(["plan", "list-templates"]);
    expect(r.status).toBe(0);
    // FR-SHRD-0008 — densest JSON: stdout trimmed must equal JSON.stringify(parsed) exactly.
    // Catches ANY indentation (spaces, tabs, multi-space) — the previous .not.toContain("\n  ")
    // assertion would have missed tab or 4-space indents. Stdout has a trailing newline from
    // the CLI's println; rtrim before comparing, but assert no INTERNAL newlines.
    expect(r.stdout.trim()).toBe(JSON.stringify(r.json));
    expect(r.stdout.trimEnd()).not.toContain("\n");
    expect((r.json as any).ok).toBeUndefined();
    const catalog = r.json as { create: { name: string; brief: string; placeholders: string[] }[]; upsert: { name: string; brief: string; placeholders: string[] }[] };
    expect(Array.isArray(catalog.create)).toBe(true);
    expect(Array.isArray(catalog.upsert)).toBe(true);
    const createNames = catalog.create.map((e) => e.name);
    const upsertNames = catalog.upsert.map((e) => e.name);
    expect(createNames).toContain("for-orchestrator");
    expect(upsertNames).toContain("for-subagent");
  });

  it("each catalog entry has name, brief, and placeholders", () => {
    const r = run(["plan", "list-templates"]);
    expect(r.status).toBe(0);
    const catalog = r.json as { create: unknown[]; upsert: unknown[] };
    for (const entry of [...catalog.create, ...catalog.upsert]) {
      const e = entry as { name: string; brief: string; placeholders: string[] };
      expect(typeof e.name).toBe("string");
      expect(typeof e.brief).toBe("string");
      expect(Array.isArray(e.placeholders)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// plan create-with-template (FR-PLAN-0030)
// ---------------------------------------------------------------------------

describe("CLI — plan create-with-template (FR-PLAN-0030)", () => {
  it("creates a plan file from for-orchestrator template and exits 0", () => {
    const file = planFile();
    // CLI positional args: create-with-template <plan_file> <template> <plan-name> <plan-description>
    const r = run([
      "plan", "create-with-template", file,
      "for-orchestrator", "CLI Template Plan", "Created via template",
    ]);
    expect(r.status).toBe(0);
    // Success: dense JSON output (FR-SHRD-0008) — single line (no trailing newline in payload JSON)
    expect((r.json as any).ok).toBeUndefined();
    // Result is PlanWriteResult: {plan, phases}
    const tree = r.json as { plan: { name: string; status: string; previous_version: unknown }; phases: unknown[] };
    expect(tree.plan.name).toBe("CLI Template Plan");
    expect(tree.plan.status).toBe("open");
    // FR-PLAN-0040 — previous_version=null on first create (FR-PLAN-0010)
    expect(tree.plan.previous_version).toBeNull();
    // No previous_version at result root level
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Array.isArray(tree.phases)).toBe(true);
    // Plan file is created on disk
    expect(fs.existsSync(file)).toBe(true);
    // .bak* files should NOT exist yet (first write)
    const bakFiles = fs.readdirSync(path.dirname(file)).filter((f) => f.includes(".bak"));
    expect(bakFiles.length).toBe(0);
  });

  it("placeholder substitution: plan-name appears in file on disk", () => {
    const file = planFile();
    run(["plan", "create-with-template", file, "for-orchestrator", "SubstTest", "desc"]);
    const raw = fs.readFileSync(file, "utf8");
    expect(raw).toContain("SubstTest");
  });

  it("returns error for unknown template name", () => {
    const file = planFile();
    const r = run(["plan", "create-with-template", file, "no-such-template", "X", "Y"]);
    expect(r.status).toBe(1);
    const payload = r.json as { error: string };
    expect(payload.error).toContain("invalid_template");
  });
});

// ---------------------------------------------------------------------------
// plan upsert-with-template (FR-PLAN-0031)
// ---------------------------------------------------------------------------

describe("CLI — plan upsert-with-template (FR-PLAN-0031)", () => {
  function createBasePlan(file: string): void {
    const data = JSON.stringify({ name: "Template Upsert Base" });
    run(["plan", "create", file, data]);
  }

  it("upserts phases from for-subagent template and exits 0", () => {
    const file = planFile();
    createBasePlan(file);
    // CLI positional args: upsert-with-template <plan_file> <phase-id> <template> <phase-name> <phase-description>
    const r = run([
      "plan", "upsert-with-template", file,
      "ph-impl", "for-subagent", "Implementation", "Implement features",
    ]);
    expect(r.status).toBe(0);
    expect((r.json as any).ok).toBeUndefined();
    // Result is PlanWriteResult: {plan, phases}
    const tree = r.json as { plan: { name: string; status: string; previous_version: unknown }; phases: unknown[] };
    expect(tree.plan).toBeDefined();
    // FR-PLAN-0040 — result.plan.previous_version is the backup path (non-null after write)
    expect(tree.plan.previous_version).not.toBeNull();
    // No previous_version at result root level
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Array.isArray(tree.phases)).toBe(true);
    // .bak* file exists on disk (FR-PLAN-0031 atomic write cycle)
    const dir = path.dirname(file);
    const base = path.basename(file);
    const bakFiles = fs.readdirSync(dir).filter((f) => f.startsWith(base + ".bak"));
    expect(bakFiles.length).toBeGreaterThan(0);
  });

  it("placeholder substitution: phase-id appears in plan on disk", () => {
    const file = planFile();
    createBasePlan(file);
    run(["plan", "upsert-with-template", file, "ph-test", "for-subagent", "Testing", "Run all tests"]);
    const raw = fs.readFileSync(file, "utf8");
    expect(raw).toContain("ph-test");
  });

  it("returns error for unknown template name", () => {
    const file = planFile();
    createBasePlan(file);
    const r = run(["plan", "upsert-with-template", file, "ph-x", "no-such-template", "X", "Y"]);
    expect(r.status).toBe(1);
    const payload = r.json as { error: string };
    expect(payload.error).toContain("invalid_template");
  });
});

// ---------------------------------------------------------------------------
// error cases
// ---------------------------------------------------------------------------

describe("CLI — error cases", () => {
  it("exits 1 for unknown command", () => {
    const r = run(["unknown-command-xyz"]);
    expect(r.status).toBe(1);
  });

  it("exits 1 for unknown plan subcommand", () => {
    const r = run(["plan", "badsubcmd"]);
    expect(r.status).toBe(1);
    // Failure: r.json IS the error payload {error: "..."}
    expect((r.json as any).ok).toBeUndefined();
    const payload = r.json as { error: string };
    expect(payload.error).toContain("unknown_command");
  });

  it("plan --help returns plan detail", () => {
    const r = run(["plan", "--help"]);
    expect(r.status).toBe(0);
    // Success: r.json IS the result payload directly (no envelope)
    expect((r.json as any).ok).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Multi-process concurrent writers (FR-PLAN-0024, FR-PLAN-0025)
// ---------------------------------------------------------------------------

// FR-PLAN-0025 / FR-PLAN-0024 acceptance: parallel writers must not lose data.
// This regression test exists because earlier implementations using POSIX rename
// (overwrite semantics) and hardlink-claim (no exclusion across the read-mutate-write
// window) both exhibited lost writes under real multi-process load (verified at 30
// and 50 concurrent CLI invocations). The mkdir-lock implementation passes; this
// test asserts that contract end-to-end through the actual binary.
describe("CLI — concurrent writers (FR-PLAN-0024 / FR-PLAN-0025)", () => {
  // 10 concurrent processes is enough to surface the bug consistently; the unit-style
  // suite covers single-process write-cycle paths.
  it("10 concurrent upsert-with-template processes against one plan: no lost writes", async () => {
    const N = 10;
    const file = planFile("concurrent.json");

    // Seed plan first (sequential, single process).
    const seed = run(["plan", "create-with-template", file, "for-orchestrator", "Concurrent", "MPP test"]);
    expect(seed.status).toBe(0);

    // Spawn N processes in parallel via Node child_process.spawn (non-blocking).
    const { spawn } = await import("child_process");
    const exitCodes: number[] = await Promise.all(
      Array.from({ length: N }, (_, i) => {
        const phaseId = `ph-mpp-${i + 1}`;
        const args = [BIN, "plan", "upsert-with-template", file, phaseId, "for-subagent", `Phase ${i + 1}`, `Worker ${i + 1}`];
        return new Promise<number>((resolve) => {
          const child = spawn(NODE, args, { stdio: "pipe" });
          child.on("close", (code) => resolve(code ?? -1));
        });
      }),
    );

    // Every process must report success — the FR-PLAN-0024 cycle has 50 retries so contention alone
    // cannot exhaust it at N=10.
    expect(exitCodes.every((c) => c === 0)).toBe(true);

    // Final plan must be valid JSON.
    const finalPlan = JSON.parse(fs.readFileSync(file, "utf8"));

    // Every successfully-reported upsert MUST be present in the final plan (no silent loss).
    const phaseIds = new Set(finalPlan.phases.map((p: { id: string }) => p.id));
    for (let i = 1; i <= N; i++) {
      const id = `ph-mpp-${i}`;
      expect(phaseIds.has(id), `lost write: ${id} reported success but not in final plan`).toBe(true);
    }

    // Retention enforced (default 5): at most 5 .bak* files remain in the same directory.
    const bakFiles = fs
      .readdirSync(path.dirname(file))
      .filter((name) => name.startsWith(path.basename(file) + ".bak"));
    expect(bakFiles.length).toBeLessThanOrEqual(5);

    // Every retained bak file is valid JSON (no corruption mid-write).
    for (const bak of bakFiles) {
      const bakPath = path.join(path.dirname(file), bak);
      expect(() => JSON.parse(fs.readFileSync(bakPath, "utf8"))).not.toThrow();
    }

    // No leftover lock directory.
    expect(fs.existsSync(file + ".lock")).toBe(false);
  }, 60_000);
});
