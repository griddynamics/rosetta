import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import {
  type Plan,
  type Phase,
  type Step,
  type CreateResult,
  validateUniqueIds,
  validateDependencies,
  validateSizeLimits,
  propagateStatuses,
  savePlan,
} from "./core.js";

export async function cmdCreate(
  planFile: string,
  data: Record<string, unknown>,
): Promise<RunEnvelope<CreateResult>> {
  try {
    const now = new Date().toISOString();

    const rawPhases = Array.isArray(data["phases"])
      ? (data["phases"] as Record<string, unknown>[])
      : [];

    const phases: Phase[] = rawPhases.map((p) => {
      const rawSteps = Array.isArray(p["steps"])
        ? (p["steps"] as Record<string, unknown>[])
        : [];
      const steps: Step[] = rawSteps.map((s) => ({
        status: "open",
        depends_on: [],
        ...(s as Partial<Step>),
      } as Step));

      const phaseBase = {
        status: "open",
        depends_on: [],
        ...(p as Partial<Phase>),
      };
      return { ...phaseBase, steps } as Phase;
    });

    const plan: Plan = {
      name: (data["name"] as string | undefined) ?? "Unnamed Plan",
      description: (data["description"] as string | undefined) ?? "",
      status: "open",
      created_at: now,
      updated_at: now,
      phases,
    };

    const uniqueErr = validateUniqueIds(plan);
    if (uniqueErr) return err(uniqueErr);

    const depsErr = validateDependencies(plan);
    if (depsErr) return err(depsErr);

    const sizeErr = validateSizeLimits(plan);
    if (sizeErr) return err(sizeErr);

    propagateStatuses(plan);
    savePlan(planFile, plan);

    logger.info({ planFile, name: plan.name }, "plan created");
    return ok({ plan_file: planFile, name: plan.name, status: plan.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}
