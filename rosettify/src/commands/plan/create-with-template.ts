// Implements FR-PLAN-0030 (create-with-template subcommand).
// Wraps plan create (FR-PLAN-0010) with template render (FR-PLAN-0034).
// All write semantics and result shape (FR-PLAN-0040) are identical to plan create.

import type { RunEnvelope } from "../../registry/types.js";
import { err } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { createTemplates } from "./templates/index.js";
import { renderTemplate } from "./templates/render.js";
import { cmdCreate } from "./create.js";
import type { PlanWriteResult } from "./output.js";
import { ERR_INVALID_TEMPLATE } from "./errors.js";

// FR-PLAN-0030 — input schema for create-with-template
export const createWithTemplateInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Path to the plan JSON file" },
    template: { type: "string", description: "Template name from create-kind collection" },
    "plan-name": { type: "string", description: "Value for the [plan-name] placeholder" },
    "plan-description": { type: "string", description: "Value for the [plan-description] placeholder" },
  },
};

export const createWithTemplateOutputSchema = {
  $ref: "PlanWriteResult" as const,
};

export async function cmdCreateWithTemplate(
  planFile: string,
  templateName: string,
  planName: string,
  planDescription: string,
): Promise<RunEnvelope<PlanWriteResult>> {
  // FR-PLAN-0030 — look up template in create-kind collection only
  const template = createTemplates[templateName as keyof typeof createTemplates];
  if (!template) {
    // FR-PLAN-0021 — invalid_template: name not found in requested kind's collection
    return err(ERR_INVALID_TEMPLATE);
  }

  // FR-PLAN-0034 — render with strict bidirectional matching
  const rendered = renderTemplate(template, {
    "plan-name": planName,
    "plan-description": planDescription,
  });

  if (!rendered.ok) {
    logger.warn({ templateName, error: rendered.error }, "template render failed");
    return err(rendered.error);
  }

  logger.info({ planFile, templateName }, "create-with-template rendering done, invoking create");
  // FR-PLAN-0030 — invoke same logic as plan create (FR-PLAN-0010)
  return cmdCreate(planFile, rendered.rendered as Record<string, unknown>);
}
