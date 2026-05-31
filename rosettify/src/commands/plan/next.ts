// Implements FR-PLAN-0011 (next subcommand).
// Uses FR-SHRD-0009 (readPlanWithRetry) for read resilience.

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { readPlanWithRetry } from "../../shared/plan-io.js";
import { ERR_PLAN_FILE_CORRUPTED } from "./errors.js";
import {
  type Plan,
  type PlanNextResult,
  type PlanPhaseContext,
  type PlanNextStep,
  type Phase,
  type Step,
  type Status,
  buildStepStatusMap,
  depsSatisfied,
} from "./core.js";

export const nextInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    limit: { type: "integer", minimum: 0, description: "Max steps to return (default: 3)" },
    target_id: { type: "string", description: "Scope to a specific phase ID" },
  },
};

export const nextOutputSchema = {
  $ref: "PlanNextResult" as const,
};

export async function cmdNext(
  planFile: string,
  targetId?: string,
  limit = 3,
): Promise<RunEnvelope<PlanNextResult>> {
  try {
    if (limit < 0) return err("invalid_limit", true);

    // FR-SHRD-0009 — read with resilience (retries if plan file missing but backup exists)
    let plan: Plan | null;
    try {
      plan = await readPlanWithRetry<Plan>(planFile);
    } catch {
      return err(ERR_PLAN_FILE_CORRUPTED);
    }
    if (!plan) return err("plan_not_found");

    // Validate target_id if provided — must reference an existing phase
    let targetPhase: Phase | undefined;
    if (targetId) {
      targetPhase = plan.phases.find((p) => p.id === targetId);
      if (!targetPhase) return err("target_not_found");
    }

    const stepStatusMap = buildStepStatusMap(plan);

    // Determine which phase(s) to source work from.
    // With target_id: use that specific phase (already validated above).
    // Without target_id: find the active phase — the first phase (in array
    // order) that is not yet fully complete (sequential enforcement).
    let phasesToScan: Phase[];
    if (targetId) {
      phasesToScan = plan.phases.filter((p) => p.id === targetId);
    } else {
      const activePhase = plan.phases.find(
        (p) => (p.status ?? "open") !== "complete",
      );
      phasesToScan = activePhase ? [activePhase] : [];
    }

    const inProgress: PlanNextStep[] = [];
    const openReady: PlanNextStep[] = [];
    const blocked: PlanNextStep[] = [];
    const failed: PlanNextStep[] = [];

    for (const phase of phasesToScan) {
      for (const step of phase.steps ?? []) {
        const st = step.status ?? "open";

        if (st === "in_progress") {
          inProgress.push(buildNextStep(step, phase));
        } else if (st === "open") {
          if (depsSatisfied(step, stepStatusMap)) {
            openReady.push(buildNextStep(step, phase));
          }
        } else if (st === "blocked") {
          blocked.push(buildNextStep(step, phase));
        } else if (st === "failed") {
          failed.push(buildNextStep(step, phase));
        }
      }
    }

    const next = [...inProgress, ...openReady, ...blocked, ...failed].slice(
      0,
      limit,
    );

    // Compute Overall*Count — scoped to target phase when target_id given, else whole plan
    const countScope: Phase[] = targetId
      ? (plan.phases.filter((p) => p.id === targetId))
      : plan.phases;

    const overallCounts = computeOverallCounts(countScope);

    // Build parent block if target_id is given (FR-PLAN-0011 — PlanPhaseContext)
    let parent: PlanPhaseContext | undefined;
    if (targetId && targetPhase) {
      parent = {
        id: targetPhase.id,
        name: targetPhase.name,
        description: targetPhase.description,
        status: targetPhase.status,
        depends_on: targetPhase.depends_on ?? [],
      };
      if (targetPhase.subagent) parent.subagent = targetPhase.subagent;
      if (targetPhase.role) parent.role = targetPhase.role;
      if (targetPhase.model) parent.model = targetPhase.model;
    }

    const result: PlanNextResult = {
      ...(parent !== undefined ? { parent } : {}),
      next,
      count: next.length,
      plan_status: plan.status,
      ...overallCounts,
    };

    logger.info({ planFile, count: next.length }, "next steps retrieved");
    return ok(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

function buildNextStep(
  step: Step,
  phase: Phase,
): PlanNextStep {
  const result: PlanNextStep = {
    id: step.id,
    name: step.name,
    prompt: step.prompt,
    status: step.status,
    depends_on: step.depends_on ?? [],
    phase_id: phase.id,
    phase_name: phase.name,
  };
  if (step.subagent) result.subagent = step.subagent;
  if (step.role) result.role = step.role;
  if (step.model) result.model = step.model;
  return result;
}

function computeOverallCounts(phases: Phase[]): {
  OverallOpenCount: number;
  OverallInProgressCount: number;
  OverallBlockedCount: number;
  OverallFailedCount: number;
  OverallCompleteCount: number;
} {
  let open = 0, inProgress = 0, blocked = 0, failed = 0, complete = 0;
  for (const phase of phases) {
    for (const step of phase.steps ?? []) {
      const st: Status = step.status ?? "open";
      if (st === "open") open++;
      else if (st === "in_progress") inProgress++;
      else if (st === "blocked") blocked++;
      else if (st === "failed") failed++;
      else if (st === "complete") complete++;
    }
  }
  return {
    OverallOpenCount: open,
    OverallInProgressCount: inProgress,
    OverallBlockedCount: blocked,
    OverallFailedCount: failed,
    OverallCompleteCount: complete,
  };
}
