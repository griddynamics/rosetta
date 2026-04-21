import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import {
  type NextResult,
  type NextStep,
  type Phase,
  type Step,
  loadPlan,
  buildStepStatusMap,
  depsSatisfied,
} from "./core.js";

export async function cmdNext(
  planFile: string,
  targetId?: string,
  limit = 10,
): Promise<RunEnvelope<NextResult>> {
  try {
    if (limit < 0) return err("invalid_limit", true);

    const plan = loadPlan(planFile);
    if (!plan) return err("plan_not_found");

    // Validate target_id if provided — must reference an existing phase
    if (targetId) {
      const targetPhase = plan.phases.find((p) => p.id === targetId);
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

    const inProgress: NextStep[] = [];
    const openReady: NextStep[] = [];
    const blocked: NextStep[] = [];
    const failed: NextStep[] = [];

    for (const phase of phasesToScan) {
      for (const step of phase.steps ?? []) {
        const st = step.status ?? "open";

        if (st === "in_progress") {
          inProgress.push(buildNextStep(step, phase, { resume: true }));
        } else if (st === "open") {
          // Check step deps satisfied
          if (depsSatisfied(step, stepStatusMap)) {
            openReady.push(buildNextStep(step, phase, { resume: false }));
          }
        } else if (st === "blocked") {
          blocked.push(buildNextStep(step, phase, { previously_blocked: true }));
        } else if (st === "failed") {
          failed.push(buildNextStep(step, phase, { previously_failed: true }));
        }
      }
    }

    const ready = [...inProgress, ...openReady, ...blocked, ...failed].slice(
      0,
      limit,
    );

    logger.info({ planFile, count: ready.length }, "next steps retrieved");
    return ok({ ready, count: ready.length, plan_status: plan.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

function buildNextStep(
  step: Step,
  phase: Phase,
  flags: {
    resume?: boolean;
    previously_blocked?: boolean;
    previously_failed?: boolean;
  },
): NextStep {
  const result: NextStep = {
    id: step.id,
    name: step.name,
    prompt: step.prompt,
    status: step.status,
    depends_on: step.depends_on ?? [],
    phase_id: phase.id,
    phase_name: phase.name,
  };
  if (flags.resume) result.resume = true;
  if (flags.previously_blocked) result.previously_blocked = true;
  if (flags.previously_failed) result.previously_failed = true;
  if (step.subagent) result.subagent = step.subagent;
  if (step.role) result.role = step.role;
  if (step.model) result.model = step.model;
  return result;
}
