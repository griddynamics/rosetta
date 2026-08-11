/**
 * Unit tests for commands/specs/errors.ts — describeError fallback. FR-SPECS-0043.
 */
import { describe, it, expect } from "vitest";
import {
  describeError,
  TEMPLATES,
  ERR_SPECS_NOT_FOUND,
  ERR_INVALID_LEVEL,
  ERR_INVALID_EARS,
  ERR_DUPLICATE_CRITERION_ID,
  ERR_ID_TYPE_MISMATCH,
} from "../../../src/commands/specs/errors.js";

describe("describeError", () => {
  it("returns the authored template for a known code", () => {
    expect(describeError(ERR_SPECS_NOT_FOUND)).toBe("The specs document was not found at the given path.");
  });

  it("returns the code itself when it has no authored template", () => {
    expect(describeError("some_unmapped_code")).toBe("some_unmapped_code");
  });
});

// The four codes the EARS-criterion model added. Each needs its own template: describeError falls
// back to the bare code, so a missing template would silently ship an error message that is just
// an identifier.
describe("the criterion-model error codes", () => {
  it.each([
    [ERR_INVALID_LEVEL, "invalid_level"],
    [ERR_INVALID_EARS, "invalid_ears"],
    [ERR_DUPLICATE_CRITERION_ID, "duplicate_criterion_id"],
    [ERR_ID_TYPE_MISMATCH, "id_type_mismatch"],
  ])("exports %s under its documented name", (code, expected) => {
    expect(code).toBe(expected);
  });

  it.each([ERR_INVALID_LEVEL, ERR_INVALID_EARS, ERR_DUPLICATE_CRITERION_ID, ERR_ID_TYPE_MISMATCH])(
    "describes %s with authored prose, not the bare code",
    (code) => {
      expect(describeError(code)).not.toBe(code);
      expect(describeError(code).length).toBeGreaterThan(code.length);
    },
  );

  it("names the three levels in the invalid_level template", () => {
    expect(describeError(ERR_INVALID_LEVEL)).toBe("A spec's level is not one of System, Subsystem, Component.");
  });

  it("names the five patterns in the invalid_ears template", () => {
    expect(describeError(ERR_INVALID_EARS)).toContain("ubiquitous, event, state, optional, unwanted");
  });
});

// FR-SPECS-0043 — the templates describe the KIND of failure generically. A Rosetta-internal id,
// ticket id, source path or module name in one would leak through every caller's error surface.
describe("TEMPLATES — leakage-clean prose (FR-SPECS-0043)", () => {
  const templates = Object.values(TEMPLATES);

  it("authors a non-empty template for every code it carries", () => {
    expect(templates.length).toBeGreaterThan(0);
    for (const template of templates) expect(template.trim().length).toBeGreaterThan(0);
  });

  it.each([
    ["a Rosetta spec id", /\b(FR|NFR|INT|DATA)-[A-Z0-9]+-\d{4}\b/],
    ["a source path", /\b\w+\/[\w./-]+\.(ts|js|json|md)\b/],
    ["a module name", /\b(rosettify|req-parser|markup-grammar|rubric)\b/],
  ])("never interpolates %s", (_label, pattern) => {
    expect(templates.filter((t) => pattern.test(t))).toEqual([]);
  });
});
