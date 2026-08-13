// Implements FR-SPECS-0023/0042 (human-readable rendering plus the canonical markup rendering).
// renderSpecs is pure (no IO, no file write); cmdRender is the thin envelope wrapper (SPECS §10),
// completed in this stage per the execution plan (S5) since it needs only
// readDocWithRetry/envelope/logger (already available) plus query-filter.ts — the plan explicitly
// names query-filter.ts as "shared by query/validate/render", so this cross-import between S5
// files is intentional, not a slip of the "no cross-imports" guideline (which is about avoiding
// accidental coupling between the five files, not about forbidding the one shared-by-design
// dependency the plan itself calls out).
//
// The xml rendering and req-parser.ts's reader are inverses. Neither holds an attribute name or
// an ordering decision of its own: both read the canonical markup vocabulary from
// markup-grammar.ts, which is the only place either of them can drift from. Escaping lives here
// and unescaping lives in the reader, because those are logic and the grammar module is data.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readDocWithRetry } from "../../shared/doc-io.js";
import { formatLocal } from "../../shared/time.js";
import { type AcceptanceCriterion, type Spec, type SpecsDocument, parseId } from "./core.js";
import type { SpecRenderResult } from "./output.js";
import { ERR_INVALID_FORMAT, ERR_SPECS_FILE_CORRUPTED, ERR_SPECS_NOT_FOUND } from "./errors.js";
import { parseQuery, applyFilter } from "./query-filter.js";
import {
  ACCEPTANCE_ELEMENT,
  CANONICAL_ATTR_LINES,
  CRITERION_ATTR_ORDER,
  CRITERION_ELEMENT,
  EVIDENCE_ELEMENT,
  EARS_CONDITION_WORD,
  ELEMENT_FIELDS,
  EVIDENCE_SEPARATOR,
  ID_LIST_SEPARATOR,
  MARKUP_TO_FIELD,
  OPTIONAL_ATTRS,
  ROOT_ELEMENT,
} from "./markup-grammar.js";

// ---------------------------------------------------------------------------
// Pure rendering (SPECS §11.5)
// ---------------------------------------------------------------------------

interface AreaGroup {
  code: string;
  name: string;
  specs: Spec[];
}

/** Groups `specs` by area (via parseId), ordered per doc.areas' registration order; any area
 * code present in `specs` but not registered in doc.areas is appended at the end (tolerant —
 * render never fails on an unregistered/unparseable area, it just falls back to the raw code
 * as its own display name). */
