/**
 * Unit tests for commands/specs/validate.ts (runValidation / cmdValidate). FR-SPECS-0021.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { cmdValidate, runValidation } from "../../../src/commands/specs/validate.js";
import { saveSpecs } from "../../../src/commands/specs/core.js";
import { SPECS_MAX_EVIDENCE_PER_SPEC, SPECS_MAX_SPECS } from "../../../src/shared/constants.js";
import { makeAcceptance, makeDoc, makeSpec } from "../../fixtures/specs.js";

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
    ["acceptance too long", { acceptance: Array.from({ length: 51 }, (_, i) => makeAcceptance({ id: `FR-CHK-0001.AC${i + 1}` })) }],
    ["evidence too long", { evidence: Array.from({ length: SPECS_MAX_EVIDENCE_PER_SPEC + 1 }, (_, i) => `src/cart.ts:${i + 1}-${i + 2}`) }],
    ["id/title too long", { title: "x".repeat(300) }],
    ["statement too long", { statement: "x".repeat(20_001) }],
    ["rationale too long", { rationale: "x".repeat(20_001) }],
  ])("reports size_limits error for %s", async (_label, override) => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec(override as Record<string, unknown>)] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "size_limits")).toBe(true);
  });

  // Explicit timeout, not the 5s default: this case writes and re-reads a document of
  // SPECS_MAX_SPECS + 1 units (a multi-megabyte file) and validates every one of them, which takes
  // ~2.5s uncontended and can exceed the default once the whole suite runs in parallel under
  // coverage instrumentation. The input scale is the point of the test, so the headroom is raised
  // rather than the document shrunk.
  it(
    "reports a document-level size_limits finding attributed to (document) when total specs exceed the max",
    async () => {
      const file = specsFile();
      const specs = Array.from({ length: SPECS_MAX_SPECS + 1 }, (_, i) => makeSpec({ id: `FR-CHK-${String(i).padStart(4, "0")}` }));
      saveSpecs(file, makeDoc({ specs }));
      const result = await cmdValidate(file);
      expect(result.result!.findings.some((f) => f.id === "(document)" && f.check === "size_limits")).toBe(true);
    },
    30_000,
  );

  // FR-SPECS-0001 — level is machine-checkable integrity, same bucket as the other enums.
  it("reports level_enum error for a level outside the enum", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ level: "Module" as never })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "level_enum" && f.severity === "error")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Criterion-level findings — FR-SPECS-0006/0021. EARS conformance is decided per criterion from
// its declared pattern and the condition word it carries; the statement text is not pattern-matched.
// ---------------------------------------------------------------------------

describe("cmdValidate — criterion findings", () => {
  async function findingsFor(...specs: ReturnType<typeof makeSpec>[]) {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs }));
    const result = await cmdValidate(file);
    return result.result!.findings;
  }

  it("reports criterion_id_format error when a criterion id does not read <spec-id>.AC<n>", async () => {
    const findings = await findingsFor(makeSpec({ acceptance: [makeAcceptance({ id: "AC1" })] }));
    expect(findings.some((f) => f.check === "criterion_id_format" && f.severity === "error")).toBe(true);
  });

  it("names the offending criterion in the criterion_id_format message", async () => {
    const findings = await findingsFor(makeSpec({ acceptance: [makeAcceptance({ id: "AC1" })] }));
    expect(findings.find((f) => f.check === "criterion_id_format")!.message).toContain("AC1");
  });

  it("falls back to the criterion's position when it carries no id at all", async () => {
    const findings = await findingsFor(makeSpec({ acceptance: [makeAcceptance({ id: "" })] }));
    expect(findings.find((f) => f.check === "criterion_id_format")!.message).toContain("criterion 1");
  });

  it("reports duplicate_criterion_id error when two criteria in one spec share an id", async () => {
    const criterion = makeAcceptance({ id: "FR-CHK-0001.AC1" });
    const findings = await findingsFor(makeSpec({ acceptance: [criterion, { ...criterion }] }));
    const finding = findings.find((f) => f.check === "duplicate_criterion_id");
    expect(finding!.severity).toBe("error");
    expect(finding!.message).toContain("FR-CHK-0001.AC1");
  });

  it("reports criterion_ears error when the condition word disagrees with the declared pattern", async () => {
    const acceptance = [makeAcceptance({ id: "FR-CHK-0001.AC1", ears: "state", when: "an item is added" })];
    const findings = await findingsFor(makeSpec({ acceptance }));
    expect(findings.some((f) => f.check === "criterion_ears" && f.severity === "error")).toBe(true);
  });

  it("reports criterion_ears error when a ubiquitous criterion carries a condition word", async () => {
    const acceptance = [makeAcceptance({ id: "FR-CHK-0001.AC1", ears: "ubiquitous" })];
    const findings = await findingsFor(makeSpec({ acceptance }));
    expect(findings.some((f) => f.check === "criterion_ears")).toBe(true);
  });

  it("reports criterion_ears error when a criterion carries more than one condition word", async () => {
    const acceptance = [makeAcceptance({ id: "FR-CHK-0001.AC1", ears: "event", when: "a", while: "b" })];
    const findings = await findingsFor(makeSpec({ acceptance }));
    expect(findings.some((f) => f.check === "criterion_ears" && f.message.includes("more than one condition word"))).toBe(true);
  });

  it("reports no criterion_ears finding for each conforming pattern", async () => {
    const conforming = [
      makeAcceptance({ id: "FR-CHK-0001.AC1", ears: "ubiquitous", when: undefined }),
      makeAcceptance({ id: "FR-CHK-0001.AC2", ears: "event", when: "a trigger arrives" }),
      makeAcceptance({ id: "FR-CHK-0001.AC3", ears: "state", when: undefined, while: "the cache is warm" }),
      makeAcceptance({ id: "FR-CHK-0001.AC4", ears: "optional", when: undefined, where: "telemetry is enabled" }),
      makeAcceptance({ id: "FR-CHK-0001.AC5", ears: "unwanted", when: undefined, if: "the disk is full" }),
    ];
    const findings = await findingsFor(makeSpec({ acceptance: conforming }));
    expect(findings).toEqual([]);
  });

  it("reports acceptance_completeness error when a criterion names no responder", async () => {
    const findings = await findingsFor(makeSpec({ acceptance: [makeAcceptance({ system: "" })] }));
    expect(findings.some((f) => f.check === "acceptance_completeness" && f.severity === "error")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Location completeness — FR-SPECS-0006 AC10-AC12. The level decides the severity.
// ---------------------------------------------------------------------------

describe("cmdValidate — location completeness", () => {
  async function findingsFor(spec: ReturnType<typeof makeSpec>) {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [spec] }));
    return (await cmdValidate(file)).result!.findings;
  }

  it("reports a location_completeness error when a Component names no subsystem", async () => {
    const findings = await findingsFor(makeSpec({ level: "Component", subsystem: "" }));
    const finding = findings.find((f) => f.check === "location_completeness");
    expect(finding!.severity).toBe("error");
    expect(finding!.message).toContain("subsystem");
  });

  it("reports a location_completeness error when a Subsystem names no subsystem", async () => {
    const findings = await findingsFor(makeSpec({ level: "Subsystem", subsystem: "", component: "" }));
    expect(findings.some((f) => f.check === "location_completeness" && f.severity === "error")).toBe(true);
  });

  it("reports only a warning when a System names neither, and leaves ok true", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ level: "System", subsystem: "", component: "" })] }));
    const result = await cmdValidate(file);
    expect(result.result!.ok).toBe(true);
    const finding = result.result!.findings.find((f) => f.check === "location_completeness");
    expect(finding!.severity).toBe("warning");
    expect(finding!.message).toBe("Neither a subsystem nor a component is named.");
  });

  it("reports nothing when a System names one of the two", async () => {
    const findings = await findingsFor(makeSpec({ level: "System", subsystem: "", component: "cart" }));
    expect(findings.some((f) => f.check === "location_completeness")).toBe(false);
  });
});

describe("cmdValidate — phrasing warning findings (never affect ok)", () => {
  it("reports modal_verbs warning for a statement using no modal verb, without affecting ok", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ type: "FR", statement: "The system handles things nicely." })] }));
    const result = await cmdValidate(file);
    expect(result.result!.ok).toBe(true);
    expect(result.result!.findings.some((f) => f.check === "modal_verbs" && f.severity === "warning")).toBe(true);
  });

  it("does not report modal_verbs for a statement that uses one", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ statement: "The system shall log every write." })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "modal_verbs")).toBe(false);
  });

  // FR-SPECS-0021 AC4 — reports the empty field, never that the requirement is unfounded.
  it("reports missing_evidence warning when the source names code and evidence is empty", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ source: "Sources", evidence: [] })] }));
    const result = await cmdValidate(file);
    expect(result.result!.ok).toBe(true);
    expect(result.result!.findings.some((f) => f.check === "missing_evidence" && f.severity === "warning")).toBe(true);
  });

  it("does not report missing_evidence when the code-derived spec cites a location", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ source: "Sources", evidence: ["src/cart.ts:10-24"] })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "missing_evidence")).toBe(false);
  });

  // FR-SPECS-0004 — the nine codes are recommended, never mandatory: an NFR outside them is
  // accepted on write and only reported here.
  it("reports recommended_nfr_area warning for an NFR outside the nine codes", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "NFR-CHK-0001", type: "NFR" })] }));
    const result = await cmdValidate(file);
    expect(result.result!.ok).toBe(true);
    expect(result.result!.findings.some((f) => f.check === "recommended_nfr_area" && f.severity === "warning")).toBe(true);
  });

  it("does not report recommended_nfr_area for an NFR inside the nine codes", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "NFR-PERF-0001", type: "NFR", statement: "The system shall respond within 500 ms." })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "recommended_nfr_area")).toBe(false);
  });

  it("does not report recommended_nfr_area for a functional requirement outside the nine codes", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ specs: [makeSpec({ id: "FR-CHK-0001", type: "FR" })] }));
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "recommended_nfr_area")).toBe(false);
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

// FR-SPECS-0021 AC9 — validate is read-only: it registers no area, seeds no reserved code and
// touches no registry, all of which are write-path concerns.
describe("cmdValidate — never mutates the document", () => {
  it("leaves the stored areas exactly as they were", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ areas: [{ code: "CHK", name: "Checkout" }], specs: [makeSpec()] }));
    const before = fs.readFileSync(file, "utf8");
    await cmdValidate(file);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).areas).toEqual(JSON.parse(before).areas);
  });

  it("does not seed the nine reserved codes onto a document that lacks them", async () => {
    const file = specsFile();
    saveSpecs(file, makeDoc({ areas: [{ code: "CHK", name: "Checkout" }], specs: [makeSpec()] }));
    await cmdValidate(file);
    expect(JSON.parse(fs.readFileSync(file, "utf8")).areas).toEqual([{ code: "CHK", name: "Checkout" }]);
  });

  // FR-SPECS-0004 AC4 — a reserved code counts as registered even when a legacy document's
  // registry has not materialised it, so a read-only pass over such a document stays clean.
  it("reports no area_registration finding for a reserved code the document has not materialised", async () => {
    const file = specsFile();
    saveSpecs(
      file,
      makeDoc({ areas: [], specs: [makeSpec({ id: "NFR-PERF-0001", type: "NFR", statement: "The system shall respond within 500 ms." })] }),
    );
    const result = await cmdValidate(file);
    expect(result.result!.findings.some((f) => f.check === "area_registration")).toBe(false);
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
