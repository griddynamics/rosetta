// Implements FR-SPECS-0025's reader for the canonical requirement-unit markup. Pure module — no
// IO, no envelopes, no error codes: always returns data plus findings, never throws, and never
// decides file-level outcomes (source_not_found/migrate_parse_error are migrate.ts's concern — it
// calls scanReqBlocks and treats a zero-length result as unparseable).
//
// This reader is the exact inverse of render.ts's markup emitter. Neither holds an attribute name
// or an ordering decision of its own: both take the vocabulary from markup-grammar.ts. Attribute
// order and line breaks are never depended on here — attributes are read by name.
//
// CANONICAL FORM ONLY. Every single-value field is an attribute of the unit element; only prose
// and structured children are child elements; every acceptance criterion is a self-closing
// element carrying its pattern, its condition word, its responder, and its outcome as attributes.
// A unit in any other shape is reported with a stated reason and is NOT reconstructed by
// inference — a criterion recovered from prose would need its responder invented, and an invented
// responder in an approved requirement is worse than a unit a human must carry across by hand.
// The superseded shapes (single-value fields as child elements, Given/When/Then prose criteria,
// and the bracketed `[Status: X] [Additional Notes: Y]` implementation field) are deliberately
// not tolerated: reading them is what produced content nobody wrote.
//
// Deliberately hand-rolled, NOT a real XML parser: unit bodies embed ```code fences```, literal
// angle brackets, and other prose that a strict parser would choke on. Every element's body is
// located by its enclosing tag pair and then treated as opaque text, so anything bracket-shaped
// inside it is skipped wholesale rather than re-parsed. The one level of descent is
// `<acceptance>`, whose criterion children are located by the same shallow technique.

import {
  type AcceptanceCriterion,
  type EarsEnum,
  type ImplEnum,
  type LevelEnum,
  type MoscowEnum,
  type Spec,
  type SourceEnum,
  type SpecType,
  type StatusEnum,
  type VerifEnum,
  EARS_PATTERNS,
  assignCriterionIds,
} from "./core.js";
import type { SpecFinding } from "./output.js";
import {
  ACCEPTANCE_ELEMENT,
  CANONICAL_ATTR_ORDER,
  CONDITION_ATTRS,
  CRITERION_ELEMENT,
  EARS_CONDITION_WORD,
  ELEMENT_FIELDS,
  EVIDENCE_ELEMENT,
  EVIDENCE_SEPARATOR,
  ID_LIST_SEPARATOR,
  MARKUP_TO_FIELD,
  ROOT_ELEMENT,
} from "./markup-grammar.js";

/** One child element located inside a unit body (or inside `<acceptance>`), body untouched. */
export interface RawElement {
  name: string;
  openTag: string;
  selfClosing: boolean;
  text: string;
}

export interface RawReq {
  attrs: Record<string, string>;
  elements: RawElement[];
  sourceLine: number;
}

// ---------------------------------------------------------------------------
// Low-level scanning
// ---------------------------------------------------------------------------

/** `s[i]` MUST be a quote char (`"` or `'`). Returns the index just past the matching close
 * quote, or -1 if the string ends first (unterminated — the opening-tag scan treats this as a
 * malformed tag and stops). No backslash-escape handling: an attribute value never contains the
 * quote character it is wrapped in, because the emitter escapes it. */
function scanAttrQuote(s: string, i: number): number {
  const quote = s[i]!;
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === quote) return j + 1;
    j++;
  }
  return -1;
}

/** Finds the first unquoted `>` at or after `from`, respecting quoted attribute values so a `>`
 * inside e.g. `classification="a>b"` never ends the opening tag early. */
function findUnquotedGt(s: string, from: number): number {
  let i = from;
  while (i < s.length) {
    const c = s[i]!;
    if (c === '"' || c === "'") {
      const end = scanAttrQuote(s, i);
      if (end === -1) return -1;
      i = end;
      continue;
    }
    if (c === ">") return i;
    i++;
  }
  return -1;
}

