// Implements FR-PLAN-0036 (seed upsert template: for-subagent).
// Content is byte-equivalent to docs/requirements/rosettify/assets/templates/upsert-for-subagent.json.

/**
 * FR-PLAN-0036 — upsert-kind template for bootstrapping a subagent preparation phase.
 * Placeholders: [phase-id], [phase-name], [phase-description].
 * Step IDs are prefixed with [phase-id]-s- to ensure plan-wide uniqueness (FR-PLAN-0001).
 * Content byte-equivalent to upsert-for-subagent.json (verified in Phase 9 tests).
 */
export const forSubagent = {
  name: "for-subagent",
  brief: "Bootstrap a subagent preparation phase with standard Rosetta load-context steps.",
  placeholders: ["phase-id", "phase-name", "phase-description"] as const,
  produces: "One phase seeded with 6 Rosetta subagent load-context bootstrap steps, step ids prefixed by the phase id.",
  content: {
    id: "[phase-id]",
    name: "[phase-name]",
    description: "[phase-description]",
    depends_on: [],
    steps: [
      {
        id: "[phase-id]-s-load-context-instructions",
        name: "Load bootstrap context",
        prompt: "USE SKILL `load-context-instructions`. Execute ALL returned prep steps.",
      },
      {
        id: "[phase-id]-s-read-docs",
        name: "Read project context",
        prompt: "USE SKILL `load-context` as the canonical current context loader. The skill is required even when its expected outputs already look satisfied.",
      },
      {
        id: "[phase-id]-s-subagent-contract",
        name: "Load subagent-only contract",
        prompt: "MUST USE SKILL `subagent-contract` to understand and to follow scope boundaries, input/output contracts, and escalation protocol.",
      },
      {
        id: "[phase-id]-s-execution-planning",
        name: "Plan execution at the task level",
        prompt: "Perform execution-level planning using todo tasks for this phase's scope. Identify dependencies and the right order before acting.",
      },
      {
        id: "[phase-id]-s-execute-tasks",
        name: "Execute todo tasks and adopt changes",
        prompt: "Execute the planned todo tasks and adopt the resulting changes. Update task status as work progresses.",
      },
      {
        id: "[phase-id]-s-proceed-with-request",
        name: "Proceed with the assigned request",
        prompt: "Proceed with the original assigned request and its activities, following all guardrails and HITL rules.",
      }
    ],
  },
} as const;
