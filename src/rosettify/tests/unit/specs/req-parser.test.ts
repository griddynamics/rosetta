/**
 * Unit tests for commands/specs/req-parser.ts — the reader for the canonical requirement-unit
 * markup. FR-SPECS-0025.
 *
 * The reader accepts the canonical form ONLY: every single-value field is an attribute of `<req>`,
 * only prose and structured children are child elements, and every acceptance criterion is a
 * self-closing `<criteria>` element carrying its pattern, condition word, responder and outcome as
 * attributes. A unit in any superseded shape is reported with a stated reason and is deliberately
 * NOT reconstructed by inference, so most of what follows pins the refusals as tightly as it pins
 * the successes.
 */
import { describe, it, expect } from "vitest";
import { scanReqBlocks, scanElements, extractAttrs, mapToSpec } from "../../../src/commands/specs/req-parser.js";

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

  it("tolerates whitespace around the equals sign", () => {
    expect(extractAttrs('<req id = "FR-CHK-0001">')).toEqual({ id: "FR-CHK-0001" });
  });

  it("reads an empty attribute value as an empty string", () => {
    expect(extractAttrs('<req approved_by="">')).toEqual({ approved_by: "" });
  });

  it("decodes the emitter's escapes", () => {
    const attrs = extractAttrs('<req classification="a &lt;b&gt; &quot;c&quot;">');
    expect(attrs["classification"]).toBe('a <b> "c"');
  });

  // `&amp;` is decoded LAST so an escaped ampersand in the source (`&amp;lt;`) decodes to the
  // literal text `&lt;` rather than being re-decoded into `<`.
  it("decodes &amp; last, so an escaped ampersand does not turn into a second escape", () => {
    expect(extractAttrs('<req classification="&amp;lt;">')["classification"]).toBe("&lt;");
  });

  it("keeps an unquoted attribute out of the result rather than guessing at its value", () => {
    expect(extractAttrs("<req id=FR-CHK-0001>")).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// scanElements
// ---------------------------------------------------------------------------

describe("scanElements", () => {
  it("locates paired child elements in document order", () => {
    const found = scanElements("<title>A</title><statement>B</statement>");
    expect(found.map((e) => e.name)).toEqual(["title", "statement"]);
    expect(found.map((e) => e.text)).toEqual(["A", "B"]);
  });

  it("marks a self-closing element and gives it empty text", () => {
    const [element] = scanElements('<criteria id="x" ears="ubiquitous"/>');
    expect(element!.selfClosing).toBe(true);
    expect(element!.text).toBe("");
  });

  it("trims an element's body", () => {
    expect(scanElements("<title>\n  A\n</title>")[0]!.text).toBe("A");
  });

  // A paired element's body is consumed whole, so nothing bracket-shaped inside it is ever
  // mistaken for a sibling element.
  it("treats a paired element's body as opaque, not as more elements", () => {
    const found = scanElements("<notes>See <PREFIX>-<AREA> for the grammar.</notes>");
    expect(found.map((e) => e.name)).toEqual(["notes"]);
    expect(found[0]!.text).toContain("<PREFIX>");
  });

  // Names are collected for EVERY child element, not just the expected ones — a unit carrying a
  // single-value field as a child element is only detectable if unexpected names are seen.
  it("collects unexpected element names too", () => {
    expect(scanElements("<source>User</source>").map((e) => e.name)).toEqual(["source"]);
  });

  it("skips an element with no closing tag and keeps scanning past it", () => {
    const found = scanElements("<title>unclosed<statement>B</statement>");
    expect(found.map((e) => e.name)).toEqual(["statement"]);
  });

  it("stops at an unterminated opening tag, since nothing after it is trustworthy", () => {
    expect(scanElements('<title>A</title><statement note="unterminated')).toEqual([
      { name: "title", openTag: "<title>", selfClosing: false, text: "A" },
    ]);
  });

  it("ignores a bare '<' that starts no tag name", () => {
    expect(scanElements("a < b <title>A</title>").map((e) => e.name)).toEqual(["title"]);
  });

  it("returns [] for a body with no elements", () => {
    expect(scanElements("just prose")).toEqual([]);
  });

  it("does not let a '>' inside a quoted attribute end the opening tag early", () => {
    const [element] = scanElements('<criteria shall="emit a > b comparison" ears="ubiquitous"/>');
    expect(extractAttrs(element!.openTag)["shall"]).toBe("emit a > b comparison");
  });
});

// ---------------------------------------------------------------------------
// scanReqBlocks
// ---------------------------------------------------------------------------

/** One unit in the canonical shape: every single-value field an attribute, prose and structured
 * children as elements, the criterion self-closing with pattern attributes. */
const CANONICAL_UNIT = `
<req id="FR-CHK-0001" type="FR" level="Component" subsystem="checkout" component="cart"
     ticketId="JIRA-12" classification="internal"
     source="User"
     priority="Must" verification="Test"
     status="Approved" approved_by="alice" changed="2026-03-15"
     depends="FR-CHK-0002, FR-CHK-0003" related="FR-CHK-0004"
     implementation="Implemented">
  <title>Cart total</title>
  <statement>When the cart changes, the system shall recompute the total.</statement>
  <rationale>A stale total misprices the order.</rationale>
  <evidence>src/cart.ts:10-24, src/total.ts:3-8</evidence>
  <acceptance>
    <criteria id="FR-CHK-0001.AC1" ears="event" when="an item is added" system="the checkout service" shall="recompute the total"/>
  </acceptance>
  <implementationNotes>shipped in core</implementationNotes>
  <notes>none</notes>
</req>
`;

describe("scanReqBlocks — canonical form", () => {
  it("finds one unit and reads its attributes", () => {
    const blocks = scanReqBlocks(CANONICAL_UNIT);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.attrs["id"]).toBe("FR-CHK-0001");
    expect(blocks[0]!.attrs["type"]).toBe("FR");
    expect(blocks[0]!.attrs["level"]).toBe("Component");
  });

  it("reads attributes by name, independent of the line they were emitted on", () => {
    const blocks = scanReqBlocks(CANONICAL_UNIT);
    expect(blocks[0]!.attrs["implementation"]).toBe("Implemented");
    expect(blocks[0]!.attrs["approved_by"]).toBe("alice");
  });

  it("collects the unit's child elements", () => {
    const names = scanReqBlocks(CANONICAL_UNIT)[0]!.elements.map((e) => e.name);
    expect(names).toEqual(["title", "statement", "rationale", "evidence", "acceptance", "implementationNotes", "notes"]);
  });

  it("records the correct 1-based source line", () => {
    expect(scanReqBlocks(CANONICAL_UNIT)[0]!.sourceLine).toBe(2);
  });

  it("finds multiple sequential units", () => {
    const md = CANONICAL_UNIT + CANONICAL_UNIT.replace("FR-CHK-0001", "FR-CHK-0009");
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.attrs["id"])).toEqual(["FR-CHK-0001", "FR-CHK-0009"]);
  });

  it("ignores surrounding prose, so a rendered requirements document reads straight back", () => {
    const md = `# Checkout\n\nSome narrative.\n${CANONICAL_UNIT}\n## Another heading\n`;
    expect(scanReqBlocks(md)).toHaveLength(1);
  });

  it("returns [] for markdown with no units", () => {
    expect(scanReqBlocks("# Just a heading\n\nSome prose.")).toEqual([]);
  });

  it("tolerates a body containing a code fence", () => {
    const md = `<req id="FR-CHK-0001" type="FR">
      <statement>\`\`\`js\nconst x = 1;\n\`\`\`</statement>
    </req>`;
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.elements[0]!.text).toContain("const x = 1;");
  });

  it("tolerates a body containing a literal <PREFIX>-<AREA> angle-bracket placeholder", () => {
    const md = `<req id="FR-CHK-0001" type="FR">
      <notes>See <PREFIX>-<AREA>-<NNNN> for the id grammar.</notes>
    </req>`;
    expect(scanReqBlocks(md)).toHaveLength(1);
  });

  it("tolerates an unescaped & in a body", () => {
    const md = `<req id="FR-CHK-0001" type="FR">
      <statement>The system shall handle A & B correctly.</statement>
    </req>`;
    expect(scanReqBlocks(md)[0]!.elements[0]!.text).toContain("A & B");
  });

  it("keeps an earlier valid unit when a later, trailing unit has no closing </req>", () => {
    // The missing-</req> search scans the REST of the document, so a malformed unit followed by
    // another well-formed (closed) unit would have its close tag erroneously consumed by the
    // earlier one — this only cleanly demonstrates skip-and-continue when the malformed unit is
    // the trailing one (nothing after it to falsely satisfy its close search).
    const md = CANONICAL_UNIT + `<req id="FR-CHK-0002" type="FR">no closing tag ever`;
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.attrs["id"]).toBe("FR-CHK-0001");
  });

  it("skips a malformed opening tag (unterminated attribute quote) and keeps scanning for later valid units", () => {
    // findUnquotedGt returns -1 for an unterminated attribute quote in the opening tag itself;
    // FR-SPECS-0025 is report-don't-drop, so that one occurrence is skipped and scanning
    // continues — a well-formed unit after the malformed one is still found.
    const md =
      CANONICAL_UNIT +
      `<req id="FR-CHK-0002" type="FR" note="unterminated>never closes` +
      CANONICAL_UNIT.replace("FR-CHK-0001", "FR-CHK-0003");
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((b) => b.attrs["id"])).toEqual(["FR-CHK-0001", "FR-CHK-0003"]);
  });

  it("never infinite-loops when the malformed tag's unterminated quote runs to the end of the document", () => {
    // A trailing malformed tag with nothing well-formed after it — the malformed occurrence is
    // skipped and the scan terminates normally (openRe.exec eventually returns null) rather than
    // looping forever re-matching the same "<req".
    const md = CANONICAL_UNIT + `<req id="FR-CHK-0002" type="FR" note="unterminated>never closes and the document just ends here`;
    const blocks = scanReqBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.attrs["id"]).toBe("FR-CHK-0001");
  });

  it("does not let a '>' inside a quoted attribute end the unit's opening tag early", () => {
    const md = `<req id="FR-CHK-0001" classification="a>b" type="FR"><title>T</title></req>`;
    expect(scanReqBlocks(md)[0]!.attrs["type"]).toBe("FR");
  });
});

