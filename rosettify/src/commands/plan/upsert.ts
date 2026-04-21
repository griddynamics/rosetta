import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { atomicWritePlan } from "../../shared/concurrency.js";
import {
  type Plan,
  type Phase,
  type Step,
  type UpsertResult,
  loadPlan,
  savePlan,
  mergePatch,
  mergeById,
  validateUniqueIds,
  validateDependencies,
  validateSizeLimits,
  validateImmutableId,
  propagateStatuses,
  findPhase,
  findStep,
} from "./core.js";

const STATUS_FIELDS = new Set(["status"]);

function stripStatusFields(
  data: Record<string, unknown>,
): { stripped: Record<string, unknown>; anyStripped: boolean } {
  let anyStripped = false;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (STATUS_FIELDS.has(key)) {
      anyStripped = true;
    } else if (key === "phases" && Array.isArray(value)) {
      result[key] = (value as Record<string, unknown>[]).map((p) => {
        const { stripped: ps, anyStripped: pa } = stripStatusFields(p);
        if (pa) anyStripped = true;
        return ps;
      });
    } else if (key === "steps" && Array.isArray(value)) {
      result[key] = (value as Record<string, unknown>[]).map((s) => {
        const { stripped: ss, anyStripped: sa } = stripStatusFields(s);
        if (sa) anyStripped = true;
        return ss;
      });
    } else {
      result[key] = value;
    }
  }
  return { stripped: result, anyStripped };
}

