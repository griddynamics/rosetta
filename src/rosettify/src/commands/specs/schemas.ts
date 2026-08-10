// Implements FR-SPECS-0050 (named result types) / FR-SPECS-0060 (help schemas dictionary) /
// FR-HELP-0002 (flat named-type dict, $ref-by-name, no anonymous shape at any depth). Mirrors
// commands/plan/schemas.ts. Every schema here is sourced from the real exported TS types in
// core.ts/output.ts (SPECS §3/§4) — this file only re-describes their shape as JSON Schema, it
// never introduces a field the type declarations don't have.
//
// $ref convention: { $ref: "<DictKey>" } — string key into specsSchemasDict.
// Array of named shape: { type:"array", items:{ $ref:"<DictKey>" } }.

import { SOURCES, MOSCOW, SPEC_TYPES, STATUSES, IMPLS, VERIFS, LEVELS, EARS_PATTERNS } from "./core.js";
import { SPEC_FIELD_GUIDE } from "./field-guide.js";

// ---------------------------------------------------------------------------
// Field descriptions (FR-SPECS-0008 AC3) — every Spec and AcceptanceCriterion property below takes
// its `description` from SPEC_FIELD_GUIDE by lookup, never by a second hand-written copy, so the
// schema dictionary and the help field_guide section are the same strings by construction.
// A field with no registered guidance throws at module load rather than silently emitting nothing,
// which is what keeps the two surfaces incapable of drifting apart.
// ---------------------------------------------------------------------------

const GUIDANCE_BY_FIELD: ReadonlyMap<string, string> = new Map(SPEC_FIELD_GUIDE.map((g) => [g.field, g.guidance]));

function guidance(field: string): string {
  const text = GUIDANCE_BY_FIELD.get(field);
  if (text === undefined) throw new Error(`No authoring guidance is registered for the field: ${field}`);
  return text;
}

// ---------------------------------------------------------------------------
// Shared named schemas — every nested/array-items shape is its own dict entry (FR-HELP-0002).
// ---------------------------------------------------------------------------

// AcceptanceCriterion — one EARS criterion (core.ts). Criterion guidance is registered under the
// path the caller addresses it by, so its `id` does not collide with the spec unit's own `id`.
const acceptanceCriterionSchema = {
  type: "object" as const,
  description: "One acceptance criterion",
  properties: {
    id: { type: "string" as const, description: guidance("acceptance.id") },
    ears: { type: "string" as const, enum: EARS_PATTERNS as unknown as string[], description: guidance("acceptance.ears") },
    when: { type: "string" as const, description: guidance("acceptance.when") },
    while: { type: "string" as const, description: guidance("acceptance.while") },
    where: { type: "string" as const, description: guidance("acceptance.where") },
    if: { type: "string" as const, description: guidance("acceptance.if") },
    system: { type: "string" as const, description: guidance("acceptance.system") },
    shall: { type: "string" as const, description: guidance("acceptance.shall") },
  },
};

// Spec — full spec unit (core.ts)
const specSchema = {
  type: "object" as const,
  description: "A full spec unit",
  properties: {
    id: { type: "string" as const, description: guidance("id") },
    type: { type: "string" as const, enum: SPEC_TYPES as unknown as string[], description: guidance("type") },
    level: { type: "string" as const, enum: LEVELS as unknown as string[], description: guidance("level") },
    subsystem: { type: "string" as const, description: guidance("subsystem") },
    component: { type: "string" as const, description: guidance("component") },
    ticket_id: { type: "string" as const, description: guidance("ticket_id") },
    classification: { type: "string" as const, description: guidance("classification") },
    title: { type: "string" as const, description: guidance("title") },
    statement: { type: "string" as const, description: guidance("statement") },
    rationale: { type: "string" as const, description: guidance("rationale") },
    evidence: { type: "array" as const, items: { type: "string" as const }, description: guidance("evidence") },
    source: { type: "string" as const, enum: SOURCES as unknown as string[], description: guidance("source") },
    priority: { type: "string" as const, enum: MOSCOW as unknown as string[], description: guidance("priority") },
    status: { type: "string" as const, enum: STATUSES as unknown as string[], description: guidance("status") },
    approved_by: { type: "string" as const, description: guidance("approved_by") },
    changed: { type: "string" as const, description: guidance("changed") },
    changed_by: { type: "string" as const, description: guidance("changed_by") },
    verification: { type: "string" as const, enum: VERIFS as unknown as string[], description: guidance("verification") },
    acceptance: { type: "array" as const, items: { $ref: "AcceptanceCriterion" as const }, description: guidance("acceptance") },
    depends_on: { type: "array" as const, items: { type: "string" as const }, description: guidance("depends_on") },
    related: { type: "array" as const, items: { type: "string" as const }, description: guidance("related") },
    implementation: { type: "string" as const, enum: IMPLS as unknown as string[], description: guidance("implementation") },
    implementation_notes: { type: "string" as const, description: guidance("implementation_notes") },
    notes: { type: "string" as const, description: guidance("notes") },
  },
};

