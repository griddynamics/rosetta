/**
 * Unit tests for commands/specs/write.ts (applyBatchWrite) and commands/specs/aggregate.ts
 * (aggregate). FR-SPECS-0030, 0040, 0070.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { applyBatchWrite, type BatchBuild } from "../../../src/commands/specs/write.js";
import { aggregate } from "../../../src/commands/specs/aggregate.js";
import { loadSpecs, saveSpecs, type SpecsDocument } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-write-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

// ---------------------------------------------------------------------------
// aggregate — single-string format
// ---------------------------------------------------------------------------

describe("aggregate", () => {
  it("formats a single rejection", () => {
    expect(aggregate("missing_id", [{ ref: "index 0", reason: "missing_id" }])).toBe(
      "missing_id: 1 item(s) rejected | [index 0] missing_id",
    );
  });

  it("formats multiple rejections, semicolon-joined, both named", () => {
    const s = aggregate("invalid_type", [
      { ref: "FR-CHK-0001", reason: "invalid_type" },
      { ref: "index 2", reason: "missing_id" },
    ]);
    expect(s).toBe("invalid_type: 2 item(s) rejected | [FR-CHK-0001] invalid_type; [index 2] missing_id");
    expect(s).toContain("FR-CHK-0001");
    expect(s).toContain("index 2");
  });

  it("formats zero rejections (degenerate case)", () => {
    expect(aggregate("some_code", [])).toBe("some_code: 0 item(s) rejected | ");
  });
});

// ---------------------------------------------------------------------------
// applyBatchWrite — happy path, actor/time stamping, first-create bypass
// ---------------------------------------------------------------------------

describe("applyBatchWrite — first-create bypass (allowCreate)", () => {
  it("creates the document when allowCreate is set and the file does not exist", async () => {
    const file = specsFile("new.json");
    const build: BatchBuild<string> = (doc) => {
      doc.specs = [...(doc.specs ?? []), makeSpec({ id: "FR-CHK-0001" })];
      return { ok: true, affected: ["FR-CHK-0001"], result: "created" };
    };
    const result = await applyBatchWrite(file, build, { allowCreate: true, actor: "tester", system: "Checkout" });
    expect(result.ok).toBe(true);
    expect(result.result!.previous_version).toBeNull();
    expect(fs.existsSync(file)).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.system).toBe("Checkout");
    expect(doc.specs).toHaveLength(1);
    expect(doc.specs[0]!.changed_by).toBe("tester");
  });

  it("does not bypass when the file already exists, even with allowCreate", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const build: BatchBuild<string> = (doc) => {
      doc.specs = [...(doc.specs ?? []), makeSpec({ id: "FR-CHK-0002" })];
      return { ok: true, affected: ["FR-CHK-0002"], result: "ok" };
    };
    const result = await applyBatchWrite(file, build, { allowCreate: true });
    expect(result.ok).toBe(true);
    expect(result.result!.previous_version).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// applyBatchWrite — caller-supplied `system` (FR-SPECS-0002, 0010, 0025)
// ---------------------------------------------------------------------------

describe("applyBatchWrite — system reconciliation (FR-SPECS-0002)", () => {
  it("rejects a create call with missing_system when no system is supplied", async () => {
    const file = specsFile("new.json");
    const build: BatchBuild<string> = (doc) => {
      doc.specs = [...(doc.specs ?? []), makeSpec({ id: "FR-CHK-0001" })];
      return { ok: true, affected: [], result: "created" };
    };
    const result = await applyBatchWrite(file, build, { allowCreate: true });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("missing_system");
    expect(result.include_help).toBe(true);
    expect(fs.existsSync(file)).toBe(false);
  });

  it("creates the document with the supplied system when creating", async () => {
    const file = specsFile("new.json");
    const build: BatchBuild<string> = (doc) => ({ ok: true, affected: [], result: "ok" });
    const result = await applyBatchWrite(file, build, { allowCreate: true, system: "Checkout" });
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.system).toBe("Checkout");
  });

  it("adopts the supplied name when the stored system is empty", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ system: "" }));
    const build: BatchBuild<string> = () => ({ ok: true, affected: [], result: "ok" });
    const result = await applyBatchWrite(file, build, { system: "Checkout" });
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.system).toBe("Checkout");
  });

  it("accepts a supplied name identical to the stored one, unchanged", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ system: "Checkout" }));
    const build: BatchBuild<string> = () => ({ ok: true, affected: [], result: "ok" });
    const result = await applyBatchWrite(file, build, { system: "Checkout" });
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.system).toBe("Checkout");
  });

  it("rejects with system_mismatch when the supplied name differs from the stored one", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ system: "Checkout" }));
    const build: BatchBuild<string> = () => ({ ok: true, affected: [], result: "ok" });
    const result = await applyBatchWrite(file, build, { system: "Billing" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("system_mismatch");
    expect(loadSpecs(file)!.system).toBe("Checkout"); // unchanged
  });

  it("leaves the stored system unchanged when none is supplied", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ system: "Checkout" }));
    const build: BatchBuild<string> = () => ({ ok: true, affected: [], result: "ok" });
    const result = await applyBatchWrite(file, build);
    expect(result.ok).toBe(true);
    expect(loadSpecs(file)!.system).toBe("Checkout");
  });
});

describe("applyBatchWrite — actor/time stamping (FR-SPECS-0041/0042)", () => {
  it("stamps changed/changed_by identically on every affected spec in the batch", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", changed: "" }), makeSpec({ id: "FR-CHK-0002", changed: "" })] }),
    );
    const build: BatchBuild<string> = (doc) => ({ ok: true, affected: ["FR-CHK-0001", "FR-CHK-0002"], result: "ok" });
    const result = await applyBatchWrite(file, build, { actor: "alice" });
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.changed_by).toBe("alice");
    expect(doc.specs[1]!.changed_by).toBe("alice");
    expect(doc.specs[0]!.changed).toBe(doc.specs[1]!.changed);
    expect(doc.specs[0]!.changed).toMatch(/Z$/);
  });

  it("does not stamp a spec not present in affected", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", changed_by: "original" })] }));
    const build: BatchBuild<string> = () => ({ ok: true, affected: [], result: "ok" });
    await applyBatchWrite(file, build, { actor: "alice" });
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.changed_by).toBe("original");
  });
});

describe("applyBatchWrite — all-or-nothing (FR-SPECS-0030)", () => {
  it("writes nothing when build returns ok:false", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const build: BatchBuild<string> = () => ({ ok: false, error: "some_error" });
    const result = await applyBatchWrite(file, build);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("some_error");
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1); // unchanged
  });

  it("runs the post-batch integrity chain and rejects a resulting duplicate_id", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const build: BatchBuild<string> = (doc) => {
      doc.specs = [...doc.specs, makeSpec({ id: "FR-CHK-0001" })]; // duplicate
      return { ok: true, affected: [], result: "ok" };
    };
    const result = await applyBatchWrite(file, build);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("duplicate_id");
    const doc = loadSpecs(file)!;
    expect(doc.specs).toHaveLength(1); // nothing written
  });

  it("runs the integrity chain in order: size limits before uniqueness", async () => {
    // A build that introduces both an oversized document AND a duplicate id — size_limit_exceeded
    // must win per the fixed order (validateSizeLimits -> validateUniqueIds -> ...).
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", title: "x".repeat(300) })] }));
    const build: BatchBuild<string> = (doc) => {
      doc.specs = [...doc.specs, makeSpec({ id: "FR-CHK-0001" })];
      return { ok: true, affected: [], result: "ok" };
    };
    const result = await applyBatchWrite(file, build);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("size_limit_exceeded");
  });

  it("rejects a dependency_cycle over the resulting state", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0002" })] }));
    const build: BatchBuild<string> = (doc) => {
      doc.specs[0]!.depends_on = ["FR-CHK-0002"];
      doc.specs[1]!.depends_on = ["FR-CHK-0001"];
      return { ok: true, affected: [], result: "ok" };
    };
    const result = await applyBatchWrite(file, build);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("dependency_cycle");
  });
});

describe("applyBatchWrite — document errors (FR-SPECS-0071)", () => {
  it("returns specs_not_found for a missing document without allowCreate", async () => {
    const result = await applyBatchWrite(specsFile("nope.json"), () => ({ ok: true, affected: [], result: "ok" }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });

  it("returns specs_file_corrupted for invalid JSON", async () => {
    const file = specsFile();
    fs.writeFileSync(file, "{{not json{{");
    const result = await applyBatchWrite(file, () => ({ ok: true, affected: [], result: "ok" }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_file_corrupted");
  });
});

describe("applyBatchWrite — previous_version surfaced (FR-SPECS-0070)", () => {
  it("surfaces the .bak000 backup path as previous_version on a second write", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await applyBatchWrite(file, () => ({ ok: true, affected: [], result: "ok" }));
    expect(result.ok).toBe(true);
    expect(result.result!.previous_version).toContain(".bak000");
    expect(fs.existsSync(result.result!.previous_version!)).toBe(true);
  });
});
