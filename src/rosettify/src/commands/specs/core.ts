// Implements FR-SPECS-0001..0007, 0040 (core types, enums, validators, and plain document I/O
// for the specs command). Mirrors the shape of commands/plan/core.ts.

import * as fs from "fs";
import * as path from "path";
import type { CommandInput } from "../../registry/types.js";
import { detectCycle } from "../../shared/graph.js";
import { nowUtcZ } from "../../shared/time.js";
import {
  SPECS_MAX_SPECS,
  SPECS_MAX_DEPENDENCIES_PER_SPEC,
  SPECS_MAX_ACCEPTANCE_PER_SPEC,
  SPECS_MAX_EVIDENCE_PER_SPEC,
  SPECS_MAX_STRING_LENGTH,
  SPECS_MAX_NAME_LENGTH,
} from "../../shared/constants.js";
import {
  ERR_INVALID_ID_FORMAT,
  ERR_INVALID_TYPE,
  ERR_INVALID_SOURCE,
  ERR_INVALID_PRIORITY,
  ERR_INVALID_VERIFICATION,
  ERR_INVALID_SPEC_FIELD,
  ERR_MISSING_REQUIRED_FIELD,
  ERR_DUPLICATE_ID,
  ERR_UNKNOWN_DEPENDENCY,
  ERR_SIZE_LIMIT_EXCEEDED,
  ERR_INVALID_LEVEL,
  ERR_INVALID_EARS,
  ERR_DUPLICATE_CRITERION_ID,
  ERR_ID_TYPE_MISMATCH,
} from "./errors.js";

// ---------------------------------------------------------------------------
// Enums (FR-SPECS-0003, 0040, 0015) — const tuples + derived unions, mirrors plan's
// VALID_STATUSES pattern.
// ---------------------------------------------------------------------------

export const SPEC_TYPES = ["FR", "NFR", "INT", "DATA"] as const; // FR-SPECS-0003
export type SpecType = (typeof SPEC_TYPES)[number];

export const STATUSES = ["Draft", "Approved", "Modified", "Deprecated", "Removed"] as const; // FR-SPECS-0040
export type StatusEnum = (typeof STATUSES)[number];

export const IMPLS = ["NotStarted", "Implemented", "Planned", "ToBeModified", "ToBeRemoved"] as const; // FR-SPECS-0015
export type ImplEnum = (typeof IMPLS)[number];

export const MOSCOW = ["Must", "Should", "Could", "Wont"] as const;
export type MoscowEnum = (typeof MOSCOW)[number];

export const SOURCES = ["User", "Inferred", "Sources", "Documentation"] as const;
export type SourceEnum = (typeof SOURCES)[number];

export const VERIFS = ["Test", "Analysis", "Inspection", "Demo"] as const;
export type VerifEnum = (typeof VERIFS)[number];

export const EARS_PATTERNS = ["ubiquitous", "event", "state", "optional", "unwanted"] as const; // FR-SPECS-0001, 0006
export type EarsEnum = (typeof EARS_PATTERNS)[number];

export const LEVELS = ["System", "Subsystem", "Component"] as const; // FR-SPECS-0001
export type LevelEnum = (typeof LEVELS)[number];

/** FR-SPECS-0006 — the four condition words an acceptance criterion may carry. */
export type ConditionWord = "when" | "while" | "where" | "if";

/**
 * FR-SPECS-0006 — the one condition word each EARS pattern names; null for `ubiquitous`, which
 * carries none. Single source for the write check, the validate check, and the markup round trip.
 */
export const EARS_CONDITION_WORD: Readonly<Record<EarsEnum, ConditionWord | null>> = {
  ubiquitous: null,
  event: "when",
  state: "while",
  optional: "where",
  unwanted: "if",
};

// ---------------------------------------------------------------------------
// Data types (FR-SPECS-0001, 0002)
// ---------------------------------------------------------------------------

/**
 * FR-SPECS-0001 — one EARS acceptance criterion. Exactly one condition word is carried, selected
 * by `ears` (EARS_CONDITION_WORD); `ubiquitous` carries none. `if` and `while` are legal TypeScript
 * property names (reserved only as statement keywords) and the JSON field names are fixed by the
 * schema, so they are deliberately not renamed.
 */
