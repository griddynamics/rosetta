// Implements FR-SPECS-0050 (named result types) for the two shared write-path result shapes.
// Per SPECS §4: "builders in output.ts (buildSpecWriteResult, buildSpecLifecycleResult) are the
// sole authors of the two shared shapes" — every write/lifecycle subcommand (S6) constructs its
// result through these, never by hand-assembling the shape inline.

import type { ImplEnum, Spec, SpecsDocument, StatusEnum } from "./core.js";

// FR-SPECS-0050 — nested shape, named per FR-HELP-0002 (no anonymous shape at any depth).
export interface SpecRef {
  id: string;
  status: StatusEnum;
}

// FR-SPECS-0050 — nested shape for SpecWriteResult.document.
export interface SpecDocumentSummary {
  system: string; // FR-SPECS-0002 — a document holds one system's requirements
  total: number;
  previous_version: string | null;
}

// FR-SPECS-0050 — shared write result for add (FR-SPECS-0010) and update (FR-SPECS-0013).
export interface SpecWriteResult {
  document: SpecDocumentSummary;
  affected: SpecRef[];
}

// FR-SPECS-0050 — shared lifecycle result for approve/deprecate/restore/reopen
// (FR-SPECS-0017..0020).
export interface SpecLifecycleResult {
  updated: SpecRef[];
}

/** Resolves affected ids to their post-write {id,status} refs, dropping any id no longer present. */
function toSpecRefs(doc: SpecsDocument, ids: string[]): SpecRef[] {
  const byId = new Map<string, Spec>((doc.specs ?? []).map((s) => [s.id, s]));
  const refs: SpecRef[] = [];
  for (const id of ids) {
    const spec = byId.get(id);
    if (spec) refs.push({ id: spec.id, status: spec.status });
  }
  return refs;
}

/**
 * Builds the SpecWriteResult for add/update: document summary (system, total count,
 * previous_version — the backup path from FR-SPECS-0070, null on first create) plus the
 * affected specs' post-write {id,status}.
 */
export function buildSpecWriteResult(
  doc: SpecsDocument,
  affectedIds: string[],
  previousVersion: string | null,
): SpecWriteResult {
  return {
    document: {
      system: doc.system,
      total: (doc.specs ?? []).length,
      previous_version: previousVersion,
    },
    affected: toSpecRefs(doc, affectedIds),
  };
}

/** Builds the SpecLifecycleResult for approve/deprecate/restore/reopen: affected specs' post-write {id,status}. */
export function buildSpecLifecycleResult(doc: SpecsDocument, affectedIds: string[]): SpecLifecycleResult {
  return { updated: toSpecRefs(doc, affectedIds) };
}

/**
 * Injects the real backup path (resolved by applyBatchWrite only AFTER `build` returns) into a
 * SpecWriteResult's document summary. add.ts/update.ts build their result with
 * document.previous_version=null as a placeholder (it cannot be known inside `build`), then call
 * this once the outer applyBatchWrite envelope reveals the actual value — mirrors plan's upsert.ts
 * post-write injection.
 */
export function withPreviousVersion(result: SpecWriteResult, previousVersion: string | null): SpecWriteResult {
  return { ...result, document: { ...result.document, previous_version: previousVersion } };
}

// ---------------------------------------------------------------------------
// FR-SPECS-0050 — remaining named result-shape types consumed by the S5 pure modules
// (rubric.ts/graph.ts/render.ts/req-parser.ts) and their S6 cmd* wrappers. Added here (rather
// than in S3) because S5 is the first stage that actually needs them; the CRUD/lifecycle shapes
// above were added in S3 for write.ts. Remaining SPECS §4 shapes (SpecGetResult, SpecQueryResult,
// SpecDeleteResult, SpecImplementedResult, SpecValidateResult, SpecAreaInfo/Totals/NextId/
// SpecInfoResult, SpecSkipped, SpecMigrateResult) are for S6 subcommands to add when they land —
// left out here to avoid speculative additions this stage does not consume.
// ---------------------------------------------------------------------------

/** FR-SPECS-0021 — finding severity: error blocks approve; warning/info are advisory only. */
export type Severity = "error" | "warning" | "info";

/** FR-SPECS-0021 — one structural or phrasing finding, keyed to the spec id it concerns. */
export interface SpecFinding {
  id: string;
  check: string;
  severity: Severity;
  message: string;
}

/** FR-SPECS-0022 — depends_on is directional/hierarchical; related is associative and may cycle. */
export type EdgeKind = "depends_on" | "related";

/** FR-SPECS-0022 — one graph edge, used by both whole-doc edge lists and cycle enumeration. */
export interface SpecEdge {
  from: string;
  to: string;
  kind: EdgeKind;
}

