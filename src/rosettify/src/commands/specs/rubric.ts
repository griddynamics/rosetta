// Implements FR-SPECS-0006/0021 (validate-only rubric matchers). Pure module — no IO, no
// envelopes, no SpecFinding construction: these return plain booleans/arrays, and validate.ts
// wraps each outcome into a SpecFinding with the severity FR-SPECS-0021 assigns it. The set is
// deliberately mixed: some matchers are cross-field structural rules decided from the stored
// fields alone (criterion EARS conformance, criterion id shape, location completeness), others
// are advisory text heuristics over stored strings. Each stays independently unit-testable
// against a bare Spec/AcceptanceCriterion.
//
// The split against the write path is fixed by FR-SPECS-0006: a field-level violation (missing
// required field, out-of-enum value, duplicate criterion id, unregistered area, type/id-prefix
// disagreement) is rejected on write by core.ts; everything here is reported, never rejected.
// So each matcher deliberately PASSES an input whose defect the write path already owns, keeping
// the two reports from colliding on one item — the same non-collision convention core.ts uses.

import {
  type AcceptanceCriterion,
  type ConditionWord,
  type Spec,
  EARS_CONDITION_WORD,
  RESERVED_NFR_AREAS,
  parseId,
} from "./core.js";
import type { Severity } from "./output.js";

// ---------------------------------------------------------------------------
// Criterion EARS conformance (FR-SPECS-0006 AC1-AC3) — cross-field, decided from the stored
// fields alone, hence error severity in validate.ts. EARS_CONDITION_WORD (core.ts) is the single
// source for which word each pattern names, shared with the write check and the markup round trip.
// ---------------------------------------------------------------------------

const CONDITION_WORDS: readonly ConditionWord[] = ["when", "while", "where", "if"];

/** The condition words a criterion actually carries non-empty, in canonical order. */
function conditionWordsPresent(c: AcceptanceCriterion): ConditionWord[] {
  return CONDITION_WORDS.filter((w) => {
    const v = c?.[w];
    return typeof v === "string" && v.trim() !== "";
  });
}

/**
 * FR-SPECS-0006 AC1/AC2 — true iff the criterion carries exactly the condition word its declared
 * `ears` names: ubiquitous none, event `when`, state `while`, optional `where`, unwanted `if`.
 * An `ears` outside the enum passes here — that is the write path's `invalid_ears` (core.ts's
 * validateCriteria), and FR-SPECS-0021 lists no validate finding for it.
 */
export function checkCriterionEars(c: AcceptanceCriterion): boolean {
  const expected: ConditionWord | null | undefined = EARS_CONDITION_WORD[c?.ears];
  if (expected === undefined) return true;
  const present = conditionWordsPresent(c);
  if (expected === null) return present.length === 0;
  return present.includes(expected);
}

/** FR-SPECS-0006 AC3 — true iff at most one of when/while/where/if is present and non-empty. */
export function checkSingleConditionWord(c: AcceptanceCriterion): boolean {
  return conditionWordsPresent(c).length <= 1;
}

// ---------------------------------------------------------------------------
// Criterion id shape (FR-SPECS-0021) — a malformed id is a validate finding; a DUPLICATE id is a
// write refusal owned by core.ts (FR-SPECS-0001 AC5) and is counted in validate.ts, not here.
// ---------------------------------------------------------------------------

const CRITERION_ID_RE = /^(.*)\.AC(\d+)$/;

/** FR-SPECS-0021 — true iff `c.id` reads `<specId>.AC<n>`. The spec id is compared literally
 * rather than spliced into a pattern, so an id carrying regex metacharacters cannot alter it. */
export function checkCriterionIdFormat(specId: string, c: AcceptanceCriterion): boolean {
  const m = CRITERION_ID_RE.exec(c?.id ?? "");
  return m !== null && m[1] === specId;
}

// ---------------------------------------------------------------------------
// Location completeness against level (FR-SPECS-0006 AC10-AC12). Empty means the author did not
// know the name, never that it does not apply, so an absence is always reported — as an error
// where the level requires the name, as a warning where it is only recommended.
// ---------------------------------------------------------------------------

/** Where a location name is missing, and how hard that is. Local return shape only — not a
 * result type, so it carries no FR-SPECS-0050 dictionary obligation. */
export interface SpecLocationGap {
  field: "subsystem" | "component";
  severity: Severity;
}

/**
 * FR-SPECS-0006 AC10-AC12 — Component requires both names, Subsystem requires a subsystem name,
 * System requires neither but recommends at least one. A `level` outside the enum yields no gap:
 * that defect belongs to the `level_enum` finding, and a gap measured against an unknown level
 * would be noise.
 */