export interface AcceptanceCriterion {
  id: string;
  ears: EarsEnum;
  when?: string;
  while?: string;
  where?: string;
  if?: string;
  system: string;
  shall: string;
}

export interface Spec {
  id: string;
  type: SpecType;
  level: LevelEnum; // FR-SPECS-0001 — default "System"
  // FR-SPECS-0001/0006 — where the requirement sits. Empty means the author did not know it,
  // never that it does not apply.
  subsystem: string;
  component: string;
  ticket_id?: string;
  classification?: string;
  title: string;
  statement: string;
  rationale: string;
  evidence: string[]; // FR-SPECS-0001 — one "path:line-range" per source location; default []
  source: SourceEnum;
  priority: MoscowEnum;
  // Guarded (FR-SPECS-0040) — settable only via lifecycle ops, never by add/update directly.
  status: StatusEnum;
  approved_by: string;
  changed: string; // ISO8601 UTC (FR-SPECS-0042)
  changed_by: string; // resolved actor (FR-SPECS-0041)
  verification: VerifEnum;
  acceptance: AcceptanceCriterion[];
  depends_on: string[]; // FR-SPECS-0005 — directional, must stay acyclic
  related: string[]; // FR-SPECS-0005 — associative, may cycle
  implementation: ImplEnum; // guarded (FR-SPECS-0040) — settable only via `implemented`
  implementation_notes: string;
  notes: string;
}

export interface AreaEntry {
  code: string;
  name: string;
}

/**
 * FR-SPECS-0004 — the nine quality-characteristic codes pre-registered in every document. They are
 * recommended, never mandatory: any registered area is legal on any type, and an NFR whose area
 * falls outside these nine is accepted on write and reported by validate as a recommendation.
 */
export const RESERVED_NFR_AREAS: readonly AreaEntry[] = [
  { code: "PERF", name: "performance efficiency" },
  { code: "SEC", name: "security" },
  { code: "REL", name: "reliability" },
  { code: "USE", name: "usability" },
  { code: "MAIN", name: "maintainability" },
  { code: "PORT", name: "portability" },
  { code: "COMP", name: "compatibility" },
  { code: "FUNC", name: "functional suitability" },
  { code: "SAFE", name: "safety" },
];

export interface SpecsDocument {
  system: string; // FR-SPECS-0002 — the system whose requirements this document holds
  description: string;
  created_at: string; // ISO8601 UTC (FR-SPECS-0042)
  updated_at: string; // ISO8601 UTC (FR-SPECS-0042)
  previous_version: string | null; // backup path at write time (FR-SPECS-0070)
  // FR-SPECS-0002/0009/0016 — ids of purged specs, retained so an id is never reused. Purge erases
  // a spec's content, deliberately not its identity. Document-level bookkeeping: not a spec field,
  // never rendered, and deliberately uncapped.
  purged_ids: string[];
  areas: AreaEntry[];
  specs: Spec[];
}

export interface SpecInput extends CommandInput {}

// ---------------------------------------------------------------------------
// Guarded fields (FR-SPECS-0040) — add/update MUST silently drop any caller-supplied value.
// ---------------------------------------------------------------------------

export const GUARDED_FIELDS = ["status", "approved_by", "implementation", "changed_by"] as const;
export type GuardedField = (typeof GUARDED_FIELDS)[number];

