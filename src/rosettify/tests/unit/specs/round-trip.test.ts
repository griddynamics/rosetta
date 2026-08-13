/**
 * FR-SPECS-0023 / FR-SPECS-0025 — the canonical markup emitter (cmdRender xml) and the reader
 * (cmdMigrate) are inverses of each other.
 *
 * Everything goes through the real exported commands, so each case exercises the contract a caller
 * actually meets: integrity checks, area auto-registration, file I/O, and the lifecycle stamps.
 *
 * Isolation and idempotency: every test gets its own `fs.mkdtempSync` directory created in
 * `beforeEach` and removed in `afterEach`; every document is built from scratch inside the test;
 * every markup source is written inside the test. No fixture module, no module-level mutable
 * state, no ordering dependency — the file passes in any order and passes repeatedly.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdAdd } from "../../../src/commands/specs/add.js";
import { cmdApprove } from "../../../src/commands/specs/approve.js";
import { cmdImplemented } from "../../../src/commands/specs/implemented.js";
import { cmdRender } from "../../../src/commands/specs/render.js";
import { cmdMigrate } from "../../../src/commands/specs/migrate.js";
import { cmdValidate } from "../../../src/commands/specs/validate.js";
import { loadSpecs, type Spec, type SpecsDocument } from "../../../src/commands/specs/core.js";

const ACTOR = "round-trip-actor";
// FR-SPECS-0002 — creating a document now requires a caller-supplied system; every helper below
// that creates a fresh document (via cmdAdd/cmdMigrate) carries this constant.
const SYSTEM = "checkout";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-round-trip-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function tmp(name: string): string {
  return path.join(tmpDir, name);
}

function readDoc(file: string): SpecsDocument {
  const doc = loadSpecs(file);
  expect(doc, `no document at ${file}`).not.toBeNull();
  return doc!;
}

function specById(doc: SpecsDocument, id: string): Spec {
  const spec = doc.specs.find((s) => s.id === id);
  expect(spec, `no spec ${id} in the document`).toBeDefined();
  return spec!;
}

/**
 * Serializes with object keys sorted, so a comparison is over content and not over key insertion
 * order. Key order is not part of the stored model (the emitter writes attributes in the canonical
 * order and the reader assembles its own object), and asserting it would fail for a reason that
 * means nothing to a caller.
 */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
    }
    return v;
  });
}

/** Renders the whole document as canonical markup and reads it back into a fresh document. Each
 * call works in its own freshly created directory, so a test may round-trip more than once without
 * colliding and no state is shared between calls. */
async function roundTrip(sourceFile: string): Promise<SpecsDocument> {
  const pass = fs.mkdtempSync(path.join(tmpDir, "pass-"));
  const rendered = await cmdRender(sourceFile, undefined, "xml");
  expect(rendered.ok, `render failed: ${rendered.error}`).toBe(true);
  expect(rendered.result!.format).toBe("xml");

  const markupFile = path.join(pass, "rendered.md");
  fs.writeFileSync(markupFile, rendered.result!.content, "utf8");

  const destination = path.join(pass, "round-tripped.json");
  const migrated = await cmdMigrate([markupFile], destination, ACTOR, SYSTEM);
  expect(migrated.ok, `migrate failed: ${migrated.error}`).toBe(true);
  expect(migrated.result!.skipped, "nothing rendered by this command should be unreadable by it").toEqual([]);
  return readDoc(destination);
}

/** A minimal, valid unit used only as a reference target for depends_on/related. */
function plainSpec(id: string): Record<string, unknown> {
  return {
    id,
    type: "FR",
    title: `title for ${id}`,
    statement: `The system shall behave as ${id} describes.`,
    source: "User",
    priority: "Must",
    verification: "Test",
    acceptance: [{ id: `${id}.AC1`, ears: "ubiquitous", system: "the system", shall: "hold" }],
  };
}

