/**
 * Profile E2E — the end-to-end proof that a profiled build actually works
 * (FR-PROF-0020/0030/0040, gate G-C).
 *
 * Where parity.e2e.test.ts proves the profiled output has the right SHAPE (path-set parity),
 * this file proves the profiled build does the right THING with real repo inputs:
 *   - a profiled run writes every target to its `core-*-light` destination and never touches a
 *     pre-existing unsuffixed `core-*` destination (FR-PROF-0020)
 *   - the profile-scoped documents (`coding-flow~profile-lightweight-only~overwrite~.md` and the ten
 *     `<agent>~profile-lightweight-only~overwrite~.md` agent documents) supersede their base
 *     counterparts ONLY in the light plugins, and their lighter `model:` candidate lists resolve
 *     through each target's built-in vocabulary (FR-PROF-0030.AC1)
 *   - a no-profile run excludes those same documents entirely — the base bodies and base models
 *     land untouched, and no `-light` destination is written at all (FR-PROF-0040)
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
import { parse as parseToml } from 'smol-toml';
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

// Marker text unique to the profile-scoped body (instructions/r3/core/workflows/
// coding-flow~profile-lightweight-only~overwrite~.md) — distinguishes it from the base
// coding-flow.md body without depending on any other part of that document's content.
const LIGHT_MARKER = 'Lightweight variant: a single architect pass produces discovery, design, specs, and plan';

// A phase heading present in the base coding-flow and deliberately absent from the light one: the
// light workflow merges discovery/design/tech_plan into a single `solution_design` phase and drops
// the user_review_plan / user_review_impl / impl_validation phases. Asserting on a REMOVED phase
// as well as an ADDED marker proves the override replaced the base body rather than merging with it.
const BASE_ONLY_PHASE = '<impl_validation phase=';
const LIGHT_ONLY_PHASE = '<solution_design phase=';

function buildSources(outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(REPO_ROOT, 'instructions'),
    pluginsSource: PLUGINS_SOURCE,
    hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
    outputDir,
    profileSource: PROFILE_SOURCE,
  };
}

/**
 * NFR-0001 (#271) — "Given: any generated subagent TOML When: parsed Then: parsing succeeds."
 *
 * Both real-repo builds in this file emit a full `.codex/agents/*.toml` set from the live
 * instruction tree, so the acceptance criterion is checked here for free rather than paying for a
 * third generate() run. This is the poka-yoke for the whole class of emitter defects: the moment a
 * maintainer authors an agent body containing a backslash (a regex, a Windows path) or a literal
 * triple-quote, this fails in CI instead of shipping a Codex plugin that won't load.
 */