// SpecFieldGuide — one field's authoring guidance (output.ts), emitted as the help field_guide section
const specFieldGuideSchema = {
  type: "object" as const,
  description: "Authoring guidance for one field of the spec unit or of an acceptance criterion",
  properties: {
    field: { type: "string" as const },
    type: { type: "string" as const },
    required: { type: "boolean" as const },
    default: { type: "string" as const },
    guidance: { type: "string" as const },
  },
};

// AreaEntry — {code, name} raw document area entry (core.ts, SpecsDocument.areas). Not itself
// referenced by any subcommand input/output schema below (SpecInfoResult uses the richer
// SpecAreaInfo, which adds `count`) — present in the dict solely because FR-SPECS-0050 names it
// explicitly as one of "the remaining named result types" that SHALL be in the schema dictionary.
const areaEntrySchema = {
  type: "object" as const,
  description: "One registered area code/name pair on the specs document",
  properties: {
    code: { type: "string" as const },
    name: { type: "string" as const },
  },
};

// SpecRef — {id, status} used in write/lifecycle results (output.ts)
const specRefSchema = {
  type: "object" as const,
  description: "A spec's id and its post-write status",
  properties: {
    id: { type: "string" as const },
    status: { type: "string" as const, enum: STATUSES as unknown as string[] },
  },
};

// SpecDocumentSummary — nested shape for SpecWriteResult.document (output.ts)
const specDocumentSummarySchema = {
  type: "object" as const,
  description: "Compact document snapshot after a write: system, total spec count, backup path",
  properties: {
    system: { type: "string" as const },
    total: { type: "integer" as const },
    previous_version: { type: ["string", "null"] as const, description: "backup path captured at this write, or null on first write" },
  },
};

// SpecWriteResult — shared by add, update (output.ts)
const specWriteResultSchema = {
  type: "object" as const,
  description: "Shared write result returned by add and update",
  properties: {
    document: { $ref: "SpecDocumentSummary" as const },
    affected: { type: "array" as const, items: { $ref: "SpecRef" as const } },
  },
};

// SpecLifecycleResult — shared by approve, deprecate, restore, reopen (output.ts)
const specLifecycleResultSchema = {
  type: "object" as const,
  description: "Shared result returned by approve, deprecate, restore, reopen",
  properties: {
    updated: { type: "array" as const, items: { $ref: "SpecRef" as const } },
  },
};

// SpecGetResult — get (output.ts)
const specGetResultSchema = {
  type: "object" as const,
  description: "Result of get: found spec units (any status, including Removed) plus missing ids",
  properties: {
    found: { type: "array" as const, items: { $ref: "Spec" as const } },
    missing: { type: "array" as const, items: { type: "string" as const } },
  },
};

// SpecQueryResult — query (output.ts)
const specQueryResultSchema = {
  type: "object" as const,
  description: "Result of query: matching spec units and their count",
  properties: {
    specs: { type: "array" as const, items: { $ref: "Spec" as const } },
    count: { type: "integer" as const },
  },
};

// SpecDeleteResult — delete (output.ts)
const specDeleteResultSchema = {
  type: "object" as const,
  description: "Result of delete: soft-removed ids and ids that did not exist",
  properties: {
    removed: { type: "array" as const, items: { type: "string" as const } },
    missing: { type: "array" as const, items: { type: "string" as const } },
  },
};

// SpecPurgeResult — purge (output.ts)
const specPurgeResultSchema = {
  type: "object" as const,
  description: "Result of purge: permanently removed ids and ids that did not exist",
  properties: {
    purged: { type: "array" as const, items: { type: "string" as const } },
    missing: { type: "array" as const, items: { type: "string" as const } },
  },
};

