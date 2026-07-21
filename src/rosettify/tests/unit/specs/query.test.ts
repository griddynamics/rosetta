/**
 * Unit tests for commands/specs/query.ts (cmdQuery). FR-SPECS-0012.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdQuery } from "../../../src/commands/specs/query.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-query-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

function seed(): string {
  const file = specsFile();
  saveSpecs(
    file,
    makeDoc({
      specs: [
        makeSpec({ id: "FR-CHK-0001", type: "NFR", status: "Approved", title: "Retry logic" }),
        makeSpec({ id: "FR-CHK-0002", type: "NFR", status: "Draft" }),
        makeSpec({ id: "FR-CHK-0003", type: "FR", status: "Approved" }),
        makeSpec({ id: "FR-CHK-0004", status: "Removed" }),
      ],
    }),
  );
  return file;
}

describe("cmdQuery — filtering", () => {
  it("returns only specs matching every AND-combined term, count matches", async () => {
    const file = seed();
    const result = await cmdQuery(file, "type:NFR status:Approved");
    expect(result.ok).toBe(true);
    expect(result.result!.specs.map((s) => s.id)).toEqual(["FR-CHK-0001"]);
    expect(result.result!.count).toBe(1);
  });

  it("returns all non-Removed specs when no query is given", async () => {
    const file = seed();
    const result = await cmdQuery(file);
    expect(result.ok).toBe(true);
    expect(result.result!.count).toBe(3);
  });

  it("includes Removed specs when include_removed:true is in the query", async () => {
    const file = seed();
    const result = await cmdQuery(file, "include_removed:true");
    expect(result.result!.count).toBe(4);
  });

  it("includes Removed specs when the includeRemoved param flag is set", async () => {
    const file = seed();
    const result = await cmdQuery(file, undefined, true);
    expect(result.result!.count).toBe(4);
  });

  it("matches free text over title/statement with a leading NOT term", async () => {
    const file = seed();
    const result = await cmdQuery(file, "-status:Removed retry");
    expect(result.result!.specs.map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });
});

describe("cmdQuery — defensive fallback for a document missing the specs key", () => {
  it("treats a document with specs missing from disk as an empty result set", async () => {
    const file = specsFile();
    fs.writeFileSync(file, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdQuery(file);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ specs: [], count: 0 });
  });
});

describe("cmdQuery — errors", () => {
  it("returns invalid_filter for an unknown filter key", async () => {
    const file = seed();
    const result = await cmdQuery(file, "bogus:value");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_filter");
  });

  it("returns invalid_query for a malformed query string", async () => {
    const file = seed();
    const result = await cmdQuery(file, "type:");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_query");
  });

  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdQuery(specsFile("nope.json"));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });

  it("returns specs_file_corrupted for invalid JSON", async () => {
    const file = specsFile();
    fs.writeFileSync(file, "{{not json{{");
    const result = await cmdQuery(file);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_file_corrupted");
  });
});
