// Implements FR-HELP-0002 / FR-PLAN-0041 (schemas dict keyed by exported type name, SRP+DRY).
// Aggregates per-subcommand declarations into dictionaries for help output and validation.
// $ref convention: { $ref: "<DictKey>" } — string key into planSchemasDict.
// Array of named shape: { type:"array", items:{ $ref:"<DictKey>" } }.

import { createInputSchema, createOutputSchema } from "./create.js";
import { upsertInputSchema, upsertOutputSchema } from "./upsert.js";
import { updateStatusInputSchema, updateStatusOutputSchema } from "./update-status.js";
import { nextInputSchema, nextOutputSchema } from "./next.js";
import { showStatusInputSchema, showStatusOutputSchema } from "./show-status.js";
import { queryInputSchema, queryOutputSchema } from "./query.js";
import { createWithTemplateInputSchema, createWithTemplateOutputSchema } from "./create-with-template.js";
import { upsertWithTemplateInputSchema, upsertWithTemplateOutputSchema } from "./upsert-with-template.js";
import { listTemplatesInputSchema, listTemplatesOutputSchema } from "./list-templates.js";

// FR-HELP-0002 — per-subcommand schema dict, keyed by subcommand name
export const planSubcommandSchemas = {
  create: { input: createInputSchema, output: createOutputSchema },
  next: { input: nextInputSchema, output: nextOutputSchema },
  update_status: { input: updateStatusInputSchema, output: updateStatusOutputSchema },
  show_status: { input: showStatusInputSchema, output: showStatusOutputSchema },
  query: { input: queryInputSchema, output: queryOutputSchema },
  upsert: { input: upsertInputSchema, output: upsertOutputSchema },
  "create-with-template": { input: createWithTemplateInputSchema, output: createWithTemplateOutputSchema },
  "upsert-with-template": { input: upsertWithTemplateInputSchema, output: upsertWithTemplateOutputSchema },
  "list-templates": { input: listTemplatesInputSchema, output: listTemplatesOutputSchema },
} as const;

// ---------------------------------------------------------------------------
// Shared named schemas — SRP+DRY, $ref convention throughout
// ---------------------------------------------------------------------------

// PlanSummary — plan name, status, and backup path after write (used in PlanWriteResult) (FR-PLAN-0040)
const planSummarySchema = {
  type: "object" as const,
  description: "Plan name, derived status, and backup path after write",
  properties: {
    name: { type: "string" as const },
    status: { type: "string" as const, enum: ["open", "in_progress", "complete", "blocked", "failed"] as const },
    previous_version: { type: ["string", "null"] as const }, // ... (FR-PLAN-0040)
  },
};

// PlanStepSummary — step id, name, status summary (FR-PLAN-0013)
const planStepSummarySchema = {
  type: "object" as const,
  description: "Step summary: id, name, status",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    status: { type: "string" as const },
  },
};

// PlanPhaseSummary — phase id, name, status, steps (reused in write result and show_status) (FR-PLAN-0013)
const planPhaseSummarySchema = {
  type: "object" as const,
  description: "Phase summary: id, name, status, steps",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    status: { type: "string" as const },
    steps: { type: "array" as const, items: { $ref: "PlanStepSummary" as const } },
  },
};

// PlanWriteResult — shared by all 4 write subcommands (create, upsert, create-with-template, upsert-with-template) (FR-PLAN-0040)
const planWriteResultSchema = {
  type: "object" as const,
  description: "Compact plan snapshot returned by all write subcommands (create, upsert, create-with-template, upsert-with-template)",
  properties: {
    plan: { $ref: "PlanSummary" as const },
    phases: { type: "array" as const, items: { $ref: "PlanPhaseSummary" as const } },
  },
};

// PlanNextStep — item type of the next array (FR-PLAN-0011)
const planNextStepSchema = {
  type: "object" as const,
  description: "Step returned by next: id, name, prompt, status, depends_on, phase_id, phase_name, and optional subagent fields",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    prompt: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    phase_id: { type: "string" as const },
    phase_name: { type: "string" as const },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
  },
};

// PlanPhaseContext — phase scalar fields present when target_id used in next (FR-PLAN-0011)
const planPhaseContextSchema = {
  type: "object" as const,
  description: "Phase context returned in next when target_id is provided: scalar phase fields (no steps)",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    description: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
  },
};

// PlanStatusTotals — status counts + progress_pct (FR-PLAN-0013)
const planStatusTotalsSchema = {
  type: "object" as const,
  description: "Status counts and progress percentage for phases or steps",
  properties: {
    open: { type: "integer" as const },
    in_progress: { type: "integer" as const },
    complete: { type: "integer" as const },
    blocked: { type: "integer" as const },
    failed: { type: "integer" as const },
    total: { type: "integer" as const },
    progress_pct: { type: "number" as const },
  },
};

// PlanStepDetail — step detail from show_status step target (FR-PLAN-0013)
const planStepDetailSchema = {
  type: "object" as const,
  description: "Step detail: id, name, status, depends_on, and optional subagent fields",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
  },
};

// PlanTemplateCatalogEntry — one entry in the template catalog (FR-PLAN-0032)
const planTemplateCatalogEntrySchema = {
  type: "object" as const,
  description: "Template catalog entry: name, brief, placeholders, produces",
  properties: {
    name: { type: "string" as const },
    brief: { type: "string" as const },
    placeholders: { type: "array" as const, items: { type: "string" as const } },
    produces: { type: "string" as const },
  },
};

