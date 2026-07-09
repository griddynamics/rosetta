#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { loadConfig } from './config.js';
import { createAnthropicClient, createOptimizeClient } from './anthropic-client.js';
import { runBenchSuite } from './runner.js';
import { buildReport, writeReportFiles } from './report.js';
import { OPTIMIZE_PHASES, runPromptOptimization } from './optimize.js';
import type { ThinkingEffort } from './types.js';

const program = new Command();

program
  .name('rosettify-prompts')
  .description('Bench/eval prompt variants using Anthropic: tokens, thinking tokens, cost, latency, stability');

const DEFAULT_EVALS_PATH = path.join(process.cwd(), 'evals.json');

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('value must be a positive integer');
  }
  return parsed;
}

function collectPath(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function collectValue(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

const THINKING_EFFORTS: ThinkingEffort[] = ['low', 'medium', 'high', 'xhigh', 'max'];

function parseEffort(value: string): ThinkingEffort {
  if (!(THINKING_EFFORTS as string[]).includes(value)) {
    throw new Error(`--effort must be one of: ${THINKING_EFFORTS.join(', ')}`);
  }
  return value as ThinkingEffort;
}

function fmtStat(value: number | null | undefined, digits = 0): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return digits > 0 ? value.toFixed(digits) : String(value);
}

program
  .command('bench', { isDefault: true })
  .description('Run all suites in the config and write a report')
  .option('-e, --evals <path>', 'path to evals.json', DEFAULT_EVALS_PATH)
  .option('-o, --out <dir>', 'output directory for the report (default: results/<timestamp>)')
  .option('--concurrency <n>', 'override concurrency from config', parsePositiveInteger)
  .option('--dry-run', 'validate config and print the planned jobs without calling the API', false)
  .action(async (opts: { evals: string; out?: string; concurrency?: number; dryRun: boolean }) => {
    const config = loadConfig(opts.evals);
    if (opts.concurrency !== undefined) config.concurrency = opts.concurrency;

    const totalJobs = config.suites.reduce(
      (acc, s) => acc + s.variants.length * (s.repetitions ?? config.repetitions),
      0,
    );

    if (opts.dryRun) {
      console.log(`Config OK: ${config.suites.length} suite(s), ${totalJobs} job(s) planned.`);
      for (const suite of config.suites) {
        const reps = suite.repetitions ?? config.repetitions;
        console.log(`- ${suite.id}: ${suite.variants.map((v) => v.id).join(', ')} x${reps} reps`);
      }
      return;
    }

    const client = createAnthropicClient();
    console.log(`Running ${totalJobs} job(s) with concurrency=${config.concurrency}...`);

    const runs = await runBenchSuite(client, config, (done, total, result) => {
      const status = result.error ? `ERROR: ${result.error}` : 'ok';
      console.log(
        `[${done}/${total}] ${result.suiteId}/${result.variantId}#${result.repetition} — ${status}`,
      );
    });

    const report = buildReport(config, runs);
    const outDir =
      opts.out ?? path.join(process.cwd(), 'results', new Date().toISOString().replace(/[:.]/g, '-'));
    const { jsonPath, markdownPath } = writeReportFiles(report, outDir);

    console.log('');
    console.log(`Report written to:\n  ${jsonPath}\n  ${markdownPath}`);
  });

program
  .command('validate')
  .description('Validate an evals.json config without running anything')
  .argument('[path]', 'path to evals.json', DEFAULT_EVALS_PATH)
  .action((configPath: string) => {
    loadConfig(configPath);
    console.log(`${configPath} is valid.`);
  });

program
  .command('optimize')
  .description('Optimize prompt/skill files through a 3-phase loss-reviewed rewrite pipeline')
  .requiredOption('--target <file>', 'target file to optimize; may be repeated', collectPath, [])
  .option('--supporting <file>', 'supporting context file; may be repeated', collectPath, [])
  .option('--additional <text>', 'additional optimization goal; may be repeated', collectPath, [])
  .requiredOption('--out <dir>', 'output directory for optimized target files, trace.json, and report.md')
  .requiredOption('--model <id>', 'model id to use for optimization')
  .option('--max-output-tokens <n>', 'maximum output tokens per optimizer call', parsePositiveInteger, 32000)
  .option('--effort <level>', 'adaptive-thinking effort: low|medium|high|xhigh|max (default: API default, high)', parseEffort)
  .option('--phase-limit <n>', 'run only the first N phases, then final audit', parsePositiveInteger)
  .option('--anthropic-beta <name>', 'Anthropic beta header for optimize calls; may be repeated', collectValue, [])
  .option('--no-default-anthropic-beta', 'do not include optimize default Anthropic beta headers')
  .option('--trace-full-prompts', 'store full prompt bodies in trace.json (default stores hashes/metadata)', false)
  .option('--trace-raw', 'append raw optimizer request/response JSONL to raw-calls.jsonl under --out', false)
  .option('--dry-run', 'print the stage plan without calling the API or writing files', false)
  .action(
    async (opts: {
      target: string[];
      supporting: string[];
      additional: string[];
      out: string;
      model: string;
      maxOutputTokens: number;
      effort?: ThinkingEffort;
      phaseLimit?: number;
      anthropicBeta: string[];
      defaultAnthropicBeta: boolean;
      traceFullPrompts: boolean;
      traceRaw: boolean;
      dryRun: boolean;
    }) => {
      if (!opts.target.length) {
        throw new Error('At least one --target file is required');
      }
      const phaseLimit = opts.phaseLimit ?? OPTIMIZE_PHASES.length;
      const defaultBetas = opts.defaultAnthropicBeta ? ['thinking-token-count-2026-05-13'] : [];
      const anthropicBetas = [...defaultBetas, ...opts.anthropicBeta];
      if (opts.dryRun) {
        await runPromptOptimization(
          { messages: { async create() {
            throw new Error('dry-run must not call the optimizer API');
          } } },
          {
            targetPaths: opts.target,
            outDir: opts.out,
            model: opts.model,
            maxOutputTokens: opts.maxOutputTokens,
            effort: opts.effort,
            phaseLimit,
            anthropicBetas,
            supportingPaths: opts.supporting,
            additional: opts.additional,
            traceFullPrompts: opts.traceFullPrompts,
            traceRaw: opts.traceRaw,
            dryRun: true,
          },
        );
        console.log(`Optimize plan OK: ${phaseLimit}/${OPTIMIZE_PHASES.length} phase(s) + final audit.`);
        console.log(`Targets: ${opts.target.map((targetPath) => path.resolve(targetPath)).join(', ')}`);
        console.log(
          `Supporting: ${opts.supporting.length > 0 ? opts.supporting.map((supportingPath) => path.resolve(supportingPath)).join(', ') : '(none)'}`,
        );
        console.log(
          `Additional goals: ${opts.additional.length > 0 ? opts.additional.join(' | ') : '(none)'}`,
        );
        console.log(`Out: ${path.resolve(opts.out)}`);
        console.log(`Model: ${opts.model}`);
        console.log(`Max output tokens: ${opts.maxOutputTokens}`);
        console.log(`Effort: ${opts.effort ?? '(default: high)'}`);
        console.log(`Phase limit: ${phaseLimit}`);
        console.log(`Anthropic betas: ${anthropicBetas.length > 0 ? anthropicBetas.join(', ') : '(none)'}`);
        console.log(`Raw trace: ${opts.traceRaw ? path.join(path.resolve(opts.out), 'raw-calls.jsonl') : '(disabled)'}`);
        for (const phase of OPTIMIZE_PHASES.slice(0, phaseLimit)) {
          console.log(`- ${phase.label} (${phase.id})`);
          for (const step of phase.steps) console.log(`  - ${step}`);
          console.log('  - phase loss reviewer/fixer');
        }
        console.log('- Final global preservation audit/fix');
        return;
      }

      const client = createOptimizeClient(createAnthropicClient());
      const total = phaseLimit;
      const result = await runPromptOptimization(
        client,
        {
          targetPaths: opts.target,
          outDir: opts.out,
          model: opts.model,
          maxOutputTokens: opts.maxOutputTokens,
          effort: opts.effort,
          phaseLimit,
          anthropicBetas,
          supportingPaths: opts.supporting,
          additional: opts.additional,
          traceFullPrompts: opts.traceFullPrompts,
          traceRaw: opts.traceRaw,
        },
        (event) => {
          if (event.type === 'call') {
            const usage = event.callStats.response.usage;
            const request = event.callStats.request;
            const phasePrefix = event.phaseLabel ? `${event.phaseLabel} / ` : '';
            const phaseOrdinal = event.phase ? `${event.donePhases + 1}/${event.totalPhases}` : 'final';
            console.log(
              `[phase ${phaseOrdinal} call] ${phasePrefix}${event.step} — ` +
              `dur=${event.callStats.durationMs}ms stop=${event.callStats.stopReason ?? 'n/a'} ` +
              `sys=${request.system?.words ?? 0}w/${request.system?.chars ?? 0}c/${request.system?.blocks ?? 0}b/cacheB${request.system?.cacheableBlocks ?? 0} ` +
              `msgs=${request.messages.count}(u${request.messages.userCount}/a${request.messages.assistantCount})/${request.messages.words}w/${request.messages.chars}c/cacheB${request.messages.cacheableBlocks} ` +
              `append=+${request.appendedMessages.count}/${request.appendedMessages.words}w/${request.appendedMessages.chars}c/cacheB${request.appendedMessages.cacheableBlocks} ` +
              `resp=${event.callStats.response.words}w/${event.callStats.response.chars}c ` +
              `tok=in${fmtStat(usage.inputTokens)} out${fmtStat(usage.outputTokens)} cacheCreate${fmtStat(usage.cacheCreationInputTokens)} cacheRead${fmtStat(usage.cacheReadInputTokens)} cached${fmtStat(usage.cachedInputTokens)} reason${fmtStat(usage.reasoningTokens)} ` +
              `cost=$${fmtStat(usage.standardCostUsd, 6)}`,
            );
            return;
          }
          console.log(
            `[${event.donePhases}/${event.totalPhases}] ${event.phase.label} — before ${event.phase.beforeLength.words}w -> after ${event.phase.afterLength.words}w — ${event.phase.durationMs}ms`,
          );
        },
      );

      console.log('');
      console.log(
        `Optimization written to:\n  ${(result.files?.optimizedPaths ?? []).join('\n  ')}\n  ${result.files?.tracePath}\n  ${result.files?.reportPath}${result.files?.rawTracePath ? `\n  ${result.files.rawTracePath}` : ''}`,
      );
    },
  );

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
