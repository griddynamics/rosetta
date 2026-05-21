// Implements FR-PLAN-0032 (list-templates subcommand).

import type { RunEnvelope } from "../../registry/types.js";
import { ok } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { buildTemplateCatalog } from "./templates/index.js";

// FR-PLAN-0032 — list-templates result shape
export interface ListTemplatesResult {
  create: Array<{ name: string; brief: string; placeholders: readonly string[] }>;
  upsert: Array<{ name: string; brief: string; placeholders: readonly string[] }>;
}

export const listTemplatesInputSchema = {
  type: "object" as const,
  properties: {
    plan_file: { type: "string", description: "Unused; included for CLI consistency" },
  },
  required: [],
};

export const listTemplatesOutputSchema = {
  type: "object" as const,
  description: "FR-PLAN-0032 — catalog of registered templates grouped by kind",
  properties: {
    create: { type: "array", items: { type: "object" } },
    upsert: { type: "array", items: { type: "object" } },
  },
};

export async function cmdListTemplates(): Promise<RunEnvelope<ListTemplatesResult>> {
  logger.info({}, "list-templates");
  // FR-PLAN-0032 — return catalog grouped by kind
  return ok(buildTemplateCatalog());
}
