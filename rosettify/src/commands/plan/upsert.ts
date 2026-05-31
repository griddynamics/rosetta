// Implements FR-PLAN-0015 (upsert subcommand) and FR-PLAN-0040 (compressed-tree output).
// Uses FR-PLAN-0024 write cycle (atomicWriteWithBackup) for all writes.
// FR-PLAN-0025 — plan writes go through FR-PLAN-0024, NOT the FR-SHRD-0006 optimistic-concurrency function.

import * as fs from "fs";
import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { atomicWriteWithBackup } from "../../shared/plan-io.js";
import {
  type Plan,
  type Phase,
  type Step,
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
import { buildPlanWriteResult, type PlanWriteResult } from "./output.js";

// FR-PLAN-0015 — upsert returns compressed-tree shape (FR-PLAN-0040)
export const upsertInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    target_id: { type: "string", description: "Phase or step ID, or 'entire_plan'" },
    data: {
      oneOf: [
        { type: "string", description: "JSON string of patch data" },
        { type: "object", description: "Patch data object" },
      ],
    },
    kind: { type: "string", description: "Type for new items: phase | step" },
    phase_id: { type: "string", description: "Parent phase for new step" },
  },
};

export const upsertOutputSchema = {
  $ref: "PlanWriteResult" as const,
};

// FR-PLAN-0015 — status fields are silently dropped from patch data;
// FR-PLAN-0016 — this behavior is documented in help notes, not per-call output.
const STATUS_FIELDS = new Set(["status"]);

function stripStatusFields(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (STATUS_FIELDS.has(key)) {
      // FR-PLAN-0015 / FR-PLAN-0016 — silently drop status fields; surfaced via help notes
      continue;
    } else if (key === "phases" && Array.isArray(value)) {
      result[key] = (value as Record<string, unknown>[]).map((p) => stripStatusFields(p));
    } else if (key === "steps" && Array.isArray(value)) {
      result[key] = (value as Record<string, unknown>[]).map((s) => stripStatusFields(s));
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function cmdUpsert(
  planFile: string,
  targetId: string | undefined,
  data: Record<string, unknown>,
  kind?: string,
  phaseId?: string,
): Promise<RunEnvelope<PlanWriteResult>> {
  try {
    const resolvedTargetId = targetId ?? "entire_plan";

    // FR-PLAN-0015 — strip status fields silently before any file I/O
    const cleanData = stripStatusFields(data);

    // Special case: entire_plan on missing file — create new plan (first-create path).
    // FR-PLAN-0024 — no rename needed for first create.
    // Use fs.existsSync (NOT loadPlan) so a corrupted file falls through to the write cycle,
    // which translates parse failure to FR-PLAN-0021 plan_file_corrupted via readPlanWithRetry.
    if (resolvedTargetId === "entire_plan" && !fs.existsSync(planFile)) {
      const now = new Date().toISOString();
      let plan: Plan = {
        name: "Unnamed Plan",
        description: "",
        status: "open",
        created_at: now,
        updated_at: now,
        previous_version: null, // FR-PLAN-0017 — null on first create
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
      // FR-PLAN-0026 — savePlan writes 2-space pretty-formatted JSON
      savePlan(planFile, plan);
      logger.info({ planFile, targetId: resolvedTargetId }, "upsert created new plan");
      // FR-PLAN-0040 — return PlanWriteResult; previous_version=null on first create (FR-PLAN-0010)
      return ok(buildPlanWriteResult(plan, null));
    }

    // FR-PLAN-0024 — use rename-as-guard write cycle for existing plans
    const writeResult = await atomicWriteWithBackup<Plan, PlanWriteResult>(
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
        // FR-PLAN-0040 — placeholder result; real backup path injected at the call site after atomicWriteWithBackup
        return { ok: true, result: buildPlanWriteResult(mutated, null), updated: mutated };
      },
      savePlan,
    );

    if (!writeResult.ok) {
      return { ok: false, result: null, error: writeResult.error, include_help: writeResult.include_help };
    }

    // FR-PLAN-0040 — inject real backup path into plan summary (FR-PLAN-0024 / FR-PLAN-0010)
    const tree = writeResult.result!.result;
    const bak = writeResult.result!.backupPath;
    return ok({ ...tree, plan: { ...tree.plan, previous_version: bak } });
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
