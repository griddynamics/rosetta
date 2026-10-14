// FR-HOOK-0020–0022 — r3 .js bundle sync from <hooksSource>/dist/bundles/<bundleSource>/
// FR-CLI-0020: hooksSource is resolved externally (<source>/src/hooks or --hooksSource override).
// DATA-CFG-0002: bundle source and hook folder read from PluginSpec data.
// No per-target-name branching (F-F-adjacent fix).
// FR-CLI-0050: dry-run → skip all disk writes.

import fs from 'fs';
import path from 'path';
import { updatePluginFrame } from '../frames.js';
import { getLogger } from '../logging.js';
import type { GenError, PluginProcessingFrame } from '../types.js';

/**
 * pluginSyncBundles: r3 → copy <hooksSource>/dist/bundles/<bundleSource>/*.js to target hook folder.
 * r2 → remove stale .js files (from any previous r3 run).
 * hooksSource: absolute path to hooks root (FR-CLI-0020, e.g. <source>/src/hooks).
 * Reads bundleSource and hookFolder from PluginSpec data (DATA-CFG-0002).
 * dry-run → no-op (FR-CLI-0050, FR-ARCH-0045).
 * FR-HOOK-0020–0022
 */
export function pluginSyncBundles(
  hooksSource: string,
  outputDir: string,
  deterministicHooks: boolean,
  dryRun = false,
) {
  return function pluginSyncBundlesProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    if (dryRun) return p; // FR-CLI-0050: zero disk writes in dry-run

    const { spec } = p;
    const targetDir = path.join(outputDir, spec.destination);
    const errors: GenError[] = [];

    // Hook folder path from spec data (DATA-CFG-0002, F-F-adjacent fix)
    const hookFolder = path.join(targetDir, spec.hookFolder);

    // A set ships exactly the bundles its `hooks` list names, plus their support modules —
    // resolved once in plugin-sets.ts and carried on the spec. An empty list means this set ships
    // no hooks at all: no bundles are copied and no hook folder is created.
    const declared = spec.hookModules.map((m) => `${m}.js`);

    // bundleSource from spec data: standalone targets use their parent IDE's bundles.
    // FR-CLI-0020: bundles live at <hooksSource>/dist/bundles/<bundleSource>/
    const bundleSourceDir = path.join(
      hooksSource, 'dist', 'bundles', spec.bundleSource ?? spec.name,
    );

    // r2 (deterministicHooks false) ships no bundles at all, so nothing is kept.
    const keep = new Set<string>(deterministicHooks ? declared : []);

    if (deterministicHooks && declared.length > 0) {
      // A missing bundle directory used to `return p` silently: a wrong bundleSource shipped ZERO
      // hooks with no error and no log, and the plugin looked complete. It is a hard error now —
      // the same silent-failure class the pre-flight check in generate() also covers, kept here as
      // defense in depth for direct callers of the pipeline.
      if (!fs.existsSync(bundleSourceDir)) {
        return withErrors(p, [{
          target: spec.destination,
          message:
            `Hook bundle directory not found: ${bundleSourceDir} (set "${spec.set}" ships ` +
            `${declared.length} hook bundle(s)). Build the hook bundles before generating.`,
          kind: 'hard',
        }]);
      }

      fs.mkdirSync(hookFolder, { recursive: true });

      const missing: string[] = [];
      for (const filename of declared) {
        const srcPath = path.join(bundleSourceDir, filename);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, path.join(hookFolder, filename));
        } else {
          missing.push(filename);
        }
      }

      if (missing.length > 0) {
        errors.push({
          target: spec.destination,
          message: `Missing bundle file(s) in ${bundleSourceDir}: ${missing.join(', ')}`,
          kind: 'hard',
        });
      }
    }

    // FR-HOOK-0022.AC2 — sweep bundles this set no longer declares. Copying the declared modules
    // is not enough: a bundle shipped by an EARLIER build and since dropped from the set (or from
    // the hook catalog entirely) would otherwise persist in the output forever, and the plugin
    // would keep registering a hook its own hooks.json no longer references. Same silent-staleness
    // class as the orphan output folders swept in generate(), one level down.
    const swept = sweepUndeclaredBundles(hookFolder, bundleSourceDir, declared, keep);
    if (swept.length > 0) {
      getLogger().info(
        { target: spec.destination, removed: swept },
        'Removed hook bundles this set no longer declares',
      );
    }

    if (errors.length === 0) return p;
    return withErrors(p, errors);
  };
}

/**
 * Remove generator-managed bundles from a hook folder that the set no longer declares.
 *
 * FR-HOOK-0022's main clause requires UNMANAGED files to survive, so the sweep is deliberately
 * narrow: it only ever deletes a `.js` file that is recognisably one of the generator's own
 * bundles — i.e. a name the set declares, or a name present in the bundle source directory (the
 * catalog of everything the hook build produces for this IDE). A `hooks.json`, a hand-added
 * script, or any other file in the hook folder is never touched.
 *
 * Returns the filenames removed, for logging.
 */
function sweepUndeclaredBundles(
  hookFolder: string,
  bundleSourceDir: string,
  declared: string[],
  keep: Set<string>,
): string[] {
  if (!fs.existsSync(hookFolder)) return [];

  const managed = new Set<string>(declared);
  if (fs.existsSync(bundleSourceDir)) {
    for (const entry of fs.readdirSync(bundleSourceDir)) {
      if (entry.endsWith('.js')) managed.add(entry);
    }
  }

  const removed: string[] = [];
  for (const entry of fs.readdirSync(hookFolder)) {
    if (!entry.endsWith('.js')) continue; // not a bundle — unmanaged, preserved
    if (!managed.has(entry)) continue;    // an unrecognised .js — unmanaged, preserved
    if (keep.has(entry)) continue;        // still declared by this set
    fs.rmSync(path.join(hookFolder, entry));
    removed.push(entry);
  }
  return removed;
}

function withErrors(p: PluginProcessingFrame, errors: GenError[]): PluginProcessingFrame {
  return updatePluginFrame(p, (draft) => {
    draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
  });
}