// ---------------------------------------------------------------------------
// mapToSpec — the canonical shape read into a Partial<Spec>
// ---------------------------------------------------------------------------

/** Reads the single unit out of `md`. */
function mapOne(md: string) {
  const [block] = scanReqBlocks(md);
  return mapToSpec(block!);
}

describe("mapToSpec — a canonical unit", () => {
  it("reads every attribute-borne field", () => {
    const { spec } = mapOne(CANONICAL_UNIT);
    expect(spec.id).toBe("FR-CHK-0001");
    expect(spec.type).toBe("FR");
    expect(spec.level).toBe("Component");
    expect(spec.subsystem).toBe("checkout");
    expect(spec.component).toBe("cart");
    expect(spec.source).toBe("User");
    expect(spec.priority).toBe("Must");
    expect(spec.verification).toBe("Test");
    expect(spec.status).toBe("Approved");
    expect(spec.approved_by).toBe("alice");
    expect(spec.implementation).toBe("Implemented");
  });

  it("reads every element-borne field", () => {
    const { spec } = mapOne(CANONICAL_UNIT);
    expect(spec.title).toBe("Cart total");
    expect(spec.statement).toBe("When the cart changes, the system shall recompute the total.");
    expect(spec.rationale).toBe("A stale total misprices the order.");
    expect(spec.implementation_notes).toBe("shipped in core");
    expect(spec.notes).toBe("none");
  });

  it("reads the criterion as a fully-populated acceptance criterion", () => {
    const { spec } = mapOne(CANONICAL_UNIT);
    expect(spec.acceptance).toEqual([
      {
        id: "FR-CHK-0001.AC1",
        ears: "event",
        when: "an item is added",
        system: "the checkout service",
        shall: "recompute the total",
      },
    ]);
  });

  it("produces no warnings for a canonical unit", () => {
    expect(mapOne(CANONICAL_UNIT).warnings).toEqual([]);
  });

  it("does not skip a canonical unit", () => {
    expect(mapOne(CANONICAL_UNIT).skip).toBeUndefined();
  });

  it("folds the markup names that differ from their field names", () => {
    const { spec } = mapOne(CANONICAL_UNIT);
    expect(spec.depends_on).toEqual(["FR-CHK-0002", "FR-CHK-0003"]);
    expect(spec.ticket_id).toBe("JIRA-12");
    expect(spec.implementation_notes).toBe("shipped in core");
  });

  it("splits the evidence element into one entry per location", () => {
    expect(mapOne(CANONICAL_UNIT).spec.evidence).toEqual(["src/cart.ts:10-24", "src/total.ts:3-8"]);
  });

  it("splits the related attribute into an array", () => {
    expect(mapOne(CANONICAL_UNIT).spec.related).toEqual(["FR-CHK-0004"]);
  });

  it("carries the optional classification across", () => {
    expect(mapOne(CANONICAL_UNIT).spec.classification).toBe("internal");
  });
});

