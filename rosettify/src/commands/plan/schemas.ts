// Implements FR-HELP-0002 (per-subcommand input/output schema aggregation).
// Aggregates per-subcommand declarations into a flat dictionary for help output.

import { createInputSchema, createOutputSchema } from "./create.js";
import { upsertInputSchema, upsertOutputSchema } from "./upsert.js";
import { updateStatusInputSchema, updateStatusOutputSchema } from "./update-status.js";
import { nextInputSchema, nextOutputSchema } from "./next.js";
import { showStatusInputSchema, showStatusOutputSchema } from "./show-status.js";
import { queryInputSchema, queryOutputSchema } from "./query.js";
import { createWithTemplateInputSchema, createWithTemplateOutputSchema } from "./create-with-template.js";
import { upsertWithTemplateInputSchema, upsertWithTemplateOutputSchema } from "./upsert-with-template.js";
import { listTemplatesInputSchema, listTemplatesOutputSchema } from "./list-templates.js";

// FR-HELP-0002 — per-subcommand schema dict, keyed by subcommand name
export const planSubcommandSchemas = {
  create: { input: createInputSchema, output: createOutputSchema },
  next: { input: nextInputSchema, output: nextOutputSchema },
  update_status: { input: updateStatusInputSchema, output: updateStatusOutputSchema },
  show_status: { input: showStatusInputSchema, output: showStatusOutputSchema },
  query: { input: queryInputSchema, output: queryOutputSchema },
  upsert: { input: upsertInputSchema, output: upsertOutputSchema },
  "create-with-template": { input: createWithTemplateInputSchema, output: createWithTemplateOutputSchema },
  "upsert-with-template": { input: upsertWithTemplateInputSchema, output: upsertWithTemplateOutputSchema },
  "list-templates": { input: listTemplatesInputSchema, output: listTemplatesOutputSchema },
} as const;

// Reusable shared shapes (part of the flat dict per FR-HELP-0002)
const compressedTreeSchema = {
  type: "object" as const,
  description: "FR-PLAN-0040 — compressed-tree shape returned by write subcommands",
  properties: {
    plan: {
      type: "object" as const,
      properties: {
        name: { type: "string" as const },
        status: { type: "string" as const },
      },
    },
    previous_version: { type: ["string", "null"] as const },
    phases: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          name: { type: "string" as const },
          status: { type: "string" as const },
          steps: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                id: { type: "string" as const },
                name: { type: "string" as const },
                status: { type: "string" as const },
              },
            },
          },
        },
      },
    },
  },
};

const planSchema = {
  type: "object" as const,
  description: "FR-PLAN-0017 — full plan JSON schema",
  properties: {
    name: { type: "string" as const },
    description: { type: "string" as const },
    status: { type: "string" as const, enum: ["open", "in_progress", "complete", "blocked", "failed"] as const },
    created_at: { type: "string" as const },
    updated_at: { type: "string" as const },
    previous_version: { type: ["string", "null"] as const },
    phases: { type: "array" as const },
  },
};

const phaseSchema = {
  type: "object" as const,
  description: "FR-PLAN-0001 — phase fields",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    description: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
    steps: { type: "array" as const },
  },
};

const stepSchema = {
  type: "object" as const,
  description: "FR-PLAN-0001 — step fields",
  properties: {
    id: { type: "string" as const },
    name: { type: "string" as const },
    prompt: { type: "string" as const },
    status: { type: "string" as const },
    depends_on: { type: "array" as const, items: { type: "string" as const } },
    subagent: { type: "string" as const },
    role: { type: "string" as const },
    model: { type: "string" as const },
  },
};

/**
 * FR-HELP-0002 — flat schemas dict: subcommand → input schema,
 * plus shared shapes (compressed-tree, plan, phase, step).
 * Output schemas live under <subcommand>-output keys.
 */
export const planSchemasDict: Record<string, unknown> = {
  // Input schemas keyed by subcommand name
  create: createInputSchema,
  next: nextInputSchema,
  update_status: updateStatusInputSchema,
  show_status: showStatusInputSchema,
  query: queryInputSchema,
  upsert: upsertInputSchema,
  "create-with-template": createWithTemplateInputSchema,
  "upsert-with-template": upsertWithTemplateInputSchema,
  "list-templates": listTemplatesInputSchema,
  // Output schemas under <subcommand>-output keys
  "create-output": createOutputSchema,
  "next-output": nextOutputSchema,
  "update_status-output": updateStatusOutputSchema,
  "show_status-output": showStatusOutputSchema,
  "query-output": queryOutputSchema,
  "upsert-output": upsertOutputSchema,
  "create-with-template-output": createWithTemplateOutputSchema,
  "upsert-with-template-output": upsertWithTemplateOutputSchema,
  "list-templates-output": listTemplatesOutputSchema,
  // Shared reusable shapes
  "compressed-tree": compressedTreeSchema,
  plan: planSchema,
  phase: phaseSchema,
  step: stepSchema,
};
