// Implements FR-PLAN-0033 (template registry: two kinds, per-file modules, compiled-in).

import { forOrchestrator } from "./create/for-orchestrator.js";
import { forSubagent } from "./upsert/for-subagent.js";

// FR-PLAN-0033 — create-kind template collection, keyed by template name
export const createTemplates = {
  "for-orchestrator": forOrchestrator,
} as const;

// FR-PLAN-0033 — upsert-kind template collection, keyed by template name
export const upsertTemplates = {
  "for-subagent": forSubagent,
} as const;

// FR-PLAN-0032 / FR-HELP-0002 — named exported type for template catalog entries (includes produces)
export interface PlanTemplateCatalogEntry {
  name: string;
  brief: string;
  placeholders: readonly string[];
  produces: string;
}

// Alias for backwards compatibility within this module
export type TemplateCatalogEntry = PlanTemplateCatalogEntry;

/** Returns the catalog for list-templates (FR-PLAN-0032). */
export function buildTemplateCatalog(): {
  create: PlanTemplateCatalogEntry[];
  upsert: PlanTemplateCatalogEntry[];
} {
  const create: PlanTemplateCatalogEntry[] = Object.values(createTemplates).map((t) => ({
    name: t.name,
    brief: t.brief,
    placeholders: t.placeholders,
    produces: t.produces,
  }));
  const upsert: PlanTemplateCatalogEntry[] = Object.values(upsertTemplates).map((t) => ({
    name: t.name,
    brief: t.brief,
    placeholders: t.placeholders,
    produces: t.produces,
  }));
  return { create, upsert };
}
