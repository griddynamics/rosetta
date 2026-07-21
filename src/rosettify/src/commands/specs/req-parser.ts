// Implements FR-SPECS-0025's tolerant `<req>` scanner (SPECS §11.4, Decision 4). Pure module —
// no IO, no envelopes, no error codes: always returns data plus warnings, never throws, and
// never decides file-level outcomes (source_not_found/migrate_parse_error are migrate.ts's (S6)
// concern — it calls scanReqBlocks and treats a zero-length result as unparseable).
//
// Deliberately hand-rolled, NOT a real XML parser (architecture-notes.md Decision 4): actual
// `<req>` bodies embed ```code fences```, literal `<PREFIX>-<AREA>` angle brackets, and
// unescaped `&` — a strict parser would choke on exactly the content this format needs to
// carry. So every top-level `<tag>...</tag>` body is opaque text, located by its enclosing tag
// pair only, never re-parsed as markup. The one exception is `<acceptance>`, whose `<criteria>`
// children are extracted by the same shallow tag-pair technique one level down, since splitting
// Given/When/Then needs to know where each criterion starts.
//
// Real shape, confirmed against docs/requirements/**/*.md and
// instructions/r3/core/skills/requirements-authoring/assets/ra-requirement-unit.xml:
//   <req id="FR-AREA-0001" type="FR" level="System" ticketId="..." classification="...">
//     <title>..</title> <statement>..</statement> <rationale>..</rationale> <source>..</source>
//     <priority>..</priority> <status>..</status> <approved_by>..</approved_by>
//     <changed>YYYY-MM-DD</changed> <verification>..</verification>
//     <acceptance><criteria>Given: A When: B Then: C.</criteria>..</acceptance>
//     <depends>FR-AREA-0000, NFR-0000</depends> <implementation>..</implementation>
//     <implementationNotes>..</implementationNotes> <notes>..</notes>
//   </req>
// Every child tag is optional in the wild — every extraction below defaults to "" / [] rather
// than failing. Two implementation shapes exist: the modern split-tag form above, and the
// legacy `<implementation>[Status: X] [Additional Notes: Y]</implementation>` single-tag form
// (docs/requirements/CHANGES.md's migration note; rosettify/PLAN.md still has unmigrated reqs
// in this form). A single `<criteria>` tag may also hold MULTIPLE concatenated
// Given:/When:/Then: triples as running prose (FR-SPECS-0012, FR-PLAN-0034 in
// rosettify/{SPECS,PLAN}.md) rather than one triple per tag — why splitGwt returns an array.

import type { AcceptanceCriterion, ImplEnum, MoscowEnum, Spec, SourceEnum, SpecType, StatusEnum, VerifEnum } from "./core.js";
import type { SpecFinding } from "./output.js";

export interface RawReq {
  attrs: Record<string, string>;
  tags: Record<string, string>;
  sourceLine: number;
}

// scanReqBlocks — locates <req ...>...</req> blocks; bodies are opaque text.

const KNOWN_TAGS = [
  "title", "statement", "rationale", "source", "ticketId", "priority", "status", "approved_by",
  "changed", "verification", "acceptance", "depends", "related", "implementation",
  "implementationNotes", "notes",
] as const;

/** `s[i]` MUST be a quote char (`"` or `'`). Returns the index just past the matching close
 * quote, or -1 if the string ends first (unterminated — the opening-tag scan treats this as a
 * malformed `<req` and stops). No backslash-escape handling here: attribute values in this
 * format never contain the quote character they're wrapped in. */
function scanAttrQuote(s: string, i: number): number {
  const quote = s[i]!;
  let j = i + 1;
  while (j < s.length) {
    if (s[j] === quote) return j + 1;
    j++;
  }
  return -1;
}

/** Finds the first unquoted `>` at or after `from`, respecting quoted attribute values so a
 * `>` inside e.g. `classification="a>b"` never ends the opening tag early. */
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

/** Parses `name="value"` (or `name='value'`) pairs out of a raw opening-tag string. */
export function extractAttrs(openTag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(openTag)) !== null) {
    attrs[m[1]!] = m[2] !== undefined ? m[2]! : m[3] ?? "";
  }
  return attrs;
}

