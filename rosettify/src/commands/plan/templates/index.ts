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

// Helper types for template entries in the catalog (FR-PLAN-0032)
export interface TemplateCatalogEntry {
  name: string;
  brief: string;
  placeholders: readonly string[];
}

/** Returns the catalog for list-templates (FR-PLAN-0032). */
export function buildTemplateCatalog(): {
  create: TemplateCatalogEntry[];
  upsert: TemplateCatalogEntry[];
} {
  const create: TemplateCatalogEntry[] = Object.values(createTemplates).map((t) => ({
    name: t.name,
    brief: t.brief,
    placeholders: t.placeholders,
  }));
  const upsert: TemplateCatalogEntry[] = Object.values(upsertTemplates).map((t) => ({
    name: t.name,
    brief: t.brief,
    placeholders: t.placeholders,
  }));
  return { create, upsert };
}
