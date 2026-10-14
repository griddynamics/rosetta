/**
 * Bootstrap SessionStart count E2E — real-instruction numeric guard (FR-HOOK-0007).
 *
 * Phase 12 finding: FR-HOOK-0007's numeric session-start entry counts (the acceptance criteria's
 * "9 entries for r2 / 5 for r3" for Claude/Copilot, "8 for r2 / 4 for r3" for Codex) were asserted
 * NOWHERE — the r3 counts were silently wrong by three for months before this flow corrected them.
 * `parity.e2e.test.ts` runs against the same real `instructions/` tree but is explicitly PATHS-ONLY
 * (never reads file content); `sample.e2e.test.ts` runs against synthetic fixtures, so a real-count
 * regression would never surface there either. This suite closes that gap: it generates BOTH r2 and
 * r3 from the REAL `instructions/` tree (not fixtures) and asserts the numeric SessionStart entry
 * counts, plus that the final entry in each payload is the plugin-root entry (FR-HOOK-0007's
 * "exactly one additional, SEPARATE... the final entry" contract) — pairing count with finality so
 * the guard can't pass on a payload that has the right length but the wrong last entry.
 *
 * r3 counts are lower than r2 because r3 consolidates the five split `bootstrap-*` rules into a
 * single `bootstrap-alwayson.md`; `BOOTSTRAP_MANIFEST_ORDER` (src/spec/bootstrap-manifest.ts) skips
 * the four r2-only basenames that are absent under r3, so the manifest naturally yields four fewer
 * entries (five split rules replaced by one consolidated rule) for Claude/Copilot, and the same
 * delta for Codex (whose payload is already one entry shorter than Claude/Copilot because the
 * workflows index is omitted for that target, per FR-VAR-0041).
 *
 * Payload shape differs by target — verified by direct inspection of the generated JSON, not
 * assumed:
 *   - Claude and Codex: JSON key `SessionStart` (capitalized), entries GROUPED as
 *     `hooks.SessionStart[].hooks[]` — the count is the SUM of the inner `hooks` arrays.
 *   - Copilot: JSON key `sessionStart` (lowercase), entries as a FLAT array `hooks.sessionStart[]`.
 *
 * Generated hook file locations (also verified by inspection):
 *   - Claude:  <target>/hooks/hooks.json
 *   - Codex:   <target>/.codex-plugin/hooks.json (and a <target>/.codex/hooks.json mirror,
 *              FR-STRUCT-0010 — both carry the same payload, so only the primary is asserted here)
 *   - Copilot: <target>/.github/plugin/hooks.json (and a <target>/hooks.json root mirror)
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

function buildSources(outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(REPO_ROOT, 'instructions'),
    pluginsSource: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins'),
    hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
    outputDir,
    profileSource: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'profiles'),
    configPath: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins.json'),
  };
}

interface CommandHook {
  command?: string;
  bash?: string;
  powershell?: string;
  [key: string]: unknown;
}

interface GroupedSessionStart {
  hooks: CommandHook[];
  [key: string]: unknown;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Claude/Codex shape: hooks.SessionStart is an array of groups, each with an inner `hooks` array.
// The effective entry count is the sum of the inner arrays; the "last entry overall" is the last
// element of the last group's inner array.
function flattenGrouped(sessionStart: GroupedSessionStart[]): CommandHook[] {
  return sessionStart.flatMap((group) => group.hooks);
}

// Real, generated repo state for both releases — built once, reused by every assertion below.
// D6 count change: every set now declares `indexes: []`, so the two virtual index entries
// (__rules_index__, __workflows_index__) are never present in the payload. Claude and Copilot
// therefore drop 2 entries each (9→7 for r2, 5→3 for r3) and Codex drops the 1 index it declared
// (8→7, 4→3), which is why all three now agree.
describe('Bootstrap SessionStart real-instruction counts (FR-HOOK-0007)', () => {
  let tmpR2: string;
  let tmpR3: string;
  let outR2: string;
  let outR3: string;

  beforeAll(async () => {
    tmpR2 = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-count-r2-'));
    outR2 = path.join(tmpR2, 'output');
    fs.mkdirSync(outR2, { recursive: true });
    await generate({
      sources: buildSources(outR2),
      release: 'r2',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
    });

    tmpR3 = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-count-r3-'));
    outR3 = path.join(tmpR3, 'output');
    fs.mkdirSync(outR3, { recursive: true });
    await generate({
      sources: buildSources(outR3),
      release: 'r3',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
    });
  }, 180000);

  afterAll(() => {
    if (tmpR2) fs.rmSync(tmpR2, { recursive: true, force: true });
    if (tmpR3) fs.rmSync(tmpR3, { recursive: true, force: true });
  });

  describe('Claude — hooks/hooks.json, grouped SessionStart', () => {
    function loadEntries(outputDir: string): CommandHook[] {
      const data = readJson(path.join(outputDir, 'core-claude', 'hooks', 'hooks.json')) as {
        hooks: { SessionStart: GroupedSessionStart[] };
      };
      expect(Array.isArray(data.hooks.SessionStart)).toBe(true);
      return flattenGrouped(data.hooks.SessionStart);
    }

    it('r2: 7 SessionStart entries, last entry is the plugin-root entry', () => {
      const entries = loadEntries(outR2);
      expect(entries.length, 'core-claude r2 SessionStart entry count').toBe(7);
      const last = entries.at(-1)!;
      expect(last.once).toBe(true);
      expect(last.command).toContain('CLAUDE_PLUGIN_ROOT');
      expect(last.command).toContain('Rosetta Plugin Path:');
    });

    it('r3: 3 SessionStart entries, last entry is the plugin-root entry', () => {
      const entries = loadEntries(outR3);
      expect(entries.length, 'core-claude r3 SessionStart entry count').toBe(3);
      const last = entries.at(-1)!;
      expect(last.once).toBe(true);
      expect(last.command).toContain('CLAUDE_PLUGIN_ROOT');
      expect(last.command).toContain('Rosetta Plugin Path:');
    });
  });

  describe('Copilot — .github/plugin/hooks.json, flat lowercase sessionStart', () => {
    function loadEntries(outputDir: string): CommandHook[] {
      const data = readJson(path.join(outputDir, 'core-copilot', '.github', 'plugin', 'hooks.json')) as {
        hooks: { sessionStart: CommandHook[] };
      };
      expect(Array.isArray(data.hooks.sessionStart)).toBe(true);
      // Confirms the flat (non-grouped) shape: entries are command hooks directly, not groups
      // with an inner `hooks` array — the opposite of Claude/Codex's grouped shape.
      expect(data.hooks.sessionStart[0]).not.toHaveProperty('hooks');
      return data.hooks.sessionStart;
    }

    it('r2: 7 sessionStart entries, last entry is the plugin-root entry', () => {
      const entries = loadEntries(outR2);
      expect(entries.length, 'core-copilot r2 sessionStart entry count').toBe(7);
      const last = entries.at(-1)!;
      expect(last.bash).toContain('agentPlugins');
      expect(last.powershell).toContain('agentPlugins');
      expect(last.bash).toContain('Rosetta Plugin Path:');
    });

    it('r3: 3 sessionStart entries, last entry is the plugin-root entry', () => {
      const entries = loadEntries(outR3);
      expect(entries.length, 'core-copilot r3 sessionStart entry count').toBe(3);
      const last = entries.at(-1)!;
      expect(last.bash).toContain('agentPlugins');
      expect(last.powershell).toContain('agentPlugins');
      expect(last.bash).toContain('Rosetta Plugin Path:');
    });
  });

  describe('Codex — .codex-plugin/hooks.json, grouped capitalized SessionStart', () => {
    function loadEntries(outputDir: string): CommandHook[] {
      const data = readJson(path.join(outputDir, 'core-codex', '.codex-plugin', 'hooks.json')) as {
        hooks: { SessionStart: GroupedSessionStart[] };
      };
      expect(Array.isArray(data.hooks.SessionStart)).toBe(true);
      return flattenGrouped(data.hooks.SessionStart);
    }

    it('r2: 7 SessionStart entries, last entry is the plugin-root entry', () => {
      const entries = loadEntries(outR2);
      expect(entries.length, 'core-codex r2 SessionStart entry count').toBe(7);
      const last = entries.at(-1)!;
      expect(last.statusMessage).toBe('Loading Rosetta bootstrap');
      expect(last.timeout).toBe(30);
      expect(last.once).toBeUndefined();
      expect(last.command).toContain('workspace_root/.agents');
      expect(last.command).toContain('Rosetta Plugin Path:');
    });

    it('r3: 3 SessionStart entries, last entry is the plugin-root entry', () => {
      const entries = loadEntries(outR3);
      expect(entries.length, 'core-codex r3 SessionStart entry count').toBe(3);
      const last = entries.at(-1)!;
      expect(last.statusMessage).toBe('Loading Rosetta bootstrap');
      expect(last.timeout).toBe(30);
      expect(last.once).toBeUndefined();
      expect(last.command).toContain('workspace_root/.agents');
      expect(last.command).toContain('Rosetta Plugin Path:');
    });
  });

  // FR-HOOK-0003 (Deprecated) — the removed BOOTSTRAP_PREFIX must not appear in any real,
  // fully-generated bootstrap payload, for any target, under either release. This runs against
  // the SAME real-instruction generation as the counts above, so a regression that reintroduced
  // the prefix would also be caught here without needing a separate generate() run.
  describe('no removed BOOTSTRAP_PREFIX text in any generated payload (FR-HOOK-0003 Deprecated)', () => {
    const payloadPaths: Array<[string, string]> = [
      ['core-claude r2', path.join('core-claude', 'hooks', 'hooks.json')],
      ['core-claude r3', path.join('core-claude', 'hooks', 'hooks.json')],
      ['core-copilot r2', path.join('core-copilot', '.github', 'plugin', 'hooks.json')],
      ['core-copilot r3', path.join('core-copilot', '.github', 'plugin', 'hooks.json')],
      ['core-codex r2', path.join('core-codex', '.codex-plugin', 'hooks.json')],
      ['core-codex r3', path.join('core-codex', '.codex-plugin', 'hooks.json')],
    ];

    it.each(payloadPaths)('%s payload does not contain the removed prefix sentence', (label, relPath) => {
      // NOTE: real bootstrap content legitimately mentions "get_context_instructions" (an MCP
      // tool name referenced in plugin-files-mode.md's own prose) — only the removed prefix
      // SENTENCE ("ALWAYS MUST FULLY READ...") is a defect if it reappears; the bare tool-name
      // substring is not distinctive enough to assert on here (see unit-level assemble-bootstrap
      // suites for the "Rosetta get_context_instructions:" prefix-phrase-specific check against
      // synthetic bodies that don't legitimately contain the phrase).
      const outputDir = label.endsWith('r2') ? outR2 : outR3;
      const raw = fs.readFileSync(path.join(outputDir, relPath), 'utf-8');
      expect(raw).not.toContain('ALWAYS MUST FULLY READ THIS ENTIRE CONTEXT');
    });
  });
});
