// FR-CLI-0002, FR-ARCH-0032 — orchestration: load catalog → pre-flight → per-set VFS → pipeline run
// FR-CLI-0050: dryRun threads into buildSpecsForSet → buildPipeline; no processor swapping here.
// FR-CLI-0020: all source roots resolved externally and passed via GenerateOptions.sources.

import fs from 'fs';
import path from 'path';
import { buildVfs } from './vfs/build-vfs.js';
import { createPluginFrame } from './frames.js';
import { getRelease, listReleases } from './spec/releases.js';
import { loadProfile } from './spec/profiles.js';
import type { ProfileDescriptor } from './spec/profiles.js';
import {
  loadPluginCatalog,
  selectSets,
  allDeclaredDestinations,
  resolveHookModules,
} from './spec/plugin-sets.js';
import type { PluginCatalog, PluginSetDecl, SetVariant } from './spec/plugin-sets.js';
import { buildSpecsForSet } from './spec/targets.js';
import { getLogger } from './logging.js';
import type {
  GenerateOptions, GenError, PluginSpec, PluginProcessingFrame, ReleaseDescriptor, Vfs,
} from './types.js';

/** One (set, variant) pair resolved to its specs and the VFS they all read from. */
interface PlannedBuild {
  set: PluginSetDecl;
  variant: SetVariant;
  vfs: Vfs;
  specs: PluginSpec[];
}

/**
 * Main generation entry point.
 * Returns exit code: 0 = success, 1 = any error.
 * FR-CLI-0002, FR-CLI-0041 (run-to-completion)
 */
