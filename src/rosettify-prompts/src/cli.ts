#!/usr/bin/env node
import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadConfig } from './config.js';
import { createAnthropicClient, createOptimizeClient, type StreamingAnthropicClient } from './anthropic-client.js';
import { runBenchSuite } from './runner.js';
import { buildReport, writeReportFiles } from './report.js';
import { OPTIMIZE_STEPS, runPromptOptimization } from './optimize.js';
import type { JudgeMode, SupportingFile, ThinkingEffort } from './types.js';

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

function parseJudgeMode(value: string): JudgeMode {
  if (value !== 'combined' && value !== 'individual') {
    throw new Error('--judge-mode must be "combined" or "individual"');
  }
  return value;
}

function readSupportingFiles(paths: string[]): SupportingFile[] {
  return paths.map((supportingPath) => {
    const absolute = path.resolve(supportingPath);
    try {
      return { path: absolute, content: readFileSync(absolute, 'utf-8') };
    } catch (err) {
      throw new Error(`Could not read --supporting file "${supportingPath}": ${(err as Error).message}`);
    }
  });
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
  .option('--additional <text>', 'extra context appended to every variant system prompt; may be repeated', collectValue, [])
  .option('--supporting <file>', 'supporting file injected (context-only) into every variant system prompt; may be repeated', collectPath, [])
  .option('--judge-mode <mode>', 'eval judge mode: combined|individual (overrides config/suite; default combined)', parseJudgeMode)
  .option('--dry-run', 'validate config and print the planned jobs without calling the API', false)
  .action(async (opts: {
    evals: string;
    out?: string;
    concurrency?: number;
    additional: string[];
    supporting: string[];
    judgeMode?: JudgeMode;
    dryRun: boolean;
  }) => {
    const config = loadConfig(opts.evals);
    if (opts.concurrency !== undefined) config.concurrency = opts.concurrency;

    // Merge run-wide CLI context over config: additional text appends, supporting files append
    // (CLI paths resolved relative to cwd), and --judge-mode is a hard global override.
    config.additional = [...(config.additional ?? []), ...opts.additional];
    config.supportingFiles = [...(config.supportingFiles ?? []), ...readSupportingFiles(opts.supporting)];
    if (opts.judgeMode) config.judgeModeOverride = opts.judgeMode;

    const totalJobs = config.suites.reduce(
      (acc, s) => acc + s.variants.length * (s.repetitions ?? config.repetitions),
      0,
    );

    if (opts.dryRun) {
      console.log(`Config OK: ${config.suites.length} suite(s), ${totalJobs} job(s) planned.`);
      console.log(
        `Judge mode: ${config.judgeModeOverride ?? config.judgeMode ?? 'combined'}${config.judgeModeOverride ? ' (CLI override)' : ' (suites may override per eval.mode)'}`,
      );
      console.log(`Additional context blocks: ${config.additional.length}`);
      console.log(
        `Supporting files: ${config.supportingFiles.length > 0 ? config.supportingFiles.map((f) => f.path).join(', ') : '(none)'}`,
      );
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
  .description('Optimize prompt/skill files through a single-session loss-reviewed rewrite pipeline')
  .requiredOption('--target <file>', 'target file to optimize; may be repeated', collectPath, [])
  .option('--supporting <file>', 'supporting context file; may be repeated', collectPath, [])
  .option('--additional <text>', 'additional optimization goal; may be repeated', collectPath, [])
  .requiredOption('--out <dir>', 'output directory for optimized target files, trace.json, and report.md')
  .requiredOption('--model <id>', 'model id to use for optimization')
  .option('--max-output-tokens <n>', 'maximum output tokens per optimizer call', parsePositiveInteger, 32000)
  .option('--effort <level>', 'adaptive-thinking effort: low|medium|high|xhigh|max (default: high)', parseEffort)
  .option('--step-limit <n>', 'run only the first N content steps, then finalize + final value-lost + serialize', parsePositiveInteger)
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
      stepLimit?: number;
      anthropicBeta: string[];
      defaultAnthropicBeta: boolean;
      traceFullPrompts: boolean;
      traceRaw: boolean;
      dryRun: boolean;
    }) => {
      if (!opts.target.length) {
        throw new Error('At least one --target file is required');
      }
      const stepLimit = opts.stepLimit ?? OPTIMIZE_STEPS.length;
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
            stepLimit,
            anthropicBetas,
            supportingPaths: opts.supporting,
            additional: opts.additional,
            traceFullPrompts: opts.traceFullPrompts,
            traceRaw: opts.traceRaw,
            dryRun: true,
          },
        );
        console.log(`Optimize plan OK: ${stepLimit}/${OPTIMIZE_STEPS.length} step(s), one conversation.`);
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
        console.log(`Effort: ${opts.effort ?? 'high'}`);
        console.log(`Step limit: ${stepLimit}`);
        console.log('Thinking: adaptive (display: summarized), replayed across the single session');
        console.log(`Anthropic betas: ${anthropicBetas.length > 0 ? anthropicBetas.join(', ') : '(none)'}`);
        console.log(`Raw trace: ${opts.traceRaw ? path.join(path.resolve(opts.out), 'raw-calls.jsonl') : '(disabled)'}`);
        console.log('Pipeline (one conversation):');
        console.log('- SESSION SETUP (cached: run setup + original target files)');
        OPTIMIZE_STEPS.slice(0, stepLimit).forEach((step, index) => {
          console.log(`- ${index + 1}. ${step.label} (${step.id})`);
          if (index === 2) console.log('- VALUE-LOST #1 (mid review)');
        });
        console.log('- FINALIZE-DRAFT');
        console.log('- VALUE-LOST #2 (final)');
        console.log('- SERIALIZE (write files)');
        return;
      }

      // The optimize content type carries opaque passthrough (thinking) blocks that are looser than
      // the SDK's strict ContentBlockParam union; bridge the concrete client through the adapter.
      const client = createOptimizeClient(createAnthropicClient() as unknown as StreamingAnthropicClient);
      const result = await runPromptOptimization(
        client,
        {
          targetPaths: opts.target,
          outDir: opts.out,
          model: opts.model,
          maxOutputTokens: opts.maxOutputTokens,
          effort: opts.effort,
          stepLimit,
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
            const stepOrdinal =
              event.step === 'finalize-draft' || event.step === 'final-value-lost' || event.step === 'value-lost-mid'
                ? event.step
                : `step ${event.doneSteps + 1}/${event.totalSteps}`;
            console.log(
              `[${stepOrdinal}] ${event.step} — ` +
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
            `[${event.doneSteps}/${event.totalSteps} steps] ${event.phase.label} — before ${event.phase.beforeLength.words}w -> after ${event.phase.afterLength.words}w — ${event.phase.durationMs}ms`,
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
