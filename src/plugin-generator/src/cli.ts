#!/usr/bin/env node
// FR-CLI-0001–0060 — commander wiring, flag parsing, exit-status aggregation
// FR-CLI-0020: --source (default: cwd) + per-source overrides (--instructionsSource, --pluginsSource, --hooksSource)

import { Command } from 'commander';
import path from 'path';
import { fileURLToPath } from 'url';
import { initLogger } from './logging.js';
import { generate } from './generate.js';
import type { GenerateOptions, ResolvedSources } from './types.js';

const program = new Command();

program
  .name('rosetta-plugin-gen')
  .description('Generate Rosetta IDE plugins from instruction sources')
  .version('1.0.0')
  .option('--release <r>', 'Release name (e.g. r2, r3)', 'r2')
  .option('--domain <list>', 'Comma-separated domain list (e.g. core)', 'core')
  .option('--source <dir>', 'Source root directory (default: current directory)', process.cwd())
  .option('--instructionsSource <dir>', 'Override instruction source directory (default: <source>/instructions)')
  .option('--pluginsSource <dir>', 'Override preserved-files source directory (default: <source>/src/plugin-generator/plugins)')
  .option('--hooksSource <dir>', 'Override hooks source directory (default: <source>/hooks)')
  .option('--output <dir>', 'Output directory (default: <source>/plugins)')
  .option('--dry-run', 'Print what would be written, but do not write', false)
  .option('--verbose', 'Enable verbose logging', false);

program.addHelpText('after', `
Source model (FR-CLI-0020):
  --source sets the global source root; all input/output locations are derived from it.
  Individual overrides replace the corresponding <source>/... default:
    --instructionsSource  <source>/instructions
    --pluginsSource       <source>/src/plugin-generator/plugins
    --hooksSource         <source>/hooks
    --output              <source>/plugins

Source structure:
  <instructionsSource>/<release>/<domain>/{rules,workflows,agents,skills,configure,templates}/

Directives (in filenames, tilde-separated):
  file~overwrite.md   — overwrite earlier layers
  file~core-only.md   — include only for core domain

Processor catalog:
  fileRead, fileApplyOverrides, fileBundle,
  fileNormalizeClaudeModels, fileNormalizeCursorModels, fileNormalizeCopilotModels, fileNormalizeCodexModels,
  fileRename, fileCodexAgentFormat
  pluginCleanup, pluginCopy, pluginProcessSpecEntries, pluginRewriteReferences,
  pluginGenerateIndexes, pluginInjectSections,
  pluginAssembleClaudeBootstrap, pluginAssembleCursorBootstrap, pluginAssembleCopilotBootstrap, pluginAssembleCodexBootstrap,
  pluginRenderTemplates, pluginSyncBundles, pluginWrite

Spec model:
  Each target is a PluginSpec with specEntries, pluginProcessors, etc.
  See src/spec/targets.ts for the six built-in targets.
`);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const sourceRoot = opts.source as string;
  const verbose = opts.verbose as boolean;
  const dryRun = opts.dryRun as boolean;

  // FR-CLI-0020: derive each source from <source> unless individually overridden
  const sources: ResolvedSources = {
    instructionsSource: (opts.instructionsSource as string | undefined) ?? path.join(sourceRoot, 'instructions'),
    pluginsSource: (opts.pluginsSource as string | undefined) ?? path.join(sourceRoot, 'src', 'plugin-generator', 'plugins'),
    hooksSource: (opts.hooksSource as string | undefined) ?? path.join(sourceRoot, 'hooks'),
    outputDir: (opts.output as string | undefined) ?? path.join(sourceRoot, 'plugins'),
  };

  initLogger(verbose);

  const options: GenerateOptions = {
    sources,
    release: opts.release as string,
    domain: opts.domain as string,
    dryRun,
    verbose,
  };

  const exitCode = await generate(options);
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message ?? String(err)}\n`);
  process.exit(1);
});
