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
            id: "ph-prep-s-load-context-instructions",
            name: "Load bootstrap context",
            prompt: "USE SKILL `load-context-instructions`. Execute ALL returned prep steps.",
          },
          {
            id: "ph-prep-s-read-docs",
            name: "Read project context",
            prompt: "USE SKILL `load-context` as the canonical current context loader. The skill is required even when its expected outputs already look satisfied.",
          },
          {
            id: "ph-prep-s-identify-request-size",
            name: "request size",
            prompt: "Classify the user request as SMALL (1-2 file changes, single area), MEDIUM (up to ~10 file changes, single area), or LARGE (more than 10 file changes or multiple areas). Re-evaluate and announce if the size changes later.",
          },
          {
            id: "ph-prep-s-orchestrator-contract",
            name: "Load orchestrator contract",
            prompt: "MUST USE SKILL `orchestrator-contract` as first action before dispatching any subagents. MUST USE SKILL `hitl` unless explicitly requested in prompt with exactly `No HITL`.",
          },
          {
            id: "ph-prep-s-load-workflow",
            name: "Load workflow",
            prompt: "MUST USE SKILL `load-workflow`.",
          },
          {
            id: "ph-prep-s-add-workflow-phases",
            name: "Add workflow phases",
            prompt: "Add workflow phases into the plan — each as a separate, dedicated, detailed, and specific plan step based on the loaded workflow phases, including state-restore and resume steps if applicable.",
          },
        ],
      },
    ],
  },
} as const;
