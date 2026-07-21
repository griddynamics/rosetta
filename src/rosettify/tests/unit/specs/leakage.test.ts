/**
 * FR-SPECS-0043/0060/0061 — no-internal-leakage inspection. Scans the specs command's OWN
 * authored surfaces (assembled help content, schema description strings, error message
 * templates) for requirement identifiers, ticket identifiers, and internal source paths/module
 * names. MUST NOT scan `result` payloads or aggregated error strings — those carry the caller's
 * own data verbatim (FR-SPECS-0043 explicitly exempts caller payloads from this rule).
 */
import { describe, it, expect } from "vitest";
import { specsHelpContent } from "../../../src/commands/specs/help-content.js";
import { specsSchemasDict } from "../../../src/commands/specs/schemas.js";
import { TEMPLATES } from "../../../src/commands/specs/errors.js";

// Real Rosetta requirement id pattern — FR-\d alone is deliberately NOT used (it would false-
// positive on the command's own domain-example ids like FR-CHK-0001, which are 3-4 char AREA
// mnemonics, never bare digits after the prefix... but to be precise per the task instructions,
// match the full id shape: PREFIX-AREA-NNNN for the specific internal prefixes this project uses).
const REQ_ID_RE = /\b(FR|NFR|INT|DATA)-[A-Z0-9]+-\d{4}\b/g;
const TICKET_ID_RE = /CTORNDGAIN-\d+/g;
const INTERNAL_PATH_RE = /\b(src\/|commands\/specs\/|shared\/(actor|time|doc-io|graph|errors)\.[jt]s|rosettify\/src\b)/g;
const MODULE_NAME_RE = /\b(core\.ts|write\.ts|aggregate\.ts|query-filter\.ts|rubric\.ts|req-parser\.ts|output\.ts)\b/g;

/** The known fictional example ids this command's own help/schema text intentionally uses
 * (help-content.ts's header comment: area "CHK" is fictional, never a real Rosetta area). These
 * are caller-domain-shaped strings, not real Rosetta requirement ids — allow-list them so the
 * regex-based scan (which cannot know intent) does not false-positive on the command's own
 * documented examples. */
const ALLOWED_EXAMPLE_IDS = new Set(["FR-CHK-0001", "FR-CHK-0002", "FR-CHK-0099"]);

function findLeaks(text: string): string[] {
  const leaks: string[] = [];
  const reqMatches = text.match(REQ_ID_RE) ?? [];
  for (const m of reqMatches) {
    if (!ALLOWED_EXAMPLE_IDS.has(m)) leaks.push(m);
  }
  leaks.push(...(text.match(TICKET_ID_RE) ?? []));
  leaks.push(...(text.match(INTERNAL_PATH_RE) ?? []));
  leaks.push(...(text.match(MODULE_NAME_RE) ?? []));
  return leaks;
}

describe("leakage — specsHelpContent (FR-SPECS-0060/0061)", () => {
  it("contains no real requirement id, ticket id, internal path, or module name", () => {
    const serialized = JSON.stringify(specsHelpContent);
    expect(findLeaks(serialized)).toEqual([]);
  });

  it("notes array is entirely leakage-clean", () => {
    const serialized = JSON.stringify(specsHelpContent.notes);
    expect(findLeaks(serialized)).toEqual([]);
  });

  it("every subcommand's description/examples are leakage-clean", () => {
    for (const sub of specsHelpContent.subcommands) {
      const serialized = JSON.stringify(sub);
      expect(findLeaks(serialized)).toEqual([]);
    }
  });
});

describe("leakage — schema description strings (FR-SPECS-0060)", () => {
  it("specsSchemasDict contains no leakage", () => {
    const serialized = JSON.stringify(specsSchemasDict);
    expect(findLeaks(serialized)).toEqual([]);
  });
});

describe("leakage — error message templates (FR-SPECS-0043)", () => {
  it("TEMPLATES contains no leakage", () => {
    const serialized = JSON.stringify(TEMPLATES);
    expect(findLeaks(serialized)).toEqual([]);
  });

  it("every template value never interpolates a Rosetta id (checked individually, not just concatenated)", () => {
    for (const [code, message] of Object.entries(TEMPLATES)) {
      expect(findLeaks(message), `template for ${code} leaked`).toEqual([]);
    }
  });
});

describe("leakage — caller payloads are exempt (FR-SPECS-0043 sanity check)", () => {
  it("a caller-supplied id matching the FR-* pattern is NOT something the leakage rule scans (documents the exemption)", () => {
    // This is a documentation test, not a scan: get/query results and aggregated error strings
    // legitimately echo caller ids like "FR-AUTH-0003" verbatim — the leakage scan above
    // deliberately targets only specsHelpContent/specsSchemasDict/TEMPLATES, never a `result`.
    const callerId = "FR-AUTH-0003";
    expect(REQ_ID_RE.test(callerId)).toBe(true); // it WOULD match the pattern
    // ...but it is caller data, never present in any of the three scanned surfaces above.
  });
});
