#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { loadConfig } from './config.js';
import { createAnthropicClient } from './anthropic-client.js';
import { runBenchSuite } from './runner.js';
import { buildReport, writeReportFiles } from './report.js';

const program = new Command();

program
  .name('rosettify-prompts')
  .description('Bench/eval prompt variants using Anthropic: tokens, thinking tokens, cost, latency, stability');

const DEFAULT_EVALS_PATH = path.join(process.cwd(), 'evals.json');

program
  .command('bench', { isDefault: true })
  .description('Run all suites in the config and write a report')
  .option('-e, --evals <path>', 'path to evals.json', DEFAULT_EVALS_PATH)
  .option('-o, --out <dir>', 'output directory for the report (default: results/<timestamp>)')
  .option('--concurrency <n>', 'override concurrency from config', (v) => parseInt(v, 10))
  .option('--dry-run', 'validate config and print the planned jobs without calling the API', false)
  .action(async (opts: { evals: string; out?: string; concurrency?: number; dryRun: boolean }) => {
    const config = loadConfig(opts.evals);
    if (opts.concurrency) config.concurrency = opts.concurrency;

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

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
