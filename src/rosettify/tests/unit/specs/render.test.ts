/**
 * Unit tests for commands/specs/render.ts (renderSpecs / cmdRender). FR-SPECS-0023, 0042.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdRender, renderSpecs } from "../../../src/commands/specs/render.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-render-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("renderSpecs — pure function", () => {
  it("groups specs by area and includes id/title/statement in markdown", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", title: "Cart total" })] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("CHK");
    expect(content).toContain("FR-CHK-0001");
    expect(content).toContain("Cart total");
  });

  it("renders plain text when format=text", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] });
    const content = renderSpecs(doc, doc.specs, "text");
    expect(content).not.toContain("##");
    expect(content).toContain("FR-CHK-0001");
  });

  it("falls back to the raw area code for an unregistered area", () => {
    const doc = makeDoc({ areas: [], specs: [makeSpec({ id: "FR-XYZ-0001" })] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("XYZ");
  });

  it("groups under 'UNKNOWN' when the id itself fails to parse", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "not-a-valid-id" })] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("UNKNOWN");
  });

  it("groups two specs sharing the same area under one group (list-exists branch)", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002" })] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("FR-CHK-0001");
    expect(content).toContain("FR-CHK-0002");
    expect(content.match(/## CHK/g)).toHaveLength(1); // one group header, not two
  });

  it("omits a registered area with zero matching specs", () => {
    const doc = makeDoc({ areas: [{ code: "EMPTY", name: "Empty area" }], specs: [] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).not.toContain("Empty area");
  });

  it("shows '(unnamed)' when component is empty, and includes description when present", () => {
    const doc = makeDoc({ component: "", description: "A description line", specs: [] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("(unnamed)");
    expect(content).toContain("A description line");
  });

  it("shows '(unnamed)' and description in text format too", () => {
    const doc = makeDoc({ component: "", description: "Text desc", specs: [] });
    const content = renderSpecs(doc, doc.specs, "text");
    expect(content).toContain("(unnamed)");
    expect(content).toContain("Text desc");
  });

  it("treats a doc with areas missing entirely as no registered areas (falls back to byArea order)", () => {
    const doc = { component: "x", description: "", specs: [makeSpec({ id: "FR-CHK-0001" })] } as unknown as Parameters<
      typeof renderSpecs
    >[0];
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("FR-CHK-0001");
  });

  it("defaults acceptance/depends_on/related to empty when literally undefined on the spec (markdown + text)", () => {
    const sparse = { id: "FR-CHK-0001", title: "Sparse", priority: "Must", status: "Draft", statement: "x", changed: "2026-01-01T00:00:00.000Z" } as unknown as ReturnType<typeof makeSpec>;
    const doc = makeDoc({ specs: [sparse] });
    const md = renderSpecs(doc, [sparse], "markdown");
    expect(md).toContain("(none)");
    const text = renderSpecs(doc, [sparse], "text");
    expect(text).toContain("(none)");
    expect(text).toContain("unknown"); // changed_by falls back to "unknown"
  });
});

describe("cmdRender — end-to-end via cmdRender", () => {
  it("returns a markdown string grouping all non-Removed specs by area, no file written", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002", status: "Removed" })] }),
    );
    const before = fs.readFileSync(file, "utf8");
    const result = await cmdRender(file);
    expect(result.ok).toBe(true);
    expect(result.result!.format).toBe("markdown");
    expect(result.result!.content).toContain("FR-CHK-0001");
    expect(result.result!.content).not.toContain("FR-CHK-0002");
    expect(fs.readFileSync(file, "utf8")).toBe(before); // no file mutation
  });

  it("shows the spec's changed timestamp in local-time format, not the raw UTC string (FR-SPECS-0042, mirrors info.test.ts)", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", changed: "2026-01-01T12:00:00.000Z" })] }));
    const result = await cmdRender(file);
    expect(result.ok).toBe(true);
    expect(result.result!.content).not.toContain("2026-01-01T12:00:00.000Z");
  });

  it("returns text content when format=text", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await cmdRender(file, undefined, "text");
    expect(result.ok).toBe(true);
    expect(result.result!.format).toBe("text");
  });

  it("scopes to a filter query", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002" })] }));
    const result = await cmdRender(file, "depends_on:NONE");
    expect(result.ok).toBe(true);
    expect(result.result!.content).not.toContain("FR-CHK-0001");
  });

  it("returns invalid_format for an unsupported format", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await cmdRender(file, undefined, "pdf");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_format");
  });

  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdRender(specsFile("nope.json"));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });

  it("returns specs_file_corrupted for invalid JSON", async () => {
    const file = specsFile();
    fs.writeFileSync(file, "{{not json{{");
    const result = await cmdRender(file);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_file_corrupted");
  });

  it("returns invalid_filter for a bad query", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await cmdRender(file, "bogus:x");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_filter");
  });
});
