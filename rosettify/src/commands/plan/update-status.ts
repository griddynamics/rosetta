import type { RunEnvelope } from "../../registry/types.js";
import { logger } from "../../shared/logger.js";
import { atomicWritePlan } from "../../shared/concurrency.js";
import {
  type Plan,
  type Status,
  type UpdateStatusResult,
  VALID_STATUSES,
  loadPlan,
  savePlan,
  propagateStatuses,
  findPhase,
  findStep,
} from "./core.js";

export async function cmdUpdateStatus(
  planFile: string,
  targetId: string,
  newStatus: string,
): Promise<RunEnvelope<UpdateStatusResult>> {
  try {
    return atomicWritePlan<Plan, UpdateStatusResult>(
      loadPlan,
      savePlan,
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
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, result: null, error: `internal_error: ${msg}`, include_help: false };
  }
}