const ATTR_RE = /([a-zA-Z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const TAG_NAME_RE = /^<([a-zA-Z_][\w:.-]*)/;

/** Inverse of the emitter's escaping. `&amp;` is decoded LAST so that an escaped ampersand in the
 * source (`&amp;lt;`) decodes to the literal text `&lt;` rather than to `<`. */
function unescapeMarkup(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
}

/** Parses `name="value"` (or `name='value'`) pairs out of a raw opening-tag string, decoding each
 * value. */
export function extractAttrs(openTag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(openTag)) !== null) {
    attrs[m[1]!] = unescapeMarkup(m[2] !== undefined ? m[2]! : (m[3] ?? ""));
  }
  return attrs;
}

function escapeForRegex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * FR-SPECS-0025 — locates every child element of `body` by name, in document order. A paired
 * element's body is consumed whole, so nothing bracket-shaped inside it is ever mistaken for a
 * sibling element. An element with no closing tag is skipped and scanning continues past its
 * opening tag (tolerant — one broken element never hides the rest).
 *
 * Names are collected for EVERY child element, not just the expected ones: a unit that carries a
 * single-value field as a child element is only detectable if the unexpected names are seen.
 */
export function scanElements(body: string): RawElement[] {
  const found: RawElement[] = [];
  let i = 0;
  while (i < body.length) {
    const lt = body.indexOf("<", i);
    if (lt === -1) break;
    const nameMatch = TAG_NAME_RE.exec(body.slice(lt, lt + 64));
    if (!nameMatch) {
      i = lt + 1;
      continue;
    }
    const name = nameMatch[1]!;
    const tagEnd = findUnquotedGt(body, lt + 1);
    if (tagEnd === -1) break; // unterminated opening tag — nothing further is trustworthy
    const openTag = body.slice(lt, tagEnd + 1);

    if (openTag.endsWith("/>")) {
      found.push({ name, openTag, selfClosing: true, text: "" });
      i = tagEnd + 1;
      continue;
    }

    const closeMatch = new RegExp(`</${escapeForRegex(name)}\\s*>`, "i").exec(body.slice(tagEnd + 1));
    if (!closeMatch) {
      i = tagEnd + 1;
      continue;
    }
    const textStart = tagEnd + 1;
    const textEnd = textStart + closeMatch.index;
    found.push({ name, openTag, selfClosing: false, text: body.slice(textStart, textEnd).trim() });
    i = textEnd + closeMatch[0].length;
  }
  return found;
}

/**
 * FR-SPECS-0025 — scans `md` for requirement units. Units are never nested, so each is found by:
 * locate the opening tag, scan to its unquoted `>`, then find the next closing tag — everything
 * between is the body. Surrounding prose (headings, narrative) is ignored, which is what lets a
 * rendered requirements document be read straight back. A malformed opening tag (unterminated
 * attribute quote) or a missing closing tag stops that occurrence and moves on — one broken unit
 * never prevents finding the rest of the file's valid units.
 */
