// Implements FR-PLAN-0032 (list-templates subcommand).

import type { RunEnvelope } from "../../registry/types.js";
import { ok } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { buildTemplateCatalog, type PlanTemplateCatalogEntry } from "./templates/index.js";

// FR-PLAN-0032 — list-templates result shape (PlanTemplateCatalog)
export interface ListTemplatesResult {
  create: PlanTemplateCatalogEntry[];
  upsert: PlanTemplateCatalogEntry[];
}

export const listTemplatesInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Unused; included for CLI consistency" },
  },
};

export const listTemplatesOutputSchema = {
  $ref: "PlanTemplateCatalog" as const,
};

export async function cmdListTemplates(): Promise<RunEnvelope<ListTemplatesResult>> {
  logger.info({}, "list-templates");
  // FR-PLAN-0032 — return catalog grouped by kind
  return ok(buildTemplateCatalog());
}
