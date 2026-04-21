import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import {
  type Plan,
  type Phase,
  type Step,
  loadPlan,
  findPhase,
  findStep,
} from "./core.js";

export async function cmdQuery(
  planFile: string,
  targetId?: string,
): Promise<RunEnvelope<Plan | Phase | Step>> {
  try {
    const plan = loadPlan(planFile);
    if (!plan) return err("plan_not_found");

    if (!targetId || targetId === "entire_plan") {
      logger.info({ planFile }, "query entire_plan");
      return ok(plan);
    }

    const phase = findPhase(plan, targetId);
    if (phase) {
      logger.info({ planFile, targetId }, "query phase");
      return ok(phase);
    }

    const found = findStep(plan, targetId);
    if (found) {
      logger.info({ planFile, targetId }, "query step");
      return ok(found.step);
    }

    return err("target_not_found");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}