export function findLocationGaps(spec: Spec): SpecLocationGap[] {
  const subsystem = (spec.subsystem ?? "").trim();
  const component = (spec.component ?? "").trim();
  switch (spec.level) {
    case "Component": {
      const gaps: SpecLocationGap[] = [];
      if (subsystem === "") gaps.push({ field: "subsystem", severity: "error" });
      if (component === "") gaps.push({ field: "component", severity: "error" });
      return gaps;
    }
    case "Subsystem":
      return subsystem === "" ? [{ field: "subsystem", severity: "error" }] : [];
    case "System":
      // One gap, not two: the recommendation is that SOME location be named, so naming either one
      // clears it. `field` is reported as "subsystem" by convention only — validate.ts phrases the
      // warning from the severity, naming both fields, so the choice is not observable.
      return subsystem === "" && component === "" ? [{ field: "subsystem", severity: "warning" }] : [];
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Measurable-NFR heuristic (FR-SPECS-0021) — advisory (warning) only, never blocks approve.
// Resolution: the SPECS text names one combined token list covering both "unit/threshold" and
// "measurement condition" vocabulary (ms|s|%|MB|rps|requests|within|per|<=|>=|at least|no more
// than); implemented as digit-presence AND at-least-one-token-from-that-list, rather than two
// separately-sourced clauses the SPECS text does not otherwise distinguish.
//
// FR-SPECS-0021 fixes this as a token match and nothing more: it reports that no quantity token
// is present, and passing it asserts only that one IS present — never that the requirement is
// measurable. Deliberately not made smarter.
// ---------------------------------------------------------------------------

const HAS_DIGIT_RE = /\d/;
const NFR_TOKEN_RE = /\bms\b|\bs\b|%|\bMB\b|\brps\b|\brequests?\b|\bwithin\b|\bper\b|≤|<=|>=|\bat least\b|\bno more than\b/i;

/** FR-SPECS-0021 — heuristic: a numeric quantity plus a unit/threshold/condition token. */
export function checkMeasurableNfr(statement: string): boolean {
  return HAS_DIGIT_RE.test(statement) && NFR_TOKEN_RE.test(statement);
}

// ---------------------------------------------------------------------------
// Modal verb usage (FR-SPECS-0021) — resolution: "uses shall/should/may appropriately" is
// implemented as its simplest testable reading — the statement uses at least one of the three
// canonical requirement modal verbs (shall/should/may) as a whole word. No discouraged-modal
// deny-list is specified anywhere in the contract, so none is invented here.
// ---------------------------------------------------------------------------

const MODAL_VERB_RE = /\b(shall|should|may)\b/i;

/** FR-SPECS-0021 — true iff `statement` uses at least one canonical modal verb. */
export function checkModalVerbs(statement: string): boolean {
  return MODAL_VERB_RE.test(statement);
}

// ---------------------------------------------------------------------------
// Duplicate-statement detection (FR-SPECS-0021) — a text comparison after normalization, not a
// sameness judgment: two units may legitimately state one rule at different levels.
// ---------------------------------------------------------------------------

function normalizeStatement(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** FR-SPECS-0021 — groups specs sharing a normalized (trim/collapse-space/lowercase) statement;
 * only groups with 2+ members are returned; specs with an empty statement are ignored (that
 * absence is core.ts's missing_required_field concern, not a duplicate-statement finding). */
export function findDuplicateStatements(specs: Spec[]): Array<{ ids: string[]; statement: string }> {
  const groups = new Map<string, { ids: string[]; statement: string }>();
  for (const spec of specs) {
    const norm = normalizeStatement(spec.statement ?? "");
    if (!norm) continue;
    const existing = groups.get(norm);
    if (existing) {
      existing.ids.push(spec.id);
    } else {
      groups.set(norm, { ids: [spec.id], statement: spec.statement });
    }
  }
  return [...groups.values()].filter((g) => g.ids.length > 1);
}

// ---------------------------------------------------------------------------
// Evidence provenance (FR-SPECS-0021 AC4) — reports the empty field, never that the requirement
// is unfounded: whether a cited location genuinely supports its unit is a reviewer judgment and
// is out of scope for the command.
// ---------------------------------------------------------------------------

/** FR-SPECS-0021 AC4 — true unless `source` names existing code while `evidence` is empty. */
export function checkEvidencePresence(spec: Spec): boolean {
  if (spec.source !== "Sources") return true;
  return (spec.evidence ?? []).length > 0;
}

// ---------------------------------------------------------------------------
// Quality-characteristic recommendation (FR-SPECS-0004, FR-SPECS-0021) — the nine codes are
// pre-registered and recommended, never mandatory. Any registered area is legal on any type, so
// an area outside the nine is accepted on write and only reported here.
// ---------------------------------------------------------------------------

/** FR-SPECS-0004 — true iff the id's area is one of the nine recommended quality-characteristic
 * codes. An unparseable id passes: that is the `id_format` finding's concern, not this one. The
 * caller applies this to non-functional requirements only. */
export function checkRecommendedNfrArea(spec: Spec): boolean {
  const parsed = parseId(spec.id);
  if (!parsed) return true;
  return RESERVED_NFR_AREAS.some((a) => a.code === parsed.area);
}

// ---------------------------------------------------------------------------
// Acceptance completeness (FR-SPECS-0006 AC6, FR-SPECS-0021) — structural, colocated here with
// the other per-unit matchers.
// ---------------------------------------------------------------------------

/** FR-SPECS-0006 AC6 — true iff `spec` has at least one acceptance criterion and every criterion
 * names a responder (`system`) and an outcome (`shall`), both non-empty after trimming. */
export function checkAcceptanceComplete(spec: Spec): boolean {
  const acceptance = spec.acceptance ?? [];
  if (acceptance.length === 0) return false;
  return acceptance.every((c) => (c?.system ?? "").trim() !== "" && (c?.shall ?? "").trim() !== "");
}
