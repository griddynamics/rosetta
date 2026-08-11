// CLI frontend for rosettify.
// Implements FR-CLI-0001 (standard CLI), FR-SHRD-0008 (dense JSON output).
// All new plan subcommands: create-with-template, upsert-with-template, list-templates.

import { Command, Option } from "commander";
import { registry } from "../registry/index.js";
import { dispatch } from "../shared/dispatch.js";
import { extractOutput, logFailure } from "../shared/envelope.js";
import { planToolDef } from "../commands/plan/index.js";
import { specsToolDef } from "../commands/specs/index.js";
import { helpToolDef } from "../commands/help/index.js";
import type { PlanInput } from "../commands/plan/core.js";
import type { SpecInput } from "../commands/specs/core.js";
import type { EnrichedEnvelope } from "../registry/types.js";
import { enableVerboseLogging, logger } from "../shared/logger.js";
import { VERSION } from "../shared/version.js";

// FR-ARCH-0007 — all command output is valid JSON; FR-SHRD-0008 — dense (no indent)
function writeResult(toolName: string, envelope: EnrichedEnvelope<unknown>): void {
  const output = extractOutput(envelope);
  if (!output.ok) {
    logFailure(logger, toolName, envelope.error ?? "unknown_error");
  }
  // FR-SHRD-0008 — dense JSON output (no indent, no whitespace between elements)
  process.stdout.write(JSON.stringify(output.payload) + "\n");
}