/** Drops any key in GUARDED_FIELDS from a spec item. Flat check — specs has no nested phases/steps. */
export function stripGuarded(item: Record<string, unknown>): Record<string, unknown> {
  const guarded: ReadonlySet<string> = new Set(GUARDED_FIELDS);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (guarded.has(key)) continue; // FR-SPECS-0040 — silently dropped, not an error
    result[key] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Known/required fields (FR-SPECS-0001)
// ---------------------------------------------------------------------------

export const KNOWN_SPEC_FIELDS: ReadonlySet<string> = new Set([
  "id",
  "type",
  "level",
  "subsystem",
  "component",
  "ticket_id",
  "classification",
  "title",
  "statement",
  "rationale",
  "evidence",
  "source",
  "priority",
  "status",
  "approved_by",
  "changed",
  "changed_by",
  "verification",
  "acceptance",
  "depends_on",
  "related",
  "implementation",
  "implementation_notes",
  "notes",
]);

// FR-SPECS-0001 — required, non-default string fields. `id` is also checked distinctly by
// callers as `missing_id` (FR-SPECS-0004) before this generic check runs; `level` is required
// but defaults to "System" when omitted (applied by the caller, not validated here) so it is
// intentionally excluded from this list. `acceptance` (required, non-empty array) is checked
// separately below since it is not a string field.
const REQUIRED_STRING_FIELDS: ReadonlyArray<keyof Spec> = [
  "id",
  "type",
  "title",
  "statement",
  "source",
  "priority",
  "verification",
];

// ---------------------------------------------------------------------------
// Validators (FR-SPECS-0001, 0003, 0004, 0005, 0007, 0040)
// ---------------------------------------------------------------------------

export const ID_RE = /^(FR|NFR|INT|DATA)-[A-Z0-9]+-\d{4}$/; // FR-SPECS-0004

// Same pattern as ID_RE but with capturing groups for area/seq, used internally by parseId.
// Kept as a second regex so ID_RE itself stays byte-identical to the SPECS contract.
const ID_CAPTURE_RE = /^(FR|NFR|INT|DATA)-([A-Z0-9]+)-(\d{4})$/;

/** Parses a spec id into its prefix/area/sequence parts, or null if it does not match ID_RE. */
export function parseId(id: string): { prefix: SpecType; area: string; seq: number } | null {
  const m = ID_CAPTURE_RE.exec(id);
  if (!m) return null;
  return { prefix: m[1] as SpecType, area: m[2]!, seq: parseInt(m[3]!, 10) };
}

/** FR-SPECS-0004 — id must match `<PREFIX>-<AREA>-<NNNN>`. */
export function validateIdFormat(id: string): string | null {
  return ID_RE.test(id) ? null : ERR_INVALID_ID_FORMAT;
}

/**
 * FR-SPECS-0004/0021 — true when spec's AREA is not registered in doc.areas. validate-only: on
 * every write path (add, migrate) autoRegisterAreas() registers a brand-new AREA before this
 * would ever run, so a write is never refused for introducing one (registration on first use).
 * What remains reachable is a hand-edited or externally-assembled document naming an area the
 * registry does not hold, which validate (FR-SPECS-0021) reports as an `area_registration`
 * finding at error severity. An id that fails ID_RE is not this function's concern
 * (validateIdFormat covers it) — an unparseable id is treated as registered so the two checks
 * don't collide on the same item.
 */
export function validateAreaRegistration(spec: Spec, doc: SpecsDocument): boolean {
  const parsed = parseId(spec.id);
  if (!parsed) return false;
  // FR-SPECS-0004 AC4 — the nine reserved codes count as registered even when a legacy document's
  // registry has not yet materialised them, so a read-only pass over such a document stays clean.
  if (RESERVED_NFR_AREAS.some((a) => a.code === parsed.area)) return false;
  const registered = (doc.areas ?? []).some((a) => a.code === parsed.area);
  return !registered;
}

/**
 * FR-SPECS-0004 AC4/AC7 — appends any of the nine quality-characteristic codes missing from
 * doc.areas, preserving every existing entry and its name (a document that renamed a code keeps
 * its own name). Idempotent. Called from newDocument() and from the add/migrate write paths only:
 * a read path must never mutate the document (FR-SPECS-0021 AC9).
 */
export function ensureReservedAreas(doc: SpecsDocument): void {
  doc.areas = doc.areas ?? [];
  for (const reserved of RESERVED_NFR_AREAS) {
    if (!doc.areas.some((a) => a.code === reserved.code)) {
      doc.areas.push({ code: reserved.code, name: reserved.name });
    }
  }
}

/**
 * FR-SPECS-0004 — for each id whose AREA is not yet in doc.areas, registers it with the default
 * name (name = code), so a write introducing a brand-new area is never refused (registration on
 * first use). update never calls this — it introduces no new ids.
 */
export function autoRegisterAreas(doc: SpecsDocument, ids: string[]): void {
  doc.areas = doc.areas ?? [];
  for (const id of ids) {
    const parsed = parseId(id);
    if (!parsed) continue; // invalid ids are rejected elsewhere (validateIdFormat)
    if (!doc.areas.some((a) => a.code === parsed.area)) {
      doc.areas.push({ code: parsed.area, name: parsed.area });
    }
  }
}

/** FR-SPECS-0003 — `type` must be one of SPEC_TYPES. */
export function validateType(t: unknown): string | null {
  return typeof t === "string" && (SPEC_TYPES as readonly string[]).includes(t) ? null : ERR_INVALID_TYPE;
}

/** FR-SPECS-0001 — `level` must be one of LEVELS. Mirrors validateType. */
export function validateLevel(v: unknown): string | null {
  return typeof v === "string" && (LEVELS as readonly string[]).includes(v) ? null : ERR_INVALID_LEVEL;
}

/** FR-SPECS-0001 — a criterion's `ears` must be one of EARS_PATTERNS. Mirrors validateType. */
export function validateEars(v: unknown): string | null {
  return typeof v === "string" && (EARS_PATTERNS as readonly string[]).includes(v) ? null : ERR_INVALID_EARS;
}

/**
 * FR-SPECS-0009 — a spec's `type` must agree with the prefix of its own id, on add and update
 * alike, because the id can never change and a disagreeing pair could only be deleted and
 * re-authored. An id that fails ID_RE, or a `type` outside SPEC_TYPES, is not this function's
 * concern (validateIdFormat / validateType cover those) — both pass here so the errors don't
 * collide on the same item.
 */
export function validateIdTypeConsistency(id: string, type: unknown): string | null {
  const parsed = parseId(id);
  if (!parsed) return null;
  if (typeof type !== "string" || !(SPEC_TYPES as readonly string[]).includes(type)) return null;
  return parsed.prefix === type ? null : ERR_ID_TYPE_MISMATCH;
}

/**
 * FR-SPECS-0001 AC3 — fills every omitted criterion id with the next free `<specId>.AC<n>`.
 * Supplied ids are claimed first and never renumbered; omitted ones are then filled in array
 * order, each taking the lowest n >= 1 not already claimed. Pure — returns a new array.
 */
export function assignCriterionIds(specId: string, criteria: AcceptanceCriterion[]): AcceptanceCriterion[] {
  const claimed = new Set<string>();
  for (const c of criteria ?? []) {
    if (typeof c?.id === "string" && c.id.trim() !== "") claimed.add(c.id);
  }
  let next = 1;
  return (criteria ?? []).map((c) => {
    if (typeof c?.id === "string" && c.id.trim() !== "") return c;
    while (claimed.has(`${specId}.AC${next}`)) next += 1;
    const id = `${specId}.AC${next}`;
    claimed.add(id);
    return { ...c, id };
  });
}

/**
 * FR-SPECS-0001 AC4/AC5/AC6 — field-level criterion checks that reject a write: an out-of-enum
 * `ears`, a missing `system` or `shall`, and two criteria within one unit sharing an id. Whether a
 * criterion's condition word agrees with its `ears`, and whether it carries more than one, are
 * cross-field rules reported by validate (FR-SPECS-0006), not rejected here.
 */
export function validateCriteria(spec: Spec): string | null {
  const seen = new Set<string>();
  for (const c of spec.acceptance ?? []) {
    const earsError = validateEars(c?.ears);
    if (earsError) return earsError;
    if (typeof c?.system !== "string" || c.system.trim() === "") return ERR_MISSING_REQUIRED_FIELD;
    if (typeof c?.shall !== "string" || c.shall.trim() === "") return ERR_MISSING_REQUIRED_FIELD;
    if (typeof c?.id === "string" && c.id.trim() !== "") {
      if (seen.has(c.id)) return ERR_DUPLICATE_CRITERION_ID;
      seen.add(c.id);
    }
  }
  return null;
}

/** FR-SPECS-0001 — `source` must be one of SOURCES. Mirrors validateType. */
export function validateSource(s: unknown): string | null {
  return typeof s === "string" && (SOURCES as readonly string[]).includes(s) ? null : ERR_INVALID_SOURCE;
}

/** FR-SPECS-0001 — `priority` must be one of MOSCOW. Mirrors validateType. */
export function validatePriority(p: unknown): string | null {
  return typeof p === "string" && (MOSCOW as readonly string[]).includes(p) ? null : ERR_INVALID_PRIORITY;
}

/** FR-SPECS-0001 — `verification` must be one of VERIFS. Mirrors validateType. */
export function validateVerification(v: unknown): string | null {
  return typeof v === "string" && (VERIFS as readonly string[]).includes(v) ? null : ERR_INVALID_VERIFICATION;
}

/** FR-SPECS-0001 — an unknown key on a spec item is rejected. */
export function validateKnownFields(item: Record<string, unknown>): string | null {
  for (const key of Object.keys(item)) {
    if (!KNOWN_SPEC_FIELDS.has(key)) return ERR_INVALID_SPEC_FIELD;
  }
  return null;
}

/** FR-SPECS-0001/0006 — every required field (per REQUIRED_STRING_FIELDS) must be non-empty, and `acceptance` non-empty. */
export function validateRequired(spec: Partial<Spec>): string | null {
  for (const field of REQUIRED_STRING_FIELDS) {
    const value = spec[field];
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
      return ERR_MISSING_REQUIRED_FIELD;
    }
  }
  if (!Array.isArray(spec.acceptance) || spec.acceptance.length === 0) {
    return ERR_MISSING_REQUIRED_FIELD;
  }
  return null;
}

