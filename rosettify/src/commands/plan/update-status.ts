// Implements FR-PLAN-0012 (update_status subcommand).
// Uses FR-PLAN-0024 write cycle (atomicWriteWithBackup) for all plan writes.
// FR-PLAN-0025 — plan writes go through FR-PLAN-0024, NOT the FR-SHRD-0006 optimistic-concurrency function.

import type { RunEnvelope } from "../../registry/types.js";
import { err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { atomicWriteWithBackup } from "../../shared/plan-io.js";
import {
  type Plan,
  type Status,
  type PlanUpdateStatusResult,
  VALID_STATUSES,
  savePlan,
  propagateStatuses,
  findPhase,
  findStep,
} from "./core.js";

export const updateStatusInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    target_id: { type: "string", description: "Step ID to update" },
    new_status: { type: "string", description: "New status: open | in_progress | complete | blocked | failed" },
  },
};

export const updateStatusOutputSchema = {
  type: "object" as const,
  description: "PlanUpdateStatusResult — result of update_status",
  properties: {
    id: { type: "string" },
    status: { type: "string" },
    plan_status: { type: "string" },
  },
};

export async function cmdUpdateStatus(
  planFile: string,
  targetId: string,
  newStatus: string,
): Promise<RunEnvelope<PlanUpdateStatusResult>> {
  try {
    // Use rename-as-guard write cycle
    const writeResult = await atomicWriteWithBackup<Plan, PlanUpdateStatusResult>(
      planFile,
      (plan) => {
        if (targetId === "entire_plan") {
          return { ok: false, error: "invalid_target" };
        }
        if (!newStatus) {
          return { ok: false, error: "missing_new_status", include_help: true };
        }
        if (!(VALID_STATUSES as readonly string[]).includes(newStatus)) {
          return { ok: false, error: `invalid_status: ${newStatus}` };
        }
        const phase = findPhase(plan, targetId);
        if (phase) return { ok: false, error: "phase_status_is_derived" };

        const found = findStep(plan, targetId);
        if (!found) return { ok: false, error: "target_not_found" };

        found.step.status = newStatus as Status;
        propagateStatuses(plan);

        logger.info({ planFile, targetId, newStatus }, "status updated");
        return {
          ok: true,
          result: { id: targetId, status: newStatus as Status, plan_status: plan.status },
          updated: plan,
        };
      },
      savePlan,
    );

    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    return { ok: true, result: writeResult.result!.result, error: null, include_help: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, result: null, error: `internal_error: ${msg}`, include_help: false };
  }
}