describe("mapToSpec — defaults and omissions", () => {
  it("defaults level to System when the attribute is absent", () => {
    expect(mapOne(`<req id="FR-CHK-0004" type="FR"></req>`).spec.level).toBe("System");
  });

  it("defaults status to Draft when the attribute is absent", () => {
    expect(mapOne(`<req id="FR-CHK-0004" type="FR"></req>`).spec.status).toBe("Draft");
  });

  it("defaults implementation to NotStarted when the attribute is absent", () => {
    expect(mapOne(`<req id="FR-CHK-0004" type="FR"></req>`).spec.implementation).toBe("NotStarted");
  });

  it("defaults type to '' when the attribute is absent entirely", () => {
    expect(mapOne(`<req id="FR-CHK-0006"></req>`).spec.type).toBe("");
  });

  it("defaults evidence to an empty array when the element is absent", () => {
    expect(mapOne(`<req id="FR-CHK-0006" type="FR"></req>`).spec.evidence).toEqual([]);
  });

  it("defaults acceptance to an empty array when the element is absent", () => {
    expect(mapOne(`<req id="FR-CHK-0006" type="FR"></req>`).spec.acceptance).toEqual([]);
  });

  it.each(["title", "statement", "rationale", "implementation_notes", "notes"] as const)(
    "defaults the %s element to '' when it is absent",
    (field) => {
      expect(mapOne(`<req id="FR-CHK-0006" type="FR"></req>`).spec[field]).toBe("");
    },
  );

  // An absent optional field is left off the spec entirely rather than set to an empty string, so
  // a patch built from it does not overwrite a stored value with nothing.
  it("omits ticket_id and classification entirely when their attributes are empty", () => {
    const { spec } = mapOne(`<req id="FR-CHK-0006" type="FR" ticketId="" classification=""></req>`);
    expect(spec).not.toHaveProperty("ticket_id");
    expect(spec).not.toHaveProperty("classification");
  });

  it("reads an empty acceptance element as no criteria and no complaint", () => {
    const { spec, skip } = mapOne(`<req id="FR-CHK-0011" type="FR"><acceptance></acceptance></req>`);
    expect(spec.acceptance).toEqual([]);
    expect(skip).toBeUndefined();
  });

  // An element outside the grammar's vocabulary is neither read nor treated as a superseded
  // single-value field, so it cannot make an otherwise-canonical unit unreadable.
  it("ignores a child element outside the grammar's vocabulary", () => {
    const { spec, skip } = mapOne(`<req id="FR-CHK-0006" type="FR"><title>T</title><footnote>ignore me</footnote></req>`);
    expect(skip).toBeUndefined();
    expect(spec.title).toBe("T");
  });

  it("keeps the first of two elements sharing a name", () => {
    expect(mapOne(`<req id="FR-CHK-0006" type="FR"><title>first</title><title>second</title></req>`).spec.title).toBe("first");
  });

  it("drops empty entries when splitting an id list", () => {
    expect(mapOne(`<req id="FR-CHK-0005" type="FR" depends="FR-CHK-0001, , FR-CHK-0002"></req>`).spec.depends_on).toEqual([
      "FR-CHK-0001",
      "FR-CHK-0002",
    ]);
  });
});

