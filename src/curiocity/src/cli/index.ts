#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import { CuriocityError } from '../shared/errors';
import { ExitCode } from './exit-codes';
import { runValidate } from './commands/validate';
import { runRun, type RunOptions } from './commands/run';
import { runReport, type ReportOptions } from './commands/report';

/**
 * The only module that reads argv (§3). Commands: run, report, validate (§13).
 */

function collect(value: string, previous: string[] = []): string[] {
  return previous.concat([value]);
}

function parsePositiveInt(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new InvalidArgumentError('must be a positive integer');
  }
  return n;
}

function finish(code: number): never {
  process.exitCode = code;
  // Return via exitCode so buffered stdout/stderr flush; do not hard-exit.
  process.exit(code);
}

function handleError(err: unknown): never {
  if (err instanceof CuriocityError) {
    process.stderr.write(`error: ${err.message}\n`);
  } else {
    process.stderr.write(`error: ${(err as Error).message ?? String(err)}\n`);
  }
  return finish(ExitCode.CONFIG_ERROR);
}

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('curiocity')
    .description('Evals/testing harness for interactive coding-agent CLIs.')
    .showHelpAfterError();

  program
    .command('validate')
    .description('Discovery dry-run: list valid cases + skip reasons; P10 preflight.')
    .requiredOption('--source <dir>', 'case source folder (each immediate subfolder is one case)')
    .option('--config <file>', 'top-level config path (for agent-profile resolution)')
    .action((opts: { source: string; config?: string }) => {
      try {
        finish(runValidate(opts));
      } catch (err) {
        handleError(err);
      }
    });

  program
    .command('run')
    .description('Run a suite (--source) or an inline case (--prompt).')
    .option('--source <dir>', 'case source folder (suite mode)')
    .option('--prompt <file|text>', 'inline task prompt (inline mode)')
    .option('--qna <file|text>', 'inline QnA policy')
    .option('--eval <file>', 'inline judge rubric')
    .option('--src <zip|dir>', 'inline workspace source')
    .option('--agent <id>', 'limit to agent id (repeatable)', collect, [])
    .option('--case <glob>', 'limit to case name glob (repeatable)', collect, [])
    .option('--repeats <n>', 'override repeats per case', parsePositiveInt)
    .option('--concurrency <n>', 'bounded pool size', parsePositiveInt)
    .option('--timeout <sec>', 'per-trial wall-clock cap', parsePositiveInt)
    .option('--config <file>', 'top-level config path')
    .option('--out <dir>', 'results output dir')
    .option('--evaluate', 'enable evaluation')
    .option('--no-evaluate', 'disable evaluation')
    .option('--collect-cost', 'enable cost collection')
    .option('--no-collect-cost', 'disable cost collection')
    .option('--dry-run', 'print resolved matrix + config, run nothing')
    .option('--keep-workspace', 'keep all workspaces')
    .option('--mirror', 'stream PTY output live')
    .option('--only-evaluator <id>', 'narrow eval pipeline (repeatable)', collect, [])
    .option('--skip-evaluator <id>', 'skip evaluator (repeatable)', collect, [])
    .option('--fast-model <provider/model>', 'override fast tier')
    .option('--workhorse-model <provider/model>', 'override workhorse tier')
    .option('--judge-model <provider/model>', 'override judge tier')
    .option('--agent-model <agentId=model>', 'agent CLI model per agent id (repeatable)', collect, [])
    .option('--agent-effort <agentId=effort>', 'agent CLI reasoning effort per agent id (repeatable)', collect, [])
    .action(async (opts: RunOptions, cmd: Command) => {
      try {
        // Tri-state --evaluate / --collect-cost: only honour when set on the CLI,
        // so the D9 mode default (suite ON / inline OFF) applies otherwise.
        const evaluate =
          cmd.getOptionValueSource('evaluate') === 'cli' ? opts.evaluate : undefined;
        const collectCost =
          cmd.getOptionValueSource('collectCost') === 'cli' ? opts.collectCost : undefined;
        finish(await runRun({ ...opts, evaluate, collectCost }));
      } catch (err) {
        handleError(err);
      }
    });

  program
    .command('report')
    .description('Recompute stats + reporters + gate from a stored run dir.')
    .argument('<resultsDir>', 'a timestamped run dir')
    .option('--reporter <list>', 'comma-separated reporter ids', 'json,markdown')
    .option('--config <file>', 'reload gate thresholds / pricing for retroactive re-gating')
    .action((resultsDir: string, opts: ReportOptions) => {
      try {
        finish(runReport(resultsDir, opts));
      } catch (err) {
        handleError(err);
      }
    });

  return program;
}

buildProgram().parseAsync(process.argv).catch(handleError);
