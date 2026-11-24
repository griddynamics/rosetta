// FR-CLI-0012 — deterministic_hooks CLI default resolution, observed through the Antigravity
// target's own rendered hooks.json (core-antigravity/hooks.json): omitted flag → false (no
// PreToolUse advisory block); `--deterministic-hooks true` → true (PreToolUse block present).
// Mirrors the buildFakeRepo/buildSources helpers in generate.test.ts, extended with the real
// core-antigravity preserved source (read-only copy; plugin.json + hooks.json.tmpl only).
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
const REAL_PLUGINS_DIR = path.join(__dirname, '..', '..', 'plugins');

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
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-ag-cli-'));

  const instrR2Core = path.join(tmpRepo, 'instructions', 'r2', 'core');
  fs.mkdirSync(instrR2Core, { recursive: true });
  copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r2', 'core'), instrR2Core);

  const pluginsRoot = path.join(tmpRepo, 'src', 'rosettify-plugins', 'plugins');
  fs.mkdirSync(pluginsRoot, { recursive: true });
  for (const target of ['template-claude', 'template-cursor', 'template-copilot', 'template-codex']) {
    const src = path.join(SAMPLE_PLUGINS_DIR, target);
    if (fs.existsSync(src)) {
      const dest = path.join(pluginsRoot, target);
      fs.mkdirSync(dest, { recursive: true });
      copyDirSync(src, dest);
    }
  }
  // template-antigravity's real preserved source is tiny (plugin.json + hooks.json.tmpl) — copy
  // read-only from the repo (not modified) so the target's own pipeline runs realistically.
  copyDirSync(REAL_PLUGINS_DIR + '/template-antigravity', path.join(pluginsRoot, 'template-antigravity'));

  // Bundle directories are bare IDE ids (src/hooks/scripts/build-bundles.mjs).
  for (const ide of ['claude', 'cursor', 'copilot', 'codex', 'antigravity']) {
    fs.mkdirSync(path.join(tmpRepo, 'src', 'hooks', 'dist', 'bundles', ide), { recursive: true });
  }

  // DATA-CFG-0007: every run loads a plugin-set catalog at pre-flight.
  fs.copyFileSync(
    path.join(FIXTURES_DIR, 'sample-plugins.json'),
    path.join(tmpRepo, 'src', 'rosettify-plugins', 'plugins.json'),
  );

  fs.mkdirSync(path.join(tmpRepo, '.git'), { recursive: true });
  return tmpRepo;
}

function buildSources(repoRoot: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(repoRoot, 'instructions'),
    pluginsSource: path.join(repoRoot, 'src', 'rosettify-plugins', 'plugins'),
    hooksSource: path.join(repoRoot, 'src', 'hooks'),
    outputDir,
    profileSource: path.join(repoRoot, 'src', 'rosettify-plugins', 'profiles'),
    configPath: path.join(repoRoot, 'src', 'rosettify-plugins', 'plugins.json'),
  };
}

function readAntigravityHooksJson(outputDir: string): { rosetta: { PreInvocation: unknown[]; PreToolUse?: unknown[] } } {
  const raw = fs.readFileSync(path.join(outputDir, 'core-antigravity', 'hooks.json'), 'utf-8');
  return JSON.parse(raw);
}

describe('generate() — Antigravity deterministic_hooks CLI default (FR-CLI-0012)', () => {
  let tmpRepo: string;

  beforeAll(() => {
    tmpRepo = buildFakeRepo();
  });

  afterAll(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('no --deterministic-hooks flag → effective value resolves to false (no PreToolUse advisory block)', async () => {
    const outputDir = path.join(tmpRepo, 'out-ag-default');
    const code = await generate({
      sources: buildSources(tmpRepo, outputDir),
      release: 'r2',
      domain: 'core',
      dryRun: false,
      verbose: false,
      // deterministicHooks intentionally omitted — mirrors "no argument supplied" from the CLI
    });
    expect(code).toBe(0);
    const parsed = readAntigravityHooksJson(outputDir);
    expect(parsed.rosetta.PreToolUse).toBeUndefined();
  });

  it('--deterministic-hooks true → effective value resolves to true (PreToolUse advisory block present)', async () => {
    const outputDir = path.join(tmpRepo, 'out-ag-true');
    // deterministicHooks:true makes pluginSyncBundles required for EVERY target in this run
    // (generate() always processes all 7 specs) — stub bundle files for all of them so only
    // the Antigravity-specific effective-value behavior is under test here, not bundle sync.
    // Every module the fixture set declares, plus read-once's support modules. Bundle dirs are
    // keyed by IDE FAMILY (standalones read their parent's), so five dirs cover all seven targets.
    const bundleFiles = [
      'dangerous-actions.js', 'codemap-refresh.js', 'lint-format-advisory.js',
      'loose-files.js', 'md-file-advisory.js',
      'read-once.js', 'read-once-reset.js', 'read-once-shared.js',
    ];
    for (const ide of ['claude', 'cursor', 'copilot', 'codex', 'antigravity']) {
      const bundleDir = path.join(tmpRepo, 'src', 'hooks', 'dist', 'bundles', ide);
      fs.mkdirSync(bundleDir, { recursive: true });
      for (const f of bundleFiles) fs.writeFileSync(path.join(bundleDir, f), '// stub');
    }

    const code = await generate({
      sources: buildSources(tmpRepo, outputDir),
      release: 'r2',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: true,
    });
    expect(code).toBe(0);
    const parsed = readAntigravityHooksJson(outputDir);
    expect(parsed.rosetta.PreToolUse).toBeDefined();
    expect(Array.isArray(parsed.rosetta.PreToolUse)).toBe(true);
  });
});
