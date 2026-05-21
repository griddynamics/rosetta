// Implements FR-PLAN-0016 (plan help content), FR-PLAN-0018 (limits and dual-form examples),
// FR-HELP-0002 (schemas dict and notes from per-subcommand declarations).

import {
  PLAN_MAX_PHASES,
  PLAN_MAX_STEPS_PER_PHASE,
  PLAN_MAX_DEPENDENCIES_PER_ITEM,
  PLAN_MAX_STRING_LENGTH,
  PLAN_MAX_NAME_LENGTH,
} from "../../shared/constants.js";
import { planSchemasDict } from "./schemas.js";
import { buildTemplateCatalog } from "./templates/index.js";

// FR-PLAN-0016 — notes documenting behaviors that affect the caller upfront
export const planNotes: string[] = [
  // FR-PLAN-0015 / FR-PLAN-0016 — status silently dropped
  "upsert silently drops status fields — use update_status to change status one-by-one after each task completion",
  // FR-PLAN-0024 — write cycle summary
  "write-cycle process (high level): read with retries → modify in memory → rename old file as backup → write new file",
  // FR-PLAN-0024 — atomic rename and previous_version
  "every successful write atomically renames the plan file to <plan_file>.bakNNN before writing the new plan; the plan's previous_version field points to the immediately prior version (the backup captured at write time)",
  // FR-PLAN-0024 — backup retention
  "backup retention is bounded; the oldest backups beyond the configured limit (default 5) are pruned",
  // FR-SHRD-0009 — read resilience
  "if the plan file is missing but at least one backup exists, reads retry briefly before returning plan_not_found",
  // FR-PLAN-0033 — template kind separation
  "templates have two kinds (create, upsert); a template of one kind cannot be used with the other kind",
  // FR-PLAN-0034 — placeholder syntax
  "placeholder syntax in templates is [placeholder-name]; provided params and declared placeholders must match exactly",
];