/** A unit carrying every optional field and one criterion per EARS pattern. */
function richSpec(id: string, referenced: string): Record<string, unknown> {
  return {
    id,
    type: "FR",
    level: "Component",
    subsystem: "checkout",
    component: "totals",
    ticket_id: "TRACKER-4711",
    classification: "business",
    title: `the recomputed order total for ${id}`,
    statement:
      "The system shall recompute the order total whenever the cart changes, and shall not recompute it for a cart that is already settled.",
    rationale: "Recomputing on every change keeps the displayed total and the charged total identical.",
    evidence: ["checkout/totals.md:10-42", "checkout/cart.md:5-9"],
    source: "Sources",
    priority: "Must",
    verification: "Test",
    acceptance: [
      { id: `${id}.AC1`, ears: "ubiquitous", system: "the totals component", shall: "hold a non-negative total" },
      { id: `${id}.AC2`, ears: "event", when: "the cart changes", system: "the totals component", shall: "recompute the total" },
      { id: `${id}.AC3`, ears: "state", while: "a promotion is active", system: "the totals component", shall: "apply the promotion" },
      { id: `${id}.AC4`, ears: "optional", where: "gift wrapping is offered", system: "the totals component", shall: "add the wrapping fee" },
      { id: `${id}.AC5`, ears: "unwanted", if: "a price lookup fails", system: "the totals component", shall: "keep the last known total and report the failure" },
    ],
    depends_on: [referenced],
    related: [referenced],
    notes: "Carried across from the checkout rewrite.",
    implementation_notes: "placeholder until the implemented call below sets it",
  };
}

describe("render -> migrate is an exact inverse (FR-SPECS-0023/0025)", () => {
  /** Builds a document holding one fully populated, approved, implemented unit plus its target. */
  async function buildRichDocument(): Promise<{ file: string; original: Spec }> {
    const file = tmp("specs.json");
    const added = await cmdAdd(file, [plainSpec("FR-CHK-0002"), richSpec("FR-CHK-0001", "FR-CHK-0002")], ACTOR, SYSTEM);
    expect(added.ok, `add failed: ${added.error}`).toBe(true);

    // approve fills approved_by and moves status, so the round trip covers the approval group.
    const approved = await cmdApprove(file, ["FR-CHK-0001"], ACTOR);
    expect(approved.ok, `approve failed: ${approved.error}`).toBe(true);

    // implemented fills implementation and implementation_notes.
    const implemented = await cmdImplemented(
      file,
      [{ id: "FR-CHK-0001", implementation: "Implemented", implementation_notes: "checkout/totals.md" }],
      ACTOR,
    );
    expect(implemented.ok, `implemented failed: ${implemented.error}`).toBe(true);

    return { file, original: specById(readDoc(file), "FR-CHK-0001") };
  }

  it("stores a unit whose every optional field is populated, so the comparison below is worth making", async () => {
    const { original } = await buildRichDocument();
    // Guards the fixture: an empty field would make its round trip vacuous.
    expect(original.subsystem).not.toBe("");
    expect(original.component).not.toBe("");
    expect(original.ticket_id).toBeTruthy();
    expect(original.classification).toBeTruthy();
    expect(original.rationale).not.toBe("");
    expect(original.evidence.length).toBeGreaterThan(1);
    expect(original.notes).not.toBe("");
    expect(original.implementation_notes).not.toBe("");
    expect(original.depends_on).toEqual(["FR-CHK-0002"]);
    expect(original.related).toEqual(["FR-CHK-0002"]);
    expect(original.status).toBe("Approved");
    expect(original.approved_by).toBe(ACTOR);
    expect(original.implementation).toBe("Implemented");
    expect(original.changed_by).toBe(ACTOR);
    expect(original.acceptance.map((c) => c.ears)).toEqual(["ubiquitous", "event", "state", "optional", "unwanted"]);
  });

  it("differs after the round trip in changed and changed_by, and in nothing else", async () => {
    const { file, original } = await buildRichDocument();
    const roundTripped = specById(await roundTrip(file), "FR-CHK-0001");

    // Same fields present on both sides — a dropped or invented field must fail here.
    expect(Object.keys(roundTripped).sort()).toEqual(Object.keys(original).sort());

    const differing = Object.keys(original)
      .filter((key) => {
        const a = (original as unknown as Record<string, unknown>)[key];
        const b = (roundTripped as unknown as Record<string, unknown>)[key];
        return canonicalJson(a) !== canonicalJson(b);
      })
      .sort();
    expect(differing).toEqual(["changed", "changed_by"]);

    // Stated the other way round, so a future field that starts differing cannot hide.
    const reconstructed = { ...roundTripped, changed: original.changed, changed_by: original.changed_by };
    expect(reconstructed).toEqual(original);
  });

  it("projects changed onto its calendar date, because the markup carries a date and not a timestamp", async () => {
    const { file, original } = await buildRichDocument();
    const roundTripped = specById(await roundTrip(file), "FR-CHK-0001");

    expect(original.changed).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/); // a full timestamp
    expect(roundTripped.changed).toBe(`${original.changed.slice(0, 10)}T00:00:00.000Z`); // the same day, at day precision
  });

  it("carries no changed_by, because the markup has no place for it", async () => {
    const { file, original } = await buildRichDocument();
    const roundTripped = specById(await roundTrip(file), "FR-CHK-0001");

    expect(original.changed_by).toBe(ACTOR);
    expect(roundTripped.changed_by).toBe(""); // absent from the markup by design, not lost
  });

  it("preserves all five criterion patterns with their own condition words", async () => {
    const { file, original } = await buildRichDocument();
    const roundTripped = specById(await roundTrip(file), "FR-CHK-0001");
    expect(roundTripped.acceptance).toEqual(original.acceptance);
    expect(roundTripped.acceptance[1].when).toBe("the cart changes");
    expect(roundTripped.acceptance[2].while).toBe("a promotion is active");
    expect(roundTripped.acceptance[3].where).toBe("gift wrapping is offered");
    expect(roundTripped.acceptance[4].if).toBe("a price lookup fails");
    expect(roundTripped.acceptance[0].when).toBeUndefined();
  });

  it("survives a second round trip unchanged, so the markup form is a fixed point", async () => {
    const { file } = await buildRichDocument();
    const once = await roundTrip(file);
    const onceFile = tmp("once.json");
    fs.writeFileSync(onceFile, JSON.stringify(once, null, 2), "utf8");
    const twice = await roundTrip(onceFile);
    expect(specById(twice, "FR-CHK-0001")).toEqual(specById(once, "FR-CHK-0001"));
  });
});

