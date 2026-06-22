// Implements FR-PLAN-0040 (PlanWriteResult output shape for write subcommands).

import type { Plan, PlanSummary, PlanPhaseSummary, PlanStepSummary } from "./core.js";

// ---------------------------------------------------------------------------
// FR-PLAN-0040 — PlanWriteResult output shape for all write subcommands
// ---------------------------------------------------------------------------

export interface PlanWriteResult {
  /** FR-PLAN-0040 — plan name and derived status after write */
  plan: PlanSummary;
  /** FR-PLAN-0040 — phases with step summaries (id/name/status only) */
  phases: PlanPhaseSummary[];
}

/**
 * Builds the PlanWriteResult representation of a plan after a successful write.
 * FR-PLAN-0040 — contains plan (PlanSummary with previous_version) and phases (PlanPhaseSummary[]).
 * previousVersion is null on first create (FR-PLAN-0010) and the backup path on subsequent writes (FR-PLAN-0024).
 */
export function buildPlanWriteResult(plan: Plan, previousVersion: string | null): PlanWriteResult {
  // FR-PLAN-0040 — only the specified fields, no extras
  return {
    plan: { name: plan.name, status: plan.status, previous_version: previousVersion },
    phases: plan.phases.map((ph) => ({
      id: ph.id,
      name: ph.name,
      status: ph.status,
      steps: (ph.steps ?? []).map((s): PlanStepSummary => ({
        id: s.id,
        name: s.name,
        status: s.status,
      })),
    })),
  };
}
