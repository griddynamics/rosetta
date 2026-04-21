import {
  PLAN_MAX_PHASES,
  PLAN_MAX_STEPS_PER_PHASE,
  PLAN_MAX_DEPENDENCIES_PER_ITEM,
  PLAN_MAX_STRING_LENGTH,
  PLAN_MAX_NAME_LENGTH,
} from "../../shared/constants.js";

export const planHelpContent = {
  name: "plan",
  brief: "Manage execution plans (create, query, update, upsert)",
  description:
    "The plan command manages two-level execution plans stored as JSON files. " +
    "Plans contain phases, phases contain steps. Status propagates bottom-up automatically.",
  plan_file: {
    convention: "plans/<feature>/plan.json",
    note: "Plan file lives in the feature plan folder: plans/<feature>/",
  },
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
  subagent_fields: {
    note: "Available on both phases and steps for delegation",
    subagent: "subagent name",
    role: "specialization to assume, brilliant and short",
    model: "comma-separated list of recommended models",
  },
  subcommands: [
    {
      name: "create",
      brief: "Create a new plan JSON file",
      usage: "rosettify plan create <plan_file> '<plan-json>'",
      args: { "plan-json": "JSON with name, description?, phases[]" },
      description:
        "Creates a new plan at plan_file. Defaults: name='Unnamed Plan', status='open', " +
        "depends_on=[], timestamps set. Validates unique IDs, dependencies, and size limits.",
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
    },
    {
      name: "show_status",
      brief: "Status summary with progress percentages and totals",
      usage: "rosettify plan show_status <plan_file> [target_id]",
      args: { target_id: "entire_plan | phase-id | step-id (default: entire_plan)" },
      description:
        "Returns progress totals for plan, phase, or step. " +
        "progress_pct = round(complete/total * 1000) / 10",
    },
    {
      name: "query",
      brief: "Return full JSON of plan, phase, or step",
      usage: "rosettify plan query <plan_file> [target_id]",
      args: { target_id: "entire_plan | phase-id | step-id (default: entire_plan)" },
      description: "Returns full JSON of the requested target.",
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
        "Use update_status to change status after each task completion.",
    },
  ],
  schema: {
    step: {
      required: ["id", "name", "prompt"],
      optional: ["status", "depends_on", "subagent", "role", "model"],
    },
    phase: {
      required: ["id", "name"],
      optional: ["description", "status", "depends_on", "subagent", "role", "model", "steps"],
    },
    plan: {
      required: ["name"],
      optional: ["description", "phases"],
    },
  },
  limits: {
    max_phases: PLAN_MAX_PHASES,
    max_steps_per_phase: PLAN_MAX_STEPS_PER_PHASE,
    max_dependencies_per_item: PLAN_MAX_DEPENDENCIES_PER_ITEM,
    max_string_length: PLAN_MAX_STRING_LENGTH,
    max_name_length: PLAN_MAX_NAME_LENGTH,
  },
  examples: {
    create:
      "rosettify plan create plans/myfeature/plan.json '{\"name\":\"My Feature\",\"phases\":[{\"id\":\"p1\",\"name\":\"Phase 1\",\"steps\":[{\"id\":\"p1-s1\",\"name\":\"Step 1\",\"prompt\":\"Do the work\"}]}]}'",
    next: "rosettify plan next plans/myfeature/plan.json 5",
    update_status:
      "rosettify plan update_status plans/myfeature/plan.json p1-s1 complete",
    show_status: "rosettify plan show_status plans/myfeature/plan.json",
    query: "rosettify plan query plans/myfeature/plan.json p1",
    upsert:
      "rosettify plan upsert plans/myfeature/plan.json p2 '{\"kind\":\"phase\",\"name\":\"Phase 2\",\"description\":\"Second phase\"}'",
  },
  plan_authoring_guidance:
    "Last step in each phase should verify all work in that phase was actually completed. " +
    "The last phase should verify all work across the entire plan was completed.",
  next_steps_for_ai:
    "1. Call 'plan next <plan_file>' to get ready steps. " +
    "2. For each step: call 'plan update_status <plan_file> <step_id> in_progress', execute the work, " +
    "then call 'plan update_status <plan_file> <step_id> complete'. " +
    "3. Repeat until next returns count:0 and plan_status:complete.",
};
