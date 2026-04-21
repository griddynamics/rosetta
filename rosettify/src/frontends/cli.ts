import { Command } from "commander";
import { registry } from "../registry/index.js";
import { dispatch } from "../shared/dispatch.js";
import { planToolDef } from "../commands/plan/index.js";
import { helpToolDef } from "../commands/help/index.js";
import type { PlanInput } from "../commands/plan/core.js";
import type { EnrichedEnvelope } from "../registry/types.js";

function writeResult(envelope: EnrichedEnvelope<unknown>): void {
  process.stdout.write(JSON.stringify(envelope, null, 2) + "\n");
}

export async function runCli(args: string[]): Promise<void> {
  // Check for --mcp before commander processes
  if (args.includes("--mcp")) {
    process.stderr.write(
      JSON.stringify({
        ok: false,
        error: "--mcp is mutually exclusive with commands",
        result: null,
        include_help: false,
      }) + "\n",
    );
    process.exit(1);
  }

  const program = new Command("rosettify");
  program.version("0.1.0");

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
      writeResult(envelope);
      process.exit(envelope.ok ? 0 : 1);
    });

  // plan next <plan_file> [limit] [--target <id>]
  planCmd
    .command("next")
    .description("Get next steps")
    .argument("<plan_file>", "Path to plan file")
    .argument("[limit]", "Max steps to return", "10")
    .option("--target <id>", "Scope to phase")
    .action(async (planFile: string, limitStr: string, opts: { target?: string }) => {
      const input: PlanInput = {
        subcommand: "next",
        plan_file: planFile,
        limit: parseInt(limitStr, 10),
        target_id: opts.target,
      };
      const envelope = await dispatch(planToolDef, input);
      writeResult(envelope);
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
      writeResult(envelope);
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
      writeResult(envelope);
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
      writeResult(envelope);
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
        writeResult(envelope);
        process.exit(envelope.ok ? 0 : 1);
      },
    );

  // Handle plan with no subcommand, --help, or unknown subcommand
  planCmd.action(async (opts: { help?: boolean }, cmd: { args: string[] }) => {
    if (opts.help) {
      const envelope = await dispatch(helpToolDef, { subcommand: "plan" });
      writeResult(envelope);
      process.exit(0);
    } else if (cmd.args.length > 0) {
      // Unknown subcommand — pass to plan run delegate which returns structured error
      const input: PlanInput = { subcommand: cmd.args[0] };
      const envelope = await dispatch(planToolDef, input);
      writeResult(envelope);
      process.exit(envelope.ok ? 0 : 1);
    } else {
      // No subcommand -> plan help
      const envelope = await dispatch(planToolDef, {});
      writeResult(envelope);
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
      writeResult(envelope);
      process.exit(0);
    });

  // Check for root-level --help before parsing
  if (args.includes("--help") && !args.some((a) => a !== "--help" && !a.startsWith("-"))) {
    const envelope = await dispatch(helpToolDef, {});
    writeResult(envelope);
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
    writeResult(envelope);
    process.exit(0);
  }

  // Print list of registered tools for reference (unused — just ensures registry import)
  void registry;

  try {
    await program.parseAsync(["node", "rosettify", ...args]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(
      JSON.stringify({
        ok: false,
        error: msg,
        result: null,
        include_help: false,
      }) + "\n",
    );
    process.exit(1);
  }
}
