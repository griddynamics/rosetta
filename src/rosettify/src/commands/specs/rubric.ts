// Implements FR-SPECS-0006/0021 (pure phrasing/structural rubric matchers). Pure module — no
// IO, no envelopes, no SpecFinding construction: these return plain booleans/arrays, and
// validate.ts (S6) wraps each check's outcome into a SpecFinding. Kept this way so each matcher
// is independently unit-testable against a bare statement string.

import type { Spec } from "./core.js";

// ---------------------------------------------------------------------------
// EARS phrasing (FR-SPECS-0006) — SPECS §11.2: ordered matching, keyword-led patterns first,
// ubiquitous only as the fallback (its negative lookahead keeps it from swallowing the
// keyword-led forms, e.g. "When X, Y shall Z" classifies as event, never ubiquitous).
// ---------------------------------------------------------------------------

const EARS_KEYWORD_PATTERNS: readonly RegExp[] = [
  /^\s*When\b.+,\s*.+\bshall\b.+$/i, // event
  /^\s*While\b.+,\s*.+\bshall\b.+$/i, // state
  /^\s*Where\b.+,\s*.+\bshall\b.+$/i, // optional
  /^\s*If\b.+,\s*.+\bshall\b.+$/i, // unwanted
];

const EARS_UBIQUITOUS_RE = /^\s*(?!(When|While|Where|If)\b).+\bshall\b.+$/i;

/** FR-SPECS-0006 — true iff `statement` matches one of the 5 EARS patterns (SPECS §11.2). */
export function checkEars(statement: string): boolean {
  for (const re of EARS_KEYWORD_PATTERNS) {
    if (re.test(statement)) return true;
  }
  return EARS_UBIQUITOUS_RE.test(statement);
}

// ---------------------------------------------------------------------------
// Measurable-NFR heuristic (FR-SPECS-0021) — advisory (warning) only, never blocks approve.
// Resolution: the SPECS text names one combined token list covering both "unit/threshold" and
// "measurement condition" vocabulary (ms|s|%|MB|rps|requests|within|per|<=|>=|at least|no more
// than); implemented as digit-presence AND at-least-one-token-from-that-list, rather than two
// separately-sourced clauses the SPECS text does not otherwise distinguish.
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
// Duplicate-statement detection (FR-SPECS-0021)
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
// Acceptance completeness (FR-SPECS-0021) — structural, not phrasing, but colocated here per
// SPECS §11.2's function list.
// ---------------------------------------------------------------------------

/** FR-SPECS-0021 — true iff `spec` has at least one acceptance criterion and every criterion's
 * given/when/then are all non-empty (after trimming). */
export function checkAcceptanceComplete(spec: Spec): boolean {
  const acceptance = spec.acceptance ?? [];
  if (acceptance.length === 0) return false;
  return acceptance.every((c) => c.given.trim() !== "" && c.when.trim() !== "" && c.then.trim() !== "");
}
