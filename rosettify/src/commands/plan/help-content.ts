// Implements FR-PLAN-0016 (plan help content), FR-PLAN-0018 (limits/examples),
// FR-PLAN-0041 (schemas), FR-PLAN-0042 (notes), FR-HELP-0002.

import {
  PLAN_MAX_PHASES,
  PLAN_MAX_STEPS_PER_PHASE,
  PLAN_MAX_DEPENDENCIES_PER_ITEM,
  PLAN_MAX_STRING_LENGTH,
  PLAN_MAX_NAME_LENGTH,
} from "../../shared/constants.js";
import { planSchemasDict } from "./schemas.js";
import { buildTemplateCatalog } from "./templates/index.js";

// FR-PLAN-0042 — notes documenting behaviors that affect the caller upfront
export const planNotes: string[] = [
  // Silent-drop note (FR-PLAN-0015 / FR-PLAN-0016)
  "upsert silently drops status fields — use update_status to change status one-by-one after each task completion",
  // Write-cycle summary (FR-PLAN-0024)
  "write-cycle process (high level): read with retries → modify in memory → rename old file as backup → write new file",
  // Atomic rename + previous_version chain (FR-PLAN-0024)
  "every successful write atomically renames the plan file to <plan_file>.bakNNN before writing the new plan; the plan's previous_version field points to the immediately prior version (the backup captured at write time)",
  // Backup retention (FR-PLAN-0024)
  "backup retention is bounded; the oldest backups beyond the configured limit (default 5) are pruned",
  // Read resilience (FR-SHRD-0009)
  "if the plan file is missing but at least one backup exists, reads retry briefly before returning plan_not_found",
  // Template kind separation (FR-PLAN-0033)
  "templates have two kinds (create, upsert); a template of one kind cannot be used with the other kind",
  // Placeholder syntax (FR-PLAN-0034)
  "placeholder syntax in templates is [placeholder-name]; provided params and declared placeholders must match exactly",
  // End-to-end usage (FR-PLAN-0042)
  "end-to-end usage: (1) build the whole plan from a create-kind template with create-with-template; (2) for each phase, seed the subagent's first steps from an upsert-kind template with upsert-with-template before delegating that phase; (3) hand the phase to its subagent; (4) the subagent works the phase in a loop — call next with --target <its phase id> for the next small batch, call update_status <step_id> in_progress before starting a step and update_status <step_id> complete once it passes; (5) the phase is finished when next returns count 0 and parent.status is complete; if blocked or failed steps remain, recover them before finishing",
  // Phase-scoped next (FR-PLAN-0042)
  "phase-scoped next: when working a single phase always call next with --target <that phase id> so the batch and all the counts cover only that phase; --target may be passed with or without a limit",
  // What next returns (FR-PLAN-0042)
  "what next returns: next lists steps in priority order — in_progress, then ready open, then blocked, then failed — and cuts the list off at limit (default 3). Because in_progress and open steps come first, when there is enough work to do the blocked and failed steps get cut off and won't appear in that call. The Overall*Count fields are a headcount of every status in scope (open, in_progress, blocked, failed, complete) — a reminder of what exists even when the limit hid some",
  // Three outcomes of a next call (FR-PLAN-0042)
  "three outcomes of a next call: if count is greater than 0, work the returned steps; if count is 0 and the scope is complete (parent.status complete under --target, otherwise plan_status complete), the scope is done; if count is 0 but blocked or failed steps remain, stop looping and recover them",
  // Recover blocked/failed/stuck steps (FR-PLAN-0042)
  "recover blocked, failed, or stuck steps: when OverallBlockedCount or OverallFailedCount is non-zero, or OverallInProgressCount does not fall across calls (a stuck in_progress step), call show_status with --target <phase id> to list every step with its status — it has no limit, so it scales to any number of steps — then for each blocked, failed, or stuck step call query <step_id> for full detail, re-review and re-verify the work, and retry it by resetting its status with update_status <step_id> open (or in_progress) so next surfaces it again; do not finish the phase while any blocked or failed step remains",
];

