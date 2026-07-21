/**
 * Unit tests for commands/specs/req-parser.ts — tolerant <req> XML-in-markdown scanner.
 * FR-SPECS-0025.
 */
import { describe, it, expect } from "vitest";
import { scanReqBlocks, extractAttrs, splitGwt, normalizeImplementation, mapToSpec } from "../../../src/commands/specs/req-parser.js";

// ---------------------------------------------------------------------------
// extractAttrs
// ---------------------------------------------------------------------------

describe("extractAttrs", () => {
  it("parses double-quoted attributes", () => {
    const attrs = extractAttrs('<req id="FR-CHK-0001" type="FR" level="System">');
    expect(attrs).toEqual({ id: "FR-CHK-0001", type: "FR", level: "System" });
  });

  it("parses single-quoted attributes", () => {
    const attrs = extractAttrs("<req id='FR-CHK-0001'>");
    expect(attrs).toEqual({ id: "FR-CHK-0001" });
  });

  it("returns {} for a tag with no attributes", () => {
    expect(extractAttrs("<req>")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// scanReqBlocks
// ---------------------------------------------------------------------------

const SPLIT_TAG_BLOCK = `
<req id="FR-CHK-0001" type="FR" level="System">
  <title>Cart total</title>
  <statement>When the cart changes, the system shall recompute the total.</statement>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <verification>Test</verification>
  <acceptance><criteria>Given: an item is added When: the cart updates Then: the total reflects it.</criteria></acceptance>
  <implementation>NotStarted</implementation>
  <implementationNotes></implementationNotes>
</req>
`;

describe("scanReqBlocks — split-tag form", () => {
  it("finds one block and extracts its known tags", () => {
    const blocks = scanReqBlocks(SPLIT_TAG_BLOCK);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.attrs["id"]).toBe("FR-CHK-0001");
    expect(blocks[0]!.tags["title"]).toBe("Cart total");
    expect(blocks[0]!.tags["statement"]).toContain("recompute the total");
  });

  it("records the correct 1-based source line", () => {
    const blocks = scanReqBlocks(SPLIT_TAG_BLOCK);
    expect(blocks[0]!.sourceLine).toBe(2);
  });

  it("finds multiple sequential blocks", () => {
    const md = SPLIT_TAG_BLOCK + SPLIT_TAG_BLOCK.replace("FR-CHK-0001", "FR-CHK-0002");
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.attrs["id"])).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
  });

  it("returns [] for markdown with no <req> blocks", () => {
    expect(scanReqBlocks("# Just a heading\n\nSome prose.")).toEqual([]);
  });

  it("tolerates a body containing a code fence", () => {
    const md = `<req id="FR-CHK-0001" type="FR">
      <statement>\`\`\`js\nconst x = 1;\n\`\`\`</statement>
    </req>`;
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.tags["statement"]).toContain("const x = 1;");
  });

  it("tolerates a body containing a literal <PREFIX>-<AREA> angle-bracket placeholder", () => {
    const md = `<req id="FR-CHK-0001" type="FR">
      <notes>See <PREFIX>-<AREA>-<NNNN> for the id grammar.</notes>
    </req>`;
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(1);
  });

  it("tolerates an unescaped & in a body", () => {
    const md = `<req id="FR-CHK-0001" type="FR">
      <statement>The system shall handle A & B correctly.</statement>
    </req>`;
    const blocks = scanReqBlocks(md);
    expect(blocks[0]!.tags["statement"]).toContain("A & B");
  });

  it("keeps an earlier valid block when a later, trailing block has no closing </req>", () => {
    // The missing-</req> search scans the REST of the document, so a malformed block followed
    // by another well-formed (closed) block would have its close tag erroneously consumed by
    // the earlier one — this only cleanly demonstrates skip-and-continue when the malformed
    // block is the trailing one (nothing after it to falsely satisfy its close search).
    const md = SPLIT_TAG_BLOCK + `<req id="FR-CHK-0002" type="FR">no closing tag ever`;
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.attrs["id"]).toBe("FR-CHK-0001");
  });

  it("skips a malformed opening tag (unterminated attribute quote) and keeps scanning for later valid blocks", () => {
    // findUnquotedGt returns -1 for an unterminated attribute quote in the opening tag itself;
    // FR-SPECS-0025 is report-don't-drop, so that one occurrence is skipped and scanning
    // continues — a well-formed <req> block after the malformed one is still found.
    const md = SPLIT_TAG_BLOCK + `<req id="FR-CHK-0002" type="FR" note="unterminated>never closes` + SPLIT_TAG_BLOCK.replace("FR-CHK-0001", "FR-CHK-0003");
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.attrs["id"])).toEqual(["FR-CHK-0001", "FR-CHK-0003"]);
  });

  it("never infinite-loops when the malformed tag's unterminated quote runs to the end of the document", () => {
    // A trailing malformed tag with nothing well-formed after it — the malformed occurrence is
    // skipped and the scan terminates normally (openRe.exec eventually returns null) rather than
    // looping forever re-matching the same "<req".
    const md = SPLIT_TAG_BLOCK + `<req id="FR-CHK-0002" type="FR" note="unterminated>never closes and the document just ends here`;
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.attrs["id"]).toBe("FR-CHK-0001");
  });
});

