// Implements FR-SPECS-0012 (query grammar + filter application). Pure module — no IO, no
// envelopes. Shared by query.ts, validate.ts, and render.ts (all S6).
//
// Grammar (SPECS §11.1): query := WS? term (WS term)* WS? | ε; term := ["-"] (field | bare);
// field := key ":" valuelist; key := IDENT (unrecognized -> invalid_filter); valuelist :=
// value ("," value)* (comma = OR within field); value := quoted | unquoted; quoted := '"' <any
// except unescaped "> '"' (unterminated -> invalid_query); unquoted := <chars except WS, ",">
// (empty value slot -> invalid_query); bare := unquoted (free-text over title+statement).
//
// Colon constraint: an unquoted token containing ':' is always key:value; if the text before
// the first unquoted ':' is not a recognized key, the query is invalid_filter. A free-text term
// that legitimately contains a colon MUST be quoted so it is never mistaken for key:value.
//
// Resolution (contract ambiguity — FilterTerm.field alone carries `quoted`, `free` does not;
// intentional, and this is what fixes what "quoted" means end to end):
//   - Quoting a BARE term only escapes whitespace/colon so a phrase becomes one term instead of
//     being split or misread as key:value; it does NOT change match semantics — free text is
//     always case-insensitive substring over title+statement, quoted or not.
//   - Quoting a FIELD value follows the grammar's "literal (case-sensitive exact)" wording:
//     quoted forces case-sensitive comparison; substring-vs-equality still follows the semantics
//     paragraph ("substring for title/statement, exact for everything else") regardless of
//     quoting. So: unquoted title/statement = case-insensitive substring; quoted = case-sensitive
//     substring (a literal phrase); unquoted enum/id-list = case-insensitive equality; quoted =
//     case-sensitive equality.

import { type Spec, parseId } from "./core.js";
import { ERR_INVALID_FILTER, ERR_INVALID_QUERY } from "./errors.js";

export const FILTER_KEYS = [
  "type",
  "area",
  "status",
  "priority",
  "implementation",
  "verification",
  "source",
  "depends_on",
  "related",
  "title",
  "statement",
  // FR-SPECS-0012 — the requirement-unit fields added with the criterion model.
  "level",
  "subsystem",
  "component",
  "ears",
  "evidence",
] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];
const KNOWN_KEYS: ReadonlySet<string> = new Set<string>([...FILTER_KEYS, "include_removed"]);

/** FR-SPECS-0012 — the only two values `evidence:` accepts. Compared case-insensitively, as
 * `include_removed:true` already is. */
const EVIDENCE_VALUES: ReadonlySet<string> = new Set(["present", "absent"]);

export type FilterTerm =
  | { kind: "field"; key: FilterKey; values: string[]; negate: boolean; quoted: boolean }
  | { kind: "free"; value: string; negate: boolean };

export interface Filter {
  terms: FilterTerm[];
  includeRemoved: boolean;
}

type ParsedTerm =
  | { kind: "field"; key: string; values: string[]; negate: boolean; quoted: boolean }
  | { kind: "free"; value: string; negate: boolean };

// ---------------------------------------------------------------------------
// Low-level quote-aware scanning helpers, shared by term splitting and value-list splitting.
// ---------------------------------------------------------------------------

function isWs(c: string): boolean {
  return c === " " || c === "\t" || c === "\n" || c === "\r";
}

/** `s[i]` MUST be `"`. Returns the index just past the matching close quote (handling `\"`
 * escapes), or -1 if the string ends before the quote closes (unterminated). */
function scanQuote(s: string, i: number): number {
  const n = s.length;
  let j = i + 1;
  while (j < n) {
    if (s[j] === "\\" && j + 1 < n && s[j + 1] === '"') {
      j += 2;
      continue;
    }
    if (s[j] === '"') return j + 1;
    j++;
  }
  return -1;
}