// ShowStatusPlanResult — entire-plan target of show_status (FR-PLAN-0013 / HIGH F2)
const showStatusPlanResultSchema = {
  type: "object" as const,
  description: "Plan-level status summary: name, status, phase and step totals, phase summary list",
  properties: {
    name: { type: "string" as const },
    status: { type: "string" as const },
    phases: { $ref: "PlanStatusTotals" as const },
    steps: { $ref: "PlanStatusTotals" as const },
    phase_summary: { type: "array" as const, items: { $ref: "PlanPhaseSummary" as const } },
  },
};

// PlanTargetInput — shared by show_status and query (both accept plan_file + target_id)
export const planTargetInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    target_id: { type: "string", description: "entire_plan | phase-id | step-id (default: entire_plan)" },
  },
};

// Plan — full plan data type (FR-PLAN-0001 / HIGH F1: phases uses $ref)
const planSchema = {
  type: "object" as const,
  description: "Full plan JSON: name, description, status, timestamps, previous_version, phases",
  properties: {
    name: { type: "string" as const },
    description: { type: "string" as const },
    status: { type: "string" as const, enum: ["open", "in_progress", "complete", "blocked", "failed"] as const },
    created_at: { type: "string" as const },
    updated_at: { type: "string" as const },
    previous_version: { type: ["string", "null"] as const },
    phases: { type: "array" as const, items: { $ref: "Phase" as const } },
  },
};

// Phase — full phase data type (FR-PLAN-0001 / HIGH F1: steps uses $ref)
const phaseSchema = {
  type: "object" as const,
  description: "Phase fields: id, name, description, status, depends_on, subagent, role, model, steps",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    description: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
    steps: { type: "array" as const, items: { $ref: "Step" as const } },
  },
};

// Step — full step data type
const stepSchema = {
  type: "object" as const,
  description: "Step fields: id, name, prompt, status, depends_on, subagent, role, model",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    prompt: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
  },
};

// PlanNextResult — result of next subcommand (FR-PLAN-0011)
const planNextResultSchema = {
  type: "object" as const,
  description: "Steps actionable now, in priority order, plus scope-wide status counts",
  properties: {
    parent: { $ref: "PlanPhaseContext" as const },
    next: { type: "array" as const, items: { $ref: "PlanNextStep" as const } },
    count: { type: "integer" as const },
    plan_status: { type: "string" as const },
    OverallOpenCount: { type: "integer" as const },
    OverallInProgressCount: { type: "integer" as const },
    OverallBlockedCount: { type: "integer" as const },
    OverallFailedCount: { type: "integer" as const },
    OverallCompleteCount: { type: "integer" as const },
  },
};

// PlanTemplateCatalog — result of list-templates (FR-PLAN-0032)
const planTemplateCatalogSchema = {
  type: "object" as const,
  description: "Template catalog grouped by kind (create, upsert)",
  properties: {
    create: { type: "array" as const, items: { $ref: "PlanTemplateCatalogEntry" as const } },
    upsert: { type: "array" as const, items: { $ref: "PlanTemplateCatalogEntry" as const } },
  },
};

/**
 * FR-HELP-0002 — flat schemas dict: keyed by exported type name.
 * One entry per distinct named type — inputs, results, and shared data shapes.
 * Used for help display (planSchemasDict).
 * $ref convention: every array items and every nested object property uses { $ref: "<DictKey>" }.
 */
export const planSchemasDict: Record<string, unknown> = {
  // Input schemas keyed by exported type name
  PlanCreateInput: createInputSchema,
  PlanNextInput: nextInputSchema,
  PlanUpdateStatusInput: updateStatusInputSchema,
  PlanTargetInput: planTargetInputSchema,       // shared by show_status and query
  PlanUpsertInput: upsertInputSchema,
  PlanCreateWithTemplateInput: createWithTemplateInputSchema,
  PlanUpsertWithTemplateInput: upsertWithTemplateInputSchema,
  PlanListTemplatesInput: listTemplatesInputSchema,
  // Result schemas keyed by exported type name
  PlanWriteResult: planWriteResultSchema,       // shared by all 4 write subcommands
  PlanNextResult: planNextResultSchema,
  PlanUpdateStatusResult: updateStatusOutputSchema,
  PlanShowStatusResult: showStatusOutputSchema,
  PlanQueryResult: queryOutputSchema,
  PlanTemplateCatalog: planTemplateCatalogSchema,
  // Shared reusable data shapes (FR-PLAN-0041)
  Plan: planSchema,
  Phase: phaseSchema,
  Step: stepSchema,
  PlanSummary: planSummarySchema,
  PlanNextStep: planNextStepSchema,
  PlanPhaseContext: planPhaseContextSchema,
  PlanStatusTotals: planStatusTotalsSchema,
  PlanPhaseSummary: planPhaseSummarySchema,
  PlanStepSummary: planStepSummarySchema,
  PlanStepDetail: planStepDetailSchema,
  PlanTemplateCatalogEntry: planTemplateCatalogEntrySchema,
  ShowStatusPlanResult: showStatusPlanResultSchema,
};