export function scanReqBlocks(md: string): RawReq[] {
  const blocks: RawReq[] = [];
  const openRe = new RegExp(`<${ROOT_ELEMENT}\\b`, "gi");
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(md)) !== null) {
    const tagStart = match.index;
    const tagEnd = findUnquotedGt(md, tagStart + ROOT_ELEMENT.length + 1);
    if (tagEnd === -1) {
      // Malformed opening tag: this occurrence is skipped, NOT the rest of the scan.
      // openRe.lastIndex already sits just past this match, so progress is guaranteed.
      continue;
    }

    const openTag = md.slice(tagStart, tagEnd + 1);
    const closeMatch = new RegExp(`</${ROOT_ELEMENT}\\s*>`, "i").exec(md.slice(tagEnd + 1));
    if (!closeMatch) {
      openRe.lastIndex = tagEnd + 1;
      continue; // unterminated unit — skip it, keep scanning for later valid ones
    }

    const bodyStart = tagEnd + 1;
    const bodyEnd = bodyStart + closeMatch.index;
    const body = md.slice(bodyStart, bodyEnd);

    blocks.push({
      attrs: extractAttrs(openTag),
      elements: scanElements(body),
      sourceLine: md.slice(0, tagStart).split("\n").length,
    });
    openRe.lastIndex = bodyEnd + closeMatch[0].length;
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// mapToSpec — assembles a Partial<Spec> from one unit, or states why it was not canonical.
// ---------------------------------------------------------------------------

/** FR-SPECS-0025 — the outcome of reading one unit. `skip` set means the unit was NOT in the
 * canonical shape: `spec` is then incomplete and must not be imported. The reason is written for
 * the human who has to carry the unit across by hand, so it names the unit and what was wrong. */
export interface MappedReq {
  spec: Partial<Spec>;
  warnings: SpecFinding[];
  skip?: string;
}

function splitList(raw: string, separator: string): string[] {
  return raw
    .split(separator)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function warn(id: string, check: string, message: string): SpecFinding {
  return { id: id || "(unknown)", check, severity: "warning", message };
}

/** Best-effort ISO8601 UTC normalization of the `changed` value. The canonical markup carries a
 * calendar date; a full timestamp is accepted too. Unparseable input is preserved verbatim
 * (report-don't-drop) with a warning rather than discarded or defaulted. */
function normalizeChanged(raw: string, id: string, warnings: SpecFinding[]): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const asMidnightUtc = new Date(`${raw}T00:00:00.000Z`);
    if (!Number.isNaN(asMidnightUtc.getTime())) return asMidnightUtc.toISOString();
  }
  const asIs = new Date(raw);
  if (!Number.isNaN(asIs.getTime())) return asIs.toISOString();
  warnings.push(warn(id, "migrate_unparseable_changed", "The changed timestamp could not be parsed and was preserved verbatim."));
  return raw;
}

const EARS_SET: ReadonlySet<string> = new Set<string>(EARS_PATTERNS);
const ATTRIBUTE_VOCABULARY: ReadonlySet<string> = new Set(CANONICAL_ATTR_ORDER);
const ELEMENT_VOCABULARY: ReadonlySet<string> = new Set(ELEMENT_FIELDS);

/** The one criterion reader. Returns the criterion, or the reason it is not canonical — never a
 * partially invented one. */
function readCriterion(element: RawElement): { criterion: AcceptanceCriterion } | { reason: string } {
  if (!element.selfClosing) {
    return { reason: "carries a criterion written as prose rather than as a self-closing element with pattern attributes" };
  }
  const attrs = extractAttrs(element.openTag);
  const ears = (attrs["ears"] ?? "").trim();
  if (!EARS_SET.has(ears)) {
    return { reason: "carries a criterion whose pattern is missing or is not one of the five recognized patterns" };
  }
  const system = (attrs["system"] ?? "").trim();
  const shall = (attrs["shall"] ?? "").trim();
  if (!system || !shall) {
    return { reason: "carries a criterion that names no responder or no outcome" };
  }

  const expected = EARS_CONDITION_WORD[ears as EarsEnum];
  const present = CONDITION_ATTRS.filter((word) => (attrs[word] ?? "").trim().length > 0);
  if (expected === null && present.length > 0) {
    return { reason: "carries a criterion whose pattern takes no condition but that names one anyway" };
  }
  if (expected !== null && (present.length !== 1 || present[0] !== expected)) {
    return { reason: "carries a criterion whose condition word does not match its pattern" };
  }

  const criterion: AcceptanceCriterion = {
    id: (attrs["id"] ?? "").trim(),
    ears: ears as EarsEnum,
    system,
    shall,
  };
  if (expected !== null) criterion[expected] = (attrs[expected] ?? "").trim();
  return { criterion };
}

/**
 * FR-SPECS-0025 — reads one scanned unit into a Partial<Spec>. Never throws. A unit that is not in
 * the canonical shape carries a `skip` reason instead of being repaired: fields found as child
 * elements, or a criterion written as prose, both mean the unit was authored against a shape this
 * reader does not read, and guessing at it is what would invent content.
 *
 * status/approved_by/changed/implementation are read as-is (not stripped the way add/update's
 * stripGuarded would) — an import carries pre-existing historical state, not a fresh user-authored
 * item.
 */
