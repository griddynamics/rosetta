/**
 * Unit tests for commands/specs/index.ts (runSpecs dispatch / specsToolDef). FR-SPECS-0030.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { specsToolDef } from "../../../src/commands/specs/index.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { SPECS_MAX_BATCH_SIZE } from "../../../src/shared/constants.js";
import { makeAddItem, makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-index-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("runSpecs — no subcommand returns help content", () => {
  it("returns specsHelpContent when subcommand is missing", async () => {
    const result = await specsToolDef.run({});
    expect(result.ok).toBe(true);
    const res = result.result as { subcommands?: unknown[]; name?: string };
    expect(res.name).toBe("specs");
    expect(Array.isArray(res.subcommands)).toBe(true);
    // FR-SPECS-0060 — 16 subcommand entries
    expect((res.subcommands as unknown[]).length).toBe(16);
  });
});

describe("runSpecs — unknown subcommand", () => {
  it("returns unknown_command with include_help=true and lists valid subcommands", async () => {
    const result = await specsToolDef.run({ subcommand: "bogus" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("unknown_command: bogus");
    expect(result.error).toContain("valid:");
    expect(result.include_help).toBe(true);
  });
});

describe("runSpecs — missing specs_file guard", () => {
  it.each(["add", "get", "query", "update", "delete", "purge", "implemented", "approve", "deprecate", "restore", "reopen", "validate", "graph", "render", "info", "migrate"])(
    "returns missing specs_file for %s",
    async (subcommand) => {
      const result = await specsToolDef.run({ subcommand });
      expect(result.ok).toBe(false);
      expect(result.error).toContain("missing specs_file");
    },
  );
});

describe("runSpecs — central data JSON parsing", () => {
  it("returns invalid_data for a malformed JSON string in data", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "add", specs_file: file, data: "not-valid-json{{{" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_data");
    expect(result.include_help).toBe(true);
  });

  it("accepts data already as an object (non-string, e.g. from MCP)", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "add", specs_file: file, data: makeAddItem(), system: "checkout" });
    expect(result.ok).toBe(true);
  });

  it("accepts data as a JSON string", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({
      subcommand: "add",
      specs_file: file,
      data: JSON.stringify(makeAddItem()),
      system: "checkout",
    });
    expect(result.ok).toBe(true);
  });
});

describe("runSpecs — system plumbing (FR-SPECS-0002)", () => {
  it("rejects add without a system when the call would create the document", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "add", specs_file: file, data: makeAddItem() });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_system");
  });

  it("flows the system input field through to the created document", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "add", specs_file: file, data: makeAddItem(), system: "checkout" });
    expect(result.ok).toBe(true);
    const write = result.result as { document: { system: string } };
    expect(write.document.system).toBe("checkout");
  });
});

describe("runSpecs — batch normalization and size limit", () => {
  it("normalizes a single object into a batch of one for add", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "add", specs_file: file, data: makeAddItem(), system: "checkout" });
    expect(result.ok).toBe(true);
    const write = result.result as { affected: unknown[] };
    expect(write.affected).toHaveLength(1);
  });

  it(`rejects a batch larger than SPECS_MAX_BATCH_SIZE (${SPECS_MAX_BATCH_SIZE}) before processing`, async () => {
    const file = specsFile();
    const items = Array.from({ length: SPECS_MAX_BATCH_SIZE + 1 }, (_, i) => makeAddItem({ id: `FR-CHK-${String(i).padStart(4, "0")}` }));
    const result = await specsToolDef.run({ subcommand: "add", specs_file: file, data: items });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("size_limit_exceeded");
    expect(fs.existsSync(file)).toBe(false); // rejected before any processing
  });
});

describe("runSpecs — missing ids / missing data guards", () => {
  it("returns missing ids for get without ids", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "get", specs_file: file });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing ids");
  });

  it("returns missing ids for delete without ids", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "delete", specs_file: file });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing ids");
  });

  it("returns missing_data for add without data", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "add", specs_file: file });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing_data");
  });

  it("returns missing sources for migrate without sources", async () => {
    const file = specsFile();
    const result = await specsToolDef.run({ subcommand: "migrate", specs_file: file });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("missing sources");
  });
});

describe("runSpecs — routing to each subcommand's cmd* delegate", () => {
  it("routes query to cmdQuery", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await specsToolDef.run({ subcommand: "query", specs_file: file });
    expect(result.ok).toBe(true);
    expect((result.result as { count: number }).count).toBe(1);
  });

  it("routes graph's optional target as ids[0] (batch-of-one)", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await specsToolDef.run({ subcommand: "graph", specs_file: file, ids: ["FR-CHK-0001"] });
    expect(result.ok).toBe(true);
    expect((result.result as { dependencies?: unknown[] }).dependencies).toEqual([]);
  });

  it("routes info to cmdInfo", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc());
    const result = await specsToolDef.run({ subcommand: "info", specs_file: file });
    expect(result.ok).toBe(true);
    expect((result.result as { totals: unknown }).totals).toBeDefined();
  });

  it("routes purge's force flag through", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const withoutForce = await specsToolDef.run({ subcommand: "purge", specs_file: file, ids: ["FR-CHK-0001"] });
    expect(withoutForce.error).toBe("force_required");
    const withForce = await specsToolDef.run({ subcommand: "purge", specs_file: file, ids: ["FR-CHK-0001"], force: true });
    expect(withForce.ok).toBe(true);
  });
});

describe("runSpecs — full routing coverage (specsFile+required-args present, every subcommand)", () => {
  it("routes get with ids present", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await specsToolDef.run({ subcommand: "get", specs_file: file, ids: ["FR-CHK-0001"] });
    expect(result.ok).toBe(true);
    expect((result.result as { found: unknown[] }).found).toHaveLength(1);
  });

  it("routes update with specs_file+data present", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await specsToolDef.run({
      subcommand: "update",
      specs_file: file,
      data: { id: "FR-CHK-0001", title: "Updated via index" },
    });
    expect(result.ok).toBe(true);
  });

  it("returns missing ids for update-shaped delete/purge without ids, and routes them with ids present", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));

    const missing = await specsToolDef.run({ subcommand: "purge", specs_file: file });
    expect(missing.error).toContain("missing ids");

    const withIds = await specsToolDef.run({ subcommand: "delete", specs_file: file, ids: ["FR-CHK-0001"] });
    expect(withIds.ok).toBe(true);
  });

  it("routes implemented with specs_file+data present", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await specsToolDef.run({
      subcommand: "implemented",
      specs_file: file,
      data: { id: "FR-CHK-0001", implementation: "Implemented" },
    });
    expect(result.ok).toBe(true);
  });

  it.each(["approve", "deprecate", "restore", "reopen"])("returns missing ids for %s without ids, and routes with ids present", async (subcommand) => {
    const file = specsFile();
    const seedStatus = subcommand === "restore" ? "Removed" : subcommand === "reopen" ? "Approved" : "Draft";
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", status: seedStatus })] }));

    const missing = await specsToolDef.run({ subcommand, specs_file: file });
    expect(missing.error).toContain("missing ids");

    const withIds = await specsToolDef.run({ subcommand, specs_file: file, ids: ["FR-CHK-0001"] });
    expect(withIds.ok).toBe(true);
  });

  it("routes validate with specs_file present", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await specsToolDef.run({ subcommand: "validate", specs_file: file });
    expect(result.ok).toBe(true);
  });

  it("routes render with specs_file present", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await specsToolDef.run({ subcommand: "render", specs_file: file });
    expect(result.ok).toBe(true);
  });

  it("routes migrate with specs_file+sources present", async () => {
    const src = path.join(tmpDir, "legacy.md");
    fs.writeFileSync(
      src,
      `<req id="FR-CHK-0001" type="FR"><title>X</title><statement>The system shall do X.</statement>` +
        `<source>User</source><priority>Must</priority><verification>Test</verification>` +
        `<acceptance><criteria>Given: a When: b Then: c</criteria></acceptance></req>`,
    );
    const dest = specsFile();
    const result = await specsToolDef.run({ subcommand: "migrate", specs_file: dest, sources: [src], system: "checkout" });
    expect(result.ok).toBe(true);
  });
});

describe("specsToolDef — metadata", () => {
  it("is registered for both CLI and MCP", () => {
    expect(specsToolDef.cli).toBe(true);
    expect(specsToolDef.mcp).toBe(true);
    expect(specsToolDef.name).toBe("specs");
  });

  it("forwards specsHelpContent as helpContent", () => {
    expect(specsToolDef.helpContent).toBeDefined();
  });
});