function groupByArea(doc: SpecsDocument, specs: Spec[]): AreaGroup[] {
  const byArea = new Map<string, Spec[]>();
  for (const spec of specs) {
    const parsed = parseId(spec.id);
    const code = parsed?.area ?? "UNKNOWN";
    const list = byArea.get(code);
    if (list) list.push(spec);
    else byArea.set(code, [spec]);
  }

  const groups: AreaGroup[] = [];
  const seen = new Set<string>();
  for (const area of doc.areas ?? []) {
    const list = byArea.get(area.code);
    if (list && list.length > 0) {
      groups.push({ code: area.code, name: area.name, specs: [...list].sort((a, b) => a.id.localeCompare(b.id)) });
      seen.add(area.code);
    }
  }
  for (const [code, list] of byArea) {
    if (seen.has(code)) continue;
    groups.push({ code, name: code, specs: [...list].sort((a, b) => a.id.localeCompare(b.id)) });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Criterion prose (FR-SPECS-0023 AC10) — pattern, condition, responder, outcome, in that order.
// Shared by the markdown and text renderings so the reading order is stated once.
// ---------------------------------------------------------------------------

/** FR-SPECS-0023 AC10 — "[event] when the cart changes — the system shall recompute the total".
 * A `ubiquitous` criterion names no condition, so the condition segment is absent entirely. */
function criterionProse(c: AcceptanceCriterion): string {
  const word = EARS_CONDITION_WORD[c.ears] ?? null;
  const value = word ? (c[word] ?? "").trim() : "";
  const condition = word && value ? ` ${word} ${value}` : "";
  return `[${c.ears}]${condition} — ${c.system} shall ${c.shall}`;
}

/** The `level` line's placement suffix: whichever of subsystem/component the unit knows. Both
 * empty means the author did not know them, so nothing is claimed. */
function placement(spec: Spec): string {
  const parts: string[] = [];
  if (spec.subsystem) parts.push(`subsystem: ${spec.subsystem}`);
  if (spec.component) parts.push(`component: ${spec.component}`);
  return parts.length > 0 ? ` (${parts.join(", ")})` : "";
}

function renderMarkdown(doc: SpecsDocument, groups: AreaGroup[]): string {
  const lines: string[] = [`# ${doc.system || "(unnamed)"}`];
  if (doc.description) lines.push("", doc.description);
  for (const group of groups) {
    lines.push("", `## ${group.code} — ${group.name}`);
    for (const spec of group.specs) {
      lines.push("", `### ${spec.id} — ${spec.title}`);
      lines.push(`- Level: ${spec.level}${placement(spec)}`);
      lines.push(`- Priority: ${spec.priority}`);
      lines.push(`- Status: ${spec.status}`);
      lines.push(`- Statement: ${spec.statement}`);
      lines.push("- Acceptance:");
      (spec.acceptance ?? []).forEach((c, i) => {
        lines.push(`  ${i + 1}. ${criterionProse(c)}`);
      });
      lines.push(`- Evidence: ${(spec.evidence ?? []).join(EVIDENCE_SEPARATOR) || "(none)"}`);
      lines.push(`- Depends on: ${(spec.depends_on ?? []).join(ID_LIST_SEPARATOR) || "(none)"}`);
      lines.push(`- Related: ${(spec.related ?? []).join(ID_LIST_SEPARATOR) || "(none)"}`);
      lines.push(`- Changed: ${formatLocal(spec.changed)} by ${spec.changed_by || "unknown"}`);
    }
  }
  return lines.join("\n");
}

function renderText(doc: SpecsDocument, groups: AreaGroup[]): string {
  const lines: string[] = [doc.system || "(unnamed)"];
  if (doc.description) lines.push(doc.description);
  for (const group of groups) {
    lines.push("", `Area: ${group.code} - ${group.name}`);
    for (const spec of group.specs) {
      lines.push("", `${spec.id} - ${spec.title}`);
      lines.push(`  Level: ${spec.level}${placement(spec)}`);
      lines.push(`  Priority: ${spec.priority}`);
      lines.push(`  Status: ${spec.status}`);
      lines.push(`  Statement: ${spec.statement}`);
      lines.push("  Acceptance:");
      (spec.acceptance ?? []).forEach((c, i) => {
        lines.push(`    ${i + 1}. ${criterionProse(c)}`);
      });
      lines.push(`  Evidence: ${(spec.evidence ?? []).join(EVIDENCE_SEPARATOR) || "(none)"}`);
      lines.push(`  Depends on: ${(spec.depends_on ?? []).join(ID_LIST_SEPARATOR) || "(none)"}`);
      lines.push(`  Related: ${(spec.related ?? []).join(ID_LIST_SEPARATOR) || "(none)"}`);
      lines.push(`  Changed: ${formatLocal(spec.changed)} by ${spec.changed_by || "unknown"}`);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Canonical markup rendering (FR-SPECS-0023) — the inverse of req-parser.ts.
// ---------------------------------------------------------------------------

/** Element text: `&` first, so an escape introduced below is never escaped twice. */
function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Attribute values additionally escape the wrapping quote. */
function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}

/** FR-SPECS-0023 AC4 — the stored ISO8601 UTC timestamp projected onto its UTC calendar date. An
 * approval is dated, not timed; storage is unaffected. A value that is not a timestamp is passed
 * through unchanged rather than guessed at. */
function calendarDate(stored: string): string {
  if (!stored) return "";
  const parsed = new Date(stored);
  return Number.isNaN(parsed.getTime()) ? stored : parsed.toISOString().slice(0, 10);
}

/** Every single-value field of `spec`, keyed by spec field name and flattened to its emitted
 * string. The markup names and their order come from the grammar module; this map only says what
 * each field's value is. */
function attributeValues(spec: Spec): Record<string, string> {
  return {
    id: spec.id,
    type: spec.type,
    level: spec.level,
    subsystem: spec.subsystem ?? "",
    component: spec.component ?? "",
    ticket_id: spec.ticket_id ?? "",
    classification: spec.classification ?? "",
    source: spec.source,
    priority: spec.priority,
    verification: spec.verification,
    status: spec.status,
    approved_by: spec.approved_by ?? "",
    changed: calendarDate(spec.changed ?? ""),
    depends_on: (spec.depends_on ?? []).join(ID_LIST_SEPARATOR),
    related: (spec.related ?? []).join(ID_LIST_SEPARATOR),
    implementation: spec.implementation,
  };
}

/** FR-SPECS-0023 AC3 — one self-closing criterion element. The condition word is whichever one
 * the pattern names; `ubiquitous` names none and emits none. */
function renderCriterion(c: AcceptanceCriterion, indent: string): string {
  const word = EARS_CONDITION_WORD[c.ears] ?? null;
  const values: Record<string, string> = {
    id: c.id,
    ears: c.ears,
    system: c.system,
    shall: c.shall,
  };
  if (word && c[word]) values[word] = c[word]!;

  const attrs = CRITERION_ATTR_ORDER.filter((name) => values[name] !== undefined)
    .map((name) => `${name}="${escapeAttr(values[name]!)}"`)
    .join(" ");
  return `${indent}<${CRITERION_ELEMENT} ${attrs}/>`;
}

/** The child elements of one unit, in ELEMENT_FIELDS order. An element whose value is empty is
 * omitted entirely — for `evidence` that is FR-SPECS-0023 AC5, and the same rule is applied to
 * every other element so that an absent value and an empty one render identically (they read
 * back identically too, since the reader defaults a missing element to empty). */
function renderElements(spec: Spec): string[] {
  const lines: string[] = [];
  for (const markupName of ELEMENT_FIELDS) {
    if (markupName === ACCEPTANCE_ELEMENT) {
      const criteria = spec.acceptance ?? [];
      if (criteria.length === 0) continue;
      lines.push(`  <${ACCEPTANCE_ELEMENT}>`);
      for (const c of criteria) lines.push(renderCriterion(c, "    "));
      lines.push(`  </${ACCEPTANCE_ELEMENT}>`);
      continue;
    }
    if (markupName === EVIDENCE_ELEMENT) {
      const locations = spec.evidence ?? [];
      if (locations.length === 0) continue; // AC5
      lines.push(`  <${EVIDENCE_ELEMENT}>${escapeText(locations.join(EVIDENCE_SEPARATOR))}</${EVIDENCE_ELEMENT}>`);
      continue;
    }
    const field = MARKUP_TO_FIELD[markupName] ?? markupName;
    const value = (spec as unknown as Record<string, unknown>)[field];
    const text = typeof value === "string" ? value : "";
    if (!text) continue;
    lines.push(`  <${markupName}>${escapeText(text)}</${markupName}>`);
  }
  return lines;
}

/** FR-SPECS-0023 AC3/AC4/AC11 — one requirement unit in the canonical markup. Attribute names,
 * their order, their line grouping, and which of them are dropped when empty all come from
 * markup-grammar.ts. */
function renderUnit(spec: Spec): string {
  const values = attributeValues(spec);
  const optional: ReadonlySet<string> = new Set(OPTIONAL_ATTRS);

  const attrLines: string[] = [];
  for (const group of CANONICAL_ATTR_LINES) {
    const rendered = group
      .map((markupName) => ({ markupName, value: values[MARKUP_TO_FIELD[markupName] ?? markupName] ?? "" }))
      .filter(({ markupName, value }) => value !== "" || !optional.has(markupName))
      .map(({ markupName, value }) => `${markupName}="${escapeAttr(value)}"`);
    if (rendered.length > 0) attrLines.push(rendered.join(" "));
  }

  const open = `<${ROOT_ELEMENT} `;
  const indent = " ".repeat(open.length);
  const head = attrLines.map((line, i) => (i === 0 ? open + line : indent + line));
  head[head.length - 1] += ">";

  return [...head, ...renderElements(spec), `</${ROOT_ELEMENT}>`].join("\n");
}

/** FR-SPECS-0023 — the whole selection as a requirements document: the system it belongs to, its
 * description, and the units grouped by area exactly as the other two renderings group them. The
 * reader locates units by their own element and ignores the surrounding prose, so the document
 * chrome costs the round trip nothing. */
function renderMarkup(doc: SpecsDocument, groups: AreaGroup[]): string {
  const lines: string[] = [`# ${doc.system || "(unnamed)"}`];
  if (doc.description) lines.push("", doc.description);
  for (const group of groups) {
    lines.push("", `## ${group.code} — ${group.name}`);
    for (const spec of group.specs) lines.push("", renderUnit(spec));
  }
  return lines.join("\n");
}

/** FR-SPECS-0023 — renders `specs` (already the caller's chosen subset — e.g. query-filtered)
 * grouped by area, in `format`. No file write; timestamps go through formatLocal (FR-SPECS-0042
 * — local display, UTC storage) in the markdown and text renderings, and through the UTC
 * calendar-date projection in the markup rendering. `format` validity is the caller's
 * (cmdRender's) concern. */
export function renderSpecs(doc: SpecsDocument, specs: Spec[], format: "markdown" | "text" | "xml"): string {
  const groups = groupByArea(doc, specs);
  if (format === "xml") return renderMarkup(doc, groups);
  return format === "markdown" ? renderMarkdown(doc, groups) : renderText(doc, groups);
}

// ---------------------------------------------------------------------------
// cmdRender — FR-SPECS-0023, SPECS §10. Optional query scope (default: all non-Removed specs);
// format defaults to markdown; a format other than markdown|text|xml -> invalid_format, checked
// before any read/render work.
// ---------------------------------------------------------------------------

export async function cmdRender(
  specsFile: string,
  query?: string,
  format?: string,
): Promise<RunEnvelope<SpecRenderResult>> {
  try {
    const fmt = format ?? "markdown";
    if (fmt !== "markdown" && fmt !== "text" && fmt !== "xml") return err(ERR_INVALID_FORMAT);

    let doc: SpecsDocument | null;
    try {
      doc = await readDocWithRetry<SpecsDocument>(specsFile);
    } catch {
      return err(ERR_SPECS_FILE_CORRUPTED);
    }
    if (!doc) return err(ERR_SPECS_NOT_FOUND);

    const filter = parseQuery(query);
    if ("error" in filter) return err(filter.error);
    const specs = applyFilter(doc.specs ?? [], filter);

    const content = renderSpecs(doc, specs, fmt);
    logger.info({ specsFile, format: fmt, count: specs.length }, "specs render");
    return ok({ format: fmt, content });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}
