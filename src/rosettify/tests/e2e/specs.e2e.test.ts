/**
 * specs command E2E tests — spawns the built rosettify binary as a subprocess.
 * Covers a realistic flow across all 16 subcommands plus help.
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-e2e-specs-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

interface SpawnResult {
  stdout: string;
  stderr: string;
  status: number | null;
  json: unknown;
}

function run(args: string[], env?: Record<string, string | undefined>): SpawnResult {
  const result = spawnSync(NODE, [BIN, ...args], {
    encoding: "utf8",
    timeout: 15000,
    env: env ? { ...process.env, ...env } : process.env,
  });
  let json: unknown = null;
  const out = result.stdout ?? "";
  try {
    json = JSON.parse(out);
  } catch {
    // not JSON — acceptable for some cases
  }
  return { stdout: out, stderr: result.stderr ?? "", status: result.status, json };
}

const ITEM_1 = JSON.stringify({
  id: "FR-CHK-0001",
  type: "FR",
  title: "Cart total",
  statement: "When the cart changes, the system shall recompute the total.",
  source: "User",
  priority: "Must",
  verification: "Test",
  acceptance: [{ given: "an item is added", when: "the cart updates", then: "the total reflects it" }],
});

// ---------------------------------------------------------------------------
// help specs
// ---------------------------------------------------------------------------

describe("CLI — help specs", () => {
  it("rosettify help specs returns specs detail with all 16 subcommands", () => {
    const r = run(["help", "specs"]);
    expect(r.status).toBe(0);
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { name: string; subcommands: { name: string }[]; schemas: unknown; limits: unknown; query_notation: unknown };
    expect(res.name).toBe("specs");
    expect(res.subcommands).toHaveLength(16);
    expect(res.schemas).toBeDefined();
    expect(res.limits).toBeDefined();
    expect(res.query_notation).toBeDefined();
  });

  it("rosettify specs (no subcommand) returns the same help content", () => {
    const r = run(["specs"]);
    expect(r.status).toBe(0);
    const res = r.json as { name: string };
    expect(res.name).toBe("specs");
  });
});

// ---------------------------------------------------------------------------
// info -> add -> get -> query -> validate -> approve -> update -> graph -> render
// -> delete -> restore -> purge -> migrate
// ---------------------------------------------------------------------------

describe("CLI — specs full lifecycle flow", () => {
  it("info on a nonexistent document returns specs_not_found", () => {
    const file = specsFile();
    const r = run(["specs", "info", file]);
    expect(r.status).toBe(1);
    expect((r.json as { error: string }).error).toBe("specs_not_found");
  });

  it("add creates the document and returns SpecWriteResult", () => {
    const file = specsFile();
    const r = run(["specs", "add", file, ITEM_1]);
    expect(r.status).toBe(0);
    expect((r.json as any).ok).toBeUndefined();
    const res = r.json as { document: { total: number; previous_version: unknown }; affected: { id: string; status: string }[] };
    expect(res.document.total).toBe(1);
    expect(res.document.previous_version).toBeNull();
    expect(res.affected).toEqual([{ id: "FR-CHK-0001", status: "Draft" }]);
    expect(fs.existsSync(file)).toBe(true);
  });

  it("info with specs present reports areas/totals/next_ids (not just the empty-document shape)", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "info", file]);
    expect(r.status).toBe(0);
    const res = r.json as {
      areas: { code: string; count: number }[];
      totals: { total: number };
      next_ids: { prefix: string; area: string; suggested: string }[];
    };
    expect(res.areas.find((a) => a.code === "CHK")!.count).toBe(1);
    expect(res.totals.total).toBe(1);
    expect(res.next_ids).toEqual([{ prefix: "FR", area: "CHK", highest: 1, suggested: "FR-CHK-0002" }]);
  });

  it("get retrieves the added spec by id, caller id not redacted", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "get", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { found: { id: string; title: string }[]; missing: string[] };
    expect(res.found[0]!.id).toBe("FR-CHK-0001"); // FR-SPECS-0043 — caller id passes through verbatim
    expect(res.found[0]!.title).toBe("Cart total");
    expect(res.missing).toEqual([]);
  });

  it("query with a key:value filter and a leading '-' NOT term", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r1 = run(["specs", "query", file, "type:FR"]);
    expect(r1.status).toBe(0);
    expect((r1.json as { count: number }).count).toBe(1);

    const r2 = run(["specs", "query", file, "-status:Removed"]);
    expect(r2.status).toBe(0);
    expect((r2.json as { count: number }).count).toBe(1);

    const r3 = run(["specs", "query", file, "type:NFR"]);
    expect(r3.status).toBe(0);
    expect((r3.json as { count: number }).count).toBe(0);
  });

  it("validate reports a clean scope (ok=true)", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "validate", file]);
    expect(r.status).toBe(0);
    const res = r.json as { ok: boolean; error_count: number };
    expect(res.ok).toBe(true);
    expect(res.error_count).toBe(0);
  });

  it("approve moves the spec to Approved", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "approve", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { updated: { id: string; status: string }[] };
    expect(res.updated).toEqual([{ id: "FR-CHK-0001", status: "Approved" }]);
  });

  it("implemented sets the implementation enum value", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const payload = JSON.stringify({ id: "FR-CHK-0001", implementation: "Implemented" });
    const r = run(["specs", "implemented", file, payload]);
    expect(r.status).toBe(0);
    const res = r.json as { updated: { id: string; implementation: string }[] };
    expect(res.updated).toEqual([{ id: "FR-CHK-0001", implementation: "Implemented" }]);
  });

  it("deprecate moves the spec to Deprecated", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "deprecate", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { updated: { id: string; status: string }[] };
    expect(res.updated).toEqual([{ id: "FR-CHK-0001", status: "Deprecated" }]);
  });

  it("reopen withdraws approval, moving an Approved spec back to Draft", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    run(["specs", "approve", file, "FR-CHK-0001"]);
    const r = run(["specs", "reopen", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { updated: { id: string; status: string }[] };
    expect(res.updated).toEqual([{ id: "FR-CHK-0001", status: "Draft" }]);
  });

  it("update on an Approved spec's statement moves it to Modified", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    run(["specs", "approve", file, "FR-CHK-0001"]);
    const patch = JSON.stringify({ id: "FR-CHK-0001", statement: "The system shall recompute totals differently." });
    const r = run(["specs", "update", file, patch]);
    expect(r.status).toBe(0);
    const res = r.json as { affected: { id: string; status: string }[] };
    expect(res.affected).toEqual([{ id: "FR-CHK-0001", status: "Modified" }]);
  });

  it("graph on the target returns dependency closures", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const dependent = JSON.stringify({
      id: "FR-CHK-0002",
      type: "FR",
      title: "Dependent",
      statement: "The system shall depend on cart total.",
      source: "User",
      priority: "Must",
      verification: "Test",
      acceptance: [{ given: "g", when: "w", then: "t" }],
      depends_on: ["FR-CHK-0001"],
    });
    run(["specs", "add", file, dependent]);
    const r = run(["specs", "graph", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { dependents: string[]; cycles: unknown[] };
    expect(res.dependents).toEqual(["FR-CHK-0002"]);
    expect(res.cycles).toEqual([]);
  });

  it("render returns a markdown document containing the spec's id and title", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "render", file]);
    expect(r.status).toBe(0);
    const res = r.json as { format: string; content: string };
    expect(res.format).toBe("markdown");
    expect(res.content).toContain("FR-CHK-0001");
    expect(res.content).toContain("Cart total");
  });

  it("delete soft-removes the spec (status=Removed, retained)", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "delete", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { removed: string[]; missing: string[] };
    expect(res.removed).toEqual(["FR-CHK-0001"]);
    const getR = run(["specs", "get", file, "FR-CHK-0001"]);
    expect((getR.json as { found: { status: string }[] }).found[0]!.status).toBe("Removed");
  });

  it("restore brings a Removed spec back to Draft", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    run(["specs", "delete", file, "FR-CHK-0001"]);
    const r = run(["specs", "restore", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { updated: { id: string; status: string }[] };
    expect(res.updated).toEqual([{ id: "FR-CHK-0001", status: "Draft" }]);
  });

  it("purge without --force refuses with force_required", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "purge", file, "FR-CHK-0001"]);
    expect(r.status).toBe(1);
    expect((r.json as { error: string }).error).toBe("force_required");
  });

  it("purge --force permanently removes the spec", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "purge", file, "FR-CHK-0001", "--force"]);
    expect(r.status).toBe(0);
    const res = r.json as { purged: string[] };
    expect(res.purged).toEqual(["FR-CHK-0001"]);
    const getR = run(["specs", "get", file, "FR-CHK-0001"]);
    expect((getR.json as { missing: string[] }).missing).toEqual(["FR-CHK-0001"]);
  });

  it("migrate imports a legacy markdown source into a fresh document", () => {
    const src = path.join(tmpDir, "legacy.md");
    fs.writeFileSync(
      src,
      `<req id="FR-CHK-0009" type="FR" level="System">
        <title>Legacy</title>
        <statement>The system shall import legacy specs.</statement>
        <source>User</source><priority>Must</priority><verification>Test</verification>
        <acceptance><criteria>Given: a When: b Then: c</criteria></acceptance>
      </req>`,
    );
    const dest = specsFile("migrated.json");
    const r = run(["specs", "migrate", dest, src]);
    expect(r.status).toBe(0);
    const res = r.json as { migrated: number };
    expect(res.migrated).toBe(1);
    expect(fs.existsSync(dest)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// actor identity (FR-SPECS-0041) — ROSETTA_ACTOR env override flows through to
// changed_by/approved_by. Never depends on the real machine's git/OS identity.
// ---------------------------------------------------------------------------

describe("CLI — specs actor identity via ROSETTA_ACTOR", () => {
  it("stamps changed_by with ROSETTA_ACTOR on add", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1], { ROSETTA_ACTOR: "e2e-actor" });
    const r = run(["specs", "get", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { found: { changed_by: string }[] };
    expect(res.found[0]!.changed_by).toBe("e2e-actor");
  });

  it("stamps approved_by with ROSETTA_ACTOR on approve", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1], { ROSETTA_ACTOR: "e2e-actor" });
    run(["specs", "approve", file, "FR-CHK-0001"], { ROSETTA_ACTOR: "e2e-actor" });
    const r = run(["specs", "get", file, "FR-CHK-0001"]);
    expect(r.status).toBe(0);
    const res = r.json as { found: { approved_by: string; changed_by: string }[] };
    expect(res.found[0]!.approved_by).toBe("e2e-actor");
    expect(res.found[0]!.changed_by).toBe("e2e-actor");
  });
});

// ---------------------------------------------------------------------------
// error cases / envelope shape
// ---------------------------------------------------------------------------

describe("CLI — specs error cases", () => {
  it("exits 1 for an unknown specs subcommand", () => {
    const r = run(["specs", "bogus-subcommand"]);
    expect(r.status).toBe(1);
    const payload = r.json as { error: string };
    expect(payload.error).toContain("unknown_command");
  });

  it("query returns invalid_filter for an unknown filter key", () => {
    const file = specsFile();
    run(["specs", "add", file, ITEM_1]);
    const r = run(["specs", "query", file, "bogus:value"]);
    expect(r.status).toBe(1);
    expect((r.json as { error: string }).error).toBe("invalid_filter");
  });

  it("add with an item missing id returns an aggregated missing_id error", () => {
    const file = specsFile();
    const badItem = JSON.stringify({ type: "FR" });
    const r = run(["specs", "add", file, badItem]);
    expect(r.status).toBe(1);
    expect((r.json as { error: string }).error).toContain("missing_id");
  });
});