export const planHelpContent = {
  name: "plan",
  brief: "Manage execution plans (create, query, update, upsert)",
  description:
    "The plan command manages two-level execution plans stored as JSON files. " +
    "Plans contain phases, phases contain steps. Status propagates bottom-up automatically. " +
    "Write subcommands return a PlanWriteResult snapshot of the post-write plan.",

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
      "Bottom-up: steps → phases → plan. A parent is complete only when all children are complete. " +
      "Otherwise: failed outranks blocked, blocked outranks in_progress, in_progress outranks open. " +
      "Plan root status is always derived — never set manually.",
    target_id: '"entire_plan" | phase-id | step-id (default: entire_plan)',
  },

  // FR-PLAN-0016 — subagent_fields
  subagent_fields: {
    note: "Available on both phases and steps for delegation",
    subagent: "subagent name",
    role: "specialization to assume, brilliant and short",
    model: "comma-separated list of recommended models",
  },

  // FR-PLAN-0016 — subcommands with dual-form examples (FR-PLAN-0018) and required statements
  subcommands: [
    {
      name: "create",
      brief: "Create a new plan JSON file",
      usage: "rosettify plan create <plan_file> '<plan-json>'",
      args: { "plan-json": "JSON with name, description?, phases[]" },
      required: "plan_file and data (plan JSON) are required",
      description:
        "Creates a new plan at plan_file. Defaults: name='Unnamed Plan', status='open', " +
        "depends_on=[], timestamps set. Validates unique IDs, dependencies, and size limits. " +
        "Returns PlanWriteResult: plan + phases summary.",
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
        limit: "max steps to return (default: 3)",
        "--target": "scope to a specific phase",
      },
      required: "plan_file is required; limit and --target are optional",
      description:
        "Returns steps in priority order: (1) in_progress, " +
        "(2) open with deps satisfied, (3) blocked, " +
        "(4) failed. Truncated to limit (default 3). Each step carries its status. " +
        "Completion is judged by parent.status when --target is used (otherwise plan_status); blocked or failed steps must be recovered, not ignored — see notes for the three outcomes. " +
        "Overall*Count fields report counts for all statuses in scope regardless of the limit.",
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
      required: "plan_file, step_id, and status are required",
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
      required: "plan_file is required; target_id defaults to entire_plan",
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
      required: "plan_file is required; target_id defaults to entire_plan",
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
      required: "plan_file, target_id, and data (patch JSON) are required",
      conditional_requirements: "kind is required only when the target id does not already exist; phase_id is required only when kind is step",
      description:
        "Creates or merge-patches plan/phase/step. Status fields in patch are silently stripped. " +
        "Use update_status to change status after each task completion. Returns PlanWriteResult.",
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
      required: "plan_file, template, plan-name, and plan-description are all required",
      description:
        "Renders the named create-kind template with the provided placeholder values, " +
        "then creates the plan. All validations and write semantics are identical to create. " +
        "Returns PlanWriteResult.",
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
      required: "plan_file, phase-id, template, phase-name, and phase-description are all required",
      description:
        "Renders the named upsert-kind template with the provided placeholder values, " +
        "then upserts the rendered phase into the plan. All upsert merge semantics apply. " +
        "Returns PlanWriteResult.",
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
      required: "no required inputs",
      description:
        "Returns the catalog of registered templates grouped by kind (create, upsert). " +
        "Each entry has name, brief, placeholders array, and produces (what the template generates).",
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

  // FR-PLAN-0016 / FR-PLAN-0042 — notes array with all required behaviors
  notes: planNotes,

  // FR-PLAN-0016 — plan_authoring_guidance (verbatim from requirement)
  plan_authoring_guidance:
    "the last step in each phase should verify all work in that phase was actually completed; " +
    "the last phase should verify all work across the entire plan was completed",

  // FR-PLAN-0016 — next_steps_for_ai with three outcomes
  next_steps_for_ai:
    "Three outcomes of a next call: " +
    "(1) count > 0 — work the returned steps (call update_status in_progress before starting each step, " +
    "update_status complete once it passes, then call next again for the next batch). " +
    "(2) count = 0 and scope is complete (parent.status = complete under --target, otherwise plan_status = complete) — " +
    "the scope is done; move on. " +
    "(3) count = 0 but blocked or failed steps remain — stop looping and recover: call show_status --target <phase id> " +
    "to list every step with its status, call query <step_id> for full detail on each blocked or failed step, " +
    "re-review and re-verify the work, then reset status with update_status <step_id> open (or in_progress) " +
    "so next surfaces it again.",
};
