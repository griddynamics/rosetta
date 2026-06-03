// Implements FR-PLAN-0031 (upsert-with-template subcommand).
// Wraps plan upsert (FR-PLAN-0015) with template render (FR-PLAN-0034).
// All upsert merge semantics, write semantics (FR-PLAN-0024), and result shape (FR-PLAN-0040) are identical to plan upsert.

import type { RunEnvelope } from "../../registry/types.js";
import { err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { upsertTemplates } from "./templates/index.js";
import { renderTemplate, parsePhaseSteps } from "./templates/render.js";
import { cmdUpsert } from "./upsert.js";
import type { PlanWriteResult } from "./output.js";
import { ERR_INVALID_TEMPLATE } from "./errors.js";

// FR-PLAN-0031 — input schema for upsert-with-template
export const upsertWithTemplateInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    "phase-id": { type: "string", description: "Value for the [phase-id] placeholder and upsert target ID" },
    template: { type: "string", description: "Template name from upsert-kind collection" },
    "phase-name": { type: "string", description: "Value for the [phase-name] placeholder" },
    "phase-description": { type: "string", description: "Value for the [phase-description] placeholder" },
    // FR-PLAN-0043 — phase-steps array injection (not a placeholder)
    "phase-steps": { type: "string", description: "JSON array of steps appended to the seeded phase" },
  },
};

export const upsertWithTemplateOutputSchema = {
  $ref: "PlanWriteResult" as const,
};

export async function cmdUpsertWithTemplate(
  planFile: string,
  phaseId: string,
  templateName: string,
  phaseName: string,
  phaseDescription: string,
  phaseSteps?: string,
): Promise<RunEnvelope<PlanWriteResult>> {
  // FR-PLAN-0031 — look up template in upsert-kind collection only
  const template = upsertTemplates[templateName as keyof typeof upsertTemplates];
  if (!template) {
    // FR-PLAN-0021 — invalid_template: name not found in requested kind's collection
    return err(ERR_INVALID_TEMPLATE);
  }

  // FR-PLAN-0034 — render with strict bidirectional matching
  const rendered = renderTemplate(template, {
    "phase-id": phaseId,
    "phase-name": phaseName,
    "phase-description": phaseDescription,
  });

  if (!rendered.ok) {
    logger.warn({ templateName, error: rendered.error }, "template render failed");
    return err(rendered.error);
  }

  // FR-PLAN-0043 — parse and inject caller-supplied steps into the seeded phase.
  // Backward compatibility: an omitted phase-steps is treated as an empty array.
  const parsed = parsePhaseSteps(phaseSteps ?? "[]");
  if (!parsed.ok) {
    logger.warn({ templateName, error: parsed.error }, "phase-steps parse failed");
    return err(parsed.error);
  }
  const phase = rendered.rendered as { steps: unknown[] };
  phase.steps.push(...parsed.steps);

  logger.info({ planFile, templateName, phaseId }, "upsert-with-template rendering done, invoking upsert");
  // FR-PLAN-0031 — invoke same logic as plan upsert (FR-PLAN-0015) targeting phase-id
  // kind="phase" so that if the phase does not exist, it gets created
  return cmdUpsert(planFile, phaseId, phase as unknown as Record<string, unknown>, "phase");
}