// SpecImplementedItem — nested shape for SpecImplementedResult.updated (output.ts)
const specImplementedItemSchema = {
  type: "object" as const,
  description: "A spec's id and its post-write implementation value",
  properties: {
    id: { type: "string" as const },
    implementation: { type: "string" as const, enum: IMPLS as unknown as string[] },
  },
};

// SpecImplementedResult — implemented (output.ts)
const specImplementedResultSchema = {
  type: "object" as const,
  description: "Result of implemented",
  properties: {
    updated: { type: "array" as const, items: { $ref: "SpecImplementedItem" as const } },
  },
};

// SpecFinding — nested shape for SpecValidateResult.findings and SpecMigrateResult.warnings (output.ts)
const specFindingSchema = {
  type: "object" as const,
  description: "One structural or phrasing finding, attributed to a spec id",
  properties: {
    id: { type: "string" as const },
    check: { type: "string" as const },
    severity: { type: "string" as const, enum: ["error", "warning", "info"] },
    message: { type: "string" as const },
  },
};

// SpecValidateResult — validate (output.ts)
const specValidateResultSchema = {
  type: "object" as const,
  description: "Result of validate: whether the scope is clean, findings, and error/warning counts",
  properties: {
    ok: { type: "boolean" as const, description: "true iff error_count is 0; warnings never block" },
    findings: { type: "array" as const, items: { $ref: "SpecFinding" as const } },
    error_count: { type: "integer" as const },
    warning_count: { type: "integer" as const },
  },
};

// SpecEdge — nested shape for SpecGraphResult.edges/cycles (output.ts)
const specEdgeSchema = {
  type: "object" as const,
  description: "One graph edge",
  properties: {
    from: { type: "string" as const },
    to: { type: "string" as const },
    kind: { type: "string" as const, enum: ["depends_on", "related"] },
  },
};

// SpecGraphResult — graph (output.ts)
const specGraphResultSchema = {
  type: "object" as const,
  description:
    "Result of graph. Target mode populates dependencies/dependents/related (cycles always []); " +
    "whole-document mode populates edges instead (dependencies/dependents/related absent). " +
    "cycles/unresolved are always present.",
  properties: {
    dependencies: { type: "array" as const, items: { type: "string" as const } },
    dependents: { type: "array" as const, items: { type: "string" as const } },
    related: { type: "array" as const, items: { type: "string" as const } },
    edges: { type: "array" as const, items: { $ref: "SpecEdge" as const } },
    cycles: { type: "array" as const, items: { type: "array" as const, items: { $ref: "SpecEdge" as const } } },
    unresolved: { type: "array" as const, items: { type: "string" as const } },
  },
};

// SpecRenderResult — render (output.ts)
const specRenderResultSchema = {
  type: "object" as const,
  description: "Result of render: the rendered document string and the format used",
  properties: {
    format: { type: "string" as const, enum: ["markdown", "text", "xml"] },
    content: { type: "string" as const },
  },
};

// SpecAreaInfo — nested shape for SpecInfoResult.areas (output.ts)
const specAreaInfoSchema = {
  type: "object" as const,
  description: "One registered area code/name and its spec count",
  properties: {
    code: { type: "string" as const },
    name: { type: "string" as const },
    count: { type: "integer" as const },
  },
};

// SpecTotals — nested shape for SpecInfoResult.totals (output.ts)
const specTotalsSchema = {
  type: "object" as const,
  description: "Counts of specs grouped by type, status, and implementation, plus the overall total",
  properties: {
    by_type: { type: "object" as const, description: "type value -> count" },
    by_status: { type: "object" as const, description: "status value -> count" },
    by_implementation: { type: "object" as const, description: "implementation value -> count" },
    total: { type: "integer" as const },
  },
};

// SpecNextId — nested shape for SpecInfoResult.next_ids (output.ts)
const specNextIdSchema = {
  type: "object" as const,
  description: "The next free id for a prefix+area combination that already has at least one spec",
  properties: {
    prefix: { type: "string" as const },
    area: { type: "string" as const },
    highest: { type: "integer" as const },
    suggested: { type: "string" as const },
  },
};

// SpecInfoResult — info (output.ts)
const specInfoResultSchema = {
  type: "object" as const,
  description: "Result of info: an orientation summary (no full spec bodies)",
  properties: {
    system: { type: "string" as const },
    description: { type: "string" as const },
    areas: { type: "array" as const, items: { $ref: "SpecAreaInfo" as const } },
    totals: { $ref: "SpecTotals" as const },
    next_ids: { type: "array" as const, items: { $ref: "SpecNextId" as const } },
    created_at: { type: "string" as const, description: "local display time" },
    updated_at: { type: "string" as const, description: "local display time" },
  },
};

