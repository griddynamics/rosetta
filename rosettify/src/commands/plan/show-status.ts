// Implements FR-PLAN-0013 (show_status subcommand).
// Uses FR-SHRD-0009 (readPlanWithRetry) for read resilience.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readPlanWithRetry } from "../../shared/plan-io.js";
import { ERR_PLAN_FILE_CORRUPTED } from "./errors.js";
import {
  type Plan,
  type Status,
  type StatusTotals,
  type ShowStatusPlanResult,
  type ShowStatusPhaseResult,
  type ShowStatusStepResult,
  findPhase,
  findStep,
} from "./core.js";

export const showStatusInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    target_id: { type: "string", description: "entire_plan | phase-id | step-id (default: entire_plan)" },
  },
  required: [],
};

export const showStatusOutputSchema = {
  type: "object" as const,
  description: "FR-PLAN-0013 — status summary for plan, phase, or step",
  properties: {
    name: { type: "string" },
    status: { type: "string" },
    phases: { type: "object" },
    steps: { type: "object" },
    phase_summary: { type: "array" },
  },
};

function computeTotals(statuses: Status[]): StatusTotals {
  const t: StatusTotals = {
    open: 0,
    in_progress: 0,
    complete: 0,
    blocked: 0,
    failed: 0,
    total: statuses.length,
    progress_pct: 0,
  };
  for (const s of statuses) {
    if (s in t) {
      (t as unknown as Record<string, number>)[s]++;
    }
  }
  t.progress_pct =
    statuses.length > 0
      ? Math.round((t.complete / statuses.length) * 1000) / 10
      : 0;
  return t;
}

export async function cmdShowStatus(
  planFile: string,
  targetId?: string,
): Promise<
  RunEnvelope<
    ShowStatusPlanResult | ShowStatusPhaseResult | ShowStatusStepResult
  >
> {
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
      const allStepStatuses = (plan.phases ?? []).flatMap((p) =>
        (p.steps ?? []).map((s) => s.status ?? ("open" as Status)),
      );
      const phaseStatuses = (plan.phases ?? []).map(
        (p) => p.status ?? ("open" as Status),
      );

      const result: ShowStatusPlanResult = {
        name: plan.name,
        status: plan.status,
        phases: computeTotals(phaseStatuses),
        steps: computeTotals(allStepStatuses),
        phase_summary: (plan.phases ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status ?? "open",
          steps: (p.steps ?? []).map((s) => ({
            id: s.id,
            name: s.name,
            status: s.status ?? "open",
          })),
        })),
      };
      logger.info({ planFile }, "show_status entire_plan");
      return ok(result);
    }

    const phase = findPhase(plan, targetId);
    if (phase) {
      const result: ShowStatusPhaseResult = {
        id: phase.id,
        name: phase.name,
        status: phase.status ?? "open",
        steps: (phase.steps ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          status: s.status ?? "open",
        })),
      };
      logger.info({ planFile, targetId }, "show_status phase");
      return ok(result);
    }

    const found = findStep(plan, targetId);
    if (found) {
      const { step } = found;
      const result: ShowStatusStepResult = {
        id: step.id,
        name: step.name,
        status: step.status ?? "open",
        depends_on: step.depends_on ?? [],
      };
      if (step.subagent) result.subagent = step.subagent;
      if (step.role) result.role = step.role;
      if (step.model) result.model = step.model;
      logger.info({ planFile, targetId }, "show_status step");
      return ok(result);
    }

    return err("target_not_found");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}
