// Implements FR-SPECS-0023/0025 (the canonical requirement-unit markup grammar). Data only: no
// emit logic, no parse logic, no IO. The renderer (render.ts) and the reader (req-parser.ts) are
// inverses of each other and share this module precisely so they cannot drift — every attribute
// name, every attribute ordering decision, and every markup-name-to-field-name fold lives here
// and nowhere else. Governing template:
// instructions/r3/core/skills/requirements-authoring/assets/ra-requirement-unit.md
//
// Leaf module: imports nothing but types and the condition-word map from core.ts.

import { EARS_CONDITION_WORD, type ConditionWord, type EarsEnum } from "./core.js";

/** FR-SPECS-0023/0025 — re-exported so both consumers reach the one declaration (it lives in
 * core.ts because the write and validate paths need it too) through a single import. */
export { EARS_CONDITION_WORD };
export type { ConditionWord, EarsEnum };

/** The element that carries one requirement unit. */
export const ROOT_ELEMENT = "req";

/** The self-closing element that carries one acceptance criterion. */
export const CRITERION_ELEMENT = "criteria";

/** The element that wraps the criterion children — the one element with structure rather than
 * prose, so both consumers treat it specially. */
export const ACCEPTANCE_ELEMENT = "acceptance";

/** The element that carries the source locations, joined on emit and split on read. */
export const EVIDENCE_ELEMENT = "evidence";

/**
 * FR-SPECS-0023 — the `<req>` attribute sequence, one inner array per emitted line.
 *
 * DECIDED, do not re-derive: the canonical template's order governs — identity, then placement,
 * then tracking, then provenance, then handling, then the approval group on one line, then the
 * relationships, then the implementation state. The approval group shares a line so that an
 * approval is a one-line difference. The round trip with the reader is what depends on this
 * order being fixed, which is why it is stated once, here.
 */
export const CANONICAL_ATTR_LINES: readonly (readonly string[])[] = [
  ["id", "type", "level", "subsystem", "component"],
  ["ticketId", "classification"],
  ["source"],
  ["priority", "verification"],
  ["status", "approved_by", "changed"],
  ["depends", "related"],
  ["implementation"],
];

/** FR-SPECS-0023 — CANONICAL_ATTR_LINES flattened: the full attribute vocabulary, in order. */
export const CANONICAL_ATTR_ORDER: readonly string[] = CANONICAL_ATTR_LINES.flat();

/**
 * FR-SPECS-0023 — attributes omitted entirely when their value is empty. Every other attribute in
 * CANONICAL_ATTR_ORDER is always emitted, so the approval group stays a stable one-line diff even
 * before a unit has been approved.
 */
export const OPTIONAL_ATTRS: readonly string[] = [
  "subsystem",
  "component",
  "ticketId",
  "classification",
  "depends",
  "related",
];

/**
 * FR-SPECS-0023 — criterion attribute order: id, pattern, condition word, responder, outcome. At
 * most one of the four condition words is ever present on a criterion (the one named by
 * EARS_CONDITION_WORD for its pattern; `ubiquitous` carries none), so emitting in this order
 * always reads id, ears, condition, system, shall.
 */
export const CRITERION_ATTR_ORDER: readonly string[] = [
  "id",
  "ears",
  "when",
  "while",
  "where",
  "if",
  "system",
  "shall",
];

/** FR-SPECS-0025 — the four condition words, derived from the pattern map so they cannot drift. */
export const CONDITION_ATTRS: readonly ConditionWord[] = Object.values(EARS_CONDITION_WORD).filter(
  (w): w is ConditionWord => w !== null,
);

/** FR-SPECS-0023 — fields carried as child elements (prose and structured children); everything
 * else is a single value and is carried as an attribute. Emit order. */
export const ELEMENT_FIELDS: readonly string[] = [
  "title",
  "statement",
  "rationale",
  "evidence",
  "acceptance",
  "implementationNotes",
  "notes",
];

/**
 * FR-SPECS-0025 — markup name to spec field name. Only the names that differ are listed; a markup
 * name absent from this map folds onto itself.
 */
export const MARKUP_TO_FIELD: Readonly<Record<string, string>> = {
  depends: "depends_on",
  ticketId: "ticket_id",
  implementationNotes: "implementation_notes",
};

/** FR-SPECS-0023 — inverse of MARKUP_TO_FIELD, built from it so the two cannot disagree. */
export const FIELD_TO_MARKUP: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(MARKUP_TO_FIELD).map(([markup, field]) => [field, markup]),
);

/** FR-SPECS-0023/0025 — joins the stored evidence locations on emit, splits them on read. */
export const EVIDENCE_SEPARATOR = ", ";

/** FR-SPECS-0023/0025 — joins an id list (`depends`, `related`) on emit, splits it on read. */
export const ID_LIST_SEPARATOR = ", ";
