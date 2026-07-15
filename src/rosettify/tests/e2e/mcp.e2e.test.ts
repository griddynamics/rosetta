/**
 * MCP E2E tests — spawns rosettify --mcp as a subprocess and communicates
 * via JSON-RPC 2.0 over stdio (newline-delimited).
 *
 * Pattern modelled after src/ims-mcp-server/validation/verify_mcp.py.
 *
 * Requires: npm run build must have been run first.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { spawn, ChildProcess } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../");
const BIN = path.join(REPO_ROOT, "dist/bin/rosettify.js");
const NODE = process.execPath;

// ---------------------------------------------------------------------------
// MCP stdio client harness
// ---------------------------------------------------------------------------

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

class McpClient {
  private proc: ChildProcess;
  private _idCounter = 1;
  private pendingLines: string[] = [];
  private lineWaiters: Array<(line: string) => void> = [];
  private rl: ReturnType<typeof createInterface>;

  constructor() {
    this.proc = spawn(NODE, [BIN, "--mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.rl = createInterface({ input: this.proc.stdout! });
    this.rl.on("line", (line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const waiter = this.lineWaiters.shift();
      if (waiter) {
        waiter(trimmed);
      } else {
        this.pendingLines.push(trimmed);
      }
    });
  }

  private nextLine(timeoutMs = 10000): Promise<string> {
    if (this.pendingLines.length > 0) {
      return Promise.resolve(this.pendingLines.shift()!);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.lineWaiters.indexOf(resolve);
        if (idx >= 0) this.lineWaiters.splice(idx, 1);
        reject(new Error("MCP response timeout"));
      }, timeoutMs);
      this.lineWaiters.push((line) => {
        clearTimeout(timer);
        resolve(line);
      });
    });
  }

  async send(method: string, params: unknown = {}): Promise<JsonRpcResponse> {
    const id = this._idCounter++;
    const request = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    this.proc.stdin!.write(request + "\n");
    const raw = await this.nextLine();
    return JSON.parse(raw) as JsonRpcResponse;
  }

  async initialize(): Promise<void> {
    // Send initialize request
    const resp = await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "0.0.1" },
    });
    if (resp.error) {
      throw new Error(`initialize failed: ${resp.error.message}`);
    }
    // Send initialized notification (no id, no response expected)
    this.proc.stdin!.write(
      JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n",
    );
  }

  async listTools(): Promise<{ name: string; description: string }[]> {
    const resp = await this.send("tools/list", {});
    if (resp.error) throw new Error(`tools/list failed: ${resp.error.message}`);
    const r = resp.result as { tools: { name: string; description: string }[] };
    return r.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<{
    content: { type: string; text: string }[];
    isError: boolean;
    payload: unknown;
  }> {
    const resp = await this.send("tools/call", { name, arguments: args });
    if (resp.error) {
      // Return it as an error-level response for assertion
      return {
        content: [],
        isError: true,
        payload: { error: resp.error.message },
      };
    }
    const r = resp.result as { content: { type: string; text: string }[]; isError: boolean };
    const payload = JSON.parse(r.content[0]!.text) as unknown;
    return { content: r.content, isError: r.isError, payload };
  }

  kill(): void {
    this.rl.close();
    this.proc.kill();
  }
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

let client: McpClient;
let tmpDir: string;

beforeAll(() => {
  if (!fs.existsSync(BIN)) {
    throw new Error(`Binary not found: ${BIN}. Run 'npm run build --prefix rosettify' first.`);
  }
});

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-e2e-mcp-"));
  client = new McpClient();
  await client.initialize();
});

afterEach(() => {
  client.kill();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

// ---------------------------------------------------------------------------
// tools/list
// ---------------------------------------------------------------------------

describe("MCP — tools/list", () => {
  it("returns plan and help tools", async () => {
    const tools = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("plan");
    expect(names).toContain("help");
  });

  it("each tool has name and description", async () => {
    const tools = await client.listTools();
    for (const t of tools) {
      expect(typeof t.name).toBe("string");
      expect(typeof t.description).toBe("string");
    }
  });
});

// ---------------------------------------------------------------------------
// tools/call — help
// ---------------------------------------------------------------------------

describe("MCP — help tool", () => {
  it("help with no args returns top-level listing", async () => {
    const { payload, isError } = await client.callTool("help", {});
    expect(isError).toBe(false);
    // Success: payload IS the result directly — no ok/envelope wrapper
    expect((payload as any).ok).toBeUndefined();
    const r = payload as { tool: string; version: string; commands: { name: string }[] };
    expect(r.tool).toBe("rosettify");
    expect(Array.isArray(r.commands)).toBe(true);
  });

  it("help with subcommand=plan returns plan detail with subcommands", async () => {
    const { payload, isError } = await client.callTool("help", { subcommand: "plan" });
    expect(isError).toBe(false);
    const r = payload as { name: string; subcommands: { name: string }[] };
    expect(r.name).toBe("plan");
    expect(Array.isArray(r.subcommands)).toBe(true);
    const subNames = r.subcommands.map((s) => s.name);
    expect(subNames).toContain("create");
    expect(subNames).toContain("next");
    expect(subNames).toContain("update_status");
    expect(subNames).toContain("show_status");
    expect(subNames).toContain("query");
    expect(subNames).toContain("upsert");
  });
});

// ---------------------------------------------------------------------------
// tools/call — plan lifecycle
// ---------------------------------------------------------------------------

describe("MCP — plan lifecycle", () => {
  it("create → next → show_status → update_status → query → upsert", async () => {
    const file = planFile();

    // 1. create
    const createRes = await client.callTool("plan", {
      subcommand: "create",
      plan_file: file,
      data: {
        name: "MCP E2E Plan",
        description: "Full lifecycle test",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "First phase",
            steps: [
              { id: "s1", name: "Step 1", prompt: "Do step 1" },
              { id: "s2", name: "Step 2", prompt: "Do step 2", depends_on: ["s1"] },
            ],
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "Second phase",
            depends_on: ["p1"],
            steps: [{ id: "s3", name: "Step 3", prompt: "Do step 3", depends_on: ["s1"] }],
          },
        ],
      },
    });
    expect(createRes.isError).toBe(false);
    // Success: payload IS the result directly (compressed-tree shape, no ok wrapper)
    expect((createRes.payload as any).ok).toBeUndefined();
    const created = createRes.payload as { plan: { name: string; status: string; previous_version: unknown }; phases: unknown[] };
    expect(created.plan.name).toBe("MCP E2E Plan");
    expect(created.plan.status).toBe("open");
    // FR-PLAN-0040 — previous_version=null on first create (FR-PLAN-0010)
    expect(created.plan.previous_version).toBeNull();
    // No previous_version at result root level
    expect((created as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Array.isArray(created.phases)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);

    // 2. next — phase 1 active, s1 should be actionable
    const nextRes = await client.callTool("plan", { subcommand: "next", plan_file: file });
    expect(nextRes.isError).toBe(false);
    const nextResult = nextRes.payload as { next: { id: string }[]; count: number };
    expect(nextResult.next.some((s) => s.id === "s1")).toBe(true);
    expect(nextResult.next.some((s) => s.id === "s3")).toBe(false); // phase 2 blocked

    // 3. show_status
    const showRes = await client.callTool("plan", { subcommand: "show_status", plan_file: file });
    expect(showRes.isError).toBe(false);
    const showResult = showRes.payload as { name: string; status: string; steps: { total: number } };
    expect(showResult.name).toBe("MCP E2E Plan");
    expect(showResult.steps.total).toBe(3);

    // 4. update_status s1 → complete
    const upd1 = await client.callTool("plan", {
      subcommand: "update_status",
      plan_file: file,
      target_id: "s1",
      new_status: "complete",
    });
    expect(upd1.isError).toBe(false);
    const upd1Result = upd1.payload as { id: string; status: string };
    expect(upd1Result.status).toBe("complete");

    // 5. update_status s2 → complete (so phase 1 completes)
    const upd2 = await client.callTool("plan", {
      subcommand: "update_status",
      plan_file: file,
      target_id: "s2",
      new_status: "complete",
    });
    expect(upd2.isError).toBe(false);
    const upd2Result = upd2.payload as { plan_status: string };
    // Phase 1 complete now, phase 2 should become active
    expect(["in_progress", "open"]).toContain(upd2Result.plan_status);

    // 6. next — phase 2 now active, s3 should be actionable (s1 dep complete)
    const nextRes2 = await client.callTool("plan", { subcommand: "next", plan_file: file });
    expect(nextRes2.isError).toBe(false);
    const nr2 = nextRes2.payload as { next: { id: string }[] };
    expect(nr2.next.some((s) => s.id === "s3")).toBe(true);

    // 7. query — full plan
    const qRes = await client.callTool("plan", { subcommand: "query", plan_file: file });
    expect(qRes.isError).toBe(false);
    const qResult = qRes.payload as { name: string; phases: { id: string }[] };
    expect(qResult.name).toBe("MCP E2E Plan");
    expect(qResult.phases.length).toBe(2);

    // 8. upsert — update plan description
    const upsertRes = await client.callTool("plan", {
      subcommand: "upsert",
      plan_file: file,
      target_id: "entire_plan",
      data: { description: "Updated via upsert" },
    });
    expect(upsertRes.isError).toBe(false);
    // upsert returns PlanWriteResult: {plan, phases}
    const upsertResult = upsertRes.payload as { plan: { name: string; status: string; previous_version: unknown }; phases: unknown[] };
    expect(upsertResult.plan).toBeDefined();
    // FR-PLAN-0040 — result.plan.previous_version is the backup path (non-null after write)
    expect(upsertResult.plan.previous_version).not.toBeNull();
    // No previous_version at result root level
    expect((upsertResult as Record<string, unknown>)["previous_version"]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// tools/call — plan next with target_id
// ---------------------------------------------------------------------------

describe("MCP — plan next with target_id", () => {
  it("scopes to specified phase", async () => {
    const file = planFile("target.json");
    await client.callTool("plan", {
      subcommand: "create",
      plan_file: file,
      data: {
        name: "Target Test",
        phases: [
          {
            id: "p1",
            name: "Phase 1",
            description: "",
            steps: [
              { id: "s1", name: "S1", prompt: "p" },
            ],
          },
          {
            id: "p2",
            name: "Phase 2",
            description: "",
            depends_on: ["p1"],
            steps: [{ id: "s2", name: "S2", prompt: "p" }],
          },
        ],
      },
    });

    const r = await client.callTool("plan", {
      subcommand: "next",
      plan_file: file,
      target_id: "p2",
    });
    expect(r.isError).toBe(false);
    const res = r.payload as { next: { id: string }[] };
    expect(res.next.some((s) => s.id === "s2")).toBe(true);
    expect(res.next.some((s) => s.id === "s1")).toBe(false);
  });

  it("returns target_not_found for nonexistent phase", async () => {
    const file = planFile("notfound.json");
    await client.callTool("plan", {
      subcommand: "create",
      plan_file: file,
      data: { name: "X" },
    });
    const r = await client.callTool("plan", {
      subcommand: "next",
      plan_file: file,
      target_id: "nonexistent-phase",
    });
    expect(r.isError).toBe(true);
    // Failure: payload IS the error payload {error: "..."}
    expect((r.payload as any).ok).toBeUndefined();
    expect((r.payload as { error: string }).error).toBe("target_not_found");
  });
});

// ---------------------------------------------------------------------------
// tools/call — list-templates (FR-PLAN-0032)
// ---------------------------------------------------------------------------

describe("MCP — plan list-templates (FR-PLAN-0032)", () => {
  it("list-templates returns catalog without plan_file", async () => {
    const { content, payload, isError } = await client.callTool("plan", { subcommand: "list-templates" });
    expect(isError).toBe(false);
    expect((payload as any).ok).toBeUndefined();
    const catalog = payload as { create: { name: string; brief: string; placeholders: string[] }[]; upsert: { name: string; brief: string; placeholders: string[] }[] };
    expect(Array.isArray(catalog.create)).toBe(true);
    expect(Array.isArray(catalog.upsert)).toBe(true);
    const createNames = catalog.create.map((e) => e.name);
    const upsertNames = catalog.upsert.map((e) => e.name);
    expect(createNames).toContain("for-orchestrator");
    expect(upsertNames).toContain("for-subagent");
    // FR-SHRD-0008 — MCP content text must be densest JSON: equals JSON.stringify(payload)
    // (no indentation, no line breaks). Stronger than substring checks — catches any indent style.
    expect(content[0]!.text).toBe(JSON.stringify(payload));
    expect(content[0]!.text).not.toContain("\n");
  });

  it("each catalog entry has name, brief, and placeholders array", async () => {
    const { payload, isError } = await client.callTool("plan", { subcommand: "list-templates" });
    expect(isError).toBe(false);
    const catalog = payload as { create: unknown[]; upsert: unknown[] };
    for (const entry of [...catalog.create, ...catalog.upsert]) {
      const e = entry as { name: string; brief: string; placeholders: string[] };
      expect(typeof e.name).toBe("string");
      expect(typeof e.brief).toBe("string");
      expect(Array.isArray(e.placeholders)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// tools/call — create-with-template (FR-PLAN-0030)
// ---------------------------------------------------------------------------

describe("MCP — plan create-with-template (FR-PLAN-0030)", () => {
  it("creates plan from for-orchestrator template with placeholder substitution", async () => {
    const file = planFile("template-create.json");

    const { payload, isError } = await client.callTool("plan", {
      subcommand: "create-with-template",
      plan_file: file,
      template: "for-orchestrator",
      "plan-name": "MCP Template Plan",
      "plan-description": "Created via MCP template",
      "phase-steps": "[]",
    });

    expect(isError).toBe(false);
    expect((payload as any).ok).toBeUndefined();
    // Result is PlanWriteResult: {plan, phases}
    const tree = payload as { plan: { name: string; status: string; previous_version: unknown }; phases: unknown[] };
    expect(tree.plan.name).toBe("MCP Template Plan");
    expect(tree.plan.status).toBe("open");
    // FR-PLAN-0040 — previous_version=null on first create (FR-PLAN-0010)
    expect(tree.plan.previous_version).toBeNull();
    // No previous_version at result root level
    expect((tree as Record<string, unknown>)["previous_version"]).toBeUndefined();
    expect(Array.isArray(tree.phases)).toBe(true);
    // Plan file exists on disk
    expect(fs.existsSync(file)).toBe(true);
    // Placeholder substitution appears in file
    const raw = fs.readFileSync(file, "utf8");
    expect(raw).toContain("MCP Template Plan");
  });

  it("returns invalid_template for unknown template name", async () => {
    const file = planFile("bad-template.json");
    const { payload, isError } = await client.callTool("plan", {
      subcommand: "create-with-template",
      plan_file: file,
      template: "no-such-template",
      "plan-name": "X",
      "plan-description": "Y",
      "phase-steps": "[]",
    });
    expect(isError).toBe(true);
    expect((payload as { error: string }).error).toContain("invalid_template");
  });

  // FR-PLAN-0043 — happy path: non-empty phase-steps array injected into ph-prep via MCP
  it("non-empty phase-steps array: injected step present in plan file on disk", async () => {
    const file = planFile("template-create-phasesteps.json");
    const injectedSteps = JSON.stringify([
      { id: "ph-prep-s-mcp-custom", name: "MCP Custom Step", prompt: "Do custom step via MCP" },
    ]);

    const { payload, isError } = await client.callTool("plan", {
      subcommand: "create-with-template",
      plan_file: file,
      template: "for-orchestrator",
      "plan-name": "MCP Phase Steps Plan",
      "plan-description": "MCP phase-steps injection test",
      "phase-steps": injectedSteps,
    });

    expect(isError).toBe(false);
    expect((payload as any).ok).toBeUndefined();
    // Plan file must contain the injected step
    const raw = fs.readFileSync(file, "utf8");
    expect(raw).toContain("ph-prep-s-mcp-custom");
    expect(raw).toContain("MCP Custom Step");
    // ph-prep should have 4 steps (3 seeded + 1 injected)
    const plan = JSON.parse(raw) as { phases: Array<{ id: string; steps: unknown[] }> };
    const prepPhase = plan.phases.find((p) => p.id === "ph-prep")!;
    expect(prepPhase).toBeDefined();
    expect(prepPhase.steps.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// tools/call — upsert-with-template (FR-PLAN-0031)
// ---------------------------------------------------------------------------

describe("MCP — plan upsert-with-template (FR-PLAN-0031)", () => {
  async function createBasePlan(file: string): Promise<void> {
    await client.callTool("plan", {
      subcommand: "create",
      plan_file: file,
      data: { name: "MCP Upsert Base" },
    });
  }

  it("upserts phase from for-subagent template with .bak file created", async () => {
    const file = planFile("template-upsert.json");
    await createBasePlan(file);

    const { payload, isError } = await client.callTool("plan", {
      subcommand: "upsert-with-template",
      plan_file: file,
      template: "for-subagent",
      "phase-id": "ph-impl",
      "phase-name": "Implementation",
      "phase-description": "Implement features",
      "phase-steps": "[]",
    });

    expect(isError).toBe(false);
    expect((payload as any).ok).toBeUndefined();
    // Result is PlanWriteResult: {plan, phases}
    const tree = payload as { plan: { name: string; previous_version: unknown }; phases: unknown[] };
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
    // Placeholder substitution in file
    const raw = fs.readFileSync(file, "utf8");
    expect(raw).toContain("ph-impl");
  });

  it("two upserts produce unique step IDs per phase-id prefix", async () => {
    const file = planFile("template-upsert2.json");
    await createBasePlan(file);

    await client.callTool("plan", {
      subcommand: "upsert-with-template",
      plan_file: file,
      template: "for-subagent",
      "phase-id": "ph-a",
      "phase-name": "Phase A",
      "phase-description": "desc a",
      "phase-steps": "[]",
    });

    await client.callTool("plan", {
      subcommand: "upsert-with-template",
      plan_file: file,
      template: "for-subagent",
      "phase-id": "ph-b",
      "phase-name": "Phase B",
      "phase-description": "desc b",
      "phase-steps": "[]",
    });

    const raw = fs.readFileSync(file, "utf8");
    // Both phase-ids should appear
    expect(raw).toContain("ph-a");
    expect(raw).toContain("ph-b");
    // Step IDs should have different prefixes, no collisions
    expect(raw).toContain("ph-a-s-");
    expect(raw).toContain("ph-b-s-");
  });

  it("returns invalid_template for unknown template name", async () => {
    const file = planFile("bad-upsert.json");
    await createBasePlan(file);
    const { payload, isError } = await client.callTool("plan", {
      subcommand: "upsert-with-template",
      plan_file: file,
      template: "no-such-template",
      "phase-id": "ph-x",
      "phase-name": "X",
      "phase-description": "Y",
      "phase-steps": "[]",
    });
    expect(isError).toBe(true);
    expect((payload as { error: string }).error).toContain("invalid_template");
  });
});

// ---------------------------------------------------------------------------
// error cases
// ---------------------------------------------------------------------------

describe("MCP — error cases", () => {
  it("unknown tool returns MethodNotFound error", async () => {
    const resp = await client.send("tools/call", {
      name: "nonexistent-tool-xyz",
      arguments: {},
    });
    expect(resp.error).toBeDefined();
    expect(resp.error!.code).toBe(-32601); // MethodNotFound
  });

  it("plan with unknown subcommand returns structured error", async () => {
    const file = planFile("err.json");
    await client.callTool("plan", {
      subcommand: "create",
      plan_file: file,
      data: { name: "X" },
    });
    const r = await client.callTool("plan", {
      subcommand: "totally_unknown_subcmd",
      plan_file: file,
    });
    expect(r.isError).toBe(true);
    // Failure: payload IS the error payload
    expect((r.payload as any).ok).toBeUndefined();
    expect((r.payload as { error: string }).error).toContain("unknown_command");
  });

  it("plan update_status with invalid status returns error", async () => {
    const file = planFile("invalid-status.json");
    await client.callTool("plan", {
      subcommand: "create",
      plan_file: file,
      data: {
        name: "X",
        phases: [
          { id: "p1", name: "P1", description: "", steps: [{ id: "s1", name: "S1", prompt: "p" }] },
        ],
      },
    });
    const r = await client.callTool("plan", {
      subcommand: "update_status",
      plan_file: file,
      target_id: "s1",
      new_status: "not-a-valid-status",
    });
    expect(r.isError).toBe(true);
    expect((r.payload as any).ok).toBeUndefined();
    expect((r.payload as { error: string }).error).toContain("invalid_status");
  });

  it("plan next for missing plan_file returns plan_not_found", async () => {
    const r = await client.callTool("plan", {
      subcommand: "next",
      plan_file: "/tmp/mcp-nonexistent-plan.json",
    });
    expect(r.isError).toBe(true);
    expect((r.payload as any).ok).toBeUndefined();
    expect((r.payload as { error: string }).error).toBe("plan_not_found");
  });
});
