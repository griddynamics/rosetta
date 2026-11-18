// FR-CLI-0002, FR-ARCH-0032 — orchestration: load catalog → pre-flight → per-set VFS → pipeline run
// FR-CLI-0050: dryRun threads into buildSpecsForSet → buildPipeline; no processor swapping here.
// FR-CLI-0020: all source roots resolved externally and passed via GenerateOptions.sources.
// FR-CLI-0035/0036, FR-CUST-0001..0003, FR-ARCH-0024/0026: customization roots, --publish filter and
// orphan-overwrite detection are ALL pre-flight (before the orphan sweep and any pipeline write).

import fs from 'fs';
import path from 'path';
import { buildVfs } from './vfs/build-vfs.js';
import { validateCustomizationRoots } from './vfs/customizations.js';
import { findOrphanOverwrites } from './vfs/effective-sources.js';
import { createPluginFrame } from './frames.js';
import { getRelease, listReleases } from './spec/releases.js';
import { loadProfile } from './spec/profiles.js';
import type { ProfileDescriptor } from './spec/profiles.js';
import {
  loadPluginCatalog,
  selectSets,
  allDeclaredDestinations,
  destinationTargets,
  resolveHookModules,
  parseDomainTokens,
  pluginName,
  allDeclaredPluginNames,
  declaredFoldersForRelease,
} from './spec/plugin-sets.js';
import type { PluginCatalog, PluginSetDecl, SetVariant } from './spec/plugin-sets.js';
import { buildSpecsForSet, TARGET_MANIFEST_PATHS } from './spec/targets.js';
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
  /** FR-CLI-0036: false → writes suppressed for every spec of this build. */
  published: boolean;
  /** Active profile of this build (variant's, or the --profile override). */
  activeProfile: string | null;
}

/**
 * Main generation entry point.
 * Returns exit code: 0 = success, 1 = any error.
 * FR-CLI-0002, FR-CLI-0041 (run-to-completion)
 */
