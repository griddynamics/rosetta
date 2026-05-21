// Implements FR-PLAN-0040 (compressed-tree output shape for write subcommands).

import type { Plan, Status } from "./core.js";

// ---------------------------------------------------------------------------
// FR-PLAN-0040 — Compressed-Tree Output Shape
// ---------------------------------------------------------------------------

export interface CompressedPlanTree {
  plan: { name: string; status: Status };
  /** FR-PLAN-0040 — backup path from FR-PLAN-0024, or null on first create. */
  previous_version: string | null;
  phases: Array<{
    id: string;
    name: string;
    status: Status;
    steps: Array<{ id: string; name: string; status: Status }>;
  }>;
}

/**
 * Builds the compressed-tree representation of a plan after a successful write.
 * FR-PLAN-0040 — contains only plan.name/status, previous_version, and phases with steps (id/name/status only).
 */
export function buildCompressedTree(plan: Plan, previousVersion: string | null): CompressedPlanTree {
  // FR-PLAN-0040 — only the specified fields, no extras
  return {
    plan: { name: plan.name, status: plan.status },
    previous_version: previousVersion,
    phases: plan.phases.map((ph) => ({
      id: ph.id,
      name: ph.name,
      status: ph.status,
      steps: (ph.steps ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
      })),
    })),
  };
}
