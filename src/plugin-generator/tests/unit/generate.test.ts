// FR-CLI-0002 — generate() orchestration: error paths, soft errors, processor throw
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../../src/index.js';
import type { ResolvedSources } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const SAMPLE_INSTRUCTIONS_DIR = path.join(FIXTURES_DIR, 'sample-instructions');
const SAMPLE_PLUGINS_DIR = path.join(FIXTURES_DIR, 'sample-plugins');

function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirSync(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildFakeRepo(): string {
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-unit-'));

  const instrR2Core = path.join(tmpRepo, 'instructions', 'r2', 'core');
  fs.mkdirSync(instrR2Core, { recursive: true });
  copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r2', 'core'), instrR2Core);

  const pluginsRoot = path.join(tmpRepo, 'src', 'plugin-generator', 'plugins');
  fs.mkdirSync(pluginsRoot, { recursive: true });
  for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex']) {
    const src = path.join(SAMPLE_PLUGINS_DIR, target);
    if (fs.existsSync(src)) {
      const dest = path.join(pluginsRoot, target);
      fs.mkdirSync(dest, { recursive: true });
      copyDirSync(src, dest);
    }
  }

  for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex']) {
    fs.mkdirSync(path.join(tmpRepo, 'hooks', 'dist', 'bundles', target), { recursive: true });
  }

  fs.mkdirSync(path.join(tmpRepo, '.git'), { recursive: true });
  return tmpRepo;
}

// FR-CLI-0020: build ResolvedSources from a fake repo layout
function buildSources(repoRoot: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(repoRoot, 'instructions'),
    pluginsSource: path.join(repoRoot, 'src', 'plugin-generator', 'plugins'),
    hooksSource: path.join(repoRoot, 'hooks'),
    outputDir,
  };
}

describe('generate() — error coverage', () => {
  let tmpRepo: string;

  beforeAll(() => {
    tmpRepo = buildFakeRepo();
  });

  afterAll(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('unknown release → returns exit code 1 (FR-CLI-0010)', async () => {
    const outputDir = path.join(tmpRepo, 'out-bad-release');
    const code = await generate({
      sources: buildSources(tmpRepo, outputDir),
      release: 'r999',
      domain: 'core',
      dryRun: false,
      verbose: false,
    });
    expect(code).toBe(1);
  });

  it('missing instruction directory → returns exit code 1 (FR-CLI-0031)', async () => {
    // instructionsSource with no release/domain dirs → buildVfs throws
    const emptyRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-empty-'));
    fs.mkdirSync(path.join(emptyRepo, '.git'), { recursive: true });
    try {
      const outputDir = path.join(emptyRepo, 'out');
      const code = await generate({
        sources: buildSources(emptyRepo, outputDir),
        release: 'r2',
        domain: 'core',
        dryRun: false,
        verbose: false,
      });
      expect(code).toBe(1);
    } finally {
      fs.rmSync(emptyRepo, { recursive: true, force: true });
    }
  });

  it('soft errors (bootstrap size violation) → exit code 1 (NFR-0004/QF-2, G-1)', async () => {
    // Write a plugin-files-mode.md with >10000 chars to trigger the soft error path.
    // The generate() must return exit 1 even though all output is still emitted.
    const instrRulesDir = path.join(tmpRepo, 'instructions', 'r2', 'core', 'rules');
    const oversizeFile = path.join(instrRulesDir, 'plugin-files-mode.md');
    const originalContent = fs.existsSync(oversizeFile) ? fs.readFileSync(oversizeFile, 'utf-8') : null;

    const oversizeBody = '# Plugin Files Mode\n\n' + 'X'.repeat(11000);
    fs.writeFileSync(
      oversizeFile,
      `---\nname: plugin-files-mode\ndescription: Oversize lead\nalwaysApply: true\napplyTo: "**"\n---\n${oversizeBody}`,
      'utf-8',
    );

    let stderrCapture = '';
    const origStderr = process.stderr.write.bind(process.stderr);
    (process.stderr as NodeJS.WriteStream).write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      if (typeof chunk === 'string') stderrCapture += chunk;
      else if (Buffer.isBuffer(chunk)) stderrCapture += chunk.toString('utf-8');
      return true;
    }) as typeof process.stderr.write;

    let code: number;
    const oversizeOutputDir = path.join(tmpRepo, 'out-oversize');
    try {
      code = await generate({
        sources: buildSources(tmpRepo, oversizeOutputDir),
        release: 'r2',
        domain: 'core',
        dryRun: false,
        verbose: false,
      });
    } finally {
      (process.stderr as NodeJS.WriteStream).write = origStderr;
      // Restore original file
      if (originalContent !== null) {
        fs.writeFileSync(oversizeFile, originalContent, 'utf-8');
      } else {
        fs.unlinkSync(oversizeFile);
      }
    }

    // NFR-0004: soft error → exit 1
    expect(code!).toBe(1);
    // Violation reported to stderr naming the file
    expect(stderrCapture).toContain('plugin-files-mode');
    expect(stderrCapture).toContain('Bootstrap entry exceeds');
    // Output is still emitted (run-to-completion)
    const outputFiles = fs.readdirSync(oversizeOutputDir).length;
    expect(outputFiles).toBeGreaterThan(0);
  });

  it('r3 with missing bundles → returns exit code 1 (hard error propagation)', async () => {
    // r3 = deterministicHooks; bundles dir exists but files are missing → pluginSyncBundles → hard error
    const r3Repo = buildFakeRepo();
    // Create bundle dirs for r3 but populate only partial bundles (trigger missing-count error)
    for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex', 'core-cursor-standalone', 'core-copilot-standalone']) {
      const bundleDir = path.join(r3Repo, 'hooks', 'dist', 'bundles', target);
      fs.mkdirSync(bundleDir, { recursive: true });
      // Only 1 of 5 expected bundles — triggers missingCount > 0 hard error
      fs.writeFileSync(path.join(bundleDir, 'dangerous-actions.js'), '// stub');
    }
    try {
      const outputDir = path.join(r3Repo, 'out-r3');
      const code = await generate({
        sources: buildSources(r3Repo, outputDir),
        release: 'r3',
        domain: 'core',
        dryRun: false,
        verbose: false,
      });
      // Missing bundles → hard errors → exit 1
      expect(code).toBe(1);
    } finally {
      fs.rmSync(r3Repo, { recursive: true, force: true });
    }
  });
});