function expectEveryCodexAgentTomlParses(outputDir: string, codexTargetDir: string): void {
  const agentsDir = path.join(outputDir, codexTargetDir, '.codex', 'agents');
  expect(fs.existsSync(agentsDir), `${agentsDir} must exist`).toBe(true);
  const files = fs.readdirSync(agentsDir).filter((f) => f.endsWith('.toml'));
  // Guard against the assertion silently passing on an empty directory.
  expect(files.length, 'expected a non-empty set of emitted agent TOMLs').toBeGreaterThan(0);
  for (const file of files) {
    const full = path.join(agentsDir, file);
    const raw = fs.readFileSync(full, 'utf-8');
    let parsed: Record<string, unknown>;
    try {
      parsed = parseToml(raw) as Record<string, unknown>;
    } catch (err) {
      throw new Error(`${codexTargetDir}/.codex/agents/${file} is not valid TOML: ${String(err)}`);
    }
    // A parse that yields no body would mean the block collapsed — assert the field is really there.
    expect(typeof parsed.developer_instructions, `${file} developer_instructions`).toBe('string');
    expect((parsed.developer_instructions as string).length, `${file} body`).toBeGreaterThan(0);
  }
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

  it('light coding-flow body wins: the profile-scoped document supersedes the base one (FR-PROF-0030.AC1)', () => {
    const p = path.join(outputDir, 'core-claude-light', 'workflows', 'coding-flow.md');
    expect(fs.existsSync(p), 'core-claude-light/workflows/coding-flow.md must exist').toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).toContain(LIGHT_MARKER);
    expect(content).toContain(LIGHT_ONLY_PHASE);
    // Full replacement, not a merge: the base-only phase is gone.
    expect(content).not.toContain(BASE_ONLY_PHASE);
  });

  // The lightweight profile selects its models by shipping profile-scoped agent documents whose
  // `model:` candidate list differs, resolved through each target's UNCHANGED built-in vocabulary —
  // it declares no modelOverrides at all. These assertions cover every resolution strategy: Claude's
  // exact-token tier and its family-substring fallback, Cursor's and Copilot's first-token exact
  // match, and Codex's first-gpt-token match plus reasoning-effort split.
  it('light agents resolve to the profile-scoped models on all four vocabularies', () => {
    // Claude, exact-token tier: architect's light list carries claude-opus-5, which the Claude map
    // resolves by EXACT token (#178 normalized the source token from claude-5-opus-high; both forms
    // are exact keys and both resolve here, so the tier this exercises did not change). The `opus`
    // family key resolves to the same value, so this agrees with the base build rather than diverging
    // from it — Claude Code exposes three tiers and the light profile asks for the same one here.
    // What the exact entry guarantees is that an author naming a version explicitly keeps getting
    // THAT version even if the family default later moves.
    const claudeArchitect = fs.readFileSync(
      path.join(outputDir, 'core-claude-light', 'agents', 'architect.md'), 'utf-8');
    expect(claudeArchitect).toMatch(/^model: claude-opus-5$/m);

    // Claude, family fallback: discoverer's light list carries claude-haiku-4-5. CLAUDE_CODE_MAP has
    // exact keys only for the opus tokens, so this still has no exact entry and the `haiku` family
    // key resolves it — #178's source normalization (claude-4.5-haiku -> claude-haiku-4-5) kept this
    // case on the family tier, so the family-substring fallback remains covered by the real source
    // tree. (The base list leads with claude-sonnet-5, also family-resolved, via `sonnet`.)
    const claudeDiscoverer = fs.readFileSync(
      path.join(outputDir, 'core-claude-light', 'agents', 'discoverer.md'), 'utf-8');
    expect(claudeDiscoverer).toMatch(/^model: claude-haiku-4-5$/m);

    // Cursor: reviewer's light list leads with gemini-3.7-flash-medium, mapped to the IDE-native
    // gemini-3.7-flash (the base list leads with gpt-5.6-terra-medium -> gpt-5.6-terra).
    const cursorReviewer = fs.readFileSync(
      path.join(outputDir, 'core-cursor-light', 'agents', 'reviewer.md'), 'utf-8');
    expect(cursorReviewer).toMatch(/^model: gemini-3\.7-flash$/m);

    // Copilot: architect's light list leads with gpt-5.6-sol-high, mapped to Copilot's display name.
    const copilotArchitect = fs.readFileSync(
      path.join(outputDir, 'core-copilot-light', 'agents', 'architect.agent.md'), 'utf-8');
    expect(copilotArchitect).toMatch(/^model: GPT-5\.6 Sol$/m);

    // Codex: engineer's light list's first gpt- token is gpt-5.6-luna-xhigh, split into model +
    // reasoning effort (the base list's first gpt- token is gpt-5.4-medium).
    const codexEngineer = fs.readFileSync(
      path.join(outputDir, 'core-codex-light', '.codex', 'agents', 'engineer.toml'), 'utf-8');
    expect(codexEngineer).toContain('model = "gpt-5.6-luna"');
    expect(codexEngineer).toContain('model_reasoning_effort = "xhigh"');
  });

  it('every emitted core-codex-light agent TOML parses (NFR-0001, #271)', () => {
    expectEveryCodexAgentTomlParses(outputDir, 'core-codex-light');
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

  it('excludes the profile-scoped documents entirely: base coding-flow body lands, not the light override (FR-PROF-0040.AC3)', () => {
    const p = path.join(outputDir, 'core-claude', 'workflows', 'coding-flow.md');
    expect(fs.existsSync(p)).toBe(true);
    const content = fs.readFileSync(p, 'utf-8');
    expect(content).not.toContain(LIGHT_MARKER);
    expect(content).not.toContain(LIGHT_ONLY_PHASE);
    expect(content).toContain(BASE_ONLY_PHASE);
  });

  it('base agents keep their base models: the profile-scoped agent documents are excluded (FR-PROF-0040.AC3)', () => {
    const claudeDiscoverer = fs.readFileSync(
      path.join(outputDir, 'core-claude', 'agents', 'discoverer.md'), 'utf-8');
    expect(claudeDiscoverer).toMatch(/^model: claude-sonnet-5$/m);

    // The base architect resolves to the current Opus through the Claude vocabulary.
    const claudeArchitect = fs.readFileSync(
      path.join(outputDir, 'core-claude', 'agents', 'architect.md'), 'utf-8');
    expect(claudeArchitect).toMatch(/^model: claude-opus-5$/m);

    const cursorReviewer = fs.readFileSync(
      path.join(outputDir, 'core-cursor', 'agents', 'reviewer.md'), 'utf-8');
    expect(cursorReviewer).toMatch(/^model: gpt-5\.6-terra$/m);

    const codexEngineer = fs.readFileSync(
      path.join(outputDir, 'core-codex', '.codex', 'agents', 'engineer.toml'), 'utf-8');
    expect(codexEngineer).toContain('model = "gpt-5.6-terra"');
    expect(codexEngineer).toContain('model_reasoning_effort = "medium"');
  });

  it('every emitted core-codex agent TOML parses (NFR-0001, #271)', () => {
    expectEveryCodexAgentTomlParses(outputDir, 'core-codex');
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
