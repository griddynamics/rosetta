/**
 * Unit tests for commands/specs/render.ts (renderSpecs / cmdRender). FR-SPECS-0023, 0042.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdRender, renderSpecs } from "../../../src/commands/specs/render.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { makeAcceptance, makeDoc, makeSpec } from "../../fixtures/specs.js";

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

  it("shows '(unnamed)' when the system name is empty, and includes description when present", () => {
    const doc = makeDoc({ system: "", description: "A description line", specs: [] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("(unnamed)");
    expect(content).toContain("A description line");
  });

  it("shows '(unnamed)' and description in text format too", () => {
    const doc = makeDoc({ system: "", description: "Text desc", specs: [] });
    const content = renderSpecs(doc, doc.specs, "text");
    expect(content).toContain("(unnamed)");
    expect(content).toContain("Text desc");
  });

  it("treats a doc with areas missing entirely as no registered areas (falls back to byArea order)", () => {
    const doc = { system: "x", description: "", specs: [makeSpec({ id: "FR-CHK-0001" })] } as unknown as Parameters<
      typeof renderSpecs
    >[0];
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("FR-CHK-0001");
  });

  // FR-SPECS-0023 AC10 — "[event] when the cart changes — the system shall recompute the total":
  // pattern, condition, responder, outcome, in that order.
  it("renders a criterion as pattern, condition, responder and outcome, in that order", () => {
    const acceptance = [makeAcceptance({ ears: "event", when: "the cart changes", system: "the system", shall: "recompute the total" })];
    const doc = makeDoc({ specs: [makeSpec({ acceptance })] });
    const content = renderSpecs(doc, doc.specs, "markdown");
    expect(content).toContain("[event] when the cart changes — the system shall recompute the total");
  });

  it("omits the condition segment for a ubiquitous criterion, which names none", () => {
    const acceptance = [makeAcceptance({ ears: "ubiquitous", when: undefined, system: "the system", shall: "log every write" })];
    const doc = makeDoc({ specs: [makeSpec({ acceptance })] });
    expect(renderSpecs(doc, doc.specs, "markdown")).toContain("[ubiquitous] — the system shall log every write");
  });

  it.each(["markdown", "text"] as const)("names the spec's placement beside its level in %s", (format) => {
    const doc = makeDoc({ specs: [makeSpec({ level: "Component", subsystem: "checkout", component: "cart" })] });
    expect(renderSpecs(doc, doc.specs, format)).toContain("Component (subsystem: checkout, component: cart)");
  });

  // Both empty means the author did not know the location, so nothing is claimed.
  it("claims no placement when the spec names neither subsystem nor component", () => {
    const doc = makeDoc({ specs: [makeSpec({ subsystem: "", component: "" })] });
    expect(renderSpecs(doc, doc.specs, "markdown")).toContain("- Level: System\n");
  });

  it("names only the half of the placement the spec knows", () => {
    const doc = makeDoc({ specs: [makeSpec({ subsystem: "", component: "cart" })] });
    expect(renderSpecs(doc, doc.specs, "markdown")).toContain("System (component: cart)");
  });

  it.each(["markdown", "text"] as const)("lists the spec's evidence locations in %s", (format) => {
    const doc = makeDoc({ specs: [makeSpec({ evidence: ["src/cart.ts:10-24", "src/total.ts:3-8"] })] });
    expect(renderSpecs(doc, doc.specs, format)).toContain("src/cart.ts:10-24, src/total.ts:3-8");
  });

  it.each(["markdown", "text"] as const)("shows '(none)' for a spec citing no evidence in %s", (format) => {
    const doc = makeDoc({ specs: [makeSpec({ evidence: [] })] });
    expect(renderSpecs(doc, doc.specs, format)).toContain("Evidence: (none)");
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

// ---------------------------------------------------------------------------
// The canonical markup rendering (FR-SPECS-0023) — the inverse of req-parser.ts's reader. Every
// single-value field is an attribute; only prose and structured children are elements.
// ---------------------------------------------------------------------------

describe("renderSpecs — xml (canonical markup)", () => {
  const render = (spec: Parameters<typeof makeSpec>[0] = {}, docOverrides: Parameters<typeof makeDoc>[0] = {}) => {
    const doc = makeDoc({ specs: [makeSpec(spec)], ...docOverrides });
    return renderSpecs(doc, doc.specs, "xml");
  };

  it("wraps each unit in the req element", () => {
    const content = render();
    expect(content).toContain("<req ");
    expect(content).toContain("</req>");
  });

  it.each(["id", "type", "level", "source", "priority", "verification", "status", "approved_by", "changed", "implementation"])(
    "carries %s as an attribute, not a child element",
    (attr) => {
      const content = render();
      expect(content).toContain(`${attr}="`);
      expect(content).not.toContain(`<${attr}>`);
    },
  );

  it.each(["title", "statement"])("carries %s as a child element", (element) => {
    expect(render()).toContain(`<${element}>`);
  });

  it("emits the attributes in the canonical order, identity first", () => {
    expect(render()).toContain('<req id="FR-CHK-0001" type="FR" level="System"');
  });

  it("keeps the approval group on one line, so an approval is a one-line difference", () => {
    const content = render({ status: "Approved", approved_by: "alice", changed: "2026-03-15T08:30:00.000Z" });
    expect(content).toContain('status="Approved" approved_by="alice" changed="2026-03-15"');
  });

  // FR-SPECS-0023 AC4 — an approval is dated, not timed; storage is unaffected.
  it("projects the stored timestamp onto its UTC calendar date", () => {
    const content = render({ changed: "2026-03-15T23:30:00.000Z" });
    expect(content).toContain('changed="2026-03-15"');
    expect(content).not.toContain("23:30:00");
  });

  it("passes a changed value that is not a timestamp through unchanged rather than guessing", () => {
    expect(render({ changed: "not-a-timestamp" })).toContain('changed="not-a-timestamp"');
  });

  it("emits a criterion as a self-closing element carrying its pattern attributes", () => {
    const acceptance = [makeAcceptance({ id: "FR-CHK-0001.AC1", ears: "event", when: "the cart changes", system: "the system", shall: "recompute" })];
    expect(render({ acceptance })).toContain(
      '<criteria id="FR-CHK-0001.AC1" ears="event" when="the cart changes" system="the system" shall="recompute"/>',
    );
  });

  it("emits no condition attribute for a ubiquitous criterion", () => {
    const acceptance = [makeAcceptance({ id: "FR-CHK-0001.AC1", ears: "ubiquitous", when: undefined, system: "the system", shall: "log" })];
    expect(render({ acceptance })).toContain('<criteria id="FR-CHK-0001.AC1" ears="ubiquitous" system="the system" shall="log"/>');
  });

  it.each([
    ["state", "while"],
    ["optional", "where"],
    ["unwanted", "if"],
  ] as const)("emits the %s pattern's own condition word '%s'", (ears, word) => {
    const acceptance = [makeAcceptance({ id: "FR-CHK-0001.AC1", ears, when: undefined, [word]: "a condition" })];
    expect(render({ acceptance })).toContain(`${word}="a condition"`);
  });

  it("omits the acceptance element entirely for a spec with no criteria", () => {
    expect(render({ acceptance: [] })).not.toContain("<acceptance>");
  });

  // FR-SPECS-0023 AC5 — an empty evidence field is omitted rather than emitted blank.
  it("omits the evidence element when the spec cites no location", () => {
    expect(render({ evidence: [] })).not.toContain("<evidence>");
  });

  it("joins several evidence locations into one element", () => {
    expect(render({ evidence: ["src/cart.ts:10-24", "src/total.ts:3-8"] })).toContain(
      "<evidence>src/cart.ts:10-24, src/total.ts:3-8</evidence>",
    );
  });

  it.each(["subsystem", "component", "ticket_id", "classification"] as const)("omits the %s attribute when it is empty", (field) => {
    const markupName = field === "ticket_id" ? "ticketId" : field;
    expect(render({ subsystem: "", component: "", [field]: "" })).not.toContain(`${markupName}="`);
  });

  it("emits the always-present attributes even when their value is empty", () => {
    expect(render({ approved_by: "" })).toContain('approved_by=""');
  });

  it("folds the field names that differ from their markup names", () => {
    const content = render({ depends_on: ["FR-CHK-0002"], ticket_id: "JIRA-12", implementation_notes: "shipped" });
    expect(content).toContain('depends="FR-CHK-0002"');
    expect(content).toContain('ticketId="JIRA-12"');
    expect(content).toContain("<implementationNotes>shipped</implementationNotes>");
  });

  it("escapes markup characters in element text", () => {
    expect(render({ statement: "The system shall emit <tag> & go." })).toContain(
      "<statement>The system shall emit &lt;tag&gt; &amp; go.</statement>",
    );
  });

  it("escapes the wrapping quote in an attribute value", () => {
    expect(render({ classification: 'say "hi"' })).toContain('classification="say &quot;hi&quot;"');
  });

  it("escapes the ampersand first, so an introduced escape is never escaped twice", () => {
    expect(render({ statement: "a & b" })).toContain("a &amp; b");
    expect(render({ statement: "a & b" })).not.toContain("&amp;amp;");
  });

  it("carries the document chrome, which the reader ignores when locating units", () => {
    const content = render({}, { system: "checkout", description: "A description line" });
    expect(content).toContain("# checkout");
    expect(content).toContain("A description line");
  });

  it("groups units by area exactly as the other two renderings do", () => {
    const doc = makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002" })] });
    const content = renderSpecs(doc, doc.specs, "xml");
    expect(content.match(/## CHK/g)).toHaveLength(1);
    expect(content.match(/<req /g)).toHaveLength(2);
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

  it("returns the canonical markup when format=xml", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await cmdRender(file, undefined, "xml");
    expect(result.ok).toBe(true);
    expect(result.result!.format).toBe("xml");
    expect(result.result!.content).toContain("<req ");
  });

  it("writes no file when rendering xml", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const before = fs.readFileSync(file, "utf8");
    await cmdRender(file, undefined, "xml");
    expect(fs.readFileSync(file, "utf8")).toBe(before);
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