// ---------------------------------------------------------------------------
// splitGwt
// ---------------------------------------------------------------------------

describe("splitGwt", () => {
  it("splits a single Given/When/Then triple", () => {
    const result = splitGwt("Given: a precondition When: an action Then: an outcome");
    expect(result).toEqual([{ given: "a precondition", when: "an action", then: "an outcome" }]);
  });

  it("splits multiple concatenated Given:-led triples in one criteria string", () => {
    const result = splitGwt(
      "Given: A When: B Then: C. Given: D When: E Then: F.",
    );
    expect(result).toEqual([
      { given: "A", when: "B", then: "C." },
      { given: "D", when: "E", then: "F." },
    ]);
  });

  it("handles a missing When: (Given/Then only)", () => {
    const result = splitGwt("Given: A Then: C");
    expect(result).toEqual([{ given: "A", when: "", then: "C" }]);
  });

  it("returns {verbatim} when no Given: marker exists at all", () => {
    const result = splitGwt("just some free-form prose with no markers");
    expect(result).toEqual({ verbatim: "just some free-form prose with no markers" });
  });

  it("returns {verbatim: ''} for empty/whitespace input", () => {
    expect(splitGwt("   ")).toEqual({ verbatim: "" });
  });

  it("degrades to given='',when='' with the chunk in then when neither When: nor Then: is present", () => {
    const result = splitGwt("Given: only a given clause, nothing else");
    expect(result).toEqual([{ given: "", when: "", then: "Given: only a given clause, nothing else" }]);
  });

  it("handles a When: with no Then: at all (then defaults to empty)", () => {
    const result = splitGwt("Given: A When: B");
    expect(result).toEqual([{ given: "A", when: "B", then: "" }]);
  });
});

// ---------------------------------------------------------------------------
// normalizeImplementation
// ---------------------------------------------------------------------------

describe("normalizeImplementation — split-tag form", () => {
  it("passes through modern split tags", () => {
    const result = normalizeImplementation({ implementation: "Implemented", implementationNotes: "done" });
    expect(result).toEqual({ implementation: "Implemented", implementation_notes: "done" });
  });

  it("defaults implementation to NotStarted when the tag is empty", () => {
    const result = normalizeImplementation({});
    expect(result.implementation).toBe("NotStarted");
  });
});

describe("normalizeImplementation — legacy bracketed form", () => {
  it("parses the strict '[Status: X] [Additional Notes: Y]' form", () => {
    const result = normalizeImplementation({ implementation: "[Status: Implemented] [Additional Notes: done in core]" });
    expect(result).toEqual({ implementation: "Implemented", implementation_notes: "done in core" });
  });

  it("parses the loose '[Status: X] <trailing text>' form with no second bracket", () => {
    const result = normalizeImplementation({ implementation: "[Status: Planned] some trailing free text" });
    expect(result).toEqual({ implementation: "Planned", implementation_notes: "some trailing free text" });
  });

  it("falls back to a separate implementationNotes tag for '[Status: X]' alone", () => {
    const result = normalizeImplementation({ implementation: "[Status: NotStarted]", implementationNotes: "separate notes" });
    expect(result).toEqual({ implementation: "NotStarted", implementation_notes: "separate notes" });
  });

  it("defaults implementation_notes to '' for '[Status: X]' alone with no implementationNotes tag at all", () => {
    const result = normalizeImplementation({ implementation: "[Status: NotStarted]" });
    expect(result).toEqual({ implementation: "NotStarted", implementation_notes: "" });
  });
});

// ---------------------------------------------------------------------------
// mapToSpec
// ---------------------------------------------------------------------------

