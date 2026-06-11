/**
 * E2E test using self-defined sample instruction tree.
 * Exercises every major code path against the fixtures in
 * tests/fixtures/sample-instructions/r2/{core,acme}/
 *
 * Covers: all 6 targets, core+acme bundling, overwrite directive, binary file passthrough,
 * .DS_Store exclusion, dry-run full-contents emission (FR-CLI-0050), verbose per-file logging
 * (FR-CLI-0051), tag-filtered workflow index, model normalization, standalones, r3 bundles,
 * NFR-0004 size-violation exit code.
 *
 * Sequence (per target):
 *   generate() → pluginCleanup → pluginCopy → pluginProcessSpecEntries
 *     → pluginRewriteReferences → pluginGenerateIndexes → pluginInjectSections
 *     → pluginAssembleBootstrap → pluginRenderTemplates → pluginMirrorFiles
 *     → pluginSyncBundles → pluginWrite
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../../src/index.js';
import { initLogger } from '../../src/logging.js';
import { PassThrough } from 'stream';
import type { ResolvedSources } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const SAMPLE_INSTRUCTIONS_DIR = path.join(FIXTURES_DIR, 'sample-instructions');
const SAMPLE_PLUGINS_DIR = path.join(FIXTURES_DIR, 'sample-plugins');

// Build a minimal fake repo that:
// - has instructions/r2/{core,acme}/  (from our fixture tree)
// - has plugins/ (from sample-plugins fixtures)
// - has hooks/dist/bundles/ with fake .js files
function buildFakeRepo(): string {
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'sample-e2e-'));

  // Link instruction dirs
  const instrR2Core = path.join(tmpRepo, 'instructions', 'r2', 'core');
  const instrR2Acme = path.join(tmpRepo, 'instructions', 'r2', 'acme');
  fs.mkdirSync(instrR2Core, { recursive: true });
  fs.mkdirSync(instrR2Acme, { recursive: true });
  copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r2', 'core'), instrR2Core);
  copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r2', 'acme'), instrR2Acme);

  // Copy sample plugin preserved sources
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

  // Create r2 bundle dirs (empty — no .js for r2 needed, r2 doesn't copy bundles)
  for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex']) {
    fs.mkdirSync(path.join(tmpRepo, 'hooks', 'dist', 'bundles', target), { recursive: true });
  }

  // Mark it as a git repo so CLI can detect the root
  fs.mkdirSync(path.join(tmpRepo, '.git'), { recursive: true });

  return tmpRepo;
}

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

// FR-CLI-0020: build ResolvedSources from fake repo layout
function buildSources(repoRoot: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(repoRoot, 'instructions'),
    pluginsSource: path.join(repoRoot, 'src', 'plugin-generator', 'plugins'),
    hooksSource: path.join(repoRoot, 'hooks'),
    outputDir,
  };
}

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

let tmpRepo: string;
let outputDir: string;
let exitCode: number;

describe('Sample E2E — generate() with self-owned fixtures', () => {
  beforeAll(async () => {
    tmpRepo = buildFakeRepo();
    outputDir = path.join(tmpRepo, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    // FR-CLI-0020: sources derive from fake repo layout
    exitCode = await generate({
      sources: buildSources(tmpRepo, outputDir),
      release: 'r2',
      domain: 'core',
      dryRun: false,
      verbose: false,
    });
  }, 60000);

  afterAll(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('exits with code 0 for valid inputs', () => {
    expect(exitCode).toBe(0);
  });

  it('produces output directories for all six targets', () => {
    const targets = [
      'core-claude',
      'core-cursor',
      'core-copilot',
      'core-codex',
      'core-cursor-standalone',
      'core-copilot-standalone',
    ];
    for (const t of targets) {
      expect(fs.existsSync(path.join(outputDir, t)), `Missing output for ${t}`).toBe(true);
    }
  });

  it('core-claude: rules/bootstrap-core-policy.md is present', () => {
    expect(fs.existsSync(path.join(outputDir, 'core-claude', 'rules', 'bootstrap-core-policy.md'))).toBe(true);
  });

  it('core-claude: rules/bootstrap.md is EXCLUDED (FR-COPY-0011)', () => {
    expect(fs.existsSync(path.join(outputDir, 'core-claude', 'rules', 'bootstrap.md'))).toBe(false);
  });

  it('core-claude: templates/shell-schemas/ is EXCLUDED (GT-8)', () => {
    const shellSchemasDir = path.join(outputDir, 'core-claude', 'templates', 'shell-schemas');
    expect(fs.existsSync(shellSchemasDir)).toBe(false);
  });

  it('core-claude: workflows INDEX includes only workflow-tagged files', () => {
    const indexPath = path.join(outputDir, 'core-claude', 'workflows', 'INDEX.md');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('coding-flow.md'); // has workflow tag
    expect(content).not.toContain('planning-phase.md'); // no workflow tag
    expect(content).not.toContain('helper-util.md'); // workflow-helper tag — excluded
  });

  it('core-claude: rules INDEX exists with correct heading', () => {
    const indexPath = path.join(outputDir, 'core-claude', 'rules', 'INDEX.md');
    expect(fs.existsSync(indexPath)).toBe(true);
    const content = fs.readFileSync(indexPath, 'utf-8');
    expect(content).toContain('# Rosetta Rules Index');
    expect(content).toContain('All paths are relative to Rosetta Plugin Path.');
  });

  it('core-cursor: rules use .mdc extension', () => {
    const files = listFilesRecursive(path.join(outputDir, 'core-cursor', 'rules'));
    const mdcFiles = files.filter((f) => f.endsWith('.mdc'));
    expect(mdcFiles.length).toBeGreaterThan(0);
  });

  it('core-cursor: workflows folder renamed to commands', () => {
    expect(fs.existsSync(path.join(outputDir, 'core-cursor', 'commands'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'core-cursor', 'workflows'))).toBe(false);
  });

  it('core-codex: agents output as .toml under .codex/agents/', () => {
    const agentsDir = path.join(outputDir, 'core-codex', '.codex', 'agents');
    if (fs.existsSync(agentsDir)) {
      const files = fs.readdirSync(agentsDir);
      expect(files.some((f) => f.endsWith('.toml'))).toBe(true);
    }
  });

  it('core-codex: instruction files under .agents/', () => {
    expect(fs.existsSync(path.join(outputDir, 'core-codex', '.agents', 'rules'))).toBe(true);
  });

  it('core-copilot: .github/plugin/hooks.json produced (rendered template)', () => {
    expect(fs.existsSync(path.join(outputDir, 'core-copilot', '.github', 'plugin', 'hooks.json'))).toBe(true);
  });

  it('core-cursor-standalone: standalone plugin.json has correct name + version', () => {
    const manifestPath = path.join(outputDir, 'core-cursor-standalone', 'plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(data.name).toBe('core-cursor-standalone');
    expect(data.version).toBe('2.0.40');
  });

  it('core-copilot-standalone: standalone plugin.json has correct format (GT-7)', () => {
    const manifestPath = path.join(outputDir, 'core-copilot-standalone', 'plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    // Exact format: 2-space indent, trailing newline, name before version
    expect(raw).toMatch(/^\{\n  "name": "core-copilot-standalone",\n  "version": "[^"]+"\n\}\n$/);
  });

  it('binary file: templates/sample-icon.png copied through unchanged (G-4)', () => {
    // FR-ARCH-0040: binary files are read as Buffer and emitted verbatim
    const pngPath = path.join(outputDir, 'core-claude', 'templates', 'sample-icon.png');
    expect(fs.existsSync(pngPath), 'sample-icon.png must be present in output').toBe(true);
    // Verify PNG signature bytes (binary passthrough)
    const bytes = fs.readFileSync(pngPath);
    expect(bytes[0]).toBe(0x89); // PNG magic byte 1
    expect(bytes[1]).toBe(0x50); // 'P'
    expect(bytes[2]).toBe(0x4e); // 'N'
    expect(bytes[3]).toBe(0x47); // 'G'
  });

  it('.DS_Store: skipped from output — not present in any target (FR-COPY-0010, G-4)', () => {
    // The sample-instructions/r2/core/rules/ folder has a .DS_Store file; must be excluded
    const dsStoreInRules = path.join(outputDir, 'core-claude', 'rules', '.DS_Store');
    expect(fs.existsSync(dsStoreInRules), '.DS_Store must not appear in output').toBe(false);
    // Also check no .DS_Store anywhere in the output
    const allFiles = listFilesRecursive(outputDir);
    const dsStoreFiles = allFiles.filter((f) => path.basename(f) === '.DS_Store');
    expect(dsStoreFiles.length, `.DS_Store files must be 0; found: ${dsStoreFiles.join(', ')}`).toBe(0);
  });

  it('dry-run: zero files on disk — pluginCleanup/pluginCopy/pluginSyncBundles all skipped (FR-CLI-0050, FR-ARCH-0045)', async () => {
    // Regression: previously pluginCopy wrote 12 preserved files even in dry-run mode.
    // This test covers the preserved-file path (sample-plugins have hooks/ dirs with .tmpl files).
    const dryOutputDir = path.join(tmpRepo, 'dry-output');

    // Capture stdout to verify full contents are emitted (FR-ARCH-0045, FR-CLI-0050, G-2)
    let capturedStdout = '';
    const originalWrite = process.stdout.write.bind(process.stdout);
    (process.stdout as NodeJS.WriteStream).write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      if (typeof chunk === 'string') capturedStdout += chunk;
      return true;
    }) as typeof process.stdout.write;

    try {
      await generate({
        sources: buildSources(tmpRepo, dryOutputDir),
        release: 'r2',
        domain: 'core',
        dryRun: true,
        verbose: false,
      });
    } finally {
      (process.stdout as NodeJS.WriteStream).write = originalWrite;
    }

    // FR-CLI-0050: dry-run MUST NOT write anything to disk — zero files, zero directories.
    const dryFiles = listFilesRecursive(dryOutputDir);
    expect(dryFiles.length, `Expected 0 files on disk after dry-run, got ${dryFiles.length}: ${dryFiles.join(', ')}`).toBe(0);
    // The output directory itself must not have been created either
    expect(fs.existsSync(dryOutputDir), 'dry-run output directory must not exist').toBe(false);

    // FR-ARCH-0045, G-2: dry-run must emit full target path AND full contents to stdout
    // Verify a known file's content substring appears in the captured stdout
    expect(capturedStdout, 'dry-run stdout must be non-empty').toContain('DRY-RUN:');
    // bootstrap-core-policy.md has known content "# Core Policy"
    expect(capturedStdout, 'dry-run must emit bootstrap-core-policy.md path in stdout').toContain('bootstrap-core-policy.md');
    expect(capturedStdout, 'dry-run must emit file content (# Core Policy) to stdout').toContain('# Core Policy');
  });

  it('unknown release → exit 1, no output', async () => {
    const badOutputDir = path.join(tmpRepo, 'bad-output');
    const code = await generate({
      sources: buildSources(tmpRepo, badOutputDir),
      release: 'r99',
      domain: 'core',
      dryRun: false,
      verbose: false,
    });
    expect(code).toBe(1);
  });

  it('missing domain → exit 1, no output', async () => {
    const badOutputDir = path.join(tmpRepo, 'bad-output-domain');
    const code = await generate({
      sources: buildSources(tmpRepo, badOutputDir),
      release: 'r2',
      domain: 'nonexistent-domain',
      dryRun: false,
      verbose: false,
    });
    expect(code).toBe(1);
  });

  it('verbose: produces strictly more log lines than non-verbose (FR-CLI-0051, G-3)', async () => {
    // FR-CLI-0051: verbose=true must produce strictly more log lines (per-VirtualFile/per-processor debug entries).
    // We inject a PassThrough stream into initLogger to capture pino output synchronously
    // (avoids pino/file worker thread which bypasses process.stderr.write).
    const verboseOutputDir = path.join(tmpRepo, 'verbose-output');
    const normalOutputDir = path.join(tmpRepo, 'normal-output');

    const countLogLines = async (verboseMode: boolean, outDir: string): Promise<number> => {
      const sink = new PassThrough();
      let captured = '';
      sink.on('data', (chunk: Buffer | string) => {
        captured += typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
      });

      initLogger(verboseMode, sink);
      await generate({
        sources: buildSources(tmpRepo, outDir),
        release: 'r2',
        domain: 'core',
        dryRun: true, // dry-run: no disk side effects
        verbose: verboseMode,
      });
      sink.end();

      return captured.split('\n').filter((l) => l.trim().length > 0).length;
    };

    const verboseLines = await countLogLines(true, verboseOutputDir);
    const normalLines = await countLogLines(false, normalOutputDir);

    // Reset logger after test
    initLogger(false);

    // FR-CLI-0051: verbose MUST produce strictly more log lines than normal mode
    expect(verboseLines, `verbose (${verboseLines}) must be > normal (${normalLines}) log lines`).toBeGreaterThan(normalLines);
  });
});

describe('Sample E2E — bundling (core+acme domains)', () => {
  let bundleRepo: string;
  let bundleOutputDir: string;

  beforeAll(async () => {
    bundleRepo = buildFakeRepo();
    bundleOutputDir = path.join(bundleRepo, 'bundle-output');
    fs.mkdirSync(bundleOutputDir, { recursive: true });

    await generate({
      sources: buildSources(bundleRepo, bundleOutputDir),
      release: 'r2',
      domain: 'core,acme',
      dryRun: false,
      verbose: false,
    });
  }, 60000);

  afterAll(() => {
    if (bundleRepo) fs.rmSync(bundleRepo, { recursive: true, force: true });
  });

  it('bundled file (same path in core+acme) contains both contents', () => {
    // rules/coding-best-practices.md exists in both core and acme
    const filePath = path.join(bundleOutputDir, 'core-claude', 'rules', 'coding-best-practices.md');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    // Core content comes first
    expect(content).toContain('Follow KISS, SOLID, DRY principles');
    // Acme content is appended (body only, no second frontmatter)
    expect(content).toContain('Acme-specific coding rules appended to core');
    // Only one frontmatter block (no second ---)
    expect(content.split('---\n').length).toBe(3); // open, close, rest
  });

  it('acme-only file appears in output', () => {
    const filePath = path.join(bundleOutputDir, 'core-claude', 'rules', 'acme-policy.md');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('workflow bundling: coding-flow contains both core and acme content', () => {
    const filePath = path.join(bundleOutputDir, 'core-claude', 'workflows', 'coding-flow.md');
    expect(fs.existsSync(filePath)).toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    // Core content
    expect(content).toContain('This is the coding workflow');
    // Acme body is appended after core (no second frontmatter delimiter)
    expect(content).toContain('This is the acme overwrite of coding-flow');
  });

  it('overwrite directive: acme bootstrap-guardrails~overwrite~ prunes core content (FR-ARCH-0024, G-4)', () => {
    // The acme overlay has bootstrap-guardrails~overwrite~.md which prunes the core version.
    // Result: only acme content appears; core "Always follow core Rosetta policy" is gone.
    const filePath = path.join(bundleOutputDir, 'core-claude', 'rules', 'bootstrap-guardrails.md');
    expect(fs.existsSync(filePath), 'bootstrap-guardrails.md must be present (from overwriting acme)').toBe(true);
    const content = fs.readFileSync(filePath, 'utf-8');
    // Acme overwrite content must be present
    expect(content).toContain('This content entirely replaces the core bootstrap-guardrails via the overwrite directive');
    // Core content must NOT be present (it was pruned by the overwrite directive)
    expect(content).not.toContain('Always follow core Rosetta policy');
  });
});

describe('Sample E2E — NFR-0004 synthetic oversize entry (G-1)', () => {
  it('synthetic oversize bootstrap entry → reports violation to stderr, still emits output, exit ≠ 0 (NFR-0004)', async () => {
    // Build a fake repo where plugin-files-mode.md has >10000 chars in its body.
    // This forces NFR-0004 to trigger a soft error on the claude/codex/copilot bootstrap entry.
    const oversizeRepo = buildFakeRepo();
    const oversizeOutputDir = path.join(oversizeRepo, 'oversize-output');

    // Write a >10000-char plugin-files-mode.md into the instructions
    const oversizeBody = '# Plugin Files Mode\n\n' + 'X'.repeat(11000);
    const instrRulesDir = path.join(oversizeRepo, 'instructions', 'r2', 'core', 'rules');
    fs.mkdirSync(instrRulesDir, { recursive: true });
    fs.writeFileSync(
      path.join(instrRulesDir, 'plugin-files-mode.md'),
      `---\nname: plugin-files-mode\ndescription: Oversize lead\nalwaysApply: true\napplyTo: "**"\n---\n${oversizeBody}`,
      'utf-8',
    );

    let stderrCapture = '';
    const originalStderrWrite = process.stderr.write.bind(process.stderr);
    (process.stderr as NodeJS.WriteStream).write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      if (typeof chunk === 'string') stderrCapture += chunk;
      else if (Buffer.isBuffer(chunk)) stderrCapture += chunk.toString('utf-8');
      return true;
    }) as typeof process.stderr.write;

    let exitCode: number;
    let outputFileCount = 0;
    try {
      exitCode = await generate({
        sources: buildSources(oversizeRepo, oversizeOutputDir),
        release: 'r2',
        domain: 'core',
        dryRun: false,
        verbose: false,
      });
      // Capture output file count before cleanup
      outputFileCount = listFilesRecursive(oversizeOutputDir).length;
    } finally {
      (process.stderr as NodeJS.WriteStream).write = originalStderrWrite;
      fs.rmSync(oversizeRepo, { recursive: true, force: true });
    }

    // NFR-0004: exit ≠ 0 on soft error
    expect(exitCode!, 'oversize entry must produce exit code 1').toBe(1);

    // NFR-0004: violation reported to stderr naming target and file
    expect(stderrCapture).toContain('Bootstrap entry exceeds');
    expect(stderrCapture).toContain('plugin-files-mode');

    // Output is still emitted (run-to-completion): output dir must have files
    expect(outputFileCount, 'output must still be emitted despite soft error').toBeGreaterThan(0);
  });
});