describe("mapToSpec — criterion reading", () => {
  const withCriteria = (criteria: string) =>
    mapOne(`<req id="FR-CHK-0001" type="FR"><acceptance>${criteria}</acceptance></req>`);

  it.each([
    ["ubiquitous", ""],
    ["event", 'when="x"'],
    ["state", 'while="x"'],
    ["optional", 'where="x"'],
    ["unwanted", 'if="x"'],
  ])("reads a %s criterion", (ears, condition) => {
    const { spec, skip } = withCriteria(`<criteria ears="${ears}" ${condition} system="the system" shall="act"/>`);
    expect(skip).toBeUndefined();
    expect(spec.acceptance![0]!.ears).toBe(ears);
  });

  it("carries a ubiquitous criterion across with no condition word at all", () => {
    const { spec } = withCriteria('<criteria ears="ubiquitous" system="the system" shall="act"/>');
    expect(spec.acceptance![0]).toEqual({ id: "FR-CHK-0001.AC1", ears: "ubiquitous", system: "the system", shall: "act" });
  });

  it("reads several criteria in document order", () => {
    const { spec } = withCriteria(
      '<criteria ears="ubiquitous" system="a" shall="x"/><criteria ears="event" when="c" system="b" shall="y"/>',
    );
    expect(spec.acceptance!.map((c) => c.shall)).toEqual(["x", "y"]);
  });

  // Assigning an omitted identifier is not inference; it is the same rule the write path uses.
  it("assigns an omitted criterion id from the unit's own id", () => {
    const { spec } = withCriteria('<criteria ears="ubiquitous" system="the system" shall="act"/>');
    expect(spec.acceptance![0]!.id).toBe("FR-CHK-0001.AC1");
  });

  it("numbers several omitted criterion ids in order", () => {
    const { spec } = withCriteria(
      '<criteria ears="ubiquitous" system="a" shall="x"/><criteria ears="ubiquitous" system="b" shall="y"/>',
    );
    expect(spec.acceptance!.map((c) => c.id)).toEqual(["FR-CHK-0001.AC1", "FR-CHK-0001.AC2"]);
  });

  it("never renumbers a supplied criterion id", () => {
    const { spec } = withCriteria('<criteria id="FR-CHK-0001.AC7" ears="ubiquitous" system="a" shall="x"/>');
    expect(spec.acceptance![0]!.id).toBe("FR-CHK-0001.AC7");
  });

  it("trims whitespace around a criterion's attribute values", () => {
    const { spec } = withCriteria('<criteria ears=" event " when=" c " system=" a " shall=" x "/>');
    expect(spec.acceptance![0]).toEqual({ id: "FR-CHK-0001.AC1", ears: "event", when: "c", system: "a", shall: "x" });
  });

  it("drops a condition word whose value is only whitespace", () => {
    const { spec } = withCriteria('<criteria ears="event" when="   " system="a" shall="x"/>');
    expect(spec.acceptance![0]).not.toHaveProperty("when");
  });

  // Which condition word a criterion carries relative to its declared pattern is a content rule
  // owned by FR-SPECS-0006 and reported by validate — the reader carries every explicit attribute
  // across as-is rather than gating on it, because doing so would drop authored content.
  it("carries a condition word that disagrees with the declared pattern across for validate to flag", () => {
    const { spec, skip } = withCriteria('<criteria ears="event" while="c" system="a" shall="x"/>');
    expect(skip).toBeUndefined();
    expect(spec.acceptance![0]!.while).toBe("c");
  });

  it("carries an event criterion with no condition word at all across for validate to flag", () => {
    const { spec, skip } = withCriteria('<criteria ears="event" system="a" shall="x"/>');
    expect(skip).toBeUndefined();
    expect(spec.acceptance![0]).toEqual({ id: "FR-CHK-0001.AC1", ears: "event", system: "a", shall: "x" });
  });

  it("decodes the emitter's escapes inside criterion attributes", () => {
    const { spec } = withCriteria('<criteria ears="ubiquitous" system="a" shall="emit &lt;tag&gt; &amp; go"/>');
    expect(spec.acceptance![0]!.shall).toBe("emit <tag> & go");
  });
});

