/**
 * Unit tests for commands/specs/validate.ts (runValidation / cmdValidate). FR-SPECS-0021.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdValidate, runValidation } from "../../../src/commands/specs/validate.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { makeDoc, makeSpec } from "../../fixtures/specs.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-specs-validate-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function specsFile(name = "specs.json"): string {
  return path.join(tmpDir, name);
}

describe("cmdValidate — clean document", () => {
  it("returns ok=true with no findings for a fully clean document", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await cmdValidate(file);
    expect(result.ok).toBe(true);
    expect(result.result!.ok).toBe(true);
    expect(result.result!.findings).toEqual([]);
    expect(result.result!.error_count).toBe(0);
  });
});

describe("cmdValidate — structural error findings", () => {
  it("reports schema_completeness error and ok=false for a spec missing title", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ title: "" })] }));
    const result = await cmdValidate(file);
    expect(result.ok).toBe(true); // envelope succeeds; validation itself reports the finding
    expect(result.result!.ok).toBe(false);
    expect(result.result!.findings.some((f) => f.check === "schema_completeness" && f.severity === "error")).toBe(true);
  });

  it("reports a depends_on cycle as an error finding for both participants", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [
          makeSpec({ id: "FR-CHK-0001", depends_on: ["FR-CHK-0002"] }),
          makeSpec({ id: "FR-CHK-0002", depends_on: ["FR-CHK-0001"] }),
        ],
      }),
    );
    const result = await cmdValidate(file);
    const cycleFindings = result.result!.findings.filter((f) => f.check === "depends_acyclic");
    expect(cycleFindings).toHaveLength(2);
    expect(cycleFindings.every((f) => f.severity === "error")).toBe(true);
  });

  it("reports uniqueness error when two specs share an id", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001" }), makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "uniqueness")).toBe(true);
  });

  it("reports reference_integrity error for an unresolved depends_on target", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ depends_on: ["FR-CHK-9999"] })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "reference_integrity")).toBe(true);
  });

  it("reports acceptance_completeness error for an empty acceptance array", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ acceptance: [] })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "acceptance_completeness" && f.severity === "error")).toBe(true);
  });
});

describe("cmdValidate — remaining structural error findings", () => {
  it("reports id_format error for a malformed id", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-8" })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "id_format" && f.severity === "error")).toBe(true);
  });

  it("reports area_registration error for an unregistered area", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ areas: [], specs: [makeSpec({ id: "FR-CHK-0001" })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "area_registration")).toBe(true);
  });

  it.each([
    ["source_enum", { source: "Magic" }],
    ["priority_enum", { priority: "Urgent" }],
    ["verification_enum", { verification: "Vibes" }],
  ] as const)("reports %s error for a bad enum value", async (check, override) => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec(override as Record<string, unknown>)] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === check && f.severity === "error")).toBe(true);
  });

  it.each([
    ["depends_on too long", { depends_on: Array.from({ length: 51 }, (_, i) => `FR-CHK-${String(i).padStart(4, "0")}` )}],
    ["related too long", { related: Array.from({ length: 51 }, (_, i) => `FR-CHK-${String(i).padStart(4, "0")}` )}],
    ["acceptance too long", { acceptance: Array.from({ length: 51 }, () => ({ given: "g", when: "w", then: "t" })) }],
    ["id/title too long", { title: "x".repeat(300) }],
    ["statement too long", { statement: "x".repeat(20_001) }],
    ["rationale too long", { rationale: "x".repeat(20_001) }],
  ])("reports size_limits error for %s", async (_label, override) => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec(override as Record<string, unknown>)] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "size_limits")).toBe(true);
  });

  it("reports a document-level size_limits finding attributed to (document) when total specs exceed the max", async () => {
    const file = specsFile();
    const specs = Array.from({ length: 1001 }, (_, i) => makeSpec({ id: `FR-CHK-${String(i).padStart(4, "0")}` }));
    saveSpecs(file, makeDoc({ specs }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.id === "(document)" && f.check === "size_limits")).toBe(true);
  });
});

describe("cmdValidate — phrasing warning findings (never affect ok)", () => {
  it("reports ears_pattern warning for a non-conformant FR statement without affecting ok", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ type: "FR", statement: "The system handles things nicely." })] }));
    const result = await cmdValidate(file);
    expect(result.result!.ok).toBe(true);
    expect(result.result!.findings.some((f) => f.check === "ears_pattern" && f.severity === "warning")).toBe(true);
  });

  it("reports measurable_nfr warning for an NFR statement lacking a metric", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ type: "NFR", statement: "The system shall be fast." })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "measurable_nfr" && f.severity === "warning")).toBe(true);
  });

  it("does not report measurable_nfr for a well-formed NFR statement", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ specs: [makeSpec({ type: "NFR", statement: "validate shall complete within 500 ms for 1000 specs." })] }),
    );
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "measurable_nfr")).toBe(false);
  });

  it("reports duplicate_statement warning for two specs sharing a statement", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        specs: [
          makeSpec({ id: "FR-CHK-0001", statement: "The system shall log writes." }),
          makeSpec({ id: "FR-CHK-0002", statement: "The system shall log writes." }),
        ],
      }),
    );
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "duplicate_statement")).toBe(true);
    expect(result.result!.ok).toBe(true);
  });
});

describe("cmdValidate — scoped by query", () => {
  it("checks only the specs matching a filter scope", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({
        areas: [{ code: "CHK", name: "CHK" }, { code: "OTHER", name: "OTHER" }],
        specs: [
          makeSpec({ id: "FR-CHK-0001", title: "" }),
          makeSpec({ id: "FR-OTHER-0001", statement: "The system shall do something else entirely." }),
        ],
      }),
    );
    const result = await cmdValidate(file, "area:OTHER");
    expect(result.result!.findings).toEqual([]);
  });
});

describe("cmdValidate — errors", () => {
  it("returns specs_not_found for a missing document", async () => {
    const result = await cmdValidate(specsFile("nope.json"));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("specs_not_found");
  });

  it("returns invalid_filter for a bad query scope", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec()] }));
    const result = await cmdValidate(file, "bogus:x");
    expect(result.ok).toBe(false);
    expect(result.error).toBe("invalid_filter");
  });
});

describe("runValidation — standalone (used directly by approve.ts)", () => {
  it("returns [] for a clean target list", () => {
    const doc = makeDoc({ specs: [makeSpec()] });
    expect(runValidation(doc, doc.specs)).toEqual([]);
  });

  it("only emits findings for ids in the targets array, not the whole document", () => {
    const specA = makeSpec({ id: "FR-CHK-0001", title: "" }); // would fail schema_completeness
    const specB = makeSpec({ id: "FR-CHK-0002", statement: "The system shall do something different." });
    const doc = makeDoc({ specs: [specA, specB] });
    const findings = runValidation(doc, [specB]);
    expect(findings).toEqual([]);
  });
});