export async function runCli(args: string[]): Promise<void> {
  if (args.includes("--verbose")) {
    enableVerboseLogging();
  }

  // Check for --mcp before commander processes
  if (args.includes("--mcp")) {
    process.stderr.write(
      JSON.stringify({ error: "--mcp is mutually exclusive with commands" }) + "\n",
    );
    process.exit(1);
  }

  const program = new Command("rosettify");
  program.version(VERSION);
  program.option("--verbose", "Write trace-level diagnostics to the log file");

  // Suppress commander's default help output
  program.helpOption(false);

  // Override --help at root level
  program.option("--help", "Show help");

  // Plan command — allowExcessArguments so unknown subcommands fall through to the action
  const planCmd = program
    .command("plan")
    .description("Manage execution plans")
    .helpOption(false)
    .allowExcessArguments(true)
    .option("--help", "Show plan help");

  // plan create <plan_file> '<json>'
  planCmd
    .command("create")
    .description("Create a new plan")
    .argument("<plan_file>", "Path to plan file")
    .argument("<data>", "Plan JSON data")
    .action(async (planFile: string, data: string) => {
      const input: PlanInput = {
        subcommand: "create",
        plan_file: planFile,
        data,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // plan next <plan_file> [limit] [--target <id>]
  planCmd
    .command("next")
    .description("Get next steps")
    .argument("<plan_file>", "Path to plan file")
    .argument("[limit]", "Max steps to return (default: 3)")
    .option("--target <id>", "Scope to phase")
    .addOption(new Option("--limit <n>", "compatibility alias for the positional limit").hideHelp())
    .action(async (planFile: string, limitStr: string | undefined, opts: { target?: string; limit?: string }) => {
      const rawLimit = limitStr !== undefined ? limitStr : opts.limit;
      const limit = rawLimit !== undefined ? parseInt(rawLimit, 10) : undefined;
      const input: PlanInput = {
        subcommand: "next",
        plan_file: planFile,
        ...(limit !== undefined ? { limit } : {}),
        target_id: opts.target,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // plan update_status <plan_file> <target_id> <new_status>
  planCmd
    .command("update_status")
    .description("Update step status")
    .argument("<plan_file>", "Path to plan file")
    .argument("<target_id>", "Step ID")
    .argument("<new_status>", "New status")
    .action(async (planFile: string, targetId: string, newStatus: string) => {
      const input: PlanInput = {
        subcommand: "update_status",
        plan_file: planFile,
        target_id: targetId,
        new_status: newStatus,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // plan show_status <plan_file> [target_id]
  planCmd
    .command("show_status")
    .description("Show status summary")
    .argument("<plan_file>", "Path to plan file")
    .argument("[target_id]", "Target ID")
    .action(async (planFile: string, targetId?: string) => {
      const input: PlanInput = {
        subcommand: "show_status",
        plan_file: planFile,
        target_id: targetId,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // plan query <plan_file> [target_id]
  planCmd
    .command("query")
    .description("Query plan JSON")
    .argument("<plan_file>", "Path to plan file")
    .argument("[target_id]", "Target ID")
    .action(async (planFile: string, targetId?: string) => {
      const input: PlanInput = {
        subcommand: "query",
        plan_file: planFile,
        target_id: targetId,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // plan upsert <plan_file> <target_id> '<json>'
  planCmd
    .command("upsert")
    .description("Upsert plan/phase/step")
    .argument("<plan_file>", "Path to plan file")
    .argument("<target_id>", "Target ID")
    .argument("<data>", "Patch JSON data")
    .option("--kind <kind>", "Item kind (phase|step)")
    .option("--phase_id <phase_id>", "Parent phase ID for new step")
    .action(
      async (
        planFile: string,
        targetId: string,
        data: string,
        opts: { kind?: string; phase_id?: string },
      ) => {
        const input: PlanInput = {
          subcommand: "upsert",
          plan_file: planFile,
          target_id: targetId,
          data,
          kind: opts.kind,
          phase_id: opts.phase_id,
        };
        const envelope = await dispatch(planToolDef, input);
        writeResult(planToolDef.name, envelope);
        process.exit(envelope.ok ? 0 : 1);
      },
    );

  // FR-PLAN-0030 — plan create-with-template <plan_file> <template> <plan-name> <plan-description> <phase-steps>
  planCmd
    .command("create-with-template")
    .description("Create a plan from a registered create-kind template")
    .argument("<plan_file>", "Path to plan file")
    .argument("<template>", "Template name from create-kind collection")
    .argument("<plan-name>", "Value for [plan-name] placeholder")
    .argument("<plan-description>", "Value for [plan-description] placeholder")
    // FR-PLAN-0043 — phase-steps array injection (not a placeholder); optional for backward compatibility (omitted → [])
    .argument("[phase-steps]", "JSON array of steps appended to the seeded ph-prep phase")
    .action(async (planFile: string, template: string, planName: string, planDescription: string, phaseSteps: string) => {
      const input: PlanInput = {
        subcommand: "create-with-template",
        plan_file: planFile,
        template,
        "plan-name": planName,
        "plan-description": planDescription,
        "phase-steps": phaseSteps,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // FR-PLAN-0031 — plan upsert-with-template <plan_file> <phase-id> <template> <phase-name> <phase-description> <phase-steps>
  planCmd
    .command("upsert-with-template")
    .description("Upsert a phase using a registered upsert-kind template")
    .argument("<plan_file>", "Path to plan file")
    .argument("<phase-id>", "Target phase ID and [phase-id] placeholder value")
    .argument("<template>", "Template name from upsert-kind collection")
    .argument("<phase-name>", "Value for [phase-name] placeholder")
    .argument("<phase-description>", "Value for [phase-description] placeholder")
    // FR-PLAN-0043 — phase-steps array injection (not a placeholder); optional for backward compatibility (omitted → [])
    .argument("[phase-steps]", "JSON array of steps appended to the seeded phase")
    .action(async (planFile: string, phaseId: string, template: string, phaseName: string, phaseDescription: string, phaseSteps: string) => {
      const input: PlanInput = {
        subcommand: "upsert-with-template",
        plan_file: planFile,
        "phase-id": phaseId,
        template,
        "phase-name": phaseName,
        "phase-description": phaseDescription,
        "phase-steps": phaseSteps,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // FR-PLAN-0032 — plan list-templates
  planCmd
    .command("list-templates")
    .description("List all registered templates grouped by kind")
    .action(async () => {
      const input: PlanInput = {
        subcommand: "list-templates",
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // Handle plan with no subcommand, --help, or unknown subcommand
  planCmd.action(async (opts: { help?: boolean }, cmd: { args: string[] }) => {
    if (opts.help) {
      const envelope = await dispatch(helpToolDef, { subcommand: "plan" });
      writeResult(helpToolDef.name, envelope);
      process.exit(0);
    } else if (cmd.args.length > 0) {
      // Unknown subcommand — pass to plan run delegate which returns structured error
      const input: PlanInput = { subcommand: cmd.args[0] };
      const envelope = await dispatch(planToolDef, input);
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    } else {
      // No subcommand -> plan help
      const envelope = await dispatch(planToolDef, {});
      writeResult(planToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    }
  });

  // ---------------------------------------------------------------------------------------
  // Specs command — data-driven table (SPECS §14). Every subcommand shares the same 4-step
  // action body (build input -> dispatch -> writeResult -> exit code); only the positional
  // shape and flags differ per row, captured declaratively below instead of 16 hand-written
  // action bodies.
  // ---------------------------------------------------------------------------------------

  interface SpecsSubRow {
    name: string;
    // The positional slot after <specs_file>, if any. "single" is one arg (required or
    // optional); "variadic" collects one-or-more into an array; "none" (info) takes no
    // further positional. Every row in SPECS §14 has at most one such slot.
    positional?: { name: string; required: boolean; variadic?: boolean; desc: string };
    flags?: Array<{ flag: string; desc: string }>;
    buildInput: (specsFile: string, rest: string[], opts: Record<string, unknown>) => SpecInput;
  }

  const SPECS_SUB_ROWS: SpecsSubRow[] = [
    {
      name: "add",
      positional: { name: "data", required: true, desc: "Spec JSON data (object or array)" },
      flags: [{ flag: "--system <name>", desc: "Required the first time this call would create the document" }],
      buildInput: (specsFile, rest, opts) => ({
        subcommand: "add",
        specs_file: specsFile,
        data: rest[0],
        system: opts["system"] as string | undefined,
      }),
    },
    {
      name: "get",
      positional: { name: "ids", required: true, variadic: true, desc: "Spec ids" },
      buildInput: (specsFile, rest) => ({ subcommand: "get", specs_file: specsFile, ids: rest }),
    },
    {
      name: "query",
      positional: { name: "query", required: false, desc: "Filter query string" },
      flags: [{ flag: "--include-removed", desc: "Include Removed specs" }],
      buildInput: (specsFile, rest, opts) => ({
        subcommand: "query",
        specs_file: specsFile,
        query: rest[0],
        include_removed: !!opts["includeRemoved"],
      }),
    },
    {
      name: "update",
      positional: { name: "data", required: true, desc: "Patch JSON data (object or array)" },
      buildInput: (specsFile, rest) => ({ subcommand: "update", specs_file: specsFile, data: rest[0] }),
    },
    {
      name: "delete",
      positional: { name: "ids", required: true, variadic: true, desc: "Spec ids" },
      buildInput: (specsFile, rest) => ({ subcommand: "delete", specs_file: specsFile, ids: rest }),
    },
    {
      name: "purge",
      positional: { name: "ids", required: true, variadic: true, desc: "Spec ids" },
      flags: [{ flag: "--force", desc: "Required — permanent removal refuses without it" }],
      buildInput: (specsFile, rest, opts) => ({
        subcommand: "purge",
        specs_file: specsFile,
        ids: rest,
        force: !!opts["force"],
      }),
    },
    {
      name: "implemented",
      positional: { name: "data", required: true, desc: "Implemented-item JSON data (object or array)" },
      buildInput: (specsFile, rest) => ({ subcommand: "implemented", specs_file: specsFile, data: rest[0] }),
    },
    {
      name: "approve",
      positional: { name: "ids", required: true, variadic: true, desc: "Spec ids" },
      buildInput: (specsFile, rest) => ({ subcommand: "approve", specs_file: specsFile, ids: rest }),
    },
    {
      name: "deprecate",
      positional: { name: "ids", required: true, variadic: true, desc: "Spec ids" },
      buildInput: (specsFile, rest) => ({ subcommand: "deprecate", specs_file: specsFile, ids: rest }),
    },
    {
      name: "restore",
      positional: { name: "ids", required: true, variadic: true, desc: "Spec ids" },
      buildInput: (specsFile, rest) => ({ subcommand: "restore", specs_file: specsFile, ids: rest }),
    },
    {
      name: "reopen",
      positional: { name: "ids", required: true, variadic: true, desc: "Spec ids" },
      buildInput: (specsFile, rest) => ({ subcommand: "reopen", specs_file: specsFile, ids: rest }),
    },
    {
      name: "validate",
      positional: { name: "query", required: false, desc: "Optional scope filter" },
      buildInput: (specsFile, rest) => ({ subcommand: "validate", specs_file: specsFile, query: rest[0] }),
    },
    {
      name: "graph",
      positional: { name: "target_id", required: false, desc: "Optional single target spec id" },
      flags: [{ flag: "--additional-paths <paths>", desc: "Comma-separated other specs document paths" }],
      buildInput: (specsFile, rest, opts) => ({
        subcommand: "graph",
        specs_file: specsFile,
        ids: rest[0] !== undefined ? [rest[0]] : undefined,
        additional_paths:
          typeof opts["additionalPaths"] === "string" ? (opts["additionalPaths"] as string).split(",") : undefined,
      }),
    },
    {
      name: "render",
      positional: { name: "query", required: false, desc: "Optional scope filter" },
      flags: [{ flag: "--format <fmt>", desc: "markdown (default), text, or xml markup" }],
      buildInput: (specsFile, rest, opts) => ({
        subcommand: "render",
        specs_file: specsFile,
        query: rest[0],
        format: opts["format"] as string | undefined,
      }),
    },
    {
      name: "info",
      buildInput: (specsFile) => ({ subcommand: "info", specs_file: specsFile }),
    },
    {
      name: "migrate",
      positional: { name: "sources", required: true, variadic: true, desc: "Legacy markdown source paths" },
      flags: [{ flag: "--system <name>", desc: "Required the first time this call would create the destination document" }],
      buildInput: (specsFile, rest, opts) => ({
        subcommand: "migrate",
        specs_file: specsFile,
        sources: rest,
        system: opts["system"] as string | undefined,
      }),
    },
  ];

  // Uniform action body: build input -> dispatch(specsToolDef) -> writeResult -> exit code.
  function registerSpecsSub(parent: Command, row: SpecsSubRow): void {
    const cmd = parent.command(row.name).description(`specs ${row.name}`);
    cmd.argument("<specs_file>", "Path to the specs document JSON file");
    if (row.positional) {
      const { name, required, variadic } = row.positional;
      const inner = variadic ? `${name}...` : name;
      const argStr = required ? `<${inner}>` : `[${inner}]`;
      cmd.argument(argStr, row.positional.desc);
    }
    // FR-SPECS-0012 negation syntax (`-status:Removed`) starts with a bare `-`, which commander
    // otherwise mistakes for an unrecognized option flag. query/validate/render all take a
    // free-form query-string positional, so allow it through unparsed as a positional argument
    // instead of requiring a `--` separator — FR-ARCH-0002 (CLI behavior must match MCP, which
    // has no such option-parsing ambiguity at all). Every declared flag below (--force,
    // --additional-paths, --format, etc.) is still recognized and parsed normally; only tokens
    // that match none of a subcommand's own options fall through as positionals.
    if (row.name === "query" || row.name === "validate" || row.name === "render") {
      cmd.allowUnknownOption();
    }
    for (const f of row.flags ?? []) {
      cmd.option(f.flag, f.desc);
    }
    cmd.action(async (...args: unknown[]) => {
      // Commander calls the action with one parameter per declared <argument>, in order,
      // followed by the parsed options object, then the Command instance itself.
      const specsFile = args[0] as string;
      const opts = (args[args.length - 2] ?? {}) as Record<string, unknown>;
      const rest: string[] = row.positional
        ? row.positional.variadic
          ? ((args[1] as string[] | undefined) ?? [])
          : args[1] !== undefined
            ? [args[1] as string]
            : []
        : [];
      const input = row.buildInput(specsFile, rest, opts);
      const envelope = await dispatch(specsToolDef, input);
      writeResult(specsToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    });
  }

  const specsCmd = program
    .command("specs")
    .description("Manage requirements/specs")
    .helpOption(false)
    .allowExcessArguments(true)
    .option("--help", "Show specs help");

  for (const row of SPECS_SUB_ROWS) {
    registerSpecsSub(specsCmd, row);
  }

  // Handle specs with no subcommand, --help, or unknown subcommand (mirrors plan's fallthrough)
  specsCmd.action(async (opts: { help?: boolean }, cmd: { args: string[] }) => {
    if (opts.help) {
      const envelope = await dispatch(helpToolDef, { subcommand: "specs" });
      writeResult(helpToolDef.name, envelope);
      process.exit(0);
    } else if (cmd.args.length > 0) {
      // Unknown subcommand — pass to specs run delegate, which returns a structured error
      const input: SpecInput = { subcommand: cmd.args[0] };
      const envelope = await dispatch(specsToolDef, input);
      writeResult(specsToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    } else {
      // No subcommand -> specs help
      const envelope = await dispatch(specsToolDef, {});
      writeResult(specsToolDef.name, envelope);
      process.exit(envelope.ok ? 0 : 1);
    }
  });

  // Help command
  program
    .command("help")
    .description("Show help")
    .argument("[subcommand]", "Command to get help for")
    .action(async (subcommand?: string) => {
      const envelope = await dispatch(helpToolDef, { subcommand });
      writeResult(helpToolDef.name, envelope);
      process.exit(0);
    });

  // Check for root-level --help before parsing
  if (args.includes("--help") && !args.some((a) => a !== "--help" && !a.startsWith("-"))) {
    const envelope = await dispatch(helpToolDef, {});
    writeResult(helpToolDef.name, envelope);
    process.exit(0);
  }

  // Check if 'plan --help' is in args
  const planHelpIdx = args.indexOf("plan");
  if (
    planHelpIdx >= 0 &&
    args.includes("--help") &&
    !args.slice(planHelpIdx + 1).some(
      (a) => !a.startsWith("-") && a !== "--help",
    )
  ) {
    const envelope = await dispatch(helpToolDef, { subcommand: "plan" });
    writeResult(helpToolDef.name, envelope);
    process.exit(0);
  }

  // Check if 'specs --help' is in args
  const specsHelpIdx = args.indexOf("specs");
  if (
    specsHelpIdx >= 0 &&
    args.includes("--help") &&
    !args.slice(specsHelpIdx + 1).some(
      (a) => !a.startsWith("-") && a !== "--help",
    )
  ) {
    const envelope = await dispatch(helpToolDef, { subcommand: "specs" });
    writeResult(helpToolDef.name, envelope);
    process.exit(0);
  }

  // Print list of registered tools for reference (unused — just ensures registry import)
  void registry;

  try {
    await program.parseAsync(["node", "rosettify", ...args]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(
      JSON.stringify({ error: msg }) + "\n",
    );
    process.exit(1);
  }
}