// ---------------------------------------------------------------------------
// mapToSpec — the refusals. A unit in a non-canonical shape is skipped with a stated reason and
// NOT reconstructed: a criterion recovered from prose would need its responder invented, and an
// invented responder in an approved requirement is worse than one a human carries across by hand.
// ---------------------------------------------------------------------------

describe("mapToSpec — non-canonical units are skipped with a stated reason", () => {
  it("skips a unit carrying no id, naming the line it sits on", () => {
    const { spec, skip } = mapOne(`<req type="FR"><title>No id</title></req>`);
    expect(skip).toContain("line 1");
    expect(skip).toContain("carries no id");
    expect(spec).toEqual({});
  });

  it("skips a unit whose id attribute is only whitespace", () => {
    expect(mapOne(`<req id="   " type="FR"></req>`).skip).toContain("carries no id");
  });

  it("skips a unit carrying single-value fields as child elements", () => {
    const { spec, skip } = mapOne(`<req id="FR-CHK-0001"><type>FR</type><source>User</source></req>`);
    expect(skip).toContain("FR-CHK-0001");
    expect(skip).toContain("single-value fields as child elements");
    expect(spec).toEqual({});
  });

  it("names every offending child element so the human knows what to move", () => {
    const skip = mapOne(`<req id="FR-CHK-0001"><type>FR</type><source>User</source></req>`).skip!;
    expect(skip).toContain("type");
    expect(skip).toContain("source");
  });

  it("says the unit was not reconstructed by inference", () => {
    expect(mapOne(`<req id="FR-CHK-0001"><source>User</source></req>`).skip).toContain("rather than reconstructed by inference");
  });

  // The superseded Given/When/Then prose criterion. Reading it is what produced content nobody
  // wrote, so it is refused rather than split.
  it("skips a unit whose criterion is written as prose", () => {
    const md = `<req id="FR-CHK-0002" type="FR"><acceptance><criteria>Given: a When: b Then: c</criteria></acceptance></req>`;
    const { spec, skip } = mapOne(md);
    expect(skip).toContain("written as prose rather than as a self-closing element with pattern attributes");
    expect(spec).toEqual({});
  });

  it("skips a unit whose acceptance body is bare prose with no criterion element", () => {
    const md = `<req id="FR-CHK-0010" type="FR"><acceptance>Given: a When: b Then: c</acceptance></req>`;
    expect(mapOne(md).skip).toContain("written as prose rather than as pattern attributes");
  });

  it("skips a unit whose criterion declares no pattern", () => {
    const md = `<req id="FR-CHK-0002" type="FR"><acceptance><criteria system="a" shall="x"/></acceptance></req>`;
    expect(mapOne(md).skip).toContain("pattern is missing or is not one of the five recognized patterns");
  });

  it("skips a unit whose criterion declares a pattern outside the five", () => {
    const md = `<req id="FR-CHK-0002" type="FR"><acceptance><criteria ears="continuous" system="a" shall="x"/></acceptance></req>`;
    expect(mapOne(md).skip).toContain("not one of the five recognized patterns");
  });

  it.each(['system=""', 'shall=""'])("skips a unit whose criterion has %s", (blank) => {
    const other = blank.startsWith("system") ? 'shall="x"' : 'system="a"';
    const md = `<req id="FR-CHK-0002" type="FR"><acceptance><criteria ears="ubiquitous" ${blank} ${other}/></acceptance></req>`;
    expect(mapOne(md).skip).toContain("names no responder or no outcome");
  });

  it("skips a unit whose criterion omits its responder entirely", () => {
    const md = `<req id="FR-CHK-0002" type="FR"><acceptance><criteria ears="ubiquitous" shall="x"/></acceptance></req>`;
    expect(mapOne(md).skip).toContain("names no responder or no outcome");
  });

  it("skips a unit whose criterion omits its outcome entirely", () => {
    const md = `<req id="FR-CHK-0002" type="FR"><acceptance><criteria ears="ubiquitous" system="a"/></acceptance></req>`;
    expect(mapOne(md).skip).toContain("names no responder or no outcome");
  });

  it("refuses the whole unit, not just the offending criterion", () => {
    const md = `<req id="FR-CHK-0002" type="FR"><acceptance><criteria ears="ubiquitous" system="a" shall="x"/><criteria ears="bogus" system="b" shall="y"/></acceptance></req>`;
    const { spec, skip } = mapOne(md);
    expect(skip).toBeDefined();
    expect(spec).toEqual({});
  });

  // The superseded bracketed implementation field. It is an attribute value now, so a bracketed
  // string is carried across verbatim rather than being re-parsed into a status plus notes.
  it("does not re-parse a legacy bracketed implementation value", () => {
    const md = `<req id="FR-CHK-0003" type="FR" implementation="[Status: Implemented] [Additional Notes: shipped]"></req>`;
    const { spec } = mapOne(md);
    expect(spec.implementation).toBe("[Status: Implemented] [Additional Notes: shipped]");
    expect(spec.implementation_notes).toBe("");
  });
});

