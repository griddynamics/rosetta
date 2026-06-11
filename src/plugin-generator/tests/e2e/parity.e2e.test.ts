/**
 * Parity E2E test — primary acceptance gate (NFR-0001).
 *
 * Runs generate() against real instructions/r2/core and instructions/r3/core,
 * then performs a recursive byte-diff vs agents/TEMP/old-gen-r2/ and agents/TEMP/old-gen-r3/.
 * Asserts the diff is empty.
 *
 * Skips gracefully (with clear message) if baseline dirs are absent.
 *
 * Per-target sub-assertions for parity-critical files:
 *   - claude hooks.json (bootstrap payload present)
 *   - codex hooks.json (codex form)
 *   - copilot .github/plugin/hooks.json
 *   - a codex TOML agent file
 *   - a rules+workflows INDEX.md
 *   - standalone plugin.json format
 *   - copilot root hooks.json MD5 == .github/plugin/hooks.json MD5
 *   - codex .codex/hooks.json MD5 == .codex-plugin/hooks.json MD5
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { generate } from '../../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root: go up from tests/e2e/ → tests/ → plugin-generator/ → src/ → rosetta/
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

const BASELINE_R2 = path.join(REPO_ROOT, 'agents', 'TEMP', 'old-gen-r2');
const BASELINE_R3 = path.join(REPO_ROOT, 'agents', 'TEMP', 'old-gen-r3');

const r2BaselineExists = fs.existsSync(BASELINE_R2);
const r3BaselineExists = fs.existsSync(BASELINE_R3);

function md5(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(buf).digest('hex');
}

/**
 * Recursive byte-diff: compare two directories for byte-for-byte equality.
 * Returns list of differences (empty = pass).
 */
function diffDirs(generated: string, baseline: string): string[] {
  const diffs: string[] = [];

  function walk(relDir: string): void {
    const genDir = path.join(generated, relDir);
    const baseDir = path.join(baseline, relDir);

    const genEntries = fs.existsSync(genDir)
      ? fs.readdirSync(genDir, { withFileTypes: true })
      : [];
    const baseEntries = fs.existsSync(baseDir)
      ? fs.readdirSync(baseDir, { withFileTypes: true })
      : [];

    const genNames = new Set(genEntries.map((e) => e.name));
    const baseNames = new Set(baseEntries.map((e) => e.name));

    for (const name of baseNames) {
      if (!genNames.has(name)) {
        diffs.push(`MISSING in generated: ${path.join(relDir, name)}`);
      }
    }
    for (const name of genNames) {
      if (!baseNames.has(name)) {
        diffs.push(`EXTRA in generated: ${path.join(relDir, name)}`);
      }
    }

    for (const entry of baseEntries) {
      const relPath = relDir ? path.join(relDir, entry.name) : entry.name;
      if (entry.isDirectory()) {
        walk(relPath);
      } else {
        const genFile = path.join(generated, relPath);
        const baseFile = path.join(baseline, relPath);
        if (!fs.existsSync(genFile)) continue;
        const genBuf = fs.readFileSync(genFile);
        const baseBuf = fs.readFileSync(baseFile);
        if (!genBuf.equals(baseBuf)) {
          diffs.push(`CONTENT DIFF: ${relPath} (gen=${genBuf.length}B vs base=${baseBuf.length}B)`);
        }
      }
    }
  }

  walk('');
  return diffs;
}

// ─── R2 Parity ────────────────────────────────────────────────────────────────

