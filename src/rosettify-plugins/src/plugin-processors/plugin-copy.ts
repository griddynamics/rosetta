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
import { emitsHooksJson } from './plugin-assemble-hooks-json.js';
import { HOOKS_PSEUDO_FOLDER } from '../spec/hook-layouts.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec, Vfs } from '../types.js';

/**
 * DATA-CFG-0007 — the manifest overlay merged into each preserved `plugin.json`.
 *
 * The template `plugin.json` files hold only what EVERY set shares (version, author, homepage,
 * license, keywords, ...). Identity (`name`, `description`) is set-driven and already carries the
 * variant's suffixes, and the folder-advertising fields are conditional: a set that ships no
 * workflows must not declare a commands folder, and a set that ships no hooks must not point at a
 * hooks.json. Sparse sets are the norm now — search ships zero workflows, workflows zero skills,
 * four sets no hooks — so emitting these unconditionally would advertise folders that do not exist.
 */
export interface ManifestOverlay {
  name: string;
  description: string;
  conditional: Array<{ field: string; value: unknown }>;
}

/**
 * Resolve which conditional manifest fields this spec actually ships.
 * `requires` names an instruction folder (or several, `|`-separated, meaning any-of) matched
 * against the VFS, or the `@hooks` pseudo-folder meaning "this spec emits a hooks.json".
 */
export function buildManifestOverlay(spec: PluginSpec, vfs: Vfs): ManifestOverlay {
  const shipsFolder = (folder: string): boolean =>
    folder === HOOKS_PSEUDO_FOLDER
      ? emitsHooksJson(spec.hookLayout, spec.hookModules, spec.bootstrap)
      : vfs.some((vf) => vf.path === folder || vf.path.startsWith(folder + '/'));

  return {
    name: spec.manifest.name,
    description: spec.manifest.description,
    conditional: spec.manifestConditionalFields
      .filter((f) => f.requires.split('|').some(shipsFolder))
      .map((f) => ({ field: f.field, value: f.value })),
  };
}

function applyOverlay(parsed: Record<string, unknown>, overlay: ManifestOverlay): string {
  // Identity is stripped from the template before merging, so the SET always wins: a stray
  // name/description left in a template is ignored rather than silently overriding the set's own.
  // Spreading the template after the identity keys would have given the template precedence.
  const { name: _templateName, description: _templateDescription, ...shared } = parsed;
  const merged: Record<string, unknown> = {
    name: overlay.name,
    description: overlay.description,
    ...shared,
  };
  for (const { field, value } of overlay.conditional) merged[field] = value;
  return emitJson(merged);
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
  out: Writable = process.stdout,
) {
  return function pluginCopyProcessor(
    p: PluginProcessingFrame,
  ): PluginProcessingFrame {
    const { spec } = p;
    const overlay = buildManifestOverlay(spec, p.vfs);
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
        copyDirRecursive(sourceDir, targetDir, '', overlay, dryRun, out);
      }
    }

    // If there's a manifest override (standalone), generate the standalone plugin.json.
    // Real run writes it to disk; dry-run reports the path instead (FR-CLI-0050, FR-ARCH-0045) —
    // manifest content is otherwise not represented anywhere in the frame pipeline, so it must be
    // reported here or a dry-run preview would silently omit it.
    if (spec.manifestOverride) {
      const version = readParentVersion(spec);
      // Standalone manifests carry only {name, version} (emitStandaloneManifest) — there is no
      // description field. The name already carries the set identity and the variant's suffix,
      // applied once in buildSpecsForSet, so it is used verbatim here.
      const manifestContent = emitStandaloneManifest(spec.manifestOverride.name, version);
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
  overlay: ManifestOverlay,
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
      // Directories are created LAZILY, by whichever file below actually gets written. Creating
      // them eagerly left an empty `hooks/` folder in every set whose hooks.json.tmpl frame is
      // dropped (a set with no hook modules and no bootstrap) — the brief's "ships NO hooks/
      // folder". Non-empty directories are still created: every write branch mkdirs its dirname.
      copyDirRecursive(srcPath, destPath, relPath, overlay, dryRun, out);
    } else if (entry.name === 'plugin.json') {
      // Every plugin.json is now composed rather than raw-copied: the template holds only the
      // shared fields, and identity + conditional folder fields come from the set.
      const parsed = JSON.parse(fs.readFileSync(srcPath, 'utf-8')) as Record<string, unknown>;
      const content = applyOverlay(parsed, overlay);
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