describe("special characters survive escaping and unescaping (FR-SPECS-0023/0025)", () => {
  const STATEMENT =
    'Totals & discounts: the system shall hold a < b and b > c, and shall quote the "cart" flag verbatim, including the literal text &amp; and <not-a-tag>.';
  const OUTCOME = 'emit "safe" output for a & b when a < b > c';

  async function buildEscapingDocument(): Promise<{ file: string; original: Spec }> {
    const file = tmp("specs.json");
    const added = await cmdAdd(
      file,
      [
        {
          id: "FR-CHK-0007",
          type: "FR",
          title: 'the "escaped" total & its <markers>',
          statement: STATEMENT,
          rationale: 'Because a & b < c is the awkward case, "quoted" or not.',
          source: "User",
          priority: "Must",
          verification: "Test",
          notes: 'trailing note with & < > and a "quote"',
          acceptance: [{ id: "FR-CHK-0007.AC1", ears: "ubiquitous", system: 'the "totals" component', shall: OUTCOME }],
        },
      ],
      ACTOR,
      SYSTEM,
    );
    expect(added.ok, `add failed: ${added.error}`).toBe(true);
    return { file, original: specById(readDoc(file), "FR-CHK-0007") };
  }

  it("escapes them in the emitted markup rather than writing them raw", async () => {
    const { file } = await buildEscapingDocument();
    const rendered = await cmdRender(file, undefined, "xml");
    expect(rendered.ok).toBe(true);
    const content = rendered.result!.content;

    expect(content).toContain("Totals &amp; discounts");
    expect(content).toContain("&lt;not-a-tag&gt;");
    expect(content).toContain("&amp;amp;"); // the literal text "&amp;" is itself escaped
    expect(content).toContain("&quot;safe&quot;"); // the criterion outcome is an attribute value
    expect(content).not.toContain("<not-a-tag>");
  });

  it("returns the statement byte for byte after the round trip", async () => {
    const { file, original } = await buildEscapingDocument();
    const roundTripped = specById(await roundTrip(file), "FR-CHK-0007");
    expect(roundTripped.statement).toBe(STATEMENT);
    expect(roundTripped.statement).toBe(original.statement);
  });

  it("returns the criterion outcome byte for byte after the round trip", async () => {
    const { file, original } = await buildEscapingDocument();
    const roundTripped = specById(await roundTrip(file), "FR-CHK-0007");
    expect(roundTripped.acceptance[0].shall).toBe(OUTCOME);
    expect(roundTripped.acceptance[0]).toEqual(original.acceptance[0]);
  });

  it("returns every other special-character field unchanged too", async () => {
    const { file, original } = await buildEscapingDocument();
    const roundTripped = specById(await roundTrip(file), "FR-CHK-0007");
    expect(roundTripped.title).toBe(original.title);
    expect(roundTripped.rationale).toBe(original.rationale);
    expect(roundTripped.notes).toBe(original.notes);
  });
});

