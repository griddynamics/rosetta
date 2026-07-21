/**
 * Unit tests for commands/specs/approve.ts (cmdApprove). FR-SPECS-0017.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdApprove } from "../../../src/commands/specs/approve.js";
import { loadSpecs, saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-approve-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

function seedOne(overrides: Parameters<typeof makeSpec>[0] = {}): string {
  const file = specsFile();
  saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", ...overrides })] }));
  return file;
}

describe("cmdApprove — happy path", () => {
  it("moves a valid Draft spec to Approved and sets approved_by to the resolved actor", async () => {
    const file = seedOne({ status: "Draft" });
    const result = await cmdApprove(file, ["FR-CHK-0001"], "alice");
    expect(result.ok).toBe(true);
    expect(result.result!.updated).toEqual([{ id: "FR-CHK-0001", status: "Approved" }]);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Approved");
    expect(doc.specs[0]!.approved_by).toBe("alice");
  });

  it("moves a Modified spec to Approved", async () => {
    const file = seedOne({ status: "Modified" });
    const result = await cmdApprove(file, ["FR-CHK-0001"], "alice");
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Approved");
  });

  it("is idempotent on an already-Approved spec (no change, no error)", async () => {
    const file = seedOne({ status: "Approved", approved_by: "bob" });
    const result = await cmdApprove(file, ["FR-CHK-0001"], "alice");
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Approved");
    // Approving an already-Approved spec passes through unchanged — approved_by keeps its prior value.
    expect(doc.specs[0]!.approved_by).toBe("bob");
  });
});

describe("cmdApprove — validation gate (FR-SPECS-0017/0021)", () => {
  it("refuses the whole batch with validation_failed when a target has an error-level finding, naming the failing id and the blocking check", async () => {
    // Missing required field (title) is a structural error-severity finding, reported by
    // validate.ts as check "schema_completeness". The aggregated error must let the caller act
    // on it without re-running validate themselves — so it names both the failing spec id and
    // which check blocked it, not just the bare "validation_failed" code.
    const file = seedOne({ status: "Draft", title: "" });
    const result = await cmdApprove(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("validation_failed");
    expect(result.error).toContain("FR-CHK-0001");
    expect(result.error).toContain("schema_completeness");
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft"); // nothing approved
  });

  it("does not block on a warning-only finding (non-EARS, no-modal-verb FR statement)", async () => {
    // "The system handles things nicely." matches no EARS pattern and uses no modal verb —
    // both warning-severity findings — but every structural (error-severity) check stays clean.
    const file = seedOne({ status: "Draft", type: "FR", statement: "The system handles things nicely." });
    const result = await cmdApprove(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(true);
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Approved");
  });

  it("refuses a batch of two when only one target fails validation (all-or-nothing), naming only the failing id and its check", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [makeSpec({ id: "FR-CHK-0001", status: "Draft" }), makeSpec({ id: "FR-CHK-0002", status: "Draft", title: "" })],
      }),
    );
    const result = await cmdApprove(file, ["FR-CHK-0001", "FR-CHK-0002"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("FR-CHK-0002");
    expect(result.error).toContain("schema_completeness");
    expect(result.error).not.toContain("FR-CHK-0001"); // the valid target is never named as a failure
    const doc = loadSpecs(file)!;
    expect(doc.specs[0]!.status).toBe("Draft"); // neither approved
    expect(doc.specs[1]!.status).toBe("Draft");
  });
});

describe("cmdApprove — defensive fallbacks for malformed inputs", () => {
  it("treats ids=undefined as an empty batch rather than throwing", async () => {
    const file = seedOne({ status: "Draft" });
    const result = await cmdApprove(file, undefined as unknown as string[]);
    expect(result.ok).toBe(true);
    expect(result.result!.updated).toEqual([]);
  });
});

describe("cmdApprove — transitions and errors", () => {
  it("returns invalid_transition for a Removed target", async () => {
    const file = seedOne({ status: "Removed" });
    const result = await cmdApprove(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_transition");
  });

  it("returns invalid_transition for a Deprecated target", async () => {
    const file = seedOne({ status: "Deprecated" });
    const result = await cmdApprove(file, ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("invalid_transition");
  });

  it("returns target_not_found for a missing id", async () => {
    const file = seedOne();
    const result = await cmdApprove(file, ["FR-CHK-9999"]);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("target_not_found");
  });

  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdApprove(specsFile("nope.json"), ["FR-CHK-0001"]);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });
});
