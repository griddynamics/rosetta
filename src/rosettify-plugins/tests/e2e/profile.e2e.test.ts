/**
 * Profile E2E — the end-to-end proof that a profiled build actually works
 * (FR-PROF-0020/0030/0040, gate G-C).
 *
 * Where parity.e2e.test.ts proves the profiled output has the right SHAPE (path-set parity),
 * this file proves the profiled build does the right THING with real repo inputs:
 *   - a profiled run writes every target to its `core-*-light` destination and never touches a
 *     pre-existing unsuffixed `core-*` destination (FR-PROF-0020)
 *   - the profile-scoped fixture (`coding-flow~profile-lightweight-only~overwrite~.md`) supersedes
 *     the base `coding-flow` body ONLY in the light plugins (FR-PROF-0030.AC1)
 *   - a no-profile run excludes that same fixture entirely — the base body lands untouched, and no
 *     `-light` destination is written at all (FR-PROF-0040)
 *   - the manifest name carries the profile's suffix in the light build and is unchanged in the
 *     base build (FR-PROF-0021)
 *   - an invalid profile name aborts with a non-zero exit and writes nothing (FR-PROF-0001, G-D)
 *
 * Generation runs: exactly THREE generate() calls — one profiled full run, one no-profile full
 * run, and one invalid-profile call that aborts at pre-flight (before buildVfs, so it never reaches
 * the expensive VFS-build/pipeline work the other two runs do). Each of the two full runs writes
 * into its own fresh temp directory; the repo's committed `plugins/` tree is never the output
 * target of any run here.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../../src/index.js';
import type { ResolvedSources } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root: up from tests/e2e/ → tests/ → rosettify-plugins/ → src/ → <repo root>.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PLUGINS_SOURCE = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins');
const PROFILE_SOURCE = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'profiles');

const TARGETS = [
  'core-claude',
  'core-cursor',
  'core-copilot',
  'core-codex',
  'core-cursor-standalone',
  'core-copilot-standalone',
  'core-antigravity',
] as const;

// Marker text unique to the profile fixture's body (instructions/r3/core/workflows/
// coding-flow~profile-lightweight-only~overwrite~.md) — distinguishes it from the base
// coding-flow.md body without depending on any other part of that document's content.
const LIGHT_MARKER = 'PROFILE TEST CONTENT — lightweight profile.';

function buildSources(outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(REPO_ROOT, 'instructions'),
    pluginsSource: PLUGINS_SOURCE,
    hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
    outputDir,
    profileSource: PROFILE_SOURCE,
  };
}

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...listFilesRecursive(full));
    else results.push(full);
  }
  return results;
}

// generate() writes user-facing error messages directly to process.stderr; the invalid-profile
// test only asserts the exit code and the (absent) output, so keep the run quiet (mirrors
// sample.e2e.test.ts's silencingStderr helper).
async function silencingStderr<T>(fn: () => Promise<T>): Promise<T> {
  const orig = process.stderr.write.bind(process.stderr);
  (process.stderr as NodeJS.WriteStream).write = (() => true) as typeof process.stderr.write;
  try {
    return await fn();
  } finally {
    (process.stderr as NodeJS.WriteStream).write = orig;
  }
}

describe('Profile E2E — profiled build (--profile lightweight)', () => {
  let tmpRoot: string;
  let outputDir: string;
  let exitCode: number;

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-e2e-light-'));
    outputDir = path.join(tmpRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    // Pre-seed a sentinel in the UNSUFFIXED destination that a profiled run must never touch
    // (FR-PROF-0020: the suffix applies to spec.destination only, and every one of the seven
    // targets writes to its suffixed destination — none write to the unsuffixed one).
    const sentinelDir = path.join(outputDir, 'core-claude');
    fs.mkdirSync(sentinelDir, { recursive: true });
    fs.writeFileSync(path.join(sentinelDir, 'SENTINEL.txt'), 'untouched', 'utf-8');

    exitCode = await generate({
      sources: buildSources(outputDir),
      release: 'r3',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
      profile: 'lightweight',
    });
  }, 180000);

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('exits 0', () => {
    expect(exitCode).toBe(0);
  });

  it('writes every target to its core-*-light destination (FR-PROF-0020.AC1)', () => {
    for (const target of TARGETS) {
      expect(fs.existsSync(path.join(outputDir, `${target}-light`)), `${target}-light missing`).toBe(true);
    }
  });

  it('does NOT touch the pre-existing unsuffixed core-claude destination', () => {
    const sentinelPath = path.join(outputDir, 'core-claude', 'SENTINEL.txt');
    expect(fs.existsSync(sentinelPath), 'sentinel file must survive untouched').toBe(true);
    expect(fs.readFileSync(sentinelPath, 'utf-8')).toBe('untouched');
    // Nothing else was written alongside it either — a profiled run writes core-claude-light,
    // never core-claude.
    const entries = fs.readdirSync(path.join(outputDir, 'core-claude'));
    expect(entries).toEqual(['SENTINEL.txt']);
  });

  it('light coding-flow body wins: the profile-scoped fixture supersedes the base document (FR-PROF-0030.AC1)', () => {
    const p = path.join(outputDir, 'core-claude-light', 'workflows', 'coding-flow.md');
    expect(fs.existsSync(p), 'core-claude-light/workflows/coding-flow.md must exist').toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain(LIGHT_MARKER);
  });

  it('light manifest name carries the -light suffix (FR-PROF-0021.AC1)', () => {
    const manifestPath = path.join(outputDir, 'core-claude-light', '.claude-plugin', 'plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(data.name).toBe('rosetta-light');
  });
});

describe('Profile E2E — no-profile run (regression guard, FR-PROF-0040)', () => {
  let tmpRoot: string;
  let outputDir: string;
  let exitCode: number;

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-e2e-base-'));
    outputDir = path.join(tmpRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    exitCode = await generate({
      sources: buildSources(outputDir),
      release: 'r3',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
      // no `profile` field: activeProfile === null
    });
  }, 180000);

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('exits 0', () => {
    expect(exitCode).toBe(0);
  });

  it('excludes the profile-scoped fixture entirely: base coding-flow body lands, not the light override (FR-PROF-0040.AC3)', () => {
    const p = path.join(outputDir, 'core-claude', 'workflows', 'coding-flow.md');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).not.toContain(LIGHT_MARKER);
  });

  it('base manifest name carries no suffix (FR-PROF-0040.AC2)', () => {
    const manifestPath = path.join(outputDir, 'core-claude', '.claude-plugin', 'plugin.json');
    expect(fs.existsSync(manifestPath)).toBe(true);
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(data.name).toBe('rosetta');
  });

  it('no core-*-light destination exists under a no-profile run (FR-PROF-0040.AC1)', () => {
    for (const target of TARGETS) {
      expect(fs.existsSync(path.join(outputDir, `${target}-light`))).toBe(false);
    }
  });
});

describe('Profile E2E — invalid profile name aborts before any output (FR-PROF-0001, G-D)', () => {
  it('non-zero exit and writes nothing', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-e2e-invalid-'));
    const outputDir = path.join(tmpRoot, 'output');
    try {
      const code = await silencingStderr(() => generate({
        sources: buildSources(outputDir),
        release: 'r3',
        domain: 'core',
        dryRun: false,
        verbose: false,
        deterministicHooks: false,
        profile: 'does-not-exist',
      }));
      expect(code).not.toBe(0);
      // Pre-flight abort happens before buildVfs — the output directory is never created.
      expect(fs.existsSync(outputDir), 'output dir must not be created on abort').toBe(false);
      expect(listFilesRecursive(outputDir)).toEqual([]);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
