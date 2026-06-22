// Implements FR-PLAN-0014 (query subcommand).
// Uses FR-SHRD-0009 (readPlanWithRetry) for read resilience.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readPlanWithRetry } from "../../shared/plan-io.js";
import { ERR_PLAN_FILE_CORRUPTED } from "./errors.js";
import {
  type Plan,
  type Phase,
  type Step,
  findPhase,
  findStep,
} from "./core.js";

export const queryInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    target_id: { type: "string", description: "entire_plan | phase-id | step-id (default: entire_plan)" },
  },
};

export const queryOutputSchema = {
  oneOf: [
    { $ref: "Plan" as const },
    { $ref: "Phase" as const },
    { $ref: "Step" as const },
  ],
  description: "Full JSON of the target — a Plan, Phase, or Step",
};

export async function cmdQuery(
  planFile: string,
  targetId?: string,
): Promise<RunEnvelope<Plan | Phase | Step>> {
  try {
    // FR-SHRD-0009 — read with resilience
    let plan: Plan | null;
    try {
      plan = await readPlanWithRetry<Plan>(planFile);
    } catch {
      return err(ERR_PLAN_FILE_CORRUPTED);
    }
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