/**
 * FR-SPECS-0005, 0009, 0016 — every spec id must be unique across both the document's live specs
 * and its `purged_ids` registry. The seen-set is seeded from the registry before walking the
 * specs, so a live id colliding with either a live id or a purged one is rejected with the same
 * `duplicate_id`. This is the single enforcement point for never-reuse: every write subcommand
 * reaches it through the shared post-batch gate, so add, update and migrate are covered at once.
 */
export function validateUniqueIds(doc: SpecsDocument): string | null {
  const seen = new Set<string>(doc.purged_ids ?? []);
  for (const spec of doc.specs ?? []) {
    if (!spec.id) continue;
    if (seen.has(spec.id)) return ERR_DUPLICATE_ID;
    seen.add(spec.id);
  }
  return null;
}

/**
 * FR-SPECS-0005 — every depends_on/related entry must reference an id present in the document.
 * Soft-deleted (Removed) specs remain valid targets since they are still present in doc.specs.
 */
export function validateReferences(doc: SpecsDocument): string | null {
  const ids = new Set((doc.specs ?? []).map((s) => s.id));
  for (const spec of doc.specs ?? []) {
    for (const dep of spec.depends_on ?? []) {
      if (!ids.has(dep)) return ERR_UNKNOWN_DEPENDENCY;
    }
    for (const rel of spec.related ?? []) {
      if (!ids.has(rel)) return ERR_UNKNOWN_DEPENDENCY;
    }
  }
  return null;
}

