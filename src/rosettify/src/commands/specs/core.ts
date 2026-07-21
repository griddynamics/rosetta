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
  SPECS_MAX_STRING_LENGTH,
  SPECS_MAX_NAME_LENGTH,
} from "../../shared/constants.js";
import {
  ERR_INVALID_ID_FORMAT,
  ERR_UNKNOWN_AREA,
  ERR_INVALID_TYPE,
  ERR_INVALID_SOURCE,
  ERR_INVALID_PRIORITY,
  ERR_INVALID_VERIFICATION,
  ERR_INVALID_SPEC_FIELD,
  ERR_MISSING_REQUIRED_FIELD,
  ERR_DUPLICATE_ID,
  ERR_UNKNOWN_DEPENDENCY,
  ERR_SIZE_LIMIT_EXCEEDED,
  ERR_IMMUTABLE_ID,
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

// ---------------------------------------------------------------------------
// Data types (FR-SPECS-0001, 0002)
// ---------------------------------------------------------------------------

export interface AcceptanceCriterion {
  given: string;
  when: string;
  then: string;
}

export interface Spec {
  id: string;
  type: SpecType;
  level: string;
  ticket_id?: string;
  classification?: string;
  title: string;
  statement: string;
  rationale: string;
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

export interface SpecsDocument {
  component: string;
  description: string;
  created_at: string; // ISO8601 UTC (FR-SPECS-0042)
  updated_at: string; // ISO8601 UTC (FR-SPECS-0042)
  previous_version: string | null; // backup path at write time (FR-SPECS-0070)
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

const KNOWN_SPEC_FIELDS: ReadonlySet<string> = new Set([
  "id",
  "type",
  "level",
  "ticket_id",
  "classification",
  "title",
  "statement",
  "rationale",
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
 * FR-SPECS-0004 — AREA must be registered in doc.areas. Callers that auto-register new areas
 * (add, migrate) MUST call autoRegisterAreas() over the batch's ids before this check, so a
 * new AREA introduced by the same call is not rejected. An id that fails ID_RE is not this
 * function's concern (validateIdFormat covers it) — an unparseable id is treated as passing
 * here so the two errors don't collide on the same item.
 */
export function validateAreaRegistration(spec: Spec, doc: SpecsDocument): string | null {
  const parsed = parseId(spec.id);
  if (!parsed) return null;
  const registered = (doc.areas ?? []).some((a) => a.code === parsed.area);
  return registered ? null : ERR_UNKNOWN_AREA;
}

/**
 * FR-SPECS-0004 — for each id whose AREA is not yet in doc.areas, registers it with the
 * default name (name = code). add/migrate call this BEFORE validateAreaRegistration so a
 * batch introducing a brand-new area succeeds instead of being rejected unknown_area.
 * update never calls this — it introduces no new ids.
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

/** FR-SPECS-0004 — update/patch MUST NOT change a spec's id. Reuses the plan pattern. */
export function validateImmutableId(patchId: string | undefined, targetId: string): string | null {
  if (patchId !== undefined && patchId !== targetId) return ERR_IMMUTABLE_ID;
  return null;
}

/** FR-SPECS-0003 — `type` must be one of SPEC_TYPES. */
export function validateType(t: unknown): string | null {
  return typeof t === "string" && (SPEC_TYPES as readonly string[]).includes(t) ? null : ERR_INVALID_TYPE;
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

/** FR-SPECS-0005 — every spec id in the document must be unique. */
export function validateUniqueIds(doc: SpecsDocument): string | null {
  const seen = new Set<string>();
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

/** Recursively enforces string length limits: `id`/`title`/`name`/`code` at SPECS_MAX_NAME_LENGTH, all other strings at SPECS_MAX_STRING_LENGTH. */
function checkStringLimits(value: unknown, keyHint?: string): string | null {
  if (typeof value === "string") {
    const isNameLike = keyHint === "id" || keyHint === "title" || keyHint === "name" || keyHint === "code";
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
 * SPECS_MAX_ACCEPTANCE_PER_SPEC acceptance criteria per spec; max SPECS_MAX_STRING_LENGTH
 * characters per string field; max SPECS_MAX_NAME_LENGTH characters per id/title/name/code.
 * (SPECS_MAX_BATCH_SIZE is enforced by index.ts before processing, not here.)
 */
export function validateSizeLimits(doc: SpecsDocument): string | null {
  if ((doc.specs ?? []).length > SPECS_MAX_SPECS) return ERR_SIZE_LIMIT_EXCEEDED;
  for (const spec of doc.specs ?? []) {
    if ((spec.depends_on ?? []).length > SPECS_MAX_DEPENDENCIES_PER_SPEC) return ERR_SIZE_LIMIT_EXCEEDED;
    if ((spec.related ?? []).length > SPECS_MAX_DEPENDENCIES_PER_SPEC) return ERR_SIZE_LIMIT_EXCEEDED;
    if ((spec.acceptance ?? []).length > SPECS_MAX_ACCEPTANCE_PER_SPEC) return ERR_SIZE_LIMIT_EXCEEDED;
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
  return raw;
}

export function saveSpecs(file: string, doc: SpecsDocument): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  doc.updated_at = nowUtcZ();
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
}

/** FR-SPECS-0002 — a fresh, empty specs document. previous_version stays null until the first backup exists. */
export function newDocument(component?: string): SpecsDocument {
  const ts = nowUtcZ();
  return {
    component: component ?? "",
    description: "",
    created_at: ts,
    updated_at: ts,
    previous_version: null,
    areas: [],
    specs: [],
  };
}
