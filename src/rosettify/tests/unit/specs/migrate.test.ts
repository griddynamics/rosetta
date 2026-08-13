/**
 * Unit tests for commands/specs/migrate.ts (cmdMigrate). FR-SPECS-0025.
 *
 * migrate reads the canonical requirement-unit markup only. A unit in any superseded shape is
 * recorded in `skipped` with a stated reason and is never reconstructed by inference, so
 * `migrated` counts canonical units alone. Skips are per unit, not per file — a whole-source
 * failure is recorded the same way, against the source itself.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdMigrate } from "../../../src/commands/specs/migrate.js";
import { loadSpecs, saveSpecs, RESERVED_NFR_AREAS } from "../../../src/commands/specs/core.js";
import { SPECS_MAX_SPECS } from "../../../src/shared/constants.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-migrate-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

function sourceFile(name: string, content: string): string {
  const file = path.join(tmpDir, name);
  fs.writeFileSync(file, content);
  return file;
}

// FR-SPECS-0002 — creating a destination document now requires a caller-supplied system; every
// call below that actually reaches the write path against a fresh destination carries this
// constant. Calls that short-circuit before any write (source_not_found, migrate_parse_error, or
// a batch with nothing to migrate) never touch document creation and need no system.
const SYSTEM = "checkout";

/** One unit in the canonical shape: single-value fields as attributes, prose as child elements,
 * the criterion self-closing with pattern attributes. */
function canonicalUnit(id: string, title: string, extraAttrs = ""): string {
  return `
<req id="${id}" type="FR" level="System" ${extraAttrs}
     source="User"
     priority="Must" verification="Test"
     status="Draft" approved_by="" changed="2026-03-15"
     implementation="NotStarted">
  <title>${title}</title>
  <statement>The system shall do ${title}.</statement>
  <acceptance>
    <criteria id="${id}.AC1" ears="event" when="a trigger arrives" system="the system" shall="respond"/>
  </acceptance>
</req>`;
}

const THREE_REQ_SOURCE = canonicalUnit("FR-CHK-0001", "One") + canonicalUnit("FR-CHK-0002", "Two") + canonicalUnit("FR-CHK-0003", "Three");