/**
 * FR-SPECS-0005 — the depends_on graph must stay acyclic (self-dependency counts as a cycle).
 * `related` is intentionally NOT checked here — it may legitimately form cycles.
 */
export function validateDependsAcyclic(doc: SpecsDocument): string | null {
  const graph = new Map<string, string[]>();
  for (const spec of doc.specs ?? []) {
    if (spec.id) graph.set(spec.id, [...(spec.depends_on ?? [])]);
  }
  return detectCycle(graph); // shared/graph.ts — generic DFS, "dependency_cycle" | null
}

/**
 * Recursively enforces string length limits: `id`/`title`/`name`/`code`/`system` at
 * SPECS_MAX_NAME_LENGTH, all other strings at SPECS_MAX_STRING_LENGTH.
 * FR-SPECS-0007 AC3 — `system` is name-like, which the keyHint recursion applies to both a
 * criterion's `system` and the document's own `system` field. Both are intended.
 */
function checkStringLimits(value: unknown, keyHint?: string): string | null {
  if (typeof value === "string") {
    const isNameLike =
      keyHint === "id" || keyHint === "title" || keyHint === "name" || keyHint === "code" || keyHint === "system";
    const limit = isNameLike ? SPECS_MAX_NAME_LENGTH : SPECS_MAX_STRING_LENGTH;
    return value.length > limit ? ERR_SIZE_LIMIT_EXCEEDED : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const r = checkStringLimits(item, keyHint);
      if (r) return r;
    }
    return null;
  }
  if (typeof value === "object" && value !== null) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const r = checkStringLimits(val, key);
      if (r) return r;
    }
  }
  return null;
}

