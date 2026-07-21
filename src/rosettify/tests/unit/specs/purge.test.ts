/**
 * Unit tests for commands/specs/purge.ts (cmdPurge — permanent removal). FR-SPECS-0016.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdPurge } from "../../../src/commands/specs/purge.js";
import { loadSpecs, saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-purge-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("cmdPurge — force gate (FR-ARCH-0015)", () => {
  it("returns force_required (with include_help) when force is false", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdPurge(file, ["FR-CHK-0001"], false);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("force_required");
    expect(result.include_help).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1); // untouched
  });
});

describe("cmdPurge — happy path with force", () => {
  it("permanently removes an unreferenced id, reporting it in purged", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdPurge(file, ["FR-CHK-0001"], true);
    expect(result.ok).toBe(true);
    expect(result.result!.purged).toEqual(["FR-CHK-0001"]);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(0);
  });

  it("reports a nonexistent id in missing without erroring", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdPurge(file, ["FR-CHK-9999"], true);
    expect(result.ok).toBe(true);
    expect(result.result!.missing).toEqual(["FR-CHK-9999"]);
    expect(result.result!.purged).toEqual([]);
  });
});

describe("cmdPurge — referenced_by_others guard (FR-SPECS-0005/0016)", () => {
  it("refuses with referenced_by_others naming the referrer when a target is still referenced", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] })],
      }),
    );
    const result = await cmdPurge(file, ["FR-CHK-0001"], true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("referenced_by_others");
    expect(result.error).toContain("FR-CHK-0002");
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(2); // nothing purged
  });

  it("succeeds when the referenced target and its referrer are purged together in one batch", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] })],
      }),
    );
    const result = await cmdPurge(file, ["FR-CHK-0001", "FR-CHK-0002"], true);
    expect(result.ok).toBe(true);
    expect(result.result!.purged.sort()).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(0);
  });

  it("guards against a related (not just depends_on) referrer as well", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002", related: ["FR-CHK-0001"] })],
      }),
    );
    const result = await cmdPurge(file, ["FR-CHK-0001"], true);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("referenced_by_others");
  });
});

describe("cmdPurge — defensive fallbacks for malformed inputs", () => {
  it("treats ids=undefined as an empty batch rather than throwing", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdPurge(file, undefined as unknown as string[], true);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ purged: [], missing: [] });
  });

  it("treats a referrer with depends_on/related undefined as having no references (purges cleanly)", async () => {
    const file = specsFile();
    const referrer = makeSpec({ id: "FR-CHK-0002" }) as Record<string, unknown>;
    delete referrer["depends_on"];
    delete referrer["related"];
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), referrer as ReturnType<typeof makeSpec>] }));
    const result = await cmdPurge(file, ["FR-CHK-0001"], true);
    expect(result.ok).toBe(true);
    expect(result.result!.purged).toEqual(["FR-CHK-0001"]);
  });
});

describe("cmdPurge — document errors", () => {
  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdPurge(specsFile("nope.json"), ["FR-CHK-0001"], true);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });
});
