#!/usr/bin/env node
// FR-CLI-0001–0060 — commander wiring, flag parsing, exit-status aggregation
// FR-CLI-0020: --source (default: cwd) + per-source overrides (--instructionsSource, --pluginsSource, --hooksSource)

import { Command, InvalidArgumentError } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initLogger } from './logging.js';
import { generate } from './generate.js';
import type { GenerateOptions, ResolvedSources } from './types.js';

// FR-CLI-0012: explicit boolean only; anything else is a usage error (exit ≠ 0)
function parseBooleanArg(value: string): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new InvalidArgumentError('Expected "true" or "false".');
}

// FR-CLI-0032: --profile is a name only, never a path; reject anything path-like
// (a path separator or a .json extension) before any output is written.
function parseProfileName(value: string): string {
  if (value.includes('/') || value.includes('\\') || value.endsWith('.json')) {
    throw new InvalidArgumentError('Expected a profile name (e.g. "lightweight"), not a path or filename.');
  }
  return value;
}

// Single source of truth for the reported version: package.json. A hardcoded literal here
// silently drifts the moment the package version is bumped, and `--version` then lies about
// which generator is running. Resolved relative to this module, so it works identically from
// `src/` under tsx and from `dist/` in the published package (both are one level below root).
const PACKAGE_VERSION: string = (
  JSON.parse(
    fs.readFileSync(new URL('../package.json', import.meta.url), 'utf-8'),
  ) as { version: string }
).version;

const program = new Command();

program
  .name('rosettify-plugins')
  .description('Generate Rosetta IDE plugins from instruction sources')
  .version(PACKAGE_VERSION)
  .option('--release <r>', 'Release name (e.g. r2, r3)', 'r3')
  .option('--domain <list>', 'Comma-separated domain list (e.g. core)', 'core')
  .option('--source <dir>', 'Source root directory (default: current directory)', process.cwd())
  .option('--instructionsSource <dir>', 'Override instruction source directory (default: <source>/instructions)')
  .option('--pluginsSource <dir>', 'Override preserved-files source directory (default: <source>/src/rosettify-plugins/plugins)')
  .option('--hooksSource <dir>', 'Override hooks source directory (default: <source>/src/hooks)')
  .option('--output <dir>', 'Output directory (default: <source>/plugins)')
  .option('--profile <name>', 'Build profile name (e.g. lightweight); name only, never a path; default: none active', parseProfileName)
  .option('--profileSource <dir>', 'Override profile source directory (default: <source>/src/rosettify-plugins/profiles)')
  .option('--deterministic-hooks <bool>', 'Override the deterministic_hooks value (true|false); default: false regardless of release', parseBooleanArg)
  .option('--dry-run', 'Print what would be written, but do not write', false)
  .option('--verbose', 'Enable verbose logging', false);

program.addHelpText('after', `
Source model:
  --source sets the global source root; all input/output locations are derived from it.
  Individual overrides replace the corresponding <source>/... default:
    --instructionsSource  <source>/instructions
    --pluginsSource       <source>/src/rosettify-plugins/plugins
    --hooksSource         <source>/src/hooks
    --output              <source>/plugins
    --profileSource       <source>/src/rosettify-plugins/profiles

Source structure:
  <instructionsSource>/<release>/<domain>/{rules,workflows,agents,skills,configure,templates}/

Directives (in filenames, tilde-separated, opening and closing tilde fence around the
token list: name~token[~token...]~.ext):
  file~overwrite~.md                 — overwrite earlier layers
  file~core-claude-only~.md          — include only when generating that exact target
                                        (core-claude, core-cursor, core-copilot, core-codex,
                                        core-antigravity, core-cursor-standalone,
                                        core-copilot-standalone)
  file~copilot-only~.md              — include for every target of one IDE: claude, cursor,
                                        copilot, codex, antigravity. copilot-only covers
                                        core-copilot AND core-copilot-standalone, while
                                        core-copilot-only covers only the former
  file~profile-lightweight-only~.md  — include only when the "lightweight" profile is active

Build profiles (--profile, --profileSource):
  A profile is an optional named build variant, orthogonal to release/domain. With no
  --profile argument, no profile is active and output is the standard, unsuffixed build.

    --profile <name>       Activate the named profile; loads <profileSource>/<name>.json.
                            <name> must be a bare name, never a path (no "/" or "\\", no
                            ".json" extension) — such a value is rejected before anything
                            is generated.
    --profileSource <dir>  Override where profile descriptors are looked up (see Source
                            model above for the default).

  A profile descriptor is a JSON file with these fields:
    destinationSuffix         appended to each target's output folder name
    pluginNameSuffix          appended to the plugin manifest's name
    pluginDescriptionSuffix   appended to the plugin manifest's description
    modelOverrides            per-target model-id remapping applied when normalizing
                               model/subagent-model fields

  A file can be scoped to a single profile with the profile-<name>-only directive token
  (see Directives above): it is included in the build only while that profile is active,
  and excluded entirely otherwise.

Processor catalog:
  fileRead, fileApplyOverrides, fileBundle,
  fileNormalizeClaudeModels, fileNormalizeCursorModels, fileNormalizeCopilotModels, fileNormalizeCodexModels,
  fileRename, fileCodexAgentFormat, fileWorkflowToSkill, fileAntigravityReduceFrontmatter
  pluginCleanup, pluginCopy, pluginProcessSpecEntries, pluginRewriteReferences,
  pluginGenerateIndexes, pluginInjectSections,
  pluginAssembleClaudeBootstrap, pluginAssembleCursorBootstrap, pluginAssembleCopilotBootstrap, pluginAssembleCodexBootstrap, pluginAssembleAntigravityBootstrap,
  pluginAntigravitySubagentModel,
  pluginRenderTemplates, pluginSyncBundles, pluginWrite

Spec model:
  Each target is a PluginSpec with specEntries, pluginProcessors, etc.
  See src/spec/targets.ts for the seven built-in targets.
`);

async function main(): Promise<void> {
  program.parse(process.argv);
  const opts = program.opts();

  const sourceRoot = opts.source as string;
  const verbose = opts.verbose as boolean;
  const dryRun = opts.dryRun as boolean;

  // FR-CLI-0020/0033: derive each source from <source> unless individually overridden
  const sources: ResolvedSources = {
    instructionsSource: (opts.instructionsSource as string | undefined) ?? path.join(sourceRoot, 'instructions'),
    pluginsSource: (opts.pluginsSource as string | undefined) ?? path.join(sourceRoot, 'src', 'rosettify-plugins', 'plugins'),
    hooksSource: (opts.hooksSource as string | undefined) ?? path.join(sourceRoot, 'src', 'hooks'),
    outputDir: (opts.output as string | undefined) ?? path.join(sourceRoot, 'plugins'),
    profileSource: (opts.profileSource as string | undefined) ?? path.join(sourceRoot, 'src', 'rosettify-plugins', 'profiles'),
  };

  initLogger(verbose);

  const options: GenerateOptions = {
    sources,
    release: opts.release as string,
    domain: opts.domain as string,
    dryRun,
    verbose,
    deterministicHooks: opts.deterministicHooks as boolean | undefined, // FR-CLI-0012
    profile: opts.profile as string | undefined, // FR-CLI-0032
  };

  const exitCode = await generate(options);
  process.exit(exitCode);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err.message ?? String(err)}\n`);
  process.exit(1);
});