/**
 * FR-SPECS-0007 — enforces: max SPECS_MAX_SPECS specs per document; max
 * SPECS_MAX_DEPENDENCIES_PER_SPEC entries in each of depends_on/related; max
 * SPECS_MAX_ACCEPTANCE_PER_SPEC acceptance criteria per spec; max SPECS_MAX_EVIDENCE_PER_SPEC
 * evidence locations per spec; max SPECS_MAX_STRING_LENGTH characters per string field; max
 * SPECS_MAX_NAME_LENGTH characters per id/title/name/code/system.
 * (SPECS_MAX_BATCH_SIZE is enforced by index.ts before processing, not here.)
 * `purged_ids` is deliberately uncapped — growth is bounded by deliberate human action.
 */
export function validateSizeLimits(doc: SpecsDocument): string | null {
  if ((doc.specs ?? []).length > SPECS_MAX_SPECS) return ERR_SIZE_LIMIT_EXCEEDED;
  for (const spec of doc.specs ?? []) {
    if ((spec.depends_on ?? []).length > SPECS_MAX_DEPENDENCIES_PER_SPEC) return ERR_SIZE_LIMIT_EXCEEDED;
    if ((spec.related ?? []).length > SPECS_MAX_DEPENDENCIES_PER_SPEC) return ERR_SIZE_LIMIT_EXCEEDED;
    if ((spec.acceptance ?? []).length > SPECS_MAX_ACCEPTANCE_PER_SPEC) return ERR_SIZE_LIMIT_EXCEEDED;
    if ((spec.evidence ?? []).length > SPECS_MAX_EVIDENCE_PER_SPEC) return ERR_SIZE_LIMIT_EXCEEDED;
  }
  return checkStringLimits(doc);
}

// ---------------------------------------------------------------------------
// Plain document I/O (FR-SPECS-0002, 0071) — used for the first-create bypass and by
// applyBatchWrite's saveDoc callback. Regular reads go through shared/doc-io.ts readDocWithRetry.
// ---------------------------------------------------------------------------

export function loadSpecs(file: string): SpecsDocument | null {
  if (!fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as SpecsDocument;
  if (!("previous_version" in raw)) {
    (raw as Record<string, unknown>)["previous_version"] = null;
  }
  // FR-SPECS-0002 — legacy documents predate the purged-id registry; normalise the shape once at
  // the read boundary so no downstream site has to guard for its absence.
  if (!("purged_ids" in raw)) {
    (raw as Record<string, unknown>)["purged_ids"] = [];
  }
  return raw;
}

export function saveSpecs(file: string, doc: SpecsDocument): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  doc.updated_at = nowUtcZ();
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
}

/**
 * FR-SPECS-0002 — a fresh, empty specs document. previous_version stays null until the first
 * backup exists; the purged-id registry starts empty; the nine reserved quality-characteristic
 * codes are pre-registered (FR-SPECS-0004 AC7). A document that already exists is never
 * re-created, so the write paths call ensureReservedAreas too.
 */
export function newDocument(system?: string): SpecsDocument {
  const ts = nowUtcZ();
  const doc: SpecsDocument = {
    system: system ?? "",
    description: "",
    created_at: ts,
    updated_at: ts,
    previous_version: null,
    purged_ids: [],
    areas: [],
    specs: [],
  };
  ensureReservedAreas(doc);
  return doc;
}
