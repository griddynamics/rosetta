// FR-ARCH-0053, FR-SEED-0001/0002 — copy preserved source files to output
// Also registers .tmpl files as frames for rendering by pluginRenderTemplates
// FR-CLI-0050, FR-ARCH-0045: dry-run → skip disk writes, report every path that would have been
// written (raw preserved-file copies and manifest emissions), and still register tmpl frames.

import fs from 'fs';
import path from 'path';
import type { Writable } from 'stream';
import { updatePluginFrame } from '../frames.js';
import { emitJson, emitStandaloneManifest } from '../serialize/json.js';
import { getLogger } from '../logging.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

/**
 * FR-PROF-0021 — global manifest name/description suffixing, decision D (architecture-notes.md §D).
 * `name`/`description` are APPENDED to the preserved manifest's existing values, never replaced.
 * Global across all seven targets (not per-target data) — the SAME suffix pair is passed for every
 * spec's `pluginCopy` invocation. `null` (no active profile) ⇒ manifest handling is a byte-identical
 * raw copy, exactly as before this feature (FR-PROF-0040 regression guard).
 */
export interface ManifestSuffix {
  name: string;
  description: string;
}

/**
 * pluginCopy: copy preservedSource/**  to mirrored output paths.
 * For standalones (manifestOverride set):
 *   - Do NOT copy parent preserved source files at root (they belong to main plugin only)
 *   - Only emit standalone plugin.json via manifestOverride
 *   - Register standaloneTemplates entries as tmpl frames with remapped target paths
 * For main targets: copy all preservedSource/** to output.
 * Skip .DS_Store (FR-COPY-0010).
 * Also registers .tmpl files as frames for rendering.
 * dry-run → skip all disk writes; still register tmpl frames (FR-CLI-0050, FR-ARCH-0045).
 * Every path this processor would otherwise write to disk (raw preserved-file copies and
 * manifest emissions) is instead reported to the dry-run output sink, using the exact same
 * log call and message pluginWrite uses, so a dry-run preview enumerates the same set of paths
 * a real run produces (FR-ARCH-0045).
 * FR-ARCH-0053, GT-4
 * @param manifestSuffix FR-PROF-0021: global {name, description} append pair, or null when no
 *   profile is active. Null MUST keep every manifest write byte-identical to today (FR-PROF-0040).
 * @param out FR-ARCH-0045: dry-run output sink; defaults to process.stdout, same convention as
 *   pluginWrite.
 */
