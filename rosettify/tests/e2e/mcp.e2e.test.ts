/**
 * MCP E2E tests — spawns rosettify --mcp as a subprocess and communicates
 * via JSON-RPC 2.0 over stdio (newline-delimited).
 *
 * Pattern modelled after ims-mcp-server/validation/verify_mcp.py.
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
    envelope: { ok: boolean; result: unknown; error: string | null; include_help: boolean };
  }> {
    const resp = await this.send("tools/call", { name, arguments: args });
    if (resp.error) {
      // Return it as an error-level response for assertion
      return {
        content: [],
        isError: true,
        envelope: { ok: false, result: null, error: resp.error.message, include_help: false },
      };
    }
    const r = resp.result as { content: { type: string; text: string }[]; isError: boolean };
    const envelope = JSON.parse(r.content[0]!.text) as {
      ok: boolean;
      result: unknown;
      error: string | null;
      include_help: boolean;
    };
    return { content: r.content, isError: r.isError, envelope };
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
    const { envelope } = await client.callTool("help", {});
    expect(envelope.ok).toBe(true);
    const r = envelope.result as { tool: string; version: string; commands: { name: string }[] };
    expect(r.tool).toBe("rosettify");
    expect(Array.isArray(r.commands)).toBe(true);
  });

  it("help with subcommand=plan returns plan detail with subcommands", async () => {
    const { envelope } = await client.callTool("help", { subcommand: "plan" });
    expect(envelope.ok).toBe(true);
    const r = envelope.result as { name: string; subcommands: { name: string }[] };
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
    expect(createRes.envelope.ok).toBe(true);
    const created = createRes.envelope.result as { name: string; status: string };
    expect(created.name).toBe("MCP E2E Plan");
    expect(created.status).toBe("open");
    expect(fs.existsSync(file)).toBe(true);

    // 2. next — phase 1 active, s1 should be ready
    const nextRes = await client.callTool("plan", { subcommand: "next", plan_file: file });
    expect(nextRes.envelope.ok).toBe(true);
    const nextResult = nextRes.envelope.result as { ready: { id: string }[]; count: number };
    expect(nextResult.ready.some((s) => s.id === "s1")).toBe(true);
    expect(nextResult.ready.some((s) => s.id === "s3")).toBe(false); // phase 2 blocked

    // 3. show_status
    const showRes = await client.callTool("plan", { subcommand: "show_status", plan_file: file });
    expect(showRes.envelope.ok).toBe(true);
    const showResult = showRes.envelope.result as { name: string; status: string; steps: { total: number } };
    expect(showResult.name).toBe("MCP E2E Plan");
    expect(showResult.steps.total).toBe(3);

    // 4. update_status s1 → complete
    const upd1 = await client.callTool("plan", {
      subcommand: "update_status",
      plan_file: file,
      target_id: "s1",
      new_status: "complete",
    });
    expect(upd1.envelope.ok).toBe(true);
    const upd1Result = upd1.envelope.result as { id: string; status: string };
    expect(upd1Result.status).toBe("complete");

    // 5. update_status s2 → complete (so phase 1 completes)
    const upd2 = await client.callTool("plan", {
      subcommand: "update_status",
      plan_file: file,
      target_id: "s2",
      new_status: "complete",
    });
    expect(upd2.envelope.ok).toBe(true);
    const upd2Result = upd2.envelope.result as { plan_status: string };
    // Phase 1 complete now, phase 2 should become active
    expect(["in_progress", "open"]).toContain(upd2Result.plan_status);

    // 6. next — phase 2 now active, s3 should be ready (s1 dep complete)
    const nextRes2 = await client.callTool("plan", { subcommand: "next", plan_file: file });
    expect(nextRes2.envelope.ok).toBe(true);
    const nr2 = nextRes2.envelope.result as { ready: { id: string }[] };
    expect(nr2.ready.some((s) => s.id === "s3")).toBe(true);

    // 7. query — full plan
    const qRes = await client.callTool("plan", { subcommand: "query", plan_file: file });
    expect(qRes.envelope.ok).toBe(true);
    const qResult = qRes.envelope.result as { name: string; phases: { id: string }[] };
    expect(qResult.name).toBe("MCP E2E Plan");
    expect(qResult.phases.length).toBe(2);

    // 8. upsert — update plan description
    const upsertRes = await client.callTool("plan", {
      subcommand: "upsert",
      plan_file: file,
      target_id: "entire_plan",
      data: { description: "Updated via upsert" },
    });
    expect(upsertRes.envelope.ok).toBe(true);
    const upsertResult = upsertRes.envelope.result as { id: string; plan_status: string };
    expect(upsertResult.id).toBe("entire_plan");
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
    expect(r.envelope.ok).toBe(true);
    const res = r.envelope.result as { ready: { id: string }[] };
    expect(res.ready.some((s) => s.id === "s2")).toBe(true);
    expect(res.ready.some((s) => s.id === "s1")).toBe(false);
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
    expect(r.envelope.ok).toBe(false);
    expect(r.envelope.error).toBe("target_not_found");
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
    expect(r.envelope.ok).toBe(false);
    expect(r.envelope.error).toContain("unknown_command");
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
    expect(r.envelope.ok).toBe(false);
    expect(r.envelope.error).toContain("invalid_status");
  });

  it("plan next for missing plan_file returns plan_not_found", async () => {
    const r = await client.callTool("plan", {
      subcommand: "next",
      plan_file: "/tmp/mcp-nonexistent-plan.json",
    });
    expect(r.envelope.ok).toBe(false);
    expect(r.envelope.error).toBe("plan_not_found");
  });
});