export const planHelpContent = {
  name: "plan",
  brief: "Manage execution plans (create, query, update, upsert)",
  description:
    "The plan command manages two-level execution plans stored as JSON files. " +
    "Plans contain phases, phases contain steps. Status propagates bottom-up automatically. " +
    "Write subcommands return a compressed-tree snapshot of the post-write plan.",

  // FR-PLAN-0016 — plan_file convention
  plan_file: {
    convention: "plans/<feature>/plan.json",
    note: "Plan file lives in the feature plan folder: plans/<feature>/",
  },

  // FR-PLAN-0016 — core concepts
  concepts: {
    hierarchy: "Two levels: phases contain steps. You assign string IDs.",
    statuses: "open | in_progress | complete | blocked | failed",
    depends_on:
      "Phases reference phase IDs; steps reference step IDs (cross-phase allowed).",
    status_propagation:
      "Bottom-up: steps → phases → plan. all-complete=complete, any-failed=failed, " +
      "any-blocked=blocked, any-in_progress/complete=in_progress, else open. " +
      "Plan root status is always derived — never set manually.",
    target_id: '"entire_plan" | phase-id | step-id (default: entire_plan)',
    resume:
      "next returns in_progress steps (resume:true) before open steps. " +
      "Always check resume flag to avoid duplicate work on interrupted sessions.",
  },

  // FR-PLAN-0016 — subagent_fields
  subagent_fields: {
    note: "Available on both phases and steps for delegation",
    subagent: "subagent name",
    role: "specialization to assume, brilliant and short",
    model: "comma-separated list of recommended models",
  },

  // FR-PLAN-0016 — subcommands with dual-form examples (FR-PLAN-0018)
  subcommands: [
    {
      name: "create",
      brief: "Create a new plan JSON file",
      usage: "rosettify plan create <plan_file> '<plan-json>'",
      args: { "plan-json": "JSON with name, description?, phases[]" },
      description:
        "Creates a new plan at plan_file. Defaults: name='Unnamed Plan', status='open', " +
        "depends_on=[], timestamps set. Validates unique IDs, dependencies, and size limits. " +
        "Returns compressed-tree (FR-PLAN-0040) with previous_version=null.",
      // FR-PLAN-0018 — dual-form examples
      examples: {
        tip: "rosettify plan create [plan_file] '[plan-json-with-name-phases]'",
        real: "rosettify plan create plans/feature-x/plan.json '{\"name\":\"Feature X\",\"phases\":[]}'",
      },
    },
    {
      name: "next",
      brief: "Return steps ready for execution",
      usage: "rosettify plan next <plan_file> [limit] [--target <phase_id>]",
      args: {
        limit: "max steps to return (default: 10)",
        "--target": "scope to a specific phase",
      },
      description:
        "Returns steps in priority order: (1) in_progress (resume:true), " +
        "(2) open with deps satisfied, (3) blocked (previously_blocked:true), " +
        "(4) failed (previously_failed:true). Loop until count:0 and plan_status:complete.",
      examples: {
        tip: "rosettify plan next [plan_file] [limit] --target [phase-id]",
        real: "rosettify plan next plans/feature-x/plan.json 5 --target ph-impl",
      },
    },
    {
      name: "update_status",
      brief: "Set status on a step; propagates upward to plan",
      usage: "rosettify plan update_status <plan_file> <step_id> <status>",
      args: {
        step_id: "step ID (phases are derived, cannot be set directly)",
        status: "open | in_progress | complete | blocked | failed",
      },
      description:
        "Updates a single step status and propagates upward. " +
        "Phase status is always derived from child steps.",
      examples: {
        tip: "rosettify plan update_status [plan_file] [step-id] [status]",
        real: "rosettify plan update_status plans/feature-x/plan.json ph-impl-s1 complete",
      },
    },
    {
      name: "show_status",
      brief: "Status summary with progress percentages and totals",
      usage: "rosettify plan show_status <plan_file> [target_id]",
      args: { target_id: "entire_plan | phase-id | step-id (default: entire_plan)" },
      description:
        "Returns progress totals for plan, phase, or step. " +
        "progress_pct = round(complete/total * 1000) / 10",
      examples: {
        tip: "rosettify plan show_status [plan_file] [target-id-or-entire_plan]",
        real: "rosettify plan show_status plans/feature-x/plan.json entire_plan",
      },
    },
    {
      name: "query",
      brief: "Return full JSON of plan, phase, or step",
      usage: "rosettify plan query <plan_file> [target_id]",
      args: { target_id: "entire_plan | phase-id | step-id (default: entire_plan)" },
      description: "Returns full JSON of the requested target.",
      examples: {
        tip: "rosettify plan query [plan_file] [target-id-or-entire_plan]",
        real: "rosettify plan query plans/feature-x/plan.json ph-impl",
      },
    },
    {
      name: "upsert",
      brief: "Create or merge-patch plan/phase/step by id",
      usage: "rosettify plan upsert <plan_file> <target_id> '<patch-json>'",
      args: {
        target_id: "entire_plan | phase-id | step-id",
        "patch-json": "RFC 7396 patch object. null removes a key.",
        kind: "required for new items: 'phase' or 'step'",
        phase_id: "required for new step: parent phase ID",
      },
      description:
        "Creates or merge-patches plan/phase/step. Status fields in patch are silently stripped. " +
        "Use update_status to change status after each task completion. Returns compressed-tree (FR-PLAN-0040).",
      examples: {
        tip: "rosettify plan upsert [plan_file] [target-id] '[patch-json]'",
        real: "rosettify plan upsert plans/feature-x/plan.json ph-review '{\"kind\":\"phase\",\"name\":\"Review\"}'",
      },
    },
    {
      name: "create-with-template",
      brief: "Create a plan from a registered create-kind template",
      usage: "rosettify plan create-with-template <plan_file> <template> <plan-name> <plan-description>",
      args: {
        template: "template name from create-kind collection",
        "plan-name": "value for [plan-name] placeholder",
        "plan-description": "value for [plan-description] placeholder",
      },
      description:
        "Renders the named create-kind template with the provided placeholder values, " +
        "then creates the plan. All validations and write semantics are identical to create. " +
        "Returns compressed-tree (FR-PLAN-0040).",
      // FR-PLAN-0016 — concrete illustration from requirements
      examples: {
        tip: "rosettify plan create-with-template plans/feature-x/plan.json for-orchestrator [plan-name] [user-request-description-one-sentence]",
        real: "rosettify plan create-with-template plans/feature-x/plan.json for-orchestrator \"Feature X\" \"User wants to add Y to Z\"",
      },
    },
    {
      name: "upsert-with-template",
      brief: "Upsert a phase into an existing plan using a registered upsert-kind template",
      usage: "rosettify plan upsert-with-template <plan_file> <phase-id> <template> <phase-name> <phase-description>",
      args: {
        "phase-id": "target phase ID and value for [phase-id] placeholder",
        template: "template name from upsert-kind collection",
        "phase-name": "value for [phase-name] placeholder",
        "phase-description": "value for [phase-description] placeholder",
      },
      description:
        "Renders the named upsert-kind template with the provided placeholder values, " +
        "then upserts the rendered phase into the plan. All upsert merge semantics apply. " +
        "Returns compressed-tree (FR-PLAN-0040).",
      examples: {
        tip: "rosettify plan upsert-with-template plans/feature-x/plan.json [phase-id] for-subagent [phase-name] [phase-description-one-sentence]",
        real: "rosettify plan upsert-with-template plans/feature-x/plan.json ph-impl for-subagent \"Implementation\" \"Implement the API endpoint\"",
      },
    },
    {
      name: "list-templates",
      brief: "List all registered templates grouped by kind",
      usage: "rosettify plan list-templates",
      args: {},
      description:
        "Returns the catalog of registered templates grouped by kind (create, upsert). " +
        "Each entry has name, brief, and placeholders array.",
      examples: {
        tip: "rosettify plan list-templates",
        real: "rosettify plan list-templates",
      },
    },
  ],

  // FR-HELP-0002 — flat schemas dict sourced from per-subcommand declarations (not hand-authored)
  schemas: planSchemasDict,

  // FR-PLAN-0005 / FR-PLAN-0016 — limits
  limits: {
    max_phases: PLAN_MAX_PHASES,
    max_steps_per_phase: PLAN_MAX_STEPS_PER_PHASE,
    max_dependencies_per_item: PLAN_MAX_DEPENDENCIES_PER_ITEM,
    max_string_length: PLAN_MAX_STRING_LENGTH,
    max_name_length: PLAN_MAX_NAME_LENGTH,
  },

  // FR-PLAN-0032 / FR-PLAN-0016 — templates catalog (same as list-templates result)
  get templates() {
    return buildTemplateCatalog();
  },

  // FR-PLAN-0016 — notes array with all required behaviors
  notes: planNotes,

  // FR-PLAN-0016 — plan_authoring_guidance (verbatim from requirement)
  plan_authoring_guidance:
    "the last step in each phase should verify all work in that phase was actually completed; " +
    "the last phase should verify all work across the entire plan was completed",

  // FR-PLAN-0016 — next_steps_for_ai
  next_steps_for_ai:
    "1. Call 'plan next <plan_file>' to get ready steps. " +
    "2. For each step: call 'plan update_status <plan_file> <step_id> in_progress', execute the work, " +
    "then call 'plan update_status <plan_file> <step_id> complete'. " +
    "3. Repeat until next returns count:0 and plan_status:complete.",
};