export async function generate(options: GenerateOptions): Promise<number> {
  const logger = getLogger();
  const { sources, release: releaseName, domain, dryRun, out, profile: profileOverride } = options;
  const customizationRoots = options.customizations ?? [];
  const publish = options.publish;
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

  // FR-CLI-0036.AC3: every --publish name must be a declared plugin name (whole catalog, all
  // releases — A2). Reported before anything else that touches the output.
  if (publish !== undefined) {
    const declaredNames = allDeclaredPluginNames(catalog);
    const unknown = [...new Set(publish)].filter((n) => !declaredNames.includes(n));
    if (unknown.length > 0) {
      process.stderr.write(
        `[hard] Unknown plugin name(s) in --publish: ${unknown.join(', ')}. ` +
          `Declared plugin names: ${declaredNames.join(', ')}.\n`,
      );
      return 1;
    }
  }

  // FR-CUST-0002/0003, FR-ARCH-0026.AC5: validate customization roots against folders the WHOLE
  // catalog declares for this release (not the --domain selection).
  const rootErrors = validateCustomizationRoots(
    customizationRoots, releaseName, declaredFoldersForRelease(catalog, releaseName),
  );
  if (rootErrors.length > 0) {
    for (const message of rootErrors) process.stderr.write(`[hard] ${message}\n`);
    return 1;
  }

  // FR-CLI-0030: a --domain token must name a real instruction folder for this release — before
  // any set selection happens, so a typo is reported precisely rather than falling through to the
  // generic "no plugin sets to build" message with the missing folder never named.
  const domainTokens = parseDomainTokens(domain);
  // FR-CLI-0030: a supplied --domain that names no folder after splitting and trimming is not
  // "every set" — reject it here, before the orphan sweep or any processor touches output.
  if (domain !== undefined && domainTokens.length === 0) {
    process.stderr.write(
      `[hard] Domain input must include at least one non-empty domain (got ${JSON.stringify(domain)}).\n`,
    );
    return 1;
  }
  const missingFolders = domainTokens
    .map((token) => ({ token, dir: path.resolve(instructionsSource, releaseName, token) }))
    .filter(({ dir }) => !fs.existsSync(dir));
  if (missingFolders.length > 0) {
    process.stderr.write(
      `Unknown instruction folder(s) for release "${releaseName}": ` +
        `${missingFolders.map((m) => m.token).join(', ')} ` +
        `(looked for ${missingFolders.map((m) => m.dir).join(', ')}).\n`,
    );
    return 1;
  }

  const sets = selectSets(catalog, releaseName, domain);
  if (sets.length === 0) {
    const declared = catalog.sets.map((s) => `${s.name} (${s.releases.join('/')})`).join(', ');
    // FR-CLI-0031: an empty selection is a legitimate outcome when a domain filter was supplied
    // (exit 0, nothing written) — distinct from an unconfigured release resolving to nothing
    // (exit 1, unchanged wording), which is a misconfiguration rather than a filter outcome.
    if (domain === undefined) {
      process.stderr.write(
        `No plugin sets to build for release "${releaseName}". Declared sets in ${configPath}: ` +
          `${declared}.\n`,
      );
      return 1;
    }
    process.stderr.write(
      `Domain filter "${domain}" matched no plugin set for release "${releaseName}". ` +
        `Declared sets: ${declared}. Nothing was generated.\n`,
    );
    return 0;
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
  // folder aborts the whole run rather than half of it. resolveLayerDirs THROWS on a missing main
  // folder (customization roots are skipped when absent, FR-CUST-0003.AC3) — deliberately, so a typo in plugins.json cannot degrade into a silent empty build.
  const planned: PlannedBuild[] = [];
  // FR-CUST-0002/FR-ARCH-0024: de-duplicate pre-flight messages — several sets share one customization fault.
  const vfsFaults = new Map<string, { sets: string[]; index: number }>();
  for (const set of sets) {
    let vfs: Vfs;
    try {
      vfs = buildVfs(instructionsSource, releaseName, set.folders.join(','), customizationRoots);
    } catch (err) {
      const reason = (err as Error).message;
      const seen = vfsFaults.get(reason);
      if (seen) {
        seen.sets.push(set.name);
      } else {
        vfsFaults.set(reason, { sets: [set.name], index: preflightErrors.length });
        preflightErrors.push('');
      }
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

      const published = publish === undefined || publish.includes(pluginName(set, variant));
      const specs = buildSpecsForSet({
        pluginsSource, hooksSource, outputDir, release, dryRun, out,
        publish: published,
        profile,
        // FR-PROF-0030: --profile is a debugging OVERRIDE of the variant's declared profile; the
        // normal path is the variant itself.
        activeProfile: profileOverride ?? variant.profile,
        set, variant, targets: catalog.targets, hookModules,
        hookSupportModules: catalog.hookSupportModules,
      });

      planned.push({
        set, variant, vfs, specs, published, activeProfile: profileOverride ?? variant.profile,
      });
    }
  }

  // One line per distinct VFS fault, naming every plugin set it affects (placeholders keep order).
  for (const [reason, { sets: names, index }] of vfsFaults) {
    preflightErrors[index] =
      `Plugin ${names.length > 1 ? 'sets' : 'set'} ${names.map((n) => `"${n}"`).join(', ')} ` +
      `(declared in ${configPath}) could not resolve ${names.length > 1 ? 'their' : 'its'} instruction ` +
      `folders: ${reason}`;
  }

  // FR-ARCH-0024.AC4/AC6: an overwrite with no surviving predecessor is a hard error, checked for
  // every planned spec (target + set + active profile) BEFORE anything is written. One line per
  // (origin file, set-variant); the line names every target destination of that build it affects.
  const orphanGroups = new Map<string, { origin: string; destinations: string[] }>();
  for (const build of planned) {
    for (const spec of build.specs) {
      const orphans = findOrphanOverwrites(
        build.vfs, { target: spec.name, set: spec.set }, build.activeProfile,
      );
      for (const { origin } of orphans) {
        const key = `${origin}\u0000${build.set.name}\u0000${build.variant.destinationSuffix}`;
        const group = orphanGroups.get(key) ?? { origin, destinations: [] };
        group.destinations.push(spec.destination);
        orphanGroups.set(key, group);
      }
    }
  }
  for (const { origin, destinations } of orphanGroups.values()) {
    preflightErrors.push(
      `${origin}: overwrite has no predecessor in ${destinations.length > 1 ? 'builds' : 'build'} ` +
        destinations.join(', '),
    );
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
    };

    for (const spec of build.specs) {
      logger.info({ target: spec.destination, set: spec.set, ide: spec.name }, 'Processing target');
      if (!build.published) {
        logger.info({ target: spec.destination }, 'Not published (--publish): writes suppressed');
      }

      // destination: the spec's output folder name. Only the Copilot plugin-form template
      // references it (its 14 fixed install-location probes), but strict rendering only throws
      // on a MISSING variable, never an extra one, so plumbing it uniformly for every spec has no
      // cost and avoids a per-target-field-nobody-else-reads pattern (OQ-2).
      const frame = createPluginFrame(spec, build.vfs, {
        ...baseTemplateContext,
        destination: spec.destination,
      });
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
 * Only a directory the generator wrote is removed. `--output` may point at a directory the
 * generator does not own, and a name alone proves nothing: `awesome-claude-code` and `openai-codex`
 * are shaped like output folders too. So the name only says which IDE targets the folder could
 * belong to (destinationTargets), and the folder must hold the manifest the generator writes for
 * one of them (TARGET_MANIFEST_PATHS). Everything else — `.git`, `docs`, `src`, a folder with a
 * plugin-like name and no such manifest, loose files in the output root — is left alone. A plugin
 * of the user's own with both the name and the manifest cannot be told apart and is removed.
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
    const generated = destinationTargets(entry.name).some((target) =>
      fs.existsSync(path.join(outputDir, entry.name, TARGET_MANIFEST_PATHS[target])));
    if (!generated) continue;

    removed.push(entry.name);
    logger.info({ path: entry.name }, dryRun ? 'dry-run: would remove orphan plugin' : 'Removing orphan plugin');
    if (!dryRun) {
      fs.rmSync(path.join(outputDir, entry.name), { recursive: true, force: true });
    }
  }

  return removed;
}
