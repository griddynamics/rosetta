// FR-ARCH-0053, FR-SEED-0001/0002 — copy preserved source files to output
// Also registers .tmpl files as frames for rendering by pluginRenderTemplates
// FR-CLI-0050: dry-run → skip disk writes; still register tmpl frames for dry-run emission

import fs from 'fs';
import path from 'path';
import { updatePluginFrame } from '../frames.js';
import { emitStandaloneManifest } from '../serialize/json.js';
import type { FileProcessingFrame, PluginProcessingFrame } from '../types.js';

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
 * FR-ARCH-0053, GT-4
 */
export function pluginCopy(outputDir: string, dryRun = false) {
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
      // Main target: copy all preserved source files (disk write skipped in dry-run)
      if (fs.existsSync(sourceDir)) {
        collectTmplFrames(sourceDir, '', tmplFrames);
        if (!dryRun) {
          // FR-CLI-0050: only copy to disk in non-dry-run
          copyDirRecursive(sourceDir, targetDir, '');
        }
      }
    }

    // If there's a manifest override (standalone), generate the standalone plugin.json
    // dry-run → skip disk write; manifest content already represented via frame pipeline
    if (spec.manifestOverride && !dryRun) {
      const version = readParentVersion(spec);
      const manifestContent = emitStandaloneManifest(spec.manifestOverride.name, version);
      const manifestPath = path.join(targetDir, 'plugin.json');
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, manifestContent, { encoding: 'utf-8' });
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
 * Copy preserved source directory to destination — disk writes only (skipped in dry-run).
 * FR-ARCH-0053
 */
function copyDirRecursive(
  srcDir: string,
  destDir: string,
  relPrefix: string,
): void {
  if (!fs.existsSync(srcDir)) return;

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue; // FR-COPY-0010

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath, relPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
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