describe('Parity E2E — R2 (core)', () => {
  let r2OutputDir: string;
  let tmpRepo: string;
  let r2ExitCode: number;

  beforeAll(async () => {
    if (!r2BaselineExists) return; // skip setup if baseline missing

    tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-r2-'));
    r2OutputDir = path.join(tmpRepo, 'output');
    fs.mkdirSync(r2OutputDir, { recursive: true });

    r2ExitCode = await generate({
      repoRoot: REPO_ROOT,
      release: 'r2',
      domain: 'core',
      outputDir: r2OutputDir,
      dryRun: false,
      verbose: false,
    });
  }, 120000);

  afterAll(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('skips if baseline missing', () => {
    if (!r2BaselineExists) {
      console.log('SKIP: agents/TEMP/old-gen-r2 not found — parity check skipped');
      return;
    }
    expect(r2BaselineExists).toBe(true);
  });

  it('generate() exits 0 for r2/core', () => {
    if (!r2BaselineExists) return;
    expect(r2ExitCode).toBe(0);
  });

  it('byte-diff r2 core-claude is empty (NFR-0001)', () => {
    if (!r2BaselineExists) return;
    const diffs = diffDirs(
      path.join(r2OutputDir, 'core-claude'),
      path.join(BASELINE_R2, 'core-claude'),
    );
    if (diffs.length > 0) {
      console.error('R2 core-claude diffs:\n' + diffs.slice(0, 20).join('\n'));
    }
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r2 core-cursor is empty', () => {
    if (!r2BaselineExists) return;
    const diffs = diffDirs(
      path.join(r2OutputDir, 'core-cursor'),
      path.join(BASELINE_R2, 'core-cursor'),
    );
    if (diffs.length > 0) console.error('R2 core-cursor diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r2 core-copilot is empty', () => {
    if (!r2BaselineExists) return;
    const diffs = diffDirs(
      path.join(r2OutputDir, 'core-copilot'),
      path.join(BASELINE_R2, 'core-copilot'),
    );
    if (diffs.length > 0) console.error('R2 core-copilot diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r2 core-codex is empty', () => {
    if (!r2BaselineExists) return;
    const diffs = diffDirs(
      path.join(r2OutputDir, 'core-codex'),
      path.join(BASELINE_R2, 'core-codex'),
    );
    if (diffs.length > 0) console.error('R2 core-codex diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r2 core-cursor-standalone is empty', () => {
    if (!r2BaselineExists) return;
    const diffs = diffDirs(
      path.join(r2OutputDir, 'core-cursor-standalone'),
      path.join(BASELINE_R2, 'core-cursor-standalone'),
    );
    if (diffs.length > 0) console.error('R2 cursor-standalone diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r2 core-copilot-standalone is empty', () => {
    if (!r2BaselineExists) return;
    const diffs = diffDirs(
      path.join(r2OutputDir, 'core-copilot-standalone'),
      path.join(BASELINE_R2, 'core-copilot-standalone'),
    );
    if (diffs.length > 0) console.error('R2 copilot-standalone diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  // ── Sub-assertions on parity-critical files ──

  it('r2 claude hooks.json has SessionStart hooks array', () => {
    if (!r2BaselineExists) return;
    const f = path.join(r2OutputDir, 'core-claude', 'hooks', 'hooks.json');
    expect(fs.existsSync(f)).toBe(true);
    const data = JSON.parse(fs.readFileSync(f, 'utf-8'));
    expect(data.hooks?.SessionStart).toBeDefined();
    expect(Array.isArray(data.hooks.SessionStart)).toBe(true);
  });

  it('r2 codex .codex/hooks.json exists and is byte-identical to .codex-plugin/hooks.json (GT-4)', () => {
    if (!r2BaselineExists) return;
    const f1 = path.join(r2OutputDir, 'core-codex', '.codex-plugin', 'hooks.json');
    const f2 = path.join(r2OutputDir, 'core-codex', '.codex', 'hooks.json');
    expect(fs.existsSync(f1)).toBe(true);
    expect(fs.existsSync(f2)).toBe(true);
    expect(md5(f1)).toBe(md5(f2));
  });

  it('r2 copilot root hooks.json is byte-identical to .github/plugin/hooks.json (GT-4)', () => {
    if (!r2BaselineExists) return;
    const f1 = path.join(r2OutputDir, 'core-copilot', '.github', 'plugin', 'hooks.json');
    const f2 = path.join(r2OutputDir, 'core-copilot', 'hooks.json');
    expect(fs.existsSync(f1)).toBe(true);
    expect(fs.existsSync(f2)).toBe(true);
    expect(md5(f1)).toBe(md5(f2));
  });

  it('r2 codex has .toml agent files under .codex/agents/', () => {
    if (!r2BaselineExists) return;
    const agentsDir = path.join(r2OutputDir, 'core-codex', '.codex', 'agents');
    expect(fs.existsSync(agentsDir)).toBe(true);
    const files = fs.readdirSync(agentsDir);
    expect(files.some((f) => f.endsWith('.toml'))).toBe(true);
  });

  it('r2 rules INDEX.md has correct GT-5 format', () => {
    if (!r2BaselineExists) return;
    const f = path.join(r2OutputDir, 'core-claude', 'rules', 'INDEX.md');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf-8');
    expect(content).toMatch(/^# Rosetta Rules Index\n\nAll paths are relative to Rosetta Plugin Path\./);
  });

  it('r2 cursor standalone plugin.json has 2-space indent + trailing newline (GT-7)', () => {
    if (!r2BaselineExists) return;
    const f = path.join(r2OutputDir, 'core-cursor-standalone', 'plugin.json');
    expect(fs.existsSync(f)).toBe(true);
    const raw = fs.readFileSync(f, 'utf-8');
    expect(raw).toMatch(/^\{\n  "name": "core-cursor-standalone",\n  "version": "[^"]+"\n\}\n$/);
  });
});

// ─── R3 Parity ────────────────────────────────────────────────────────────────

describe('Parity E2E — R3 (core)', () => {
  let r3OutputDir: string;
  let tmpRepo: string;
  let r3ExitCode: number;

  beforeAll(async () => {
    if (!r3BaselineExists) return;

    tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-r3-'));
    r3OutputDir = path.join(tmpRepo, 'output');
    fs.mkdirSync(r3OutputDir, { recursive: true });

    r3ExitCode = await generate({
      repoRoot: REPO_ROOT,
      release: 'r3',
      domain: 'core',
      outputDir: r3OutputDir,
      dryRun: false,
      verbose: false,
    });
  }, 120000);

  afterAll(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('skips if baseline missing', () => {
    if (!r3BaselineExists) {
      console.log('SKIP: agents/TEMP/old-gen-r3 not found — parity check skipped');
      return;
    }
    expect(r3BaselineExists).toBe(true);
  });

  it('generate() exits 1 for r3/core (NFR-0004: plugin-files-mode soft violation)', () => {
    // r3's plugin-files-mode.md body + bootstrap prefix = ~10926 chars additionalContext,
    // which builds a jsonPayload of ~11182 chars — genuinely exceeding the 10000-char limit
    // (NFR-0004). The soft error fires, exit is 1, but ALL output files are still written
    // (verified by the byte-diff tests below). This is correct NFR-0004 behavior.
    if (!r3BaselineExists) return;
    expect(r3ExitCode).toBe(1);
  });

  it('byte-diff r3 core-claude is empty (NFR-0001)', () => {
    if (!r3BaselineExists) return;
    const diffs = diffDirs(
      path.join(r3OutputDir, 'core-claude'),
      path.join(BASELINE_R3, 'core-claude'),
    );
    if (diffs.length > 0) console.error('R3 core-claude diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r3 core-cursor is empty', () => {
    if (!r3BaselineExists) return;
    const diffs = diffDirs(
      path.join(r3OutputDir, 'core-cursor'),
      path.join(BASELINE_R3, 'core-cursor'),
    );
    if (diffs.length > 0) console.error('R3 core-cursor diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r3 core-copilot is empty', () => {
    if (!r3BaselineExists) return;
    const diffs = diffDirs(
      path.join(r3OutputDir, 'core-copilot'),
      path.join(BASELINE_R3, 'core-copilot'),
    );
    if (diffs.length > 0) console.error('R3 core-copilot diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r3 core-codex is empty', () => {
    if (!r3BaselineExists) return;
    const diffs = diffDirs(
      path.join(r3OutputDir, 'core-codex'),
      path.join(BASELINE_R3, 'core-codex'),
    );
    if (diffs.length > 0) console.error('R3 core-codex diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r3 core-cursor-standalone is empty', () => {
    if (!r3BaselineExists) return;
    const diffs = diffDirs(
      path.join(r3OutputDir, 'core-cursor-standalone'),
      path.join(BASELINE_R3, 'core-cursor-standalone'),
    );
    if (diffs.length > 0) console.error('R3 cursor-standalone diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('byte-diff r3 core-copilot-standalone is empty', () => {
    if (!r3BaselineExists) return;
    const diffs = diffDirs(
      path.join(r3OutputDir, 'core-copilot-standalone'),
      path.join(BASELINE_R3, 'core-copilot-standalone'),
    );
    if (diffs.length > 0) console.error('R3 copilot-standalone diffs:\n' + diffs.slice(0, 20).join('\n'));
    expect(diffs).toHaveLength(0);
  });

  it('r3 claude hooks.json has deterministic_hooks blocks (PreToolUse/PostToolUse)', () => {
    if (!r3BaselineExists) return;
    const f = path.join(r3OutputDir, 'core-claude', 'hooks', 'hooks.json');
    expect(fs.existsSync(f)).toBe(true);
    const content = fs.readFileSync(f, 'utf-8');
    // r3 has PreToolUse block
    expect(content).toContain('PreToolUse');
  });

  it('r3 claude has .js bundle files in hooks/', () => {
    if (!r3BaselineExists) return;
    const hooksDir = path.join(r3OutputDir, 'core-claude', 'hooks');
    expect(fs.existsSync(hooksDir)).toBe(true);
    const files = fs.readdirSync(hooksDir);
    expect(files.some((f) => f.endsWith('.js'))).toBe(true);
  });

  it('r3 codex .codex/hooks.json is byte-identical to .codex-plugin/hooks.json', () => {
    if (!r3BaselineExists) return;
    const f1 = path.join(r3OutputDir, 'core-codex', '.codex-plugin', 'hooks.json');
    const f2 = path.join(r3OutputDir, 'core-codex', '.codex', 'hooks.json');
    expect(fs.existsSync(f1)).toBe(true);
    expect(fs.existsSync(f2)).toBe(true);
    expect(md5(f1)).toBe(md5(f2));
  });

  it('r3 copilot root hooks.json is byte-identical to .github/plugin/hooks.json', () => {
    if (!r3BaselineExists) return;
    const f1 = path.join(r3OutputDir, 'core-copilot', '.github', 'plugin', 'hooks.json');
    const f2 = path.join(r3OutputDir, 'core-copilot', 'hooks.json');
    expect(fs.existsSync(f1)).toBe(true);
    expect(fs.existsSync(f2)).toBe(true);
    expect(md5(f1)).toBe(md5(f2));
  });

  it('r3 codex has .js bundle files in .codex/hooks/', () => {
    if (!r3BaselineExists) return;
    const hooksDir = path.join(r3OutputDir, 'core-codex', '.codex', 'hooks');
    expect(fs.existsSync(hooksDir)).toBe(true);
    const files = fs.readdirSync(hooksDir);
    expect(files.some((f) => f.endsWith('.js'))).toBe(true);
  });
});
