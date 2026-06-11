// FR-HOOK-0020–0022 — r3 .js bundle sync from <hooksSource>/dist/bundles/<bundleSource>/
// FR-CLI-0020: hooksSource is resolved externally (<source>/hooks or --hooksSource override).
// DATA-CFG-0002: bundle source and hook folder read from PluginSpec data.
// No per-target-name branching (F-F-adjacent fix).
// FR-CLI-0050: dry-run → skip all disk writes.

import fs from 'fs';
import path from 'path';
import { updatePluginFrame } from '../frames.js';
import type { GenError, PluginProcessingFrame } from '../types.js';

const BUNDLE_FILENAMES = [
  'dangerous-actions.js',
  'gitnexus-refresh.js',
  'lint-format-advisory.js',
  'loose-files.js',
  'md-file-advisory.js',
];

/**
 * pluginSyncBundles: r3 → copy <hooksSource>/dist/bundles/<bundleSource>/*.js to target hook folder.
 * r2 → remove stale .js files (from any previous r3 run).
 * hooksSource: absolute path to hooks root (FR-CLI-0020, e.g. <source>/hooks).
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

    if (deterministicHooks) {
      // r3: copy bundles from hooksSource/dist/bundles/<bundleSource>/ to hook folder
      // bundleSource from spec data: standalone targets use parent target's bundles
      const bundleTargetName = spec.bundleSource ?? spec.name;

      // FR-CLI-0020: bundles live at <hooksSource>/dist/bundles/<bundleSource>/
      const bundleSourceDir = path.join(
        hooksSource,
        'dist',
        'bundles',
        bundleTargetName,
      );

      if (!fs.existsSync(bundleSourceDir)) {
        // Unknown bundle dir → ignore (PARITY-15)
        return p;
      }

      fs.mkdirSync(hookFolder, { recursive: true });

      let missingCount = 0;
      for (const filename of BUNDLE_FILENAMES) {
        const srcPath = path.join(bundleSourceDir, filename);
        const destPath = path.join(hookFolder, filename);
        if (fs.existsSync(srcPath)) {
          fs.copyFileSync(srcPath, destPath);
        } else {
          missingCount++;
        }
      }

      if (missingCount > 0) {
        errors.push({
          target: spec.name,
          message: `Missing ${missingCount} bundle file(s) in ${bundleSourceDir}`,
          kind: 'hard',
        });
      }
    } else {
      // r2: remove stale .js files (from any previous r3 run)
      if (fs.existsSync(hookFolder)) {
        for (const filename of BUNDLE_FILENAMES) {
          const stale = path.join(hookFolder, filename);
          if (fs.existsSync(stale)) {
            fs.rmSync(stale);
          }
        }
      }
    }

    if (errors.length === 0) return p;

    return updatePluginFrame(p, (draft) => {
      draft.errors = [...draft.errors, ...errors] as typeof draft.errors;
    });
  };
}