export function mapToSpec(raw: RawReq): MappedReq {
  const warnings: SpecFinding[] = [];

  // Attribute names fold onto spec field names once, here; nothing below knows a markup name.
  const fields: Record<string, string> = {};
  for (const [markupName, value] of Object.entries(raw.attrs)) {
    fields[MARKUP_TO_FIELD[markupName] ?? markupName] = value;
  }

  const id = (fields["id"] ?? "").trim();
  if (!id) {
    return { spec: {}, warnings, skip: `The unit at line ${raw.sourceLine} carries no id and was skipped.` };
  }

  const asElements = raw.elements.filter((e) => ATTRIBUTE_VOCABULARY.has(e.name)).map((e) => e.name);
  if (asElements.length > 0) {
    return {
      spec: {},
      warnings,
      skip: `The unit ${id} carries single-value fields as child elements (${asElements.join(", ")}) instead of attributes and was skipped rather than reconstructed by inference.`,
    };
  }

  const elementText: Record<string, string> = {};
  for (const element of raw.elements) {
    if (!ELEMENT_VOCABULARY.has(element.name)) continue;
    const field = MARKUP_TO_FIELD[element.name] ?? element.name;
    if (elementText[field] === undefined) elementText[field] = unescapeMarkup(element.text);
  }

  const acceptanceElement = raw.elements.find((e) => e.name.toLowerCase() === ACCEPTANCE_ELEMENT);
  let acceptance: AcceptanceCriterion[] = [];
  if (acceptanceElement) {
    const children = scanElements(acceptanceElement.text).filter((e) => e.name.toLowerCase() === CRITERION_ELEMENT);
    if (children.length === 0 && acceptanceElement.text.trim().length > 0) {
      return {
        spec: {},
        warnings,
        skip: `The unit ${id} carries a criterion written as prose rather than as pattern attributes and was skipped rather than reconstructed by inference.`,
      };
    }
    for (const child of children) {
      const read = readCriterion(child);
      if ("reason" in read) {
        return {
          spec: {},
          warnings,
          skip: `The unit ${id} ${read.reason} and was skipped rather than reconstructed by inference.`,
        };
      }
      acceptance.push(read.criterion);
    }
    // An omitted criterion id is filled by the same rule the write path uses; a supplied one is
    // never renumbered. This assigns an identifier, it never invents content.
    acceptance = assignCriterionIds(id, acceptance);
  }

  const spec: Partial<Spec> = {
    id,
    type: (fields["type"] ?? "").trim() as SpecType,
    level: ((fields["level"] ?? "").trim() || "System") as LevelEnum,
    subsystem: (fields["subsystem"] ?? "").trim(),
    component: (fields["component"] ?? "").trim(),
    title: elementText["title"] ?? "",
    statement: elementText["statement"] ?? "",
    rationale: elementText["rationale"] ?? "",
    evidence: splitList(elementText[MARKUP_TO_FIELD[EVIDENCE_ELEMENT] ?? EVIDENCE_ELEMENT] ?? "", EVIDENCE_SEPARATOR),
    source: (fields["source"] ?? "").trim() as SourceEnum,
    priority: (fields["priority"] ?? "").trim() as MoscowEnum,
    status: ((fields["status"] ?? "").trim() || "Draft") as StatusEnum,
    approved_by: (fields["approved_by"] ?? "").trim(),
    changed: normalizeChanged((fields["changed"] ?? "").trim(), id, warnings),
    verification: (fields["verification"] ?? "").trim() as VerifEnum,
    acceptance,
    depends_on: splitList(fields["depends_on"] ?? "", ID_LIST_SEPARATOR),
    related: splitList(fields["related"] ?? "", ID_LIST_SEPARATOR),
    implementation: ((fields["implementation"] ?? "").trim() || "NotStarted") as ImplEnum,
    implementation_notes: elementText["implementation_notes"] ?? "",
    notes: elementText["notes"] ?? "",
  };

  const ticketId = (fields["ticket_id"] ?? "").trim();
  if (ticketId) spec.ticket_id = ticketId;
  const classification = (fields["classification"] ?? "").trim();
  if (classification) spec.classification = classification;

  return { spec, warnings };
}
