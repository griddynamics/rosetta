// Plan command entry point.
// Routes all plan subcommands and exposes the ToolDef for CLI/MCP registration.
// Implements FR-PLAN-0022 (no-args returns help), FR-PLAN-0023 (unknown subcommand error).

import type { ToolDef, RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { type PlanInput } from "./core.js";
import { cmdCreate } from "./create.js";
import { cmdNext } from "./next.js";
import { cmdUpdateStatus } from "./update-status.js";
import { cmdShowStatus } from "./show-status.js";
import { cmdQuery } from "./query.js";
import { cmdUpsert } from "./upsert.js";
import { cmdCreateWithTemplate } from "./create-with-template.js";
import { cmdUpsertWithTemplate } from "./upsert-with-template.js";
import { cmdListTemplates } from "./list-templates.js";
import { planHelpContent } from "./help-content.js";
import { ERR_MISSING_TEMPLATE_PARAM } from "./errors.js";

// FR-PLAN-0023 — valid subcommand list includes all new subcommands
const VALID_SUBCOMMANDS = [
  "create",
  "next",
  "update_status",
  "show_status",
  "query",
  "upsert",
  "create-with-template",
  "upsert-with-template",
  "list-templates",
] as const;

const VALID_SUBCOMMANDS_STR = VALID_SUBCOMMANDS.join(", ");

async function runPlan(input: PlanInput): Promise<RunEnvelope<unknown>> {
  const {
    subcommand,
    plan_file,
    data,
    target_id,
    new_status,
    limit,
    kind,
    phase_id,
    template,
    "plan-name": planName,
    "plan-description": planDescription,
    "phase-id": phaseId,
    "phase-name": phaseName,
    "phase-description": phaseDescription,
  } = input;

  // FR-PLAN-0022 — no subcommand returns help content
  if (!subcommand) {
    return ok(planHelpContent);
  }

  // FR-PLAN-0023 — unknown subcommand: return error with valid list and include_help=true
  if (!(VALID_SUBCOMMANDS as readonly string[]).includes(subcommand)) {
    return err(
      `unknown_command: ${subcommand} | valid: ${VALID_SUBCOMMANDS_STR}`,
      true,
    );
  }

  // Parse data if it's a JSON string
  let parsedData: Record<string, unknown> | undefined;
  if (data !== undefined) {
    if (typeof data === "string") {
      try {
        parsedData = JSON.parse(data) as Record<string, unknown>;
      } catch {
        return err("invalid_data: data is not valid JSON", true);
      }
    } else {
      parsedData = data as Record<string, unknown>;
    }
  }

  switch (subcommand) {
    case "create": {
      if (!plan_file) return err("missing plan_file", true);
      if (!parsedData) return err("missing_data", true);
      return cmdCreate(plan_file, parsedData);
    }

    case "next": {
      if (!plan_file) return err("missing plan_file", true);
      return cmdNext(plan_file, target_id, limit);
    }

    case "update_status": {
      if (!plan_file) return err("missing plan_file", true);
      if (!target_id) return err("missing target_id", true);
      if (!new_status) return err("missing_new_status", true);
      return cmdUpdateStatus(plan_file, target_id, new_status);
    }

    case "show_status": {
      if (!plan_file) return err("missing plan_file", true);
      return cmdShowStatus(plan_file, target_id);
    }

    case "query": {
      if (!plan_file) return err("missing plan_file", true);
      return cmdQuery(plan_file, target_id);
    }

    case "upsert": {
      if (!plan_file) return err("missing plan_file", true);
      if (!parsedData) return err("missing_data", true);
      return cmdUpsert(plan_file, target_id, parsedData, kind, phase_id);
    }

    // FR-PLAN-0030 — create-with-template
    case "create-with-template": {
      if (!plan_file) return err("missing plan_file", true);
      if (template === undefined || template === null) return err(`${ERR_MISSING_TEMPLATE_PARAM}: template`, true);
      // FR-PLAN-0034 — provided=present. Empty string is a value; only undefined/null = absent.
      if (planName === undefined || planName === null) return err(`${ERR_MISSING_TEMPLATE_PARAM}: plan-name`, true);
      if (planDescription === undefined || planDescription === null) return err(`${ERR_MISSING_TEMPLATE_PARAM}: plan-description`, true);
      return cmdCreateWithTemplate(plan_file, template, planName, planDescription);
    }

    // FR-PLAN-0031 — upsert-with-template
    case "upsert-with-template": {
      if (!plan_file) return err("missing plan_file", true);
      // phase-id is also the upsert target_id, so it must be a non-empty string.
      if (!phaseId) return err(`${ERR_MISSING_TEMPLATE_PARAM}: phase-id`, true);
      if (template === undefined || template === null) return err(`${ERR_MISSING_TEMPLATE_PARAM}: template`, true);
      if (phaseName === undefined || phaseName === null) return err(`${ERR_MISSING_TEMPLATE_PARAM}: phase-name`, true);
      if (phaseDescription === undefined || phaseDescription === null) return err(`${ERR_MISSING_TEMPLATE_PARAM}: phase-description`, true);
      return cmdUpsertWithTemplate(plan_file, phaseId, template, phaseName, phaseDescription);
    }

    // FR-PLAN-0032 — list-templates
    case "list-templates": {
      return cmdListTemplates();
    }

    default:
      return err(`unknown_command: ${subcommand}`, true);
  }
}

export const planToolDef: ToolDef<PlanInput, unknown> = {
  name: "plan",
  brief: "Manage execution plans (create, query, update, upsert, templates)",
  description:
    "Manages two-level execution plans stored as JSON files. " +
    `Subcommands: ${VALID_SUBCOMMANDS_STR}.`,
  inputSchema: {
    type: "object",
    properties: {
      subcommand: {
        type: "string",
        description: `Subcommand: ${VALID_SUBCOMMANDS_STR}`,
      },
      plan_file: {
        type: "string",
        description: "Path to the plan JSON file",
      },
      data: {
        oneOf: [
          { type: "string", description: "JSON string of plan/phase/step data" },
          { type: "object", description: "Plan/phase/step data object" },
        ],
      },
      target_id: {
        type: "string",
        description: "Phase or step ID, or 'entire_plan'",
      },
      new_status: {
        type: "string",
        description: "Status value: open | in_progress | complete | blocked | failed",
      },
      limit: {
        type: "integer",
        minimum: 0,
        description: "Max items to return (next)",
      },
      kind: {
        type: "string",
        description: "Type for new upsert target: phase | step",
      },
      phase_id: {
        type: "string",
        description: "Parent phase for new step (upsert)",
      },
      // FR-PLAN-0030 / FR-PLAN-0034 — template parameters (kebab-case, uniform across CLI/MCP)
      template: {
        type: "string",
        description: "Template name",
      },
      "plan-name": {
        type: "string",
        description: "Value for [plan-name] placeholder",
      },
      "plan-description": {
        type: "string",
        description: "Value for [plan-description] placeholder",
      },
      "phase-id": {
        type: "string",
        description: "Value for [phase-id] placeholder",
      },
      "phase-name": {
        type: "string",
        description: "Value for [phase-name] placeholder",
      },
      "phase-description": {
        type: "string",
        description: "Value for [phase-description] placeholder",
      },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      result: {},
      error: { type: "string" },
      include_help: { type: "boolean" },
    },
  },
  cli: true,
  mcp: true,
  run: runPlan,
  // FR-HELP-0002 / FR-PLAN-0016 — forward the full plan help content payload through
  // help/index.ts. Includes plan_file, concepts, subagent_fields, subcommands with
  // dual-form examples, schemas, limits, templates, notes, plan_authoring_guidance,
  // next_steps_for_ai.
  helpContent: planHelpContent as unknown as Record<string, unknown>,
};
