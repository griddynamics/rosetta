// Implements FR-HELP-0001 (top-level help), FR-HELP-0002 (command detail with schemas and notes).

import type { ToolDef, RunEnvelope, HelpTopLevel, HelpCommandDetail, CommandInput } from "../../registry/types.js";
import { ok } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";
import { VERSION } from "../../shared/version.js";

export interface HelpInput extends CommandInput {
  subcommand?: string;
}

// Lazy registry to avoid circular imports
async function getRegistry() {
  const { registry } = await import("../../registry/index.js");
  return registry;
}

async function runHelp(
  input: HelpInput,
): Promise<RunEnvelope<HelpTopLevel | HelpCommandDetail>> {
  const { subcommand } = input;
  const registry = await getRegistry();

  // FR-HELP-0001 — no subcommand: top-level listing (brief only, no full schemas)
  if (!subcommand) {
    const commands = [...registry.values()].map((t) => ({
      name: t.name,
      brief: t.brief,
    }));
    const result: HelpTopLevel = {
      tool: "rosettify",
      version: VERSION,
      commands,
      guidance: "use 'help <command>' for details",
    };
    logger.info({}, "help top-level");
    return ok(result);
  }

  // FR-HELP-0002 — known subcommand: return full command detail
  const tool = registry.get(subcommand);
  if (tool) {
    // FR-HELP-0002 — forward the entire helpContent payload authored by the command,
    // then overlay canonical name/brief/description from ToolDef. Per-command extensions
    // (e.g. FR-PLAN-0016: plan_file, concepts, subagent_fields, limits, templates,
    // plan_authoring_guidance, next_steps_for_ai, and subcommand entries with examples)
    // flow through unchanged.
    const result: HelpCommandDetail = {
      ...(tool.helpContent ?? {}),
      name: tool.name,
      brief: tool.brief,
      description: tool.description,
    };
    logger.info({ subcommand }, "help command detail");
    return ok(result);
  }

  // FR-HELP-0002 — unknown subcommand: fall back to top-level listing, ok:true, include_help:false
  const commands = [...registry.values()].map((t) => ({
    name: t.name,
    brief: t.brief,
  }));
  const result: HelpTopLevel = {
    tool: "rosettify",
    version: VERSION,
    commands,
    guidance: "use 'help <command>' for details",
  };
  logger.info({ subcommand }, "help unknown subcommand fallback");
  return ok(result);
}

export const helpToolDef: ToolDef<HelpInput, HelpTopLevel | HelpCommandDetail> = {
  name: "help",
  brief: "Show available commands and detailed usage information",
  description:
    "Returns top-level command listing or detailed help for a specific command.",
  inputSchema: {
    type: "object",
    properties: {
      subcommand: {
        type: "string",
        description: "Command name to get details for",
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
  run: runHelp,
};