// SpecSkipped — nested shape for SpecMigrateResult.skipped (output.ts)
const specSkippedSchema = {
  type: "object" as const,
  description: "One migrate exclusion with its reason: a whole source, or a single unit not in the canonical shape",
  properties: {
    source: { type: "string" as const },
    reason: { type: "string" as const },
  },
};

// SpecMigrateResult — migrate (output.ts)
const specMigrateResultSchema = {
  type: "object" as const,
  description: "Result of migrate",
  properties: {
    migrated: { type: "integer" as const },
    sources: { type: "array" as const, items: { type: "string" as const } },
    warnings: { type: "array" as const, items: { $ref: "SpecFinding" as const } },
    skipped: { type: "array" as const, items: { $ref: "SpecSkipped" as const } },
  },
};

// ---------------------------------------------------------------------------
// Per-subcommand input schemas (FR-SPECS §9/§14) — every field also lives on CommandInput.
// ---------------------------------------------------------------------------

const specsFileProp = { type: "string" as const, description: "Path to the specs document JSON file" };
const idsProp = { type: "array" as const, items: { type: "string" as const }, description: "One or more spec ids" };
const dataProp = {
  oneOf: [
    { type: "string" as const, description: "JSON string: a single spec/patch/implemented-item object, or an array (batch)" },
    { type: "object" as const, description: "A single spec/patch/implemented-item object" },
    { type: "array" as const, description: "A batch of spec/patch/implemented-item objects" },
  ],
};

export const addInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, data: dataProp },
};
export const addOutputSchema = { $ref: "SpecWriteResult" as const };

export const getInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, ids: idsProp },
};
export const getOutputSchema = { $ref: "SpecGetResult" as const };

export const queryInputSchema = {
  type: "object" as const,
  properties: {
    specs_file: specsFileProp,
    query: { type: "string" as const, description: "Filter query string (see query_notation)" },
    include_removed: { type: "boolean" as const, description: "Include Removed specs even without an explicit status:Removed term" },
  },
};
export const queryOutputSchema = { $ref: "SpecQueryResult" as const };

export const updateInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, data: dataProp },
};
export const updateOutputSchema = { $ref: "SpecWriteResult" as const };

export const deleteInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, ids: idsProp },
};
export const deleteOutputSchema = { $ref: "SpecDeleteResult" as const };

export const purgeInputSchema = {
  type: "object" as const,
  properties: {
    specs_file: specsFileProp,
    ids: idsProp,
    force: { type: "boolean" as const, description: "Required — permanent removal refuses without it" },
  },
};
export const purgeOutputSchema = { $ref: "SpecPurgeResult" as const };

export const implementedInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, data: dataProp },
};
export const implementedOutputSchema = { $ref: "SpecImplementedResult" as const };

export const approveInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, ids: idsProp },
};
export const approveOutputSchema = { $ref: "SpecLifecycleResult" as const };

export const deprecateInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, ids: idsProp },
};
export const deprecateOutputSchema = { $ref: "SpecLifecycleResult" as const };

export const restoreInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, ids: idsProp },
};
export const restoreOutputSchema = { $ref: "SpecLifecycleResult" as const };

export const reopenInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, ids: idsProp },
};
export const reopenOutputSchema = { $ref: "SpecLifecycleResult" as const };

export const validateInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp, query: { type: "string" as const, description: "Optional scope filter" } },
};
export const validateOutputSchema = { $ref: "SpecValidateResult" as const };

export const graphInputSchema = {
  type: "object" as const,
  properties: {
    specs_file: specsFileProp,
    ids: { type: "array" as const, items: { type: "string" as const }, description: "Optional target spec id, carried as ids[0] (batch-of-one); omit for whole-document mode" },
    additional_paths: { type: "array" as const, items: { type: "string" as const }, description: "Other specs documents to resolve cross-document references against" },
  },
};
export const graphOutputSchema = { $ref: "SpecGraphResult" as const };

export const renderInputSchema = {
  type: "object" as const,
  properties: {
    specs_file: specsFileProp,
    query: { type: "string" as const, description: "Optional scope filter" },
    format: { type: "string" as const, enum: ["markdown", "text", "xml"], description: "Default markdown" },
  },
};
export const renderOutputSchema = { $ref: "SpecRenderResult" as const };

