import type { ToolDef, RunEnvelope } from "../../registry/types.js";
import { ok, err } from "../../shared/envelope.js";
import { type PlanInput } from "./core.js";
import { cmdCreate } from "./create.js";
import { cmdNext } from "./next.js";
import { cmdUpdateStatus } from "./update-status.js";
import { cmdShowStatus } from "./show-status.js";
import { cmdQuery } from "./query.js";
import { cmdUpsert } from "./upsert.js";
import { planHelpContent } from "./help-content.js";

const VALID_SUBCOMMANDS = [
  "create",
  "next",
  "update_status",
  "show_status",
  "query",
  "upsert",
] as const;

async function runPlan(input: PlanInput): Promise<RunEnvelope<unknown>> {
  const { subcommand, plan_file, data, target_id, new_status, limit, kind, phase_id } =
    input;

  // No subcommand -> return help content (FR-PLAN-0022)
  if (!subcommand) {
    return ok(planHelpContent);
  }

  // Unknown subcommand (FR-PLAN-0023)
  if (!(VALID_SUBCOMMANDS as readonly string[]).includes(subcommand)) {
    return err(
      `unknown_command: ${subcommand} | valid: create, next, update_status, show_status, query, upsert`,
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

    default:
      return err(`unknown_command: ${subcommand}`, true);
  }
}

export const planToolDef: ToolDef<PlanInput, unknown> = {
  name: "plan",
  brief: "Manage execution plans (create, query, update, upsert)",
  description:
    "Manages two-level execution plans stored as JSON files. " +
    "Subcommands: create, next, update_status, show_status, query, upsert.",
  inputSchema: {
    type: "object",
    properties: {
      subcommand: {
        type: "string",
        description: "Subcommand: create | next | update_status | show_status | query | upsert",
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
    },
    required: [],
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
};