/** Extracts the first occurrence of each KNOWN_TAGS top-level tag from `body`, trimmed. Any
 * tag absent from `body` is simply absent from the result (never an error — every caller
 * treats a missing tag as "" / defaulted). */
function extractKnownTags(body: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const name of KNOWN_TAGS) {
    const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}\\s*>`, "i");
    const m = re.exec(body);
    if (m) tags[name] = m[1]!.trim();
  }
  return tags;
}

/**
 * FR-SPECS-0025 — scans `md` for `<req ...>...</req>` blocks. `<req>` blocks are never nested,
 * so each is found by: locate `<req`, scan to the opening tag's unquoted `>`, then find the
 * next `</req>` — everything between is the opaque body. A malformed opening tag (unterminated
 * quote) or a missing `</req>` for a given `<req` stops scanning that occurrence and moves on
 * (tolerant — one broken block never prevents finding the rest of the file's valid blocks).
 */
export function scanReqBlocks(md: string): RawReq[] {
  const blocks: RawReq[] = [];
  const openRe = /<req\b/gi;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(md)) !== null) {
    const tagStart = match.index;
    const tagEnd = findUnquotedGt(md, tagStart + 4);
    if (tagEnd === -1) {
      // FR-SPECS-0025 — malformed opening tag (unterminated attribute quote): report-don't-drop
      // means this occurrence is skipped, NOT that scanning stops. openRe.lastIndex is left
      // untouched here, so it already sits just past this "<req" match (the engine advances it
      // automatically on every exec()) — the next exec() call resumes strictly forward from
      // there, guaranteeing progress (no infinite loop) while still finding any later
      // well-formed <req> block in the rest of the document.
      continue;
    }

    const openTag = md.slice(tagStart, tagEnd + 1);
    const closeMatch = /<\/req\s*>/i.exec(md.slice(tagEnd + 1));
    if (!closeMatch) {
      openRe.lastIndex = tagEnd + 1;
      continue; // unterminated block — skip it, keep scanning for later valid blocks
    }

    const bodyStart = tagEnd + 1;
    const bodyEnd = bodyStart + closeMatch.index;
    const body = md.slice(bodyStart, bodyEnd);
    const closeTagEnd = bodyEnd + closeMatch[0].length;

    blocks.push({
      attrs: extractAttrs(openTag),
      tags: extractKnownTags(body),
      sourceLine: md.slice(0, tagStart).split("\n").length,
    });
    openRe.lastIndex = closeTagEnd;
  }
  return blocks;
}

// splitGwt — Given:/When:/Then: splitter. A single criteria string may hold multiple
// concatenated triples (see file header); each is located by its own "Given:" marker.

const GIVEN_RE = /\bGiven:\s*/gi;
const WHEN_RE = /\bWhen:\s*/i;
const THEN_RE = /\bThen:\s*/i;

/**
 * FR-SPECS-0025 — splits `criteria` into one AcceptanceCriterion per "Given:" marker found. If
 * no "Given:" marker exists anywhere, the whole text is unsplittable and is returned as
 * `{verbatim}` for the caller to place into `then` + flag a warning (report-don't-drop).
 * Within a "Given:"-led chunk, "When:" and "Then:" are each independently optional — real docs
 * (e.g. rosettify/PLAN.md's FR-PLAN-0034) commonly write "Given: ... Then: ..." with no
 * explicit When: clause — so every present marker is used; only a chunk with NEITHER When: nor
 * Then: is truly unsplittable and degrades to `{given:"", when:"", then: <chunk verbatim>}`
 * (mapToSpec's extractAcceptance detects that exact empty-given/when shape and warns).
 */
export function splitGwt(criteria: string): AcceptanceCriterion[] | { verbatim: string } {
  const text = criteria.trim();
  if (!text) return { verbatim: "" };

  const givenPositions: number[] = [];
  GIVEN_RE.lastIndex = 0;
  let gm: RegExpExecArray | null;
  while ((gm = GIVEN_RE.exec(text)) !== null) givenPositions.push(gm.index);
  if (givenPositions.length === 0) return { verbatim: text };
  const chunks: string[] = givenPositions.map((start, i) => {
    const end = i + 1 < givenPositions.length ? givenPositions[i + 1]! : text.length;
    return text.slice(start, end);
  });

  return chunks.map((chunk): AcceptanceCriterion => {
    const trimmedChunk = chunk.trim();
    const afterGiven = trimmedChunk.replace(/^Given:\s*/i, "");
    const whenMatch = WHEN_RE.exec(afterGiven);
    const thenBase = whenMatch ? afterGiven.slice(whenMatch.index + whenMatch[0].length) : afterGiven;
    const thenMatch = THEN_RE.exec(thenBase);

    if (!whenMatch && !thenMatch) return { given: "", when: "", then: trimmedChunk };
    if (whenMatch && thenMatch) {
      return {
        given: afterGiven.slice(0, whenMatch.index).trim(),
        when: thenBase.slice(0, thenMatch.index).trim(),
        then: thenBase.slice(thenMatch.index + thenMatch[0].length).trim(),
      };
    }
    if (whenMatch) return { given: afterGiven.slice(0, whenMatch.index).trim(), when: thenBase.trim(), then: "" };
    return { given: thenBase.slice(0, thenMatch!.index).trim(), when: "", then: thenBase.slice(thenMatch!.index + thenMatch![0].length).trim() };
  });
}

// normalizeImplementation — handles both the split-tag and legacy bracketed forms.

// Strict legacy form: "[Status: X] [Additional Notes: Y]" (Y may itself be empty).
const LEGACY_STRICT_RE = /^\[Status:\s*([^\]]+)\]\s*\[Additional Notes:\s*([\s\S]*)\]\s*$/i;
// Looser legacy form: "[Status: X] <trailing text>" — trailing text not itself bracketed.
const LEGACY_LOOSE_RE = /^\[Status:\s*([^\]]+)\]\s*([\s\S]*)$/i;

/**
 * FR-SPECS-0025 — normalizes `tags.implementation`/`tags.implementationNotes` for any of the
 * three real-world shapes: (1) modern split tags; (2) legacy strict bracketed "[Status: X]
 * [Additional Notes: Y]"; (3) legacy loose bracketed "[Status: X] <free text>" with no second
 * bracket (docs/requirements/CHANGES.md's own description of the pre-split format). Never
 * throws and never validates the extracted status against IMPLS — that is migrate.ts's job
 * over the assembled document; this module stays a pure, validation-free mapper.
 */
export function normalizeImplementation(tags: Record<string, string>): { implementation: ImplEnum; implementation_notes: string } {
  const raw = (tags["implementation"] ?? "").trim();

  const strict = LEGACY_STRICT_RE.exec(raw);
  if (strict) {
    return { implementation: strict[1]!.trim() as ImplEnum, implementation_notes: strict[2]!.trim() };
  }

  const loose = LEGACY_LOOSE_RE.exec(raw);
  if (loose) {
    const trailing = (loose[2] ?? "").trim();
    if (trailing.length > 0) {
      return { implementation: loose[1]!.trim() as ImplEnum, implementation_notes: trailing };
    }
    // "[Status: X]" alone — fall back to a separate implementationNotes tag if present.
    return { implementation: loose[1]!.trim() as ImplEnum, implementation_notes: (tags["implementationNotes"] ?? "").trim() };
  }

  // Modern split-tag form (no brackets at all).
  return { implementation: (raw || "NotStarted") as ImplEnum, implementation_notes: (tags["implementationNotes"] ?? "").trim() };
}

// mapToSpec — assembles a Partial<Spec> + warnings from one RawReq.

function splitIdList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function warn(id: string, check: string, message: string): SpecFinding {
  return { id: id || "(unknown)", check, severity: "warning", message };
}

/** Best-effort ISO8601 UTC normalization of a `<changed>` value. The template uses a bare
 * `YYYY-MM-DD` date; real docs sometimes carry a full timestamp already. Unparseable input is
 * preserved verbatim (report-don't-drop) with a warning rather than discarded or defaulted. */
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

/** Extracts `<criteria>` children from a raw `<acceptance>` body (falling back to treating the
 * whole body as one implicit criteria block if no `<criteria>` tag is found at all), then
 * splits each into given/when/then via splitGwt, warning on every unsplittable result. */
function extractAcceptance(acceptanceRaw: string, id: string, warnings: SpecFinding[]): AcceptanceCriterion[] {
  if (!acceptanceRaw.trim()) return [];

  const blocks: string[] = [];
  const criteriaRe = /<criteria\b[^>]*>([\s\S]*?)<\/criteria\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = criteriaRe.exec(acceptanceRaw)) !== null) blocks.push(m[1]!);
  if (blocks.length === 0) blocks.push(acceptanceRaw);

  const unsplittable = (): SpecFinding =>
    warn(id, "migrate_unsplittable_criterion", "An acceptance criterion could not be split into given/when/then and was preserved verbatim.");

  const result: AcceptanceCriterion[] = [];
  for (const block of blocks) {
    const split = splitGwt(block);
    if ("verbatim" in split) {
      if (split.verbatim) {
        result.push({ given: "", when: "", then: split.verbatim });
        warnings.push(unsplittable());
      }
      continue;
    }
    for (const criterion of split) {
      result.push(criterion);
      if (criterion.given === "" && criterion.when === "") warnings.push(unsplittable());
    }
  }
  return result;
}

/**
 * FR-SPECS-0025 — maps one scanned `<req>` block to a Partial<Spec> plus warnings. Never
 * throws; a missing id (the one field callers must key writes by) is reported as an
 * error-severity SpecFinding, not a thrown exception, so migrate.ts can report-don't-drop and
 * skip just that item. status/approved_by/changed/implementation are mapped as-is (not
 * stripped the way add/update's stripGuarded would) — migrate imports pre-existing historical
 * state, not a fresh user-authored item.
 */
export function mapToSpec(raw: RawReq): { spec: Partial<Spec>; warnings: SpecFinding[] } {
  const warnings: SpecFinding[] = [];
  const { attrs, tags } = raw;

  const id = (tags["id"] ?? attrs["id"] ?? "").trim();
  if (!id) {
    warnings.push({
      id: `line:${raw.sourceLine}`,
      check: "migrate_missing_id",
      severity: "error",
      message: "A <req> block is missing its id attribute.",
    });
  }

  const spec: Partial<Spec> = {};
  if (id) spec.id = id;
  spec.type = (attrs["type"] ?? "") as SpecType;
  spec.level = (attrs["level"] ?? "").trim() || "System";

  const ticketId = (tags["ticketId"] ?? attrs["ticketId"] ?? "").trim();
  if (ticketId) spec.ticket_id = ticketId;
  const classification = (attrs["classification"] ?? "").trim();
  if (classification) spec.classification = classification;

  spec.title = (tags["title"] ?? "").trim();
  spec.statement = (tags["statement"] ?? "").trim();
  spec.rationale = (tags["rationale"] ?? "").trim();
  spec.source = (tags["source"] ?? "") as SourceEnum;
  spec.priority = (tags["priority"] ?? "") as MoscowEnum;
  spec.status = (tags["status"] ?? "Draft") as StatusEnum;
  spec.approved_by = (tags["approved_by"] ?? "").trim();
  spec.changed = normalizeChanged((tags["changed"] ?? "").trim(), id, warnings);
  spec.verification = (tags["verification"] ?? "") as VerifEnum;
  spec.notes = (tags["notes"] ?? "").trim();

  spec.depends_on = splitIdList(tags["depends"] ?? "");
  spec.related = splitIdList(tags["related"] ?? "");

  const { implementation, implementation_notes } = normalizeImplementation(tags);
  spec.implementation = implementation;
  spec.implementation_notes = implementation_notes;

  spec.acceptance = extractAcceptance(tags["acceptance"] ?? "", id, warnings);

  return { spec, warnings };
}
