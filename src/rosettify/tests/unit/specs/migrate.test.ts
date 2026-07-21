/**
 * Unit tests for commands/specs/migrate.ts (cmdMigrate). FR-SPECS-0025.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdMigrate } from "../../../src/commands/specs/migrate.js";
import { loadSpecs, saveSpecs } from "../../../src/commands/specs/core.js";
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

const THREE_REQ_SOURCE = `
<req id="FR-CHK-0001" type="FR" level="System">
  <title>One</title>
  <statement>The system shall do one.</statement>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <verification>Test</verification>
  <acceptance><criteria>Given: a When: b Then: c</criteria></acceptance>
</req>
<req id="FR-CHK-0002" type="FR" level="System">
  <title>Two</title>
  <statement>The system shall do two.</statement>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <verification>Test</verification>
  <acceptance><criteria>Given: a When: b Then: c</criteria></acceptance>
</req>
<req id="FR-CHK-0003" type="FR" level="System">
  <title>Three</title>
  <statement>The system shall do three.</statement>
  <source>User</source>
  <priority>Must</priority>
  <status>Draft</status>
  <verification>Test</verification>
  <acceptance><criteria>Given: a When: b Then: c</criteria></acceptance>
</req>
`;

describe("cmdMigrate — happy path (split-tag form)", () => {
  it("migrates three <req> blocks and registers the encountered area", async () => {
    const src = sourceFile("legacy.md", THREE_REQ_SOURCE);
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(3);
    const doc = loadSpecs(dest)!;
    expect(doc.specs).toHaveLength(3);
    expect(doc.areas).toContainEqual({ code: "CHK", name: "CHK" });
  });

  it("creates the destination document when it does not exist", async () => {
    const src = sourceFile("legacy.md", THREE_REQ_SOURCE);
    const dest = specsFile("new.json");
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(dest)).toBe(true);
  });
});

describe("cmdMigrate — legacy bracketed implementation form", () => {
  it("normalizes to split implementation/implementation_notes fields", async () => {
    const src = sourceFile(
      "legacy-impl.md",
      `<req id="FR-CHK-0001" type="FR">
        <title>X</title><statement>The system shall do X.</statement>
        <source>User</source><priority>Must</priority><verification>Test</verification>
        <acceptance><criteria>Given: a When: b Then: c</criteria></acceptance>
        <implementation>[Status: Implemented] [Additional Notes: shipped already]</implementation>
      </req>`,
    );
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(dest)!;
    expect(doc.specs[0]!.implementation).toBe("Implemented");
    expect(doc.specs[0]!.implementation_notes).toBe("shipped already");
  });
});

describe("cmdMigrate — GWT parsing and unsplittable warning", () => {
  it("parses a Given/When/Then criteria string into the structured array", async () => {
    const src = sourceFile(
      "gwt.md",
      `<req id="FR-CHK-0001" type="FR">
        <title>X</title><statement>The system shall do X.</statement>
        <source>User</source><priority>Must</priority><verification>Test</verification>
        <acceptance><criteria>Given: a precondition When: an action Then: an outcome</criteria></acceptance>
      </req>`,
    );
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    const doc = loadSpecs(dest)!;
    expect(doc.specs[0]!.acceptance).toEqual([{ given: "a precondition", when: "an action", then: "an outcome" }]);
    expect(result.ok).toBe(true);
  });

  it("preserves an unsplittable criterion verbatim in 'then' and records a warning", async () => {
    const src = sourceFile(
      "unsplittable.md",
      `<req id="FR-CHK-0001" type="FR">
        <title>X</title><statement>The system shall do X.</statement>
        <source>User</source><priority>Must</priority><verification>Test</verification>
        <acceptance><criteria>unsplittable free-form prose</criteria></acceptance>
      </req>`,
    );
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.warnings.some((w) => w.check === "migrate_unsplittable_criterion")).toBe(true);
    const doc = loadSpecs(dest)!;
    expect(doc.specs[0]!.acceptance![0]!.then).toBe("unsplittable free-form prose");
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
    const src = sourceFile("legacy.md", THREE_REQ_SOURCE);
    const dest = specsFile();
    const result = await cmdMigrate([specsFile("missing.md"), src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(3);
    expect(result.result!.skipped).toHaveLength(1);
    expect(result.result!.skipped[0]!.source).toBe(specsFile("missing.md"));
  });
});

describe("cmdMigrate — migrate_parse_error", () => {
  it("returns migrate_parse_error (top-level) when the only source has zero parseable blocks", async () => {
    const src = sourceFile("no-reqs.md", "# Just a heading\n\nSome prose, no <req> blocks here.");
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("migrate_parse_error");
  });
});

describe("cmdMigrate — size_limit_exceeded", () => {
  it("returns size_limit_exceeded when the import would exceed the max specs limit", async () => {
    const dest = specsFile();
    const existing = Array.from({ length: 999 }, (_, i) => makeSpec({ id: `FR-CHK-${String(i).padStart(4, "0")}` }));
    saveSpecs(dest, makeDoc({ specs: existing }));
    const src = sourceFile("legacy.md", THREE_REQ_SOURCE); // adds 3 more -> 1002 total
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("size_limit_exceeded");
  });
});

describe("cmdMigrate — nothing to write (pending empty, no source-level failure)", () => {
  it("returns ok(migrated:0) when sources=undefined (no sources to process at all)", async () => {
    const dest = specsFile();
    const result = await cmdMigrate(undefined as unknown as string[], dest);
    expect(result.ok).toBe(true);
    expect(result.result).toEqual({ migrated: 0, sources: [], warnings: [], skipped: [] });
  });

  it("returns ok(migrated:0) when the only source parses but its only block has no id", async () => {
    const src = sourceFile("only-idless.md", `<req type="FR"><title>No id</title></req>`);
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(0);
    expect(result.result!.sources).toEqual([src]);
    expect(result.result!.skipped).toEqual([]);
    expect(result.result!.warnings.some((w) => w.check === "migrate_missing_id")).toBe(true);
  });
});

describe("cmdMigrate — writes onto a document missing the specs key entirely", () => {
  it("appends onto a legacy document lacking specs, without crashing", async () => {
    const src = sourceFile("legacy.md", THREE_REQ_SOURCE);
    const dest = specsFile();
    fs.writeFileSync(dest, JSON.stringify({ component: "x", description: "", created_at: "t", updated_at: "t", areas: [] }));
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(3);
    const doc = loadSpecs(dest)!;
    expect(doc.specs).toHaveLength(3);
  });
});

describe("cmdMigrate — ticket_id and classification carried through when present", () => {
  it("includes ticket_id/classification on the mapped spec when the source supplies them", async () => {
    const src = sourceFile(
      "with-ticket.md",
      `<req id="FR-CHK-0001" type="FR" ticketId="CTORNDGAIN-9999" classification="business">
        <title>X</title><statement>The system shall do X.</statement>
        <source>User</source><priority>Must</priority><verification>Test</verification>
        <acceptance><criteria>Given: a When: b Then: c</criteria></acceptance>
      </req>`,
    );
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(dest)!;
    expect(doc.specs[0]!.ticket_id).toBe("CTORNDGAIN-9999");
    expect(doc.specs[0]!.classification).toBe("business");
  });
});

describe("cmdMigrate — missing id within a source is report-don't-drop", () => {
  it("excludes only the id-less block, migrating the rest and recording an error finding", async () => {
    const src = sourceFile(
      "mixed.md",
      `<req type="FR"><title>No id</title></req>` +
        `<req id="FR-CHK-0001" type="FR">
          <title>Has id</title><statement>The system shall do X.</statement>
          <source>User</source><priority>Must</priority><verification>Test</verification>
          <acceptance><criteria>Given: a When: b Then: c</criteria></acceptance>
        </req>`,
    );
    const dest = specsFile();
    const result = await cmdMigrate([src], dest);
    expect(result.ok).toBe(true);
    expect(result.result!.migrated).toBe(1);
    expect(result.result!.warnings.some((w) => w.check === "migrate_missing_id" && w.severity === "error")).toBe(true);
  });
});