describe("a criterion whose condition word disagrees with its pattern is imported, not dropped (FR-SPECS-0025)", () => {
  // Regression: an earlier reader treated the disagreement as a non-canonical shape and dropped the
  // whole unit silently. The shape IS canonical — every value is an explicit attribute — so the
  // unit must be imported as written and the disagreement reported by validate instead.
  const MISMATCHED = `# imported requirements

<req id="FR-CHK-0011" type="FR" level="System"
     source="User"
     priority="Must" verification="Test"
     status="Draft" approved_by="" changed="2026-08-10"
     implementation="NotStarted">
  <title>a unit whose criterion names the wrong condition word</title>
  <statement>The system shall import this unit as written rather than discarding it.</statement>
  <acceptance>
    <criteria id="FR-CHK-0011.AC1" ears="event" while="a promotion is active" system="the totals component" shall="recompute the total"/>
  </acceptance>
</req>
`;

  async function importMismatched(): Promise<string> {
    const source = tmp("mismatched.md");
    fs.writeFileSync(source, MISMATCHED, "utf8");
    const destination = tmp("specs.json");
    const migrated = await cmdMigrate([source], destination, ACTOR, SYSTEM);
    expect(migrated.ok, `migrate failed: ${migrated.error}`).toBe(true);
    expect(migrated.result!.migrated).toBe(1);
    expect(migrated.result!.skipped).toEqual([]);
    return destination;
  }

  it("imports the unit successfully", async () => {
    const destination = await importMismatched();
    const spec = specById(readDoc(destination), "FR-CHK-0011");
    expect(spec.title).toBe("a unit whose criterion names the wrong condition word");
    expect(spec.acceptance).toHaveLength(1);
  });

  it("carries the criterion across exactly as written — the declared pattern and the word actually present", async () => {
    const destination = await importMismatched();
    const criterion = specById(readDoc(destination), "FR-CHK-0011").acceptance[0];
    expect(criterion.ears).toBe("event");
    expect(criterion.while).toBe("a promotion is active");
    expect(criterion.when).toBeUndefined(); // the word the pattern names is NOT invented
  });

  it("is then reported by validate at error severity", async () => {
    const destination = await importMismatched();
    const validated = await cmdValidate(destination);
    expect(validated.ok).toBe(true);

    const finding = validated.result!.findings.find((f) => f.id === "FR-CHK-0011" && f.check === "criterion_ears");
    expect(finding, "validate reported no criterion_ears finding for the mismatched unit").toBeDefined();
    expect(finding!.severity).toBe("error");
    expect(finding!.message).toContain("FR-CHK-0011.AC1");

    expect(validated.result!.ok).toBe(false);
    expect(validated.result!.error_count).toBeGreaterThan(0);
  });
});

describe("a non-canonical unit is skipped with a stated reason, never inferred (FR-SPECS-0025)", () => {
  const SOURCE = `# mixed sources

<req id="FR-CHK-0021">
  <title>a unit carrying its single-value fields as child elements</title>
  <statement>The reader shall not reconstruct this unit.</statement>
  <source>User</source>
  <priority>Must</priority>
  <verification>Test</verification>
  <acceptance>
    <criteria id="FR-CHK-0021.AC1" ears="ubiquitous" system="the system" shall="hold"/>
  </acceptance>
</req>

<req id="FR-CHK-0022" type="FR" level="System"
     source="User"
     priority="Must" verification="Test"
     status="Draft" approved_by="" changed="2026-08-10"
     implementation="NotStarted">
  <title>a unit whose criterion is prose</title>
  <statement>The reader shall not reconstruct this unit either.</statement>
  <acceptance>Given: a cart. When: it changes. Then: the total is recomputed.</acceptance>
</req>

<req id="FR-CHK-0023" type="FR" level="System"
     source="User"
     priority="Must" verification="Test"
     status="Draft" approved_by="" changed="2026-08-10"
     implementation="NotStarted">
  <title>a canonical unit alongside the two above</title>
  <statement>The system shall import this one.</statement>
  <acceptance>
    <criteria id="FR-CHK-0023.AC1" ears="ubiquitous" system="the system" shall="hold"/>
  </acceptance>
</req>
`;

  async function importMixed(): Promise<{ destination: string; reasons: string[] }> {
    const source = tmp("mixed.md");
    fs.writeFileSync(source, SOURCE, "utf8");
    const destination = tmp("specs.json");
    const migrated = await cmdMigrate([source], destination, ACTOR, SYSTEM);
    expect(migrated.ok, `migrate failed: ${migrated.error}`).toBe(true);
    expect(migrated.result!.migrated).toBe(1); // only the canonical one counts
    return { destination, reasons: migrated.result!.skipped.map((s) => s.reason) };
  }

  it("skips the unit whose fields are child elements, naming the unit and the offending fields", async () => {
    const { reasons } = await importMixed();
    const reason = reasons.find((r) => r.includes("FR-CHK-0021"));
    expect(reason, `no skip reason named FR-CHK-0021; got: ${reasons.join(" | ")}`).toBeDefined();
    expect(reason!).toContain("child elements");
    expect(reason!).toContain("source");
    expect(reason!).toContain("priority");
  });

  it("skips the unit whose criterion is prose, naming the unit", async () => {
    const { reasons } = await importMixed();
    const reason = reasons.find((r) => r.includes("FR-CHK-0022"));
    expect(reason, `no skip reason named FR-CHK-0022; got: ${reasons.join(" | ")}`).toBeDefined();
    expect(reason!).toContain("prose");
  });

  it("states, in each reason, that the unit was not reconstructed by inference", async () => {
    const { reasons } = await importMixed();
    for (const id of ["FR-CHK-0021", "FR-CHK-0022"]) {
      const reason = reasons.find((r) => r.includes(id))!;
      expect(reason, `reason for ${id}`).toContain("inference");
    }
  });

  it("writes neither skipped unit into the document, in whole or in part", async () => {
    const { destination } = await importMixed();
    const doc = readDoc(destination);
    expect(doc.specs.map((s) => s.id)).toEqual(["FR-CHK-0023"]);
    // Nothing of the skipped units leaked in under any id.
    const serialized = JSON.stringify(doc);
    expect(serialized).not.toContain("FR-CHK-0021");
    expect(serialized).not.toContain("FR-CHK-0022");
    expect(serialized).not.toContain("Given:");
  });

  it("records one skip entry per unit, each naming the source it came from", async () => {
    const source = tmp("mixed.md");
    fs.writeFileSync(source, SOURCE, "utf8");
    const migrated = await cmdMigrate([source], tmp("specs.json"), ACTOR, SYSTEM);
    expect(migrated.result!.skipped).toHaveLength(2);
    for (const entry of migrated.result!.skipped) expect(entry.source).toBe(source);
  });
});