describe("cmdMigrate — happy path (canonical form)", () => {
  it("migrates three units and registers the encountered area", async () => {
    const src = sourceFile("units.md", THREE_REQ_SOURCE);
    const dest = specsFile();
    const result = await cmdMigrate([src], dest, undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(3);
    const doc = loadSpecs(dest)!;
    expect(doc.specs).toHaveLength(3);
    expect(doc.areas).toContainEqual({ code: "CHK", name: "CHK" });
  });

  it("creates the destination document when it does not exist", async () => {
    const src = sourceFile("units.md", THREE_REQ_SOURCE);
    const dest = specsFile("new.json");
    const result = await cmdMigrate([src], dest, undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);
  });

  it("reports no skips and no warnings for canonical sources", async () => {
    const src = sourceFile("units.md", THREE_REQ_SOURCE);
    const result = await cmdMigrate([src], specsFile(), undefined, SYSTEM);
    expect(result.result!.skipped).toEqual([]);
    expect(result.result!.warnings).toEqual([]);
  });

  it("carries each unit's fields through to the stored spec", async () => {
    const src = sourceFile("units.md", canonicalUnit("FR-CHK-0001", "One"));
    const dest = specsFile();
    await cmdMigrate([src], dest, undefined, SYSTEM);
    const spec = loadSpecs(dest)!.specs[0]!;
    expect(spec.title).toBe("One");
    expect(spec.statement).toBe("The system shall do One.");
    expect(spec.level).toBe("System");
    expect(spec.priority).toBe("Must");
    expect(spec.verification).toBe("Test");
  });

  it("carries a criterion through with its pattern and condition word intact", async () => {
    const src = sourceFile("units.md", canonicalUnit("FR-CHK-0001", "One"));
    const dest = specsFile();
    await cmdMigrate([src], dest, undefined, SYSTEM);
    expect(loadSpecs(dest)!.specs[0]!.acceptance).toEqual([
      { id: "FR-CHK-0001.AC1", ears: "event", when: "a trigger arrives", system: "the system", shall: "respond" },
    ]);
  });

  it("carries the source locations through as one evidence entry each", async () => {
    const src = sourceFile(
      "with-evidence.md",
      `<req id="FR-CHK-0001" type="FR" source="Sources" priority="Must" verification="Test">
        <title>X</title><statement>The system shall do X.</statement>
        <evidence>src/cart.ts:10-24, src/total.ts:3-8</evidence>
        <acceptance><criteria ears="ubiquitous" system="the system" shall="act"/></acceptance>
      </req>`,
    );
    const dest = specsFile();
    await cmdMigrate([src], dest, undefined, SYSTEM);
    expect(loadSpecs(dest)!.specs[0]!.evidence).toEqual(["src/cart.ts:10-24", "src/total.ts:3-8"]);
  });

  // FR-SPECS-0004 — an existing destination is never re-created, so migrate backfills the nine
  // pre-registered quality-characteristic codes onto it.
  it("backfills the nine reserved areas onto an existing destination that lacks them", async () => {
    const dest = specsFile();
    saveSpecs(dest, makeDoc({ areas: [{ code: "CHK", name: "CHK" }] }));
    const src = sourceFile("units.md", canonicalUnit("FR-CHK-0001", "One"));
    await cmdMigrate([src], dest);
    const codes = loadSpecs(dest)!.areas.map((a) => a.code);
    for (const reserved of RESERVED_NFR_AREAS) expect(codes).toContain(reserved.code);
  });

  // migrate imports historical authorship as-is and never auto-stamps it.
  it("leaves changed_by empty rather than stamping the migrating actor", async () => {
    const src = sourceFile("units.md", canonicalUnit("FR-CHK-0001", "One"));
    const dest = specsFile();
    await cmdMigrate([src], dest, "alice", SYSTEM);
    expect(loadSpecs(dest)!.specs[0]!.changed_by).toBe("");
  });
});

describe("cmdMigrate — source_not_found", () => {
  it("returns source_not_found (top-level) when the only source does not exist", async () => {
    const dest = specsFile();
    const result = await cmdMigrate([specsFile("does-not-exist.md")], dest);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("source_not_found");
  });

  it("returns source_not_found when the source path exists but cannot be read as a file (e.g. a directory)", async () => {
    // fs.existsSync(dir) is true but fs.readFileSync(dir) throws EISDIR — exercises the
    // readFileSync try/catch distinct from the existsSync check above.
    const dirAsSource = path.join(tmpDir, "a-directory-not-a-file.md");
    fs.mkdirSync(dirAsSource);
    const dest = specsFile();
    const result = await cmdMigrate([dirAsSource], dest);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("source_not_found");
  });

  it("skips a nonexistent source but still migrates the rest, recording it in skipped", async () => {
    const src = sourceFile("units.md", THREE_REQ_SOURCE);
    const dest = specsFile();
    const result = await cmdMigrate([specsFile("missing.md"), src], dest, undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(3);
    expect(result.result!.skipped).toHaveLength(1);
    expect(result.result!.skipped[0]!.source).toBe(specsFile("missing.md"));
  });
});

describe("cmdMigrate — migrate_parse_error", () => {
  it("returns migrate_parse_error (top-level) when the only source has zero parseable units", async () => {
    const src = sourceFile("no-reqs.md", "# Just a heading\n\nSome prose, no units here.");
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("migrate_parse_error");
  });

  it("reports the first failure code when sources fail for two different reasons", async () => {
    const empty = sourceFile("no-reqs.md", "nothing here");
    const result = await cmdMigrate([empty, specsFile("missing.md")], specsFile());
    expect(result.ok).toBe(false);
    expect(result.error).toBe("migrate_parse_error");
    expect(result.result).toBeNull();
  });
});

describe("cmdMigrate — size_limit_exceeded", () => {
  it("returns size_limit_exceeded when the import would exceed the max specs limit", async () => {
    const dest = specsFile();
    const existing = Array.from({ length: SPECS_MAX_SPECS - 1 }, (_, i) => makeSpec({ id: `FR-CHK-${String(i + 1000).padStart(4, "0")}` }));
    saveSpecs(dest, makeDoc({ specs: existing }));
    const src = sourceFile("units.md", THREE_REQ_SOURCE); // adds 3 more -> over the limit
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("size_limit_exceeded");
  });

  it("accepts an import that lands exactly on the max specs limit", async () => {
    const dest = specsFile();
    const existing = Array.from({ length: SPECS_MAX_SPECS - 3 }, (_, i) => makeSpec({ id: `FR-CHK-${String(i + 1000).padStart(4, "0")}` }));
    saveSpecs(dest, makeDoc({ specs: existing }));
    const src = sourceFile("units.md", THREE_REQ_SOURCE);
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(loadSpecs(dest)!.specs).toHaveLength(SPECS_MAX_SPECS);
  });
});

describe("cmdMigrate — nothing to write (pending empty, no source-level failure)", () => {
  it("returns ok(migrated:0) when sources=undefined (no sources to process at all)", async () => {
    const dest = specsFile();
    const result = await cmdMigrate(undefined as unknown as string[], dest);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ migrated: 0, sources: [], warnings: [], skipped: [] });
  });

  it("returns ok(migrated:0) when the only source parses but its only unit has no id", async () => {
    const src = sourceFile("only-idless.md", `<req type="FR"><title>No id</title></req>`);
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(0);
    expect(result.result!.sources).toEqual([src]);
    expect(result.result!.warnings).toEqual([]);
    // A unit with no id is a non-canonical UNIT, not a file-level failure: it lands in `skipped`
    // against its source, so the call stays ok rather than becoming a top-level error.
    expect(result.result!.skipped).toHaveLength(1);
    expect(result.result!.skipped[0]!.source).toBe(src);
    expect(result.result!.skipped[0]!.reason).toContain("carries no id");
  });

  it("does not create the destination document when nothing was migrated", async () => {
    const src = sourceFile("only-idless.md", `<req type="FR"><title>No id</title></req>`);
    const dest = specsFile("never-written.json");
    await cmdMigrate([src], dest);
    expect(fs.existsSync(dest)).toBe(false);
  });
});

