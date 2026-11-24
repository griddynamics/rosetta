/**
 * specs help E2E tests — runs the real-form examples that `rosettify help specs` prints, verbatim,
 * against the built rosettify binary in an empty directory (FR-SPECS-0060: a real-form example is
 * a working invocation).
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-e2e-specs-help-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

interface SpawnResult {
  status: number | null;
  json: unknown;
}

/** Runs the binary with tmpDir as the working directory, so an example's relative paths land there. */
function run(args: string[]): SpawnResult {
  const result = spawnSync(NODE, [BIN, ...args], { encoding: "utf8", timeout: 15000, cwd: tmpDir });
  let json: unknown = null;
  try {
    json = JSON.parse(result.stdout ?? "");
  } catch {
    // not JSON — the assertions below fail on it
  }
  return { status: result.status, json };
}

/** The real-form example of one subcommand, as argv: split on whitespace, single quotes group
 * (the only quoting the examples use), leading `rosettify` dropped. */
function realExampleArgs(subcommand: string): string[] {
  const help = run(["help", "specs"]).json as { subcommands: { name: string; examples: { real: string } }[] };
  const example = help.subcommands.find((s) => s.name === subcommand)!.examples.real;
  const words = [...example.matchAll(/'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2]!);
  expect(words[0]).toBe("rosettify");
  return words.slice(1);
}

function readSystem(file: string): string {
  return (JSON.parse(fs.readFileSync(path.join(tmpDir, file), "utf8")) as { system: string }).system;
}

describe("CLI — specs help real-form examples that create a document", () => {
  it("the add example creates the document in an empty directory", () => {
    const r = run(realExampleArgs("add"));
    expect((r.json as { error?: string }).error).toBeUndefined();
    expect(r.status).toBe(0);
    expect((r.json as { affected: unknown[] }).affected).toEqual([{ id: "FR-CHK-0001", status: "Draft" }]);
    expect(readSystem("specs/checkout/specs.json")).toBe("checkout");
  });

  it("the migrate example creates the document from the source it names", () => {
    const args = realExampleArgs("migrate");
    const source = args[3]!; // specs migrate <specs_file> <source>
    fs.mkdirSync(path.join(tmpDir, path.dirname(source)), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, source),
      `<req id="FR-CHK-0001" type="FR" level="System" source="User" priority="Must" verification="Test">
        <title>Cart total</title>
        <statement>The cart total shall equal the sum of its line totals.</statement>
        <acceptance>
          <criteria id="FR-CHK-0001.AC1" ears="ubiquitous" system="the checkout system" shall="hold the total"/>
        </acceptance>
      </req>`,
    );
    const r = run(args);
    expect((r.json as { error?: string }).error).toBeUndefined();
    expect(r.status).toBe(0);
    expect((r.json as { migrated: number }).migrated).toBe(1);
    expect(readSystem("specs/checkout/specs.json")).toBe("checkout");
  });

  it("the help attached to missing_system names the --system flag", () => {
    const r = run(realExampleArgs("add").slice(0, 4)); // specs add <specs_file> <data>, no flag
    expect(r.status).toBe(1);
    const res = r.json as { error: string; help: { subcommands: { name: string; usage: string }[] } };
    expect(res.error).toBe("missing_system");
    expect(res.help.subcommands.find((s) => s.name === "add")!.usage).toContain("--system");
  });
});
