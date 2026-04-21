import type { ToolDef, RunEnvelope, HelpTopLevel, HelpCommandDetail, CommandInput } from "../../registry/types.js";
import { ok } from "../../shared/envelope.js";
import { logger } from "../../shared/logger.js";

export interface HelpInput extends CommandInput {
  subcommand?: string;
}

// Version from package — hardcoded to keep implementation simple
const VERSION = "0.1.0";

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

  // No subcommand (FR-HELP-0001): top-level listing
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

  // Known subcommand (FR-HELP-0002): return detailed help
  const tool = registry.get(subcommand);
  if (tool) {
    // Check if the command has subcommands (via its help content)
    let subcommands: Array<{ name: string; brief: string }> | undefined;
    if (subcommand === "plan") {
      try {
        const { planHelpContent } = await import("../plan/help-content.js");
        subcommands = planHelpContent.subcommands.map((s) => ({
          name: s.name,
          brief: s.brief,
        }));
      } catch {
        // ignore
      }
    }

    const result: HelpCommandDetail = {
      name: tool.name,
      brief: tool.brief,
      description: tool.description,
      input_schema: tool.inputSchema,
      output_schema: tool.outputSchema,
      ...(subcommands ? { subcommands } : {}),
    };
    logger.info({ subcommand }, "help command detail");
    return ok(result);
  }

  // Unknown subcommand: fall back to top-level listing, ok:true, include_help:false
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