function unescapeQuoted(inner: string): string {
  return inner.replace(/\\"/g, '"');
}

/** Walks `s` from `from`, skipping quoted regions (via scanQuote), until `stop(c)` is true for
 * an unquoted char. Returns that index, `s.length` if `stop` never fires, or -1 on an
 * unterminated quote. Shared by term splitting, value-list splitting, and colon-scanning —
 * every quote-aware "scan until an unquoted delimiter" walk in this file is this one shape. */
function scanUnquotedUntil(s: string, from: number, stop: (c: string) => boolean): number {
  let i = from;
  while (i < s.length) {
    const c = s[i]!;
    if (c === '"') {
      const end = scanQuote(s, i);
      if (end === -1) return -1;
      i = end;
      continue;
    }
    if (stop(c)) return i;
    i++;
  }
  return s.length;
}

/** Splits the whole query into raw term strings on unquoted whitespace, leaving quote
 * characters and escapes intact for downstream term parsing. Returns null on an unterminated
 * quote (the caller reports invalid_query). */
function splitTerms(q: string): string[] | null {
  const terms: string[] = [];
  let i = 0;
  while (i < q.length) {
    while (i < q.length && isWs(q[i]!)) i++;
    if (i >= q.length) break;
    const end = scanUnquotedUntil(q, i, isWs);
    if (end === -1) return null;
    terms.push(q.slice(i, end));
    i = end;
  }
  return terms;
}

/** Splits a valuelist string on unquoted commas into individual raw pieces, unwrapping any
 * fully-quoted piece (unescaping `\"`). `quoted` is true if ANY piece in this valuelist was
 * quoted — SPECS' FilterTerm.field carries one flag for the whole term (see file header). */
function splitValueList(str: string): { values: string[]; quoted: boolean } | { error: string } {
  if (str.length === 0) return { error: ERR_INVALID_QUERY };
  const pieces: string[] = [];
  let i = 0;
  for (;;) {
    const end = scanUnquotedUntil(str, i, (c) => c === ",");
    if (end === -1) return { error: ERR_INVALID_QUERY };
    pieces.push(str.slice(i, end));
    if (end >= str.length) break;
    i = end + 1;
  }

  let anyQuoted = false;
  const values: string[] = [];
  for (const piece of pieces) {
    if (piece.length === 0) return { error: ERR_INVALID_QUERY };
    if (piece[0] === '"') {
      const end = scanQuote(piece, 0);
      if (end === -1) return { error: ERR_INVALID_QUERY }; // unreachable: pre-validated above
      anyQuoted = true;
      const inner = unescapeQuoted(piece.slice(1, end - 1));
      values.push(inner + piece.slice(end)); // tolerant: trailing text after a closed quote is appended literally
      continue;
    }
    values.push(piece);
  }
  return { values, quoted: anyQuoted };
}

/** Parses one raw (whitespace-delimited, quote-intact) term string into its structural shape. */
function parseTerm(raw: string): ParsedTerm | { error: string } {
  let s = raw;
  let negate = false;
  if (s.length > 1 && s[0] === "-") {
    negate = true;
    s = s.slice(1);
  }
  if (s.length === 0) {
    // A lone "-" has nothing to negate — treat the literal token as free text.
    return { kind: "free", value: raw, negate: false };
  }

  if (s[0] === '"') {
    // Colon constraint: a term starting with a quote is always free text, never a field —
    // this is how a colon-bearing (or whitespace-bearing) phrase escapes field-parsing.
    const end = scanQuote(s, 0);
    if (end === -1) return { error: ERR_INVALID_QUERY };
    const inner = unescapeQuoted(s.slice(1, end - 1));
    const rest = s.slice(end); // tolerant: trailing text after the close quote appended literally
    return { kind: "free", value: inner + rest, negate };
  }

  // Scan for the first unquoted ':' — quotes can legitimately appear later in an unquoted
  // token's tail (e.g. a malformed value), so this walk must still respect quoting.
  const colonIdx = scanUnquotedUntil(s, 0, (c) => c === ":");
  if (colonIdx === -1) return { error: ERR_INVALID_QUERY };
  if (colonIdx >= s.length) {
    return { kind: "free", value: s, negate };
  }

  const key = s.slice(0, colonIdx);
  if (!KNOWN_KEYS.has(key)) return { error: ERR_INVALID_FILTER };

  const valuelistStr = s.slice(colonIdx + 1);
  const parsedValues = splitValueList(valuelistStr);
  if ("error" in parsedValues) return parsedValues;

  return { kind: "field", key, values: parsedValues.values, negate, quoted: parsedValues.quoted };
}

/** Parses a query string into a Filter, or an error code (`invalid_filter` | `invalid_query`). */
export function parseQuery(q: string | undefined): Filter | { error: string } {
  if (q === undefined || q.trim().length === 0) return { terms: [], includeRemoved: false };

  const rawTerms = splitTerms(q);
  if (rawTerms === null) return { error: ERR_INVALID_QUERY };

  const terms: FilterTerm[] = [];
  let includeRemoved = false;

  for (const raw of rawTerms) {
    const parsed = parseTerm(raw);
    if ("error" in parsed) return parsed;

    if (parsed.kind === "field" && parsed.key === "include_removed") {
      if (parsed.negate) continue; // negating the pseudo-key is a no-op — default stays excluded
      if (parsed.values.length === 1 && parsed.values[0]!.toLowerCase() === "true") {
        includeRemoved = true;
        continue;
      }
      return { error: ERR_INVALID_QUERY }; // "any other value -> invalid_query"
    }

    // FR-SPECS-0012 — `evidence` takes a closed two-value vocabulary, so a value outside it is a
    // malformed value on a KNOWN key: invalid_query, never invalid_filter. Checked here rather
    // than in matchFieldValue, which can only answer true/false. Negation stays legal.
    if (parsed.kind === "field" && parsed.key === "evidence") {
      const legal = parsed.values.every((v) => EVIDENCE_VALUES.has(v.toLowerCase()));
      if (!legal) return { error: ERR_INVALID_QUERY };
    }

    if (parsed.kind === "field") {
      terms.push({ kind: "field", key: parsed.key as FilterKey, values: parsed.values, negate: parsed.negate, quoted: parsed.quoted });
    } else {
      terms.push(parsed);
    }
  }

  return { terms, includeRemoved };
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

function matchesExact(value: string, target: string, quoted: boolean): boolean {
  return quoted ? value === target : value.toLowerCase() === target.toLowerCase();
}

function matchesSubstring(haystack: string, needle: string, quoted: boolean): boolean {
  return quoted ? haystack.includes(needle) : haystack.toLowerCase().includes(needle.toLowerCase());
}

function listContains(list: string[], value: string, quoted: boolean): boolean {
  return list.some((item) => matchesExact(item, value, quoted));
}

function matchFieldValue(spec: Spec, key: FilterKey, value: string, quoted: boolean): boolean {
  switch (key) {
    case "type":
      return matchesExact(spec.type, value, quoted);
    case "area": {
      const parsed = parseId(spec.id);
      return parsed ? matchesExact(parsed.area, value, quoted) : false;
    }
    case "status":
      return matchesExact(spec.status, value, quoted);
    case "priority":
      return matchesExact(spec.priority, value, quoted);
    case "implementation":
      return matchesExact(spec.implementation, value, quoted);
    case "verification":
      return matchesExact(spec.verification, value, quoted);
    case "source":
      return matchesExact(spec.source, value, quoted);
    case "depends_on":
      return listContains(spec.depends_on ?? [], value, quoted);
    case "related":
      return listContains(spec.related ?? [], value, quoted);
    case "title":
      return matchesSubstring(spec.title ?? "", value, quoted);
    case "statement":
      return matchesSubstring(spec.statement ?? "", value, quoted);
    case "level":
      return matchesExact(spec.level, value, quoted);
    case "subsystem":
      return matchesExact(spec.subsystem ?? "", value, quoted);
    case "component":
      return matchesExact(spec.component ?? "", value, quoted);
    // FR-SPECS-0012 — `ears` matches the unit when ANY of its criteria declares that pattern:
    // the field lives on the criterion, and a filter over units can only ask whether one exists.
    case "ears":
      return (spec.acceptance ?? []).some((c) => matchesExact(c?.ears ?? "", value, quoted));
    // Value vocabulary is enforced at parse time (parseQuery), so only present/absent reach here.
    case "evidence":
      return value.toLowerCase() === "present" ? (spec.evidence ?? []).length > 0 : (spec.evidence ?? []).length === 0;
  }
}

function matchTerm(spec: Spec, term: FilterTerm): boolean {
  if (term.kind === "free") {
    const haystack = `${spec.title ?? ""} ${spec.statement ?? ""}`;
    const match = matchesSubstring(haystack, term.value, false); // free text is always case-insensitive (see file header)
    return term.negate ? !match : match;
  }
  const match = term.values.some((v) => matchFieldValue(spec, term.key, v, term.quoted));
  return term.negate ? !match : match;
}

/** True if `terms` contains a positive (non-negated) `status:` field-term whose values include
 * "Removed" — the "explicitly matches status:Removed" exception to default Removed-exclusion. */
function explicitlyRequestsRemoved(terms: FilterTerm[]): boolean {
  return terms.some(
    (t) => t.kind === "field" && t.key === "status" && !t.negate && t.values.some((v) => matchesExact(v, "Removed", t.quoted)),
  );
}

/** Applies a parsed Filter over a spec list. Removed specs are excluded unless
 * `includeRemoved` or a term explicitly requests `status:Removed`. */
export function applyFilter(specs: Spec[], filter: Filter): Spec[] {
  const showRemoved = filter.includeRemoved || explicitlyRequestsRemoved(filter.terms);
  return specs.filter((spec) => {
    if (spec.status === "Removed" && !showRemoved) return false;
    return filter.terms.every((term) => matchTerm(spec, term));
  });
}