export async function cmdUpsert(
  planFile: string,
  targetId: string | undefined,
  data: Record<string, unknown>,
  kind?: string,
  phaseId?: string,
): Promise<RunEnvelope<UpsertResult>> {
  try {
    const resolvedTargetId = targetId ?? "entire_plan";

    // Strip status fields silently (before any file I/O)
    const { stripped: cleanData, anyStripped } = stripStatusFields(data);
    const statusMessage = anyStripped
      ? "status fields ignored -- use update_status to update status one-by-one after each task completion"
      : undefined;

    // Special case: entire_plan on missing file — create new plan, no concurrency needed
    if (resolvedTargetId === "entire_plan" && !loadPlan(planFile)) {
      const now = new Date().toISOString();
      let plan: Plan = {
        name: "Unnamed Plan",
        description: "",
        status: "open",
        created_at: now,
        updated_at: now,
        phases: [],
      };
      const idCheck = validateImmutableId(cleanData["id"] as string | undefined, resolvedTargetId);
      if (idCheck) return err(idCheck);
      plan = applyEntirePlanPatch(plan, cleanData);
      if ("error" in plan) return err((plan as unknown as { error: string }).error);
      const uniqueErr = validateUniqueIds(plan); if (uniqueErr) return err(uniqueErr);
      const depsErr = validateDependencies(plan); if (depsErr) return err(depsErr);
      const sizeErr = validateSizeLimits(plan); if (sizeErr) return err(sizeErr);
      propagateStatuses(plan);
      savePlan(planFile, plan);
      const result: UpsertResult = { id: resolvedTargetId, plan_status: plan.status };
      if (statusMessage) result.message = statusMessage;
      return ok(result);
    }

    return atomicWritePlan<Plan, UpsertResult>(
      loadPlan,
      savePlan,
      planFile,
      (plan) => {
        let mutated = plan;

        if (resolvedTargetId === "entire_plan") {
          const idCheck = validateImmutableId(cleanData["id"] as string | undefined, resolvedTargetId);
          if (idCheck) return { ok: false, error: idCheck };
          mutated = applyEntirePlanPatch(plan, cleanData);
          if ("error" in mutated) return { ok: false, error: (mutated as unknown as { error: string }).error };
        } else {
          const phaseIdx = plan.phases.findIndex((p) => p.id === resolvedTargetId);
          if (phaseIdx >= 0) {
            const phase = plan.phases[phaseIdx]!;
            const idCheck = validateImmutableId(cleanData["id"] as string | undefined, resolvedTargetId);
            if (idCheck) return { ok: false, error: idCheck };
            if (cleanData["steps"] !== undefined && Array.isArray(cleanData["steps"])) {
              const patchSteps = cleanData["steps"] as Record<string, unknown>[];
              const mergedSteps = mergeById((phase.steps ?? []) as unknown as Record<string, unknown>[], patchSteps);
              if ("error" in mergedSteps) return { ok: false, error: mergedSteps.error };
              const { steps: _s, ...rest } = cleanData;
              const merged = mergePatch(phase as unknown as Record<string, unknown>, rest) as unknown as Phase;
              merged.steps = mergedSteps as unknown as Step[];
              mutated.phases[phaseIdx] = merged;
            } else {
              mutated.phases[phaseIdx] = mergePatch(phase as unknown as Record<string, unknown>, cleanData) as unknown as Phase;
            }
          } else {
            const foundStep = findStep(plan, resolvedTargetId);
            if (foundStep) {
              const idCheck = validateImmutableId(cleanData["id"] as string | undefined, resolvedTargetId);
              if (idCheck) return { ok: false, error: idCheck };
              const phaseForStep = foundStep.phase;
              const stepIdx = phaseForStep.steps.findIndex((s) => s.id === resolvedTargetId);
              phaseForStep.steps[stepIdx] = mergePatch(foundStep.step as unknown as Record<string, unknown>, cleanData) as unknown as Step;
            } else {
              if (!kind) return { ok: false, error: "missing_kind", include_help: true };
              if (kind !== "phase" && kind !== "step") return { ok: false, error: "invalid_kind", include_help: true };
              if (kind === "step") {
                if (!phaseId) return { ok: false, error: "missing_phase_id", include_help: true };
                const parentPhase = findPhase(mutated, phaseId);
                if (!parentPhase) return { ok: false, error: "phase_not_found" };
                const newStep: Step = { status: "open", depends_on: [], ...(cleanData as Partial<Step>), id: resolvedTargetId } as Step;
                parentPhase.steps = parentPhase.steps ?? [];
                parentPhase.steps.push(newStep);
              } else {
                const newPhase: Phase = { status: "open", depends_on: [], steps: [], name: resolvedTargetId, description: "", ...(cleanData as Partial<Phase>), id: resolvedTargetId } as Phase;
                mutated.phases = mutated.phases ?? [];
                mutated.phases.push(newPhase);
              }
            }
          }
        }

        const uniqueErr = validateUniqueIds(mutated); if (uniqueErr) return { ok: false, error: uniqueErr };
        const depsErr = validateDependencies(mutated); if (depsErr) return { ok: false, error: depsErr };
        const sizeErr = validateSizeLimits(mutated); if (sizeErr) return { ok: false, error: sizeErr };
        propagateStatuses(mutated);

        logger.info({ planFile, targetId: resolvedTargetId }, "upsert complete");
        const result: UpsertResult = { id: resolvedTargetId, plan_status: mutated.status };
        if (statusMessage) result.message = statusMessage;
        return { ok: true, result, updated: mutated };
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}

function applyEntirePlanPatch(plan: Plan, cleanData: Record<string, unknown>): Plan {
  if (cleanData["phases"] !== undefined && Array.isArray(cleanData["phases"])) {
    const patchPhases = cleanData["phases"] as Record<string, unknown>[];
    const mergedPhases = mergeById(plan.phases as unknown as Record<string, unknown>[], patchPhases);
    if ("error" in mergedPhases) return mergedPhases as unknown as Plan;
    const { phases: _p, ...rest } = cleanData;
    const merged = mergePatch(plan as unknown as Record<string, unknown>, rest) as unknown as Plan;
    merged.phases = mergedPhases as unknown as Phase[];
    return merged;
  }
  return mergePatch(plan as unknown as Record<string, unknown>, cleanData) as unknown as Plan;
}