describe("an empty condition-word attribute is not emitted (FR-SPECS-0023)", () => {
  async function renderWithEmptyConditionWord(): Promise<string> {
    const file = tmp("specs.json");
    const added = await cmdAdd(
      file,
      [
        {
          id: "FR-CHK-0031",
          type: "FR",
          title: "a unit whose event criterion names no trigger",
          statement: "The system shall emit no empty condition word for this criterion.",
          source: "User",
          priority: "Must",
          verification: "Test",
          acceptance: [
            { id: "FR-CHK-0031.AC1", ears: "event", when: "", system: "the system", shall: "hold" },
            { id: "FR-CHK-0031.AC2", ears: "ubiquitous", system: "the system", shall: "hold" },
          ],
        },
      ],
      ACTOR,
      SYSTEM,
    );
    expect(added.ok, `add failed: ${added.error}`).toBe(true);

    const rendered = await cmdRender(file, undefined, "xml");
    expect(rendered.ok).toBe(true);
    return rendered.result!.content;
  }

  it("omits the attribute entirely rather than emitting when=\"\"", async () => {
    const content = await renderWithEmptyConditionWord();
    expect(content).not.toContain('when=""');
    expect(content).toContain('<criteria id="FR-CHK-0031.AC1" ears="event" system="the system" shall="hold"/>');
  });

  it("emits no condition word at all for a ubiquitous criterion", async () => {
    const content = await renderWithEmptyConditionWord();
    expect(content).toContain('<criteria id="FR-CHK-0031.AC2" ears="ubiquitous" system="the system" shall="hold"/>');
    for (const word of ["when", "while", "where", "if"]) {
      expect(content).not.toContain(`${word}=""`);
    }
  });

  it("reads back a criterion with no condition word rather than an empty one", async () => {
    const file = tmp("specs.json");
    expect(
      (
        await cmdAdd(
          file,
          [
            {
              id: "FR-CHK-0031",
              type: "FR",
              title: "a unit whose event criterion names no trigger",
              statement: "The system shall emit no empty condition word for this criterion.",
              source: "User",
              priority: "Must",
              verification: "Test",
              acceptance: [{ id: "FR-CHK-0031.AC1", ears: "event", when: "", system: "the system", shall: "hold" }],
            },
          ],
          ACTOR,
          SYSTEM,
        )
      ).ok,
    ).toBe(true);

    const criterion = specById(await roundTrip(file), "FR-CHK-0031").acceptance[0];
    expect(criterion.ears).toBe("event");
    expect(criterion.when).toBeUndefined(); // absent, not ""
  });
});