export async function generate(options: GenerateOptions): Promise<number> {
  const logger = getLogger();
  const { sources, release: releaseName, domain, dryRun, out, profile: profileOverride } = options;
  const {
    instructionsSource, pluginsSource, hooksSource, outputDir, profileSource, configPath,
  } = sources;

  // Validate release (FR-CLI-0010/0011)
  const descriptor = getRelease(releaseName);
  if (!descriptor) {
    const known = listReleases().join(', ');
    process.stderr.write(`Unknown release: "${releaseName}". Known releases: ${known}\n`);
    return 1;
  }

  // DATA-CFG-0007: load and fully validate the plugin-set catalog FIRST. Everything below depends
  // on it, and a violation must abort before any output folder is touched.
  let catalog: PluginCatalog;
  try {
    catalog = loadPluginCatalog(configPath);
  } catch (err) {
    process.stderr.write(`Failed to load plugin sets: ${(err as Error).message}\n`);
    return 1;
  }

  const sets = selectSets(catalog, releaseName, domain);
  if (sets.length === 0) {
    process.stderr.write(
      `No plugin sets to build for release "${releaseName}"` +
        (domain ? ` and domain "${domain}"` : '') +
        `. Declared sets in ${configPath}: ` +
        `${catalog.sets.map((s) => `${s.name} (${s.releases.join('/')})`).join(', ')}.\n`,
    );
    return 1;
  }

  // FR-CLI-0012: effective deterministic-hooks value — CLI override when supplied, otherwise a
  // fixed `false` default (NOT the release descriptor's native value).
  const release: ReleaseDescriptor =
    options.deterministicHooks === undefined
      ? { ...descriptor, deterministicHooks: false }
      : { ...descriptor, deterministicHooks: options.deterministicHooks };

  // ── Pre-flight ────────────────────────────────────────────────────────────
  // Every check that can fail MUST run before the first pluginCleanup. With 6 sets expanding to 49
  // output folders, a failure discovered while building set 4 would otherwise leave sets 1-3
  // written and the output tree half-updated.

  const preflightErrors: string[] = [];

  // Templates: a set naming a template family with no folder for an IDE it is built for.
  for (const set of sets) {
    for (const target of catalog.targets) {
      const family = target.replace(/-standalone$/, '');
      const dir = path.join(pluginsSource, `${set.template}-${family}`);
      if (!fs.existsSync(dir)) {
        preflightErrors.push(
          `${configPath}: plugin set "${set.name}" declares template "${set.template}", but ` +
            `there is no preserved-files folder for the "${target}" target at ${dir}.`,
        );
      }
    }
  }

  // Bundles: a wrong bundleSource used to ship ZERO hooks with no error and no log. Check the
  // directory up front so the run fails naming it.
  if (release.deterministicHooks) {
    const families = new Set(catalog.targets.map((t) => t.replace(/-standalone$/, '')));
    const needsHooks = sets.some((s) => resolveHookModules(catalog, s).length > 0);
    if (needsHooks) {
      for (const family of families) {
        const dir = path.join(hooksSource, 'dist', 'bundles', family);
        if (!fs.existsSync(dir)) {
          preflightErrors.push(
            `Hook bundle directory not found: ${dir}. Build the hook bundles ` +
              `(src/hooks) before generating with --deterministic-hooks true.`,
          );
        }
      }
    }
  }

  // Profiles: load each variant's profile once, up front (FR-PROF-0001 pre-flight).
  const profileCache = new Map<string, ProfileDescriptor | null>();
  const resolveProfile = (name: string | null): ProfileDescriptor | null => {
    if (name === null) return null;
    if (!profileCache.has(name)) profileCache.set(name, loadProfile(profileSource, name));
    return profileCache.get(name) ?? null;
  };

  // VFS: build every selected set's VFS before processing any of them, so a missing instruction
  // folder aborts the whole run rather than half of it. resolveSourceDirs THROWS on a missing
  // directory — deliberately, so a typo in plugins.json cannot degrade into a silent empty build.
  const planned: PlannedBuild[] = [];
  for (const set of sets) {
    let vfs: Vfs;
    try {
      vfs = buildVfs(instructionsSource, releaseName, set.folders.join(','));
    } catch (err) {
      preflightErrors.push(
        `Plugin set "${set.name}" (declared in ${configPath}) could not resolve its instruction ` +
          `folders [${set.folders.join(', ')}]: ${(err as Error).message}`,
      );
      continue;
    }

    const hookModules = resolveHookModules(catalog, set);

    for (const variant of set.variants) {
      let profile: ProfileDescriptor | null;
      try {
        profile = resolveProfile(profileOverride ?? variant.profile);
      } catch (err) {
        preflightErrors.push(`Failed to load profile: ${(err as Error).message}`);
        continue;
      }

      const specs = buildSpecsForSet({
        pluginsSource, hooksSource, outputDir, release, dryRun, out,
        profile,
        // FR-PROF-0030: --profile is a debugging OVERRIDE of the variant's declared profile; the
        // normal path is the variant itself.
        activeProfile: profileOverride ?? variant.profile,
        set, variant, targets: catalog.targets, hookModules,
        hookSupportModules: catalog.hookSupportModules,
      });

      planned.push({ set, variant, vfs, specs });
    }
  }

  if (preflightErrors.length > 0) {
    for (const message of preflightErrors) process.stderr.write(`[hard] ${message}\n`);
    return 1;
  }

  // ── Orphan sweep ──────────────────────────────────────────────────────────
  sweepOrphanDestinations(catalog, outputDir, dryRun);

  logger.info(
    {
      release: releaseName,
      domain: domain ?? null,
      sets: sets.map((s) => s.name),
      builds: planned.length,
      targets: catalog.targets.length,
    },
    'Plugin sets resolved',
  );

  // ── Run ───────────────────────────────────────────────────────────────────
  const allErrors: GenError[] = [];
  let anyError = false;

  for (const build of planned) {
    // Template context. Every key a template may reference is plumbed here EXPLICITLY: rendering
    // is strict, so an unplumbed `{{var}}` throws instead of silently rendering empty and
    // producing malformed JSON.
    const baseTemplateContext: Record<string, unknown> = {
      release: releaseName,
      deterministic_hooks: release.deterministicHooks,
      bootstrap_hooks: '',
      hooks_json: '',
    };

    for (const spec of build.specs) {
      logger.info({ target: spec.destination, set: spec.set, ide: spec.name }, 'Processing target');

      const frame = createPluginFrame(spec, build.vfs, { ...baseTemplateContext });
      let currentFrame: PluginProcessingFrame = frame;

      try {
        for (const processor of spec.pluginProcessors) {
          // FR-ARCH-0050: per-PluginProcessor debug logging — frame metadata, no content
          logger.debug({
            target: spec.destination,
            processor: processor.name || '(anonymous)',
            framesBefore: currentFrame.frames.length,
            errorsBefore: currentFrame.errors.length,
          }, 'FR-ARCH-0050: plugin-processor start');
          currentFrame = processor(currentFrame);
          logger.debug({
            target: spec.destination,
            processor: processor.name || '(anonymous)',
            framesAfter: currentFrame.frames.length,
            errorsAfter: currentFrame.errors.length,
          }, 'FR-ARCH-0050: plugin-processor done');
        }
      } catch (err) {
        const errMsg = (err as Error).message ?? String(err);
        // Attribution uses `destination`, not `name`: six sets share each IDE identity, so naming
        // the IDE alone would not say which of the six failed.
        allErrors.push({
          target: spec.destination,
          message: `Processor error: ${errMsg}`,
          kind: 'hard',
        });
        anyError = true;
        logger.error({ target: spec.destination, error: errMsg }, 'Target processing failed');
        continue;
      }

      if (currentFrame.errors.length > 0) {
        for (const e of currentFrame.errors) {
          allErrors.push(e);
          process.stderr.write(`[${e.kind}] ${e.target}${e.file ? ':' + e.file : ''}: ${e.message}\n`);
          anyError = true; // NFR-0004/QF-2: soft errors also set exit ≠ 0
        }
      }

      logger.info(
        { target: spec.destination, frames: currentFrame.frames.length },
        'Target complete',
      );
    }
  }

  return anyError ? 1 : 0;
}

/**
 * Remove output folders the catalog no longer declares.
 *
 * pluginCleanup only ever wipes destinations it is about to write, so renaming `core-<ide>` to
 * `rosetta-<ide>` would otherwise leave the superseded folders in the output tree forever, and
 * users would keep installing a plugin the generator stopped producing.
 *
 * The keep-list is every destination the WHOLE catalog can produce — across all releases, sets,
 * variants and targets — deliberately NOT the current run's selection. Sweeping against the
 * selection would make `--domain qe` delete the other 42 folders.
 *
 * Only directories are considered; loose files in the output root are left alone.
 */
export function sweepOrphanDestinations(
  catalog: PluginCatalog,
  outputDir: string,
  dryRun: boolean,
): string[] {
  if (!fs.existsSync(outputDir)) return [];

  const declared = allDeclaredDestinations(catalog);
  const removed: string[] = [];
  const logger = getLogger();

  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (declared.has(entry.name)) continue;

    removed.push(entry.name);
    logger.info({ path: entry.name }, dryRun ? 'dry-run: would remove orphan plugin' : 'Removing orphan plugin');
    if (!dryRun) {
      fs.rmSync(path.join(outputDir, entry.name), { recursive: true, force: true });
    }
  }

  return removed;
}