/**
 * FR-SPECS-0022 — cmdGraph's result. Target mode populates dependencies/dependents/related
 * (cycles always []); whole-doc mode populates edges (dependencies/dependents/related absent).
 * cycles/unresolved are always present (empty arrays when none found).
 */
export interface SpecGraphResult {
  dependencies?: string[];
  dependents?: string[];
  related?: string[];
  edges?: SpecEdge[];
  cycles: SpecEdge[][];
  unresolved: string[];
}

/**
 * FR-SPECS-0023 — cmdRender's result: the rendered document string plus the format it used.
 * The union stays inline: a string union is named only when more than one declaration references
 * it, and this one appears here alone.
 */
export interface SpecRenderResult {
  format: "markdown" | "text" | "xml";
  content: string;
}

// ---------------------------------------------------------------------------
// FR-SPECS-0050 — S6 result shapes (get/query/delete/purge/implemented/validate/info/migrate).
// ---------------------------------------------------------------------------

/** FR-SPECS-0011 — cmdGet's result: full spec units found (any status, incl. Removed) + missing ids. */
export interface SpecGetResult {
  found: Spec[];
  missing: string[];
}

/** FR-SPECS-0012 — cmdQuery's result: the matching specs and their count (count === specs.length). */
export interface SpecQueryResult {
  specs: Spec[];
  count: number;
}

/** FR-SPECS-0014 — cmdDelete's result: soft-removed ids and ids that did not exist. */
export interface SpecDeleteResult {
  removed: string[];
  missing: string[];
}

/** FR-SPECS-0016 — cmdPurge's result: permanently removed ids and ids that did not exist. */
export interface SpecPurgeResult {
  purged: string[];
  missing: string[];
}

/**
 * FR-SPECS-0008/0050 — one field's authoring guidance, emitted both as the field's description in
 * the help schema dictionary and as an entry of the help content's field_guide section. The data
 * itself lives in field-guide.ts, which both surfaces read so they cannot diverge.
 */
export interface SpecFieldGuide {
  field: string;
  type: string;
  required: boolean;
  default: string;
  guidance: string;
}

/** FR-SPECS-0015 — nested shape for SpecImplementedResult.updated. */
export interface SpecImplementedItem {
  id: string;
  implementation: ImplEnum;
}

/** FR-SPECS-0015 — cmdImplemented's result. */
export interface SpecImplementedResult {
  updated: SpecImplementedItem[];
}

/** FR-SPECS-0021 — cmdValidate's result. `ok` is true iff error_count is 0 (warnings never block). */
export interface SpecValidateResult {
  ok: boolean;
  findings: SpecFinding[];
  error_count: number;
  warning_count: number;
}

/** FR-SPECS-0024 — nested shape for SpecInfoResult.areas. */
export interface SpecAreaInfo {
  code: string;
  name: string;
  count: number;
}

/** FR-SPECS-0024 — nested shape for SpecInfoResult.totals; each field maps an enum value to a count. */
export interface SpecTotals {
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  by_implementation: Record<string, number>;
  total: number;
}

/** FR-SPECS-0024 — nested shape for SpecInfoResult.next_ids: the next free id per prefix+area. */
export interface SpecNextId {
  prefix: string;
  area: string;
  highest: number;
  suggested: string;
}

/** FR-SPECS-0024 — cmdInfo's result: orientation summary (no full spec bodies). Timestamps are
 * local-time display strings (FR-SPECS-0042), not the stored UTC value. */
export interface SpecInfoResult {
  system: string; // FR-SPECS-0002 — a document holds one system's requirements
  description: string;
  areas: SpecAreaInfo[];
  totals: SpecTotals;
  next_ids: SpecNextId[];
  created_at: string;
  updated_at: string;
}

/**
 * FR-SPECS-0025 — nested shape for SpecMigrateResult.skipped: one exclusion with the reason it was
 * excluded. An entry covers either a whole source that could not be read or parsed, or a single
 * unit within a source that was not in the canonical shape and was therefore skipped rather than
 * reconstructed by inference. Two skipped units from one source produce two entries sharing a
 * `source`, and the unit is identified inside `reason` — the shape stays exactly two fields, with
 * no unit-id field.
 */
export interface SpecSkipped {
  source: string;
  reason: string;
}

/** FR-SPECS-0025 — cmdMigrate's result. `warnings` carries every per-unit parse/mapping issue on a
 * unit that was still imported; `skipped` carries exclusions — whole sources and individual
 * non-canonical units alike. `migrated` counts canonical units only. */
export interface SpecMigrateResult {
  migrated: number;
  sources: string[];
  warnings: SpecFinding[];
  skipped: SpecSkipped[];
}