export function pluginCopy(
  outputDir: string,
  dryRun = false,
  manifestSuffix: ManifestSuffix | null = null,
  out: Writable = process.stdout,
) {
  return function pluginCopyProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    const { spec } = p;
    const targetDir = path.join(outputDir, spec.destination);
    const sourceDir = spec.preservedSource;

    const tmplFrames: FileProcessingFrame[] = [];

    if (spec.manifestOverride) {
      // Standalone target: do NOT copy parent preserved files to root.
      // Only register specific standalone templates (hooks.json.tmpl) with remapped paths.
      // GT-4: cursor-standalone root hooks.json.tmpl → .cursor/hooks.json.tmpl
      //       copilot-standalone hooks/hooks.json.tmpl → .github/hooks/hooks.json.tmpl
      if (spec.standaloneTemplates && fs.existsSync(sourceDir)) {
        for (const [srcRel, targetPath] of spec.standaloneTemplates) {
          const srcAbs = path.join(sourceDir, srcRel);
          if (fs.existsSync(srcAbs)) {
            const content = fs.readFileSync(srcAbs, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
            tmplFrames.push({
              sourcePath: targetPath,
              target: targetPath,
              isBinary: false,
              target_contents: content,
              source: [],
            });
          }
        }
      }
    } else {
      // Main target: copy all preserved source files.
      // FR-CLI-0050/FR-ARCH-0045: real run copies to disk; dry-run reports each path instead
      // (copyDirRecursive itself branches on dryRun so both modes share one traversal).
      if (fs.existsSync(sourceDir)) {
        collectTmplFrames(sourceDir, '', tmplFrames);
        copyDirRecursive(sourceDir, targetDir, '', manifestSuffix, dryRun, out);
      }
    }

    // If there's a manifest override (standalone), generate the standalone plugin.json.
    // Real run writes it to disk; dry-run reports the path instead (FR-CLI-0050, FR-ARCH-0045) —
    // manifest content is otherwise not represented anywhere in the frame pipeline, so it must be
    // reported here or a dry-run preview would silently omit it.
    if (spec.manifestOverride) {
      const version = readParentVersion(spec);
      // FR-PROF-0021: standalone manifests carry only {name, version} (emitStandaloneManifest) —
      // there is no description field to suffix here. Append pluginNameSuffix (via manifestSuffix.name)
      // to the override name only when a profile is active; null ⇒ untouched, same as today.
      const manifestName = manifestSuffix
        ? spec.manifestOverride.name + manifestSuffix.name
        : spec.manifestOverride.name;
      const manifestContent = emitStandaloneManifest(manifestName, version);
      const manifestPath = path.join(targetDir, 'plugin.json');
      if (dryRun) {
        reportDryRunWrite(manifestPath, manifestContent, out);
      } else {
        fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
        fs.writeFileSync(manifestPath, manifestContent, { encoding: 'utf-8' });
      }
    }

    if (tmplFrames.length === 0) return p;

    // Add .tmpl frames so pluginRenderTemplates can render them
    return updatePluginFrame(p, (draft) => {
      draft.frames = [...draft.frames, ...tmplFrames] as typeof draft.frames;
    });
  };
}

/**
 * Collect .tmpl frames from preserved source for rendering — no disk writes.
 * Used in both dry-run and normal mode (FR-CLI-0050).
 */
function collectTmplFrames(
  srcDir: string,
  relPrefix: string,
  tmplFrames: FileProcessingFrame[],
): void {
  if (!fs.existsSync(srcDir)) return;

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue; // FR-COPY-0010

    const srcPath = path.join(srcDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      collectTmplFrames(srcPath, relPath, tmplFrames);
    } else if (entry.name.endsWith('.tmpl')) {
      const content = fs.readFileSync(srcPath, 'utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      tmplFrames.push({
        sourcePath: relPath,
        target: relPath,
        isBinary: false,
        target_contents: content,
        source: [],
      });
    }
  }
}

/**
 * Copy preserved source directory to destination.
 * Real run: disk writes only. Dry-run: no disk writes at all (not even directory creation) —
 * every path that would have been written is instead reported to `out` via `reportDryRunWrite`/
 * `reportDryRunBinary`, using the identical log call and message pluginWrite uses for the frame
 * pipeline, so a dry-run preview enumerates the same paths a real run produces (FR-ARCH-0045).
 * `.tmpl` files are excluded from this raw copy: their content is already collected into frames
 * by `collectTmplFrames` above, rendered by `pluginRenderTemplates`, and written to disk by
 * `pluginWrite` as the rendered sibling only — the `.tmpl` itself must never reach the output
 * (all targets, not just standalones).
 * FR-ARCH-0053
 *
 * FR-PROF-0021: `manifestSuffix` is null on every no-profile run, and a null suffix takes the
 * exact same `fs.copyFileSync` raw-copy branch as before this feature touched the file — so a
 * `plugin.json` is never parsed/re-serialized when no profile is active, guaranteeing
 * byte-for-byte parity (FR-PROF-0040). Only when `manifestSuffix` is non-null is `plugin.json`
 * read, JSON-parsed, its `name`/`description` appended in place (object-spread preserves the
 * original key order/position since both keys already exist), and re-emitted via the package's
 * existing `emitJson` serializer (2-space indent, trailing LF — same emitter already used for
 * every other generator-owned JSON output, per `serialize/json.ts`). The dry-run preview mirrors
 * whichever of those two forms would actually be written, so the preview is always accurate.
 */
