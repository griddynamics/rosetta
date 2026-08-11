/**
 * FR-SPECS-0009 / FR-SPECS-0016 — identifiers are never reused.
 *
 * A purged spec leaves the document, so its identity is kept in the document's `purged_ids`
 * registry and the uniqueness check spans it (FR-SPECS-0009 AC4). A soft-deleted spec stays in
 * the document, so its id collides naturally and needs no registry entry.
 *
 * Driven through the real exported commands (cmdAdd, cmdPurge, cmdDelete) rather than the
 * low-level helpers, so each case exercises the whole contract a caller meets: integrity checks,
 * area auto-registration, and file I/O.
 *
 * Isolation and idempotency: every test gets its own `fs.mkdtempSync` directory created in
 * `beforeEach` and removed in `afterEach`, and every document is built from scratch inside the
 * test by cmdAdd. No fixture module, no module-level mutable state, no test reads a file another
 * test wrote — so the file passes in any order and passes repeatedly.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdAdd } from "../../../src/commands/specs/add.js";
import { cmdPurge } from "../../../src/commands/specs/purge.js";
import { cmdDelete } from "../../../src/commands/specs/delete.js";
import { loadSpecs, type SpecsDocument } from "../../../src/commands/specs/core.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-purged-ids-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

/** A minimal, valid spec-unit input in the current model — criterion is {id, ears, system, shall}. */
function specInput(id: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    type: id.split("-")[0],
    title: `title for ${id}`,
    statement: `The system shall behave as ${id} describes.`,
    source: "User",
    priority: "Must",
    verification: "Test",
    acceptance: [{ id: `${id}.AC1`, ears: "ubiquitous", system: "the system", shall: "hold" }],
    ...over,
  };
}

function readDoc(file: string): SpecsDocument {
  const doc = loadSpecs(file);
  expect(doc, `no document at ${file}`).not.toBeNull();
  return doc!;
}

describe("purge records the id so it can never be reused (FR-SPECS-0009 AC4 / FR-SPECS-0016)", () => {
  it("writes the purged id into the document's purged_ids registry", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);
    expect(readDoc(file).purged_ids).toEqual([]);

    const purge = await cmdPurge(file, ["FR-CHK-0001"], true);
    expect(purge.ok).toBe(true);
    expect(purge.result!.purged).toEqual(["FR-CHK-0001"]);

    const doc = readDoc(file);
    expect(doc.purged_ids).toEqual(["FR-CHK-0001"]);
    expect(doc.specs.map((s) => s.id)).toEqual([]); // the content is gone, the identity is not
  });

  it("rejects a later add that reuses a purged id, as duplicate_id", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);
    expect((await cmdPurge(file, ["FR-CHK-0001"], true)).ok).toBe(true);

    const readd = await cmdAdd(file, [specInput("FR-CHK-0001", { title: "a different unit entirely" })]);
    expect(readd.ok).toBe(false);
    expect(readd.error).toContain("duplicate_id");

    const doc = readDoc(file);
    expect(doc.specs.map((s) => s.id)).toEqual([]); // nothing written
    expect(doc.purged_ids).toEqual(["FR-CHK-0001"]);
  });

  it("rejects the reuse even when the reusing item is only one of several in the batch", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);
    expect((await cmdPurge(file, ["FR-CHK-0001"], true)).ok).toBe(true);

    const batch = await cmdAdd(file, [specInput("FR-CHK-0002"), specInput("FR-CHK-0001")]);
    expect(batch.ok).toBe(false);
    expect(batch.error).toContain("duplicate_id");
    // all-or-nothing: the innocent sibling is not written either
    expect(readDoc(file).specs.map((s) => s.id)).toEqual([]);
  });

  it("still admits a neighbouring id that was never purged", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);
    expect((await cmdPurge(file, ["FR-CHK-0001"], true)).ok).toBe(true);

    const added = await cmdAdd(file, [specInput("FR-CHK-0002")]);
    expect(added.ok).toBe(true);
    expect(readDoc(file).specs.map((s) => s.id)).toEqual(["FR-CHK-0002"]);
  });

  it("keeps every purged id, across separate purges, and never duplicates an entry", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001"), specInput("FR-CHK-0002")])).ok).toBe(true);
    expect((await cmdPurge(file, ["FR-CHK-0001"], true)).ok).toBe(true);
    expect((await cmdPurge(file, ["FR-CHK-0002"], true)).ok).toBe(true);
    // a repeat purge of an id already gone reports it missing and must not double-register it
    const repeat = await cmdPurge(file, ["FR-CHK-0001"], true);
    expect(repeat.ok).toBe(true);
    expect(repeat.result!.missing).toEqual(["FR-CHK-0001"]);

    const doc = readDoc(file);
    expect([...doc.purged_ids].sort()).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
    expect(doc.purged_ids.length).toBe(new Set(doc.purged_ids).size);
  });
});

