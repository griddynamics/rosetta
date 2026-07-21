/**
 * Unit tests for commands/specs/info.ts (cmdInfo — orientation). FR-SPECS-0024.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdInfo } from "../../../src/commands/specs/info.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-info-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("cmdInfo — areas, totals, next_ids", () => {
  it("reports area counts, totals by type/status/implementation, and next free ids", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        areas: [
          { code: "CHK", name: "Checkout" },
          { code: "CLI", name: "CLI" },
        ],
        specs: [
          makeSpec({ id: "FR-CHK-0001", type: "FR", status: "Draft", implementation: "NotStarted" }),
          makeSpec({ id: "FR-CHK-0012", type: "FR", status: "Approved", implementation: "Implemented" }),
          makeSpec({ id: "NFR-CLI-0001", type: "NFR", status: "Draft", implementation: "NotStarted" }),
        ],
      }),
    );
    const result = await cmdInfo(file);
    expect(result.ok).toBe(true);
    const info = result.result!;

    const chkArea = info.areas.find((a) => a.code === "CHK")!;
    expect(chkArea.count).toBe(2);
    const cliArea = info.areas.find((a) => a.code === "CLI")!;
    expect(cliArea.count).toBe(1);

    expect(info.totals.total).toBe(3);
    expect(info.totals.by_type["FR"]).toBe(2);
    expect(info.totals.by_type["NFR"]).toBe(1);
    expect(info.totals.by_status["Draft"]).toBe(2);
    expect(info.totals.by_status["Approved"]).toBe(1);
    expect(info.totals.by_implementation["Implemented"]).toBe(1);

    const chkNext = info.next_ids.find((n) => n.prefix === "FR" && n.area === "CHK")!;
    expect(chkNext.highest).toBe(12);
    expect(chkNext.suggested).toBe("FR-CHK-0013");
  });

  it("reports zero count for a registered area with no specs", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ areas: [{ code: "EMPTY", name: "Empty" }], specs: [] }));
    const result = await cmdInfo(file);
    expect(result.result!.areas).toEqual([{ code: "EMPTY", name: "Empty", count: 0 }]);
  });

  it("returns next_ids empty when the document has no specs", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [] }));
    const result = await cmdInfo(file);
    expect(result.result!.next_ids).toEqual([]);
  });

  it("displays created_at/updated_at in local-time format (not the raw UTC string)", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ created_at: "2026-01-01T12:00:00.000Z", updated_at: "2026-01-01T12:00:00.000Z" }));
    const result = await cmdInfo(file);
    expect(result.result!.created_at).not.toBe("2026-01-01T12:00:00.000Z");
  });
});

describe("cmdInfo — defensive fallbacks and edge cases", () => {
  it("treats a document with specs/areas missing from disk as an entirely empty summary", async () => {
    const file = specsFile();
    fs.writeFileSync(file, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t" }));
    const result = await cmdInfo(file);
    expect(result.ok).toBe(true);
    expect(result.result!.areas).toEqual([]);
    expect(result.result!.totals).toEqual({ by_type: {}, by_status: {}, by_implementation: {}, total: 0 });
    expect(result.result!.next_ids).toEqual([]);
  });

  it("skips a spec whose id fails to parse, without crashing area/next_id computation", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        areas: [{ code: "CHK", name: "Checkout" }],
        specs: [makeSpec({ id: "not-a-valid-id" }), makeSpec({ id: "FR-CHK-0001" })],
      }),
    );
    const result = await cmdInfo(file);
    expect(result.ok).toBe(true);
    expect(result.result!.areas.find((a) => a.code === "CHK")!.count).toBe(1); // malformed id not counted
    expect(result.result!.next_ids).toEqual([{ prefix: "FR", area: "CHK", highest: 1, suggested: "FR-CHK-0002" }]);
  });

  it("keeps the highest seq when a later spec in the same prefix+area has a LOWER sequence number", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ specs: [makeSpec({ id: "FR-CHK-0012" }), makeSpec({ id: "FR-CHK-0003" })] }),
    );
    const result = await cmdInfo(file);
    const next = result.result!.next_ids.find((n) => n.prefix === "FR" && n.area === "CHK")!;
    expect(next.highest).toBe(12);
    expect(next.suggested).toBe("FR-CHK-0013");
  });
});

describe("cmdInfo — document errors", () => {
  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdInfo(specsFile("nope.json"));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });

  it("returns specs_file_corrupted for invalid JSON", async () => {
    const file = specsFile();
    fs.writeFileSync(file, "{{not json{{");
    const result = await cmdInfo(file);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_file_corrupted");
  });
});