// ---------------------------------------------------------------------------
// normalizeChanged (via mapToSpec's `changed` attribute) — report-don't-drop
// ---------------------------------------------------------------------------

describe("normalizeChanged", () => {
  it("normalizes a bare YYYY-MM-DD date to midnight-UTC ISO8601", () => {
    expect(mapOne(`<req id="FR-CHK-0007" type="FR" changed="2026-03-15"></req>`).spec.changed).toBe("2026-03-15T00:00:00.000Z");
  });

  it("normalizes an already-full ISO8601 timestamp via the general Date fallback", () => {
    expect(mapOne(`<req id="FR-CHK-0008" type="FR" changed="2026-03-15T08:30:00.000Z"></req>`).spec.changed).toBe(
      "2026-03-15T08:30:00.000Z",
    );
  });

  it("reads an absent changed attribute as an empty string with no warning", () => {
    const { spec, warnings } = mapOne(`<req id="FR-CHK-0008" type="FR"></req>`);
    expect(spec.changed).toBe("");
    expect(warnings).toEqual([]);
  });

  it("preserves an unparseable changed value verbatim and records a warning", () => {
    const { spec, warnings } = mapOne(`<req id="FR-CHK-0009" type="FR" changed="not-a-real-date-at-all"></req>`);
    expect(spec.changed).toBe("not-a-real-date-at-all");
    expect(warnings).toEqual([
      {
        id: "FR-CHK-0009",
        check: "migrate_unparseable_changed",
        severity: "warning",
        message: "The changed timestamp could not be parsed and was preserved verbatim.",
      },
    ]);
  });
});