describe("a refused purge leaves the registry untouched (FR-SPECS-0016)", () => {
  it("records nothing when the purge is refused for remaining references", async () => {
    const file = specsFile();
    const added = await cmdAdd(file, [
      specInput("FR-CHK-0001"),
      specInput("FR-CHK-0002", { depends_on: ["FR-CHK-0001"] }),
    ]);
    expect(added.ok).toBe(true);

    const before = readDoc(file);

    const purge = await cmdPurge(file, ["FR-CHK-0001"], true);
    expect(purge.ok).toBe(false);
    expect(purge.error).toContain("referenced_by_others");

    const after = readDoc(file);
    // The registry is UNCHANGED — not merely "the purge failed".
    expect(after.purged_ids).toEqual([]);
    expect(after.purged_ids).toEqual(before.purged_ids);
    expect(after.specs).toEqual(before.specs);
    expect(after.updated_at).toBe(before.updated_at);

    // ...and the id therefore remains addable if the spec is ever legitimately removed and re-added.
    expect(after.specs.map((s) => s.id)).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
  });

  it("records nothing when the purge is refused for want of force", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);
    const before = readDoc(file);

    const purge = await cmdPurge(file, ["FR-CHK-0001"], false);
    expect(purge.ok).toBe(false);
    expect(purge.error).toBe("force_required");

    const after = readDoc(file);
    expect(after.purged_ids).toEqual(before.purged_ids);
    expect(after.specs).toEqual(before.specs);
  });

  it("registers nothing for a target that does not exist", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);

    const purge = await cmdPurge(file, ["FR-CHK-9999"], true);
    expect(purge.ok).toBe(true);
    expect(purge.result!.missing).toEqual(["FR-CHK-9999"]);
    expect(purge.result!.purged).toEqual([]);

    const doc = readDoc(file);
    expect(doc.purged_ids).toEqual([]); // a never-existing id is not "taken"
    expect(doc.specs.map((s) => s.id)).toEqual(["FR-CHK-0001"]);
  });

  it("registers both ids when the referrer is purged in the same batch, since nothing outside it refers", async () => {
    const file = specsFile();
    expect(
      (
        await cmdAdd(file, [specInput("FR-CHK-0001"), specInput("FR-CHK-0002", { depends_on: ["FR-CHK-0001"] })])
      ).ok,
    ).toBe(true);

    const purge = await cmdPurge(file, ["FR-CHK-0001", "FR-CHK-0002"], true);
    expect(purge.ok).toBe(true);

    const doc = readDoc(file);
    expect([...doc.purged_ids].sort()).toEqual(["FR-CHK-0001", "FR-CHK-0002"]);
    expect(doc.specs).toEqual([]);
  });
});

describe("a soft-deleted id collides naturally (FR-SPECS-0009)", () => {
  it("is refused as a duplicate without any registry entry, because the removed spec stays in the document", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);

    const del = await cmdDelete(file, ["FR-CHK-0001"]);
    expect(del.ok).toBe(true);

    const afterDelete = readDoc(file);
    expect(afterDelete.specs.map((s) => s.id)).toEqual(["FR-CHK-0001"]); // still present
    expect(afterDelete.specs[0].status).toBe("Removed");
    expect(afterDelete.purged_ids).toEqual([]); // soft delete records nothing — it does not need to

    const readd = await cmdAdd(file, [specInput("FR-CHK-0001", { title: "a different unit entirely" })]);
    expect(readd.ok).toBe(false);
    expect(readd.error).toContain("duplicate_id");

    const doc = readDoc(file);
    expect(doc.specs).toHaveLength(1);
    expect(doc.specs[0].title).toBe("title for FR-CHK-0001"); // the original, not the impostor
  });

  it("stays taken after the removed spec is purged too — now via the registry", async () => {
    const file = specsFile();
    expect((await cmdAdd(file, [specInput("FR-CHK-0001")])).ok).toBe(true);
    expect((await cmdDelete(file, ["FR-CHK-0001"])).ok).toBe(true);
    expect((await cmdPurge(file, ["FR-CHK-0001"], true)).ok).toBe(true);

    const doc = readDoc(file);
    expect(doc.specs).toEqual([]);
    expect(doc.purged_ids).toEqual(["FR-CHK-0001"]);

    const readd = await cmdAdd(file, [specInput("FR-CHK-0001")]);
    expect(readd.ok).toBe(false);
    expect(readd.error).toContain("duplicate_id");
  });
});
