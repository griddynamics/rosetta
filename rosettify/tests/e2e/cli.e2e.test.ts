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

function asEnvelope(r: SpawnResult): { ok: boolean; result: unknown; error: string | null } {
  return r.json as { ok: boolean; result: unknown; error: string | null };
}

// ---------------------------------------------------------------------------
// help command
// ---------------------------------------------------------------------------

describe("CLI — help command", () => {
  it("rosettify help returns top-level listing", () => {
    const r = run(["help"]);
    expect(r.status).toBe(0);
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    const res = env.result as { tool: string; version: string; commands: { name: string }[] };
    expect(res.tool).toBe("rosettify");
    expect(res.version).toBeDefined();
    expect(Array.isArray(res.commands)).toBe(true);
  });

  it("rosettify help plan returns plan detail with subcommands", () => {
    const r = run(["help", "plan"]);
    expect(r.status).toBe(0);
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    const res = env.result as { name: string; subcommands: { name: string }[] };
    expect(res.name).toBe("plan");
    expect(Array.isArray(res.subcommands)).toBe(true);
    const subNames = res.subcommands.map((s) => s.name);
    expect(subNames).toContain("create");
    expect(subNames).toContain("next");
  });

  it("rosettify --help returns top-level help", () => {
    const r = run(["--help"]);
    expect(r.status).toBe(0);
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    const res = env.result as { tool: string };
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
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    // planHelpContent must contain all required guidance fields (FR-PLAN-0022)
    const res = env.result as {
      plan_file?: unknown;
      concepts?: unknown;
      schema?: unknown;
      limits?: unknown;
      next_steps_for_ai?: unknown;
      plan_authoring_guidance?: unknown;
      subcommands?: unknown[];
    };
    expect(res).toBeDefined();
    expect(res.plan_file).toBeDefined();
    expect(res.concepts).toBeDefined();
    expect(res.schema).toBeDefined();
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
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    const res = env.result as { name: string; status: string; plan_file: string };
    expect(res.name).toBe("CLI Test Plan");
    expect(res.status).toBe("open");
    expect(res.plan_file).toBe(file);
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

  it("returns ready steps and exits 0", () => {
    const file = planFile();
    createPlan(file);
    const r = run(["plan", "next", file]);
    expect(r.status).toBe(0);
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    const res = env.result as { ready: { id: string }[]; count: number };
    expect(Array.isArray(res.ready)).toBe(true);
    expect(res.ready[0]!.id).toBe("s1");
    expect(res.count).toBe(1);
  });

  it("returns plan_not_found and exits 1 for missing file", () => {
    const r = run(["plan", "next", "/tmp/nonexistent-cli-next.json"]);
    expect(r.status).toBe(1);
    const env = asEnvelope(r);
    expect(env.ok).toBe(false);
    expect(env.error).toBe("plan_not_found");
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
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    const res = env.result as { name: string; status: string };
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
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
    const res = env.result as { id: string; status: string; plan_status: string };
    expect(res.id).toBe("s1");
    expect(res.status).toBe("complete");
    expect(res.plan_status).toBe("complete");
  });

  it("returns error and exits 1 for invalid status", () => {
    const file = createAndGetFile();
    const r = run(["plan", "update_status", file, "s1", "invalid-status"]);
    expect(r.status).toBe(1);
    const env = asEnvelope(r);
    expect(env.ok).toBe(false);
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
    const env = asEnvelope(r);
    expect(env.ok).toBe(false);
    expect(env.error).toContain("unknown_command");
  });

  it("plan --help returns plan detail", () => {
    const r = run(["plan", "--help"]);
    expect(r.status).toBe(0);
    const env = asEnvelope(r);
    expect(env.ok).toBe(true);
  });
});