describe("cmdMigrate — writes onto a document missing the specs key entirely", () => {
  it("appends onto a legacy document lacking specs, without crashing", async () => {
    const src = sourceFile("units.md", THREE_REQ_SOURCE);
    const dest = specsFile();
    fs.writeFileSync(dest, JSON.stringify({ system: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(3);
    const doc = loadSpecs(dest)!;
    expect(doc.specs).toHaveLength(3);
  });
});

describe("cmdMigrate — ticket_id and classification carried through when present", () => {
  it("includes ticket_id/classification on the mapped spec when the source supplies them", async () => {
    const src = sourceFile("with-ticket.md", canonicalUnit("FR-CHK-0001", "X", `ticketId="CTORNDGAIN-9999" classification="business"`));
    const dest = specsFile();
    const result = await cmdMigrate([src], dest, undefined, SYSTEM);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(dest)!;
    expect(doc.specs[0]!.ticket_id).toBe("CTORNDGAIN-9999");
    expect(doc.specs[0]!.classification).toBe("business");
  });
});

// ---------------------------------------------------------------------------
// Non-canonical units — report-don't-drop, never reconstructed by inference
// ---------------------------------------------------------------------------

describe("cmdMigrate — a non-canonical unit is skipped, never reconstructed", () => {
  it("excludes only the id-less unit, migrating the rest and recording the exclusion", async () => {
    const src = sourceFile("mixed.md", `<req type="FR"><title>No id</title></req>` + canonicalUnit("FR-CHK-0001", "Has id"));
    const dest = specsFile();
    const result = await cmdMigrate([src], dest, undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(1);
    expect(result.result!.skipped).toHaveLength(1);
    expect(result.result!.skipped[0]!.reason).toContain("carries no id");
    expect(loadSpecs(dest)!.specs.map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  // The superseded shape: single-value fields carried as child elements.
  it("skips a unit carrying its fields as child elements and states why", async () => {
    const src = sourceFile(
      "old-shape.md",
      `<req id="FR-CHK-0007"><type>FR</type><source>User</source><title>Old shape</title></req>` +
        canonicalUnit("FR-CHK-0001", "New shape"),
    );
    const result = await cmdMigrate([src], specsFile(), undefined, SYSTEM);
    expect(result.result!.migrated).toBe(1);
    expect(result.result!.skipped[0]!.reason).toContain("single-value fields as child elements");
    expect(result.result!.skipped[0]!.reason).toContain("FR-CHK-0007");
  });

  // The superseded shape: a Given/When/Then prose criterion. Splitting it would need the
  // responder invented, which is what produced content nobody wrote.
  it("skips a unit whose criterion is written as Given/When/Then prose", async () => {
    const src = sourceFile(
      "gwt.md",
      `<req id="FR-CHK-0008" type="FR" source="User" priority="Must" verification="Test">
        <title>X</title><statement>The system shall do X.</statement>
        <acceptance><criteria>Given: a precondition When: an action Then: an outcome</criteria></acceptance>
      </req>`,
    );
    const result = await cmdMigrate([src], specsFile());
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(0);
    expect(result.result!.skipped[0]!.reason).toContain("rather than reconstructed by inference");
  });

  it("does not invent a responder for a criterion that names none", async () => {
    const src = sourceFile(
      "no-responder.md",
      `<req id="FR-CHK-0009" type="FR" source="User" priority="Must" verification="Test">
        <title>X</title><statement>The system shall do X.</statement>
        <acceptance><criteria ears="ubiquitous" shall="act"/></acceptance>
      </req>`,
    );
    const result = await cmdMigrate([src], specsFile());
    expect(result.result!.migrated).toBe(0);
    expect(result.result!.skipped[0]!.reason).toContain("names no responder or no outcome");
  });

  // Skips are recorded per unit, not per file.
  it("records one entry per skipped unit, all sharing their source", async () => {
    const src = sourceFile("two-bad.md", `<req type="FR"><title>A</title></req><req type="FR"><title>B</title></req>`);
    const result = await cmdMigrate([src], specsFile());
    expect(result.result!.skipped).toHaveLength(2);
    expect(result.result!.skipped.map((s) => s.source)).toEqual([src, src]);
  });
});

describe("cmdMigrate — per-unit warnings on units that were still imported", () => {
  it("surfaces an unparseable changed timestamp as a warning while still importing the unit", async () => {
    const src = sourceFile(
      "bad-date.md",
      `<req id="FR-CHK-0001" type="FR" source="User" priority="Must" verification="Test" changed="not-a-real-date">
        <title>X</title><statement>The system shall do X.</statement>
        <acceptance><criteria ears="ubiquitous" system="the system" shall="act"/></acceptance>
      </req>`,
    );
    const dest = specsFile();
    const result = await cmdMigrate([src], dest, undefined, SYSTEM);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(1);
    expect(result.result!.warnings.some((w) => w.check === "migrate_unparseable_changed")).toBe(true);
    expect(loadSpecs(dest)!.specs[0]!.changed).toBe("not-a-real-date");
  });
});