function copyDirRecursive(
  srcDir: string,
  destDir: string,
  relPrefix: string,
  manifestSuffix: ManifestSuffix | null,
  dryRun: boolean,
  out: Writable,
): void {
  if (!fs.existsSync(srcDir)) return;

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue; // FR-COPY-0010
    if (entry.name.endsWith('.tmpl')) continue; // rendered sibling only reaches output

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (!dryRun) fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath, relPath, manifestSuffix, dryRun, out);
    } else if (entry.name === 'plugin.json' && manifestSuffix) {
      // Profile active: append the global suffixes to the preserved manifest's existing
      // name/description rather than raw-copying the bytes.
      const parsed = JSON.parse(fs.readFileSync(srcPath, 'utf-8')) as Record<string, unknown>;
      const suffixed = {
        ...parsed,
        name: `${String(parsed.name ?? '')}${manifestSuffix.name}`,
        description: `${String(parsed.description ?? '')}${manifestSuffix.description}`,
      };
      const content = emitJson(suffixed);
      if (dryRun) {
        reportDryRunWrite(destPath, content, out);
      } else {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.writeFileSync(destPath, content, { encoding: 'utf-8' });
      }
    } else if (dryRun) {
      const buf = fs.readFileSync(srcPath);
      if (looksBinary(buf)) {
        reportDryRunBinary(destPath, out);
      } else {
        reportDryRunWrite(destPath, buf.toString('utf-8'), out);
      }
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Report a would-write to the dry-run output sink, using the exact same logger call and message
 * `pluginWrite` uses for frame-pipeline writes (FR-ARCH-0045), so pluginCopy's raw preserved-file
 * copies and manifest emissions are reported identically rather than via a second logging style.
 */
function reportDryRunWrite(outputPath: string, content: string, out: Writable): void {
  getLogger().info({ path: outputPath }, 'dry-run: would write');
  out.write(`=== DRY-RUN: ${outputPath} ===\n${content}\n`);
}

/** Binary counterpart of `reportDryRunWrite` — same log call, placeholder preview body. */
function reportDryRunBinary(outputPath: string, out: Writable): void {
  getLogger().info({ path: outputPath }, 'dry-run: would write');
  out.write(`=== DRY-RUN: ${outputPath} (binary) ===\n`);
}

/**
 * Cheap, well-established binary sniff (the same first-bytes-NUL-byte heuristic git and most
 * diff tools use): a NUL byte in the first 8000 bytes marks content as binary. Preserved-source
 * content today is JSON/text only (no raw-copied file is currently binary — .tmpl files never
 * reach this branch), so this only guards the dry-run preview against ever mis-decoding a future
 * binary preserved asset as UTF-8 text.
 */
function looksBinary(buf: Buffer): boolean {
  const len = Math.min(buf.length, 8000);
  for (let i = 0; i < len; i++) {
    if (buf[i] === 0) return true;
  }
  return false;
}

/**
 * Read version from preserved plugin.json for standalone manifests.
 * FR-VAR-0060: version copied from parent target (2.0.40).
 */
function readParentVersion(spec: PluginProcessingFrame['spec']): string {
  const preservedDir = spec.preservedSource;

  const candidates = [
    path.join(preservedDir, '.claude-plugin', 'plugin.json'),
    path.join(preservedDir, '.cursor-plugin', 'plugin.json'),
    path.join(preservedDir, '.github', 'plugin', 'plugin.json'),
    path.join(preservedDir, '.codex-plugin', 'plugin.json'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      try {
        const data = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
        if (data.version) return data.version as string;
      } catch {
        // ignore
      }
    }
  }

  return '2.0.40'; // fallback (GT-7)
}
