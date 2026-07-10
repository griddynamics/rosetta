// Implements FR-PLAN-0035 (seed create template: for-orchestrator).
// Content is byte-equivalent to docs/requirements/rosettify/assets/templates/create-for-orchestrator.json.

/**
 * FR-PLAN-0035 — create-kind template for bootstrapping an orchestrator plan.
 * Placeholders: [plan-name], [plan-description].
 * Content byte-equivalent to create-for-orchestrator.json (verified in Phase 9 tests).
 */
export const forOrchestrator = {
  name: "for-orchestrator",
  brief: "Bootstrap a new plan with the Rosetta orchestrator preparation phase.",
  placeholders: ["plan-name", "plan-description"] as const,
  produces: "A new plan with one preparation phase (ph-prep) of 3 Rosetta orchestrator bootstrap steps.",
  content: {
    name: "[plan-name]",
    description: "[plan-description]",
    previous_version: null,
    phases: [
      {
        id: "ph-prep",
        name: "Preparation",
        description: "Mandatory Rosetta preparation steps for the orchestrator. Execute every step sequentially. No skipping.",
        depends_on: [],
        steps: [
          {
            id: "ph-prep-s-read-docs",
            name: "Read project context",
            prompt: "USE SKILL `load-project-context` as the canonical current context loader. The skill is required even when its expected outputs already look satisfied.",
          },
          {
            id: "ph-prep-s-orchestration",
            name: "Load orchestration",
            prompt: "MUST USE SKILL `orchestration` before dispatching any subagents. MUST USE SKILL `hitl` unless explicitly requested in prompt with exactly `No HITL`.",
          },
          {
            id: "ph-prep-s-add-workflow-phases",
            name: "Add workflow phases",
            prompt:"Add phases from the active workflow (the one the user invoked), if any, into this plan — one plan phase per workflow phase, each with dedicated, detailed, and specific steps; no active workflow → derive phases directly from the request. Must add phase to identify request size after initial discovery. Include state-restore and resume steps if applicable.",
          },
        ],
      },
    ],
  },
} as const;
