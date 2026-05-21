// Implements FR-PLAN-0010 (create subcommand) and FR-PLAN-0040 (compressed-tree output).
// Uses FR-PLAN-0024 write cycle (first-create path: direct write, previous_version=null).

import type { RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import {
  type Plan,
  type Phase,
  type Step,
  validateUniqueIds,
  validateDependencies,
  validateSizeLimits,
  propagateStatuses,
  savePlan,
} from "./core.js";
import { buildCompressedTree, type CompressedPlanTree } from "./output.js";

// FR-PLAN-0010 — create returns compressed-tree shape (FR-PLAN-0040)
export const createInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    data: {
      oneOf: [
        { type: "string", description: "JSON string of plan data" },
        { type: "object", description: "Plan data object" },
      ],
    },
  },
  required: [],
};

export const createOutputSchema = {
  type: "object" as const,
  description: "FR-PLAN-0040 — compressed-tree shape after create",
  properties: {
    plan: {
      type: "object",
      properties: {
        name: { type: "string" },
        status: { type: "string" },
      },
    },
    previous_version: { type: ["string", "null"] },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          status: { type: "string" },
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                status: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export async function cmdCreate(
  planFile: string,
  data: Record<string, unknown>,
): Promise<RunEnvelope<CompressedPlanTree>> {
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
      // FR-PLAN-0010 / FR-PLAN-0017 — previous_version=null on first create
      previous_version: null,
      phases,
    };

    const uniqueErr = validateUniqueIds(plan);
    if (uniqueErr) return err(uniqueErr);

    const depsErr = validateDependencies(plan);
    if (depsErr) return err(depsErr);

    const sizeErr = validateSizeLimits(plan);
    if (sizeErr) return err(sizeErr);

    propagateStatuses(plan);
    // FR-PLAN-0026 — savePlan writes pretty-formatted JSON (2-space indent)
    savePlan(planFile, plan);

    logger.info({ planFile, name: plan.name }, "plan created");
    // FR-PLAN-0040 — return compressed-tree shape; previous_version=null on first create
    return ok(buildCompressedTree(plan, null));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return err(`internal_error: ${msg}`);
  }
}