describe("mapToSpec", () => {
  it("maps a fully-populated split-tag block to a Partial<Spec> with no warnings", () => {
    const [block] = scanReqBlocks(SPLIT_TAG_BLOCK);
    const { spec, warnings } = mapToSpec(block!);
    expect(spec.id).toBe("FR-CHK-0001");
    expect(spec.type).toBe("FR");
    expect(spec.title).toBe("Cart total");
    expect(spec.acceptance).toHaveLength(1);
    expect(spec.acceptance![0]).toEqual({ given: "an item is added", when: "the cart updates", then: "the total reflects it." });
    expect(warnings.filter((w) => w.severity === "error")).toEqual([]);
  });

  it("records an error-severity finding for a block missing its id", () => {
    const md = `<req type="FR"><title>No id</title></req>`;
    const [block] = scanReqBlocks(md);
    const { spec, warnings } = mapToSpec(block!);
    expect(spec.id).toBeUndefined();
    expect(warnings.some((w) => w.check === "migrate_missing_id" && w.severity === "error")).toBe(true);
  });

  it("warns on an unsplittable acceptance criterion and preserves it verbatim in 'then'", () => {
    const md = `<req id="FR-CHK-0002" type="FR">
      <acceptance><criteria>unsplittable free-form text with no markers</criteria></acceptance>
    </req>`;
    const [block] = scanReqBlocks(md);
    const { spec, warnings } = mapToSpec(block!);
    expect(spec.acceptance).toEqual([{ given: "", when: "", then: "unsplittable free-form text with no markers" }]);
    expect(warnings.some((w) => w.check === "migrate_unsplittable_criterion")).toBe(true);
  });

  it("normalizes a legacy bracketed implementation tag on the mapped spec", () => {
    const md = `<req id="FR-CHK-0003" type="FR">
      <implementation>[Status: Implemented] [Additional Notes: shipped]</implementation>
    </req>`;
    const [block] = scanReqBlocks(md);
    const { spec } = mapToSpec(block!);
    expect(spec.implementation).toBe("Implemented");
    expect(spec.implementation_notes).toBe("shipped");
  });

  it("defaults level to 'System' when the attribute is absent", () => {
    const md = `<req id="FR-CHK-0004" type="FR"></req>`;
    const [block] = scanReqBlocks(md);
    const { spec } = mapToSpec(block!);
    expect(spec.level).toBe("System");
  });

  it("splits a comma-separated depends tag into an array", () => {
    const md = `<req id="FR-CHK-0005" type="FR"><depends>FR-CHK-0001, FR-CHK-0002</depends></req>`;
    const [block] = scanReqBlocks(md);
    const { spec } = mapToSpec(block!);
    expect(spec.depends_on).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
  });

  it("defaults type to '' when the type attribute is absent entirely", () => {
    const md = `<req id="FR-CHK-0006"></req>`;
    const [block] = scanReqBlocks(md);
    const { spec } = mapToSpec(block!);
    expect(spec.type).toBe("");
  });

  it("warns with id '(unknown)' when both id and changed are absent/unparseable", () => {
    const md = `<req type="FR"><changed>not-a-real-date-at-all</changed></req>`;
    const [block] = scanReqBlocks(md);
    const { warnings } = mapToSpec(block!);
    const changedWarning = warnings.find((w) => w.check === "migrate_unparseable_changed");
    expect(changedWarning?.id).toBe("(unknown)");
  });

  describe("normalizeChanged (via mapToSpec's <changed> tag)", () => {
    it("normalizes a bare YYYY-MM-DD date to midnight-UTC ISO8601", () => {
      const md = `<req id="FR-CHK-0007" type="FR"><changed>2026-03-15</changed></req>`;
      const [block] = scanReqBlocks(md);
      const { spec } = mapToSpec(block!);
      expect(spec.changed).toBe("2026-03-15T00:00:00.000Z");
    });

    it("normalizes an already-full ISO8601 timestamp via the general Date fallback", () => {
      const md = `<req id="FR-CHK-0008" type="FR"><changed>2026-03-15T08:30:00.000Z</changed></req>`;
      const [block] = scanReqBlocks(md);
      const { spec } = mapToSpec(block!);
      expect(spec.changed).toBe("2026-03-15T08:30:00.000Z");
    });

    it("preserves an unparseable <changed> value verbatim and records a warning", () => {
      const md = `<req id="FR-CHK-0009" type="FR"><changed>not-a-real-date-at-all</changed></req>`;
      const [block] = scanReqBlocks(md);
      const { spec, warnings } = mapToSpec(block!);
      expect(spec.changed).toBe("not-a-real-date-at-all");
      expect(warnings.some((w) => w.check === "migrate_unparseable_changed")).toBe(true);
    });
  });

  describe("extractAcceptance edge cases (via mapToSpec's <acceptance> tag)", () => {
    it("treats the whole acceptance body as one implicit block when no <criteria> tag is present", () => {
      const md = `<req id="FR-CHK-0010" type="FR"><acceptance>Given: a When: b Then: c</acceptance></req>`;
      const [block] = scanReqBlocks(md);
      const { spec } = mapToSpec(block!);
      expect(spec.acceptance).toEqual([{ given: "a", when: "b", then: "c" }]);
    });

    it("silently drops an empty <criteria></criteria> block (no criterion, no warning)", () => {
      const md = `<req id="FR-CHK-0011" type="FR"><acceptance><criteria></criteria></acceptance></req>`;
      const [block] = scanReqBlocks(md);
      const { spec, warnings } = mapToSpec(block!);
      expect(spec.acceptance).toEqual([]);
      expect(warnings.some((w) => w.check === "migrate_unsplittable_criterion")).toBe(false);
    });

    it("warns on a Given:-only criterion (both given and when end up empty) via the full mapToSpec path", () => {
      const md = `<req id="FR-CHK-0012" type="FR"><acceptance><criteria>Given: only this, nothing else</criteria></acceptance></req>`;
      const [block] = scanReqBlocks(md);
      const { spec, warnings } = mapToSpec(block!);
      expect(spec.acceptance).toEqual([{ given: "", when: "", then: "Given: only this, nothing else" }]);
      expect(warnings.some((w) => w.check === "migrate_unsplittable_criterion")).toBe(true);
    });
  });
});