export const infoInputSchema = {
  type: "object" as const,
  properties: { specs_file: specsFileProp },
};
export const infoOutputSchema = { $ref: "SpecInfoResult" as const };

export const migrateInputSchema = {
  type: "object" as const,
  properties: {
    specs_file: specsFileProp,
    sources: { type: "array" as const, items: { type: "string" as const }, description: "Legacy markdown source paths" },
  },
};
export const migrateOutputSchema = { $ref: "SpecMigrateResult" as const };

// FR-HELP-0002 — per-subcommand schema dict, keyed by subcommand name
export const specsSubcommandSchemas = {
  add: { input: addInputSchema, output: addOutputSchema },
  get: { input: getInputSchema, output: getOutputSchema },
  query: { input: queryInputSchema, output: queryOutputSchema },
  update: { input: updateInputSchema, output: updateOutputSchema },
  delete: { input: deleteInputSchema, output: deleteOutputSchema },
  purge: { input: purgeInputSchema, output: purgeOutputSchema },
  implemented: { input: implementedInputSchema, output: implementedOutputSchema },
  approve: { input: approveInputSchema, output: approveOutputSchema },
  deprecate: { input: deprecateInputSchema, output: deprecateOutputSchema },
  restore: { input: restoreInputSchema, output: restoreOutputSchema },
  reopen: { input: reopenInputSchema, output: reopenOutputSchema },
  validate: { input: validateInputSchema, output: validateOutputSchema },
  graph: { input: graphInputSchema, output: graphOutputSchema },
  render: { input: renderInputSchema, output: renderOutputSchema },
  info: { input: infoInputSchema, output: infoOutputSchema },
  migrate: { input: migrateInputSchema, output: migrateOutputSchema },
} as const;

/**
 * FR-SPECS-0050/0060 — flat schemas dict: keyed by exported type name. One entry per distinct
 * named type — inputs, results, and shared data shapes. Used for help display (specsSchemasDict).
 * $ref convention: every array items and every nested object property uses { $ref: "<DictKey>" }.
 */
export const specsSchemasDict: Record<string, unknown> = {
  // Input schemas keyed by exported type name
  SpecAddInput: addInputSchema,
  SpecGetInput: getInputSchema,
  SpecQueryInput: queryInputSchema,
  SpecUpdateInput: updateInputSchema,
  SpecDeleteInput: deleteInputSchema,
  SpecPurgeInput: purgeInputSchema,
  SpecImplementedInput: implementedInputSchema,
  SpecApproveInput: approveInputSchema,
  SpecDeprecateInput: deprecateInputSchema,
  SpecRestoreInput: restoreInputSchema,
  SpecReopenInput: reopenInputSchema,
  SpecValidateInput: validateInputSchema,
  SpecGraphInput: graphInputSchema,
  SpecRenderInput: renderInputSchema,
  SpecInfoInput: infoInputSchema,
  SpecMigrateInput: migrateInputSchema,
  // Result schemas keyed by exported type name
  SpecWriteResult: specWriteResultSchema,
  SpecLifecycleResult: specLifecycleResultSchema,
  SpecGetResult: specGetResultSchema,
  SpecQueryResult: specQueryResultSchema,
  SpecDeleteResult: specDeleteResultSchema,
  SpecPurgeResult: specPurgeResultSchema,
  SpecImplementedResult: specImplementedResultSchema,
  SpecValidateResult: specValidateResultSchema,
  SpecGraphResult: specGraphResultSchema,
  SpecRenderResult: specRenderResultSchema,
  SpecInfoResult: specInfoResultSchema,
  SpecMigrateResult: specMigrateResultSchema,
  // Shared reusable data shapes (FR-SPECS-0050)
  Spec: specSchema,
  AcceptanceCriterion: acceptanceCriterionSchema,
  AreaEntry: areaEntrySchema,
  SpecRef: specRefSchema,
  SpecDocumentSummary: specDocumentSummarySchema,
  SpecImplementedItem: specImplementedItemSchema,
  SpecFinding: specFindingSchema,
  SpecEdge: specEdgeSchema,
  SpecAreaInfo: specAreaInfoSchema,
  SpecTotals: specTotalsSchema,
  SpecNextId: specNextIdSchema,
  SpecSkipped: specSkippedSchema,
  SpecFieldGuide: specFieldGuideSchema,
};
