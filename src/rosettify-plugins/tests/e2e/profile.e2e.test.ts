/**
 * Variant E2E — the end-to-end proof that a set's LIGHTWEIGHT VARIANT actually works
 * (FR-PROF-0020/0030/0040, DATA-CFG-0007, gate G-C).
 *
 * What changed: the `-light` suffix used to come from the PROFILE descriptor and required a
 * second `--profile lightweight` invocation. It is now a property of a set VARIANT declared in
 * plugins.json, so ONE unprofiled invocation emits both `rosetta-<ide>` and `rosetta-<ide>-light`
 * side by side. That makes this file's base-vs-light comparison a comparison between two folders of
 * the SAME run, which is a stronger check than comparing two separate runs: any difference is
 * attributable to the variant alone.
 *
 * The `rosetta` set is used throughout because the agent and workflow documents these assertions
 * read (architect, discoverer, reviewer, engineer, coding-flow) live in `workflows/`, which only the
 * multi-folder `rosetta` set layers.
 *
 * Where parity.e2e.test.ts proves the profiled output has the right SHAPE (path-set parity),
 * this file proves the profiled build does the right THING with real repo inputs:
 *   - the light variant writes every target to its `rosetta-<ide>-light` destination beside the
 *     unsuffixed `rosetta-<ide>` destination (FR-PROF-0020)
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
import matter from 'gray-matter';
import {
  normalizeClaude, normalizeCursor, normalizeCopilot, normalizeCodex,
  CLAUDE_VOCABULARY, CURSOR_VOCABULARY, COPILOT_VOCABULARY, CODEX_VOCABULARY,
  type CodexModelResult,
} from '../../src/spec/model-maps.js';
import { generate } from '../../src/index.js';
import type { ResolvedSources } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root: up from tests/e2e/ → tests/ → rosettify-plugins/ → src/ → <repo root>.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PLUGINS_SOURCE = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins');
const PROFILE_SOURCE = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'profiles');

const SET = 'rosetta';
const TARGETS = [
  'claude',
  'cursor',
  'copilot',
  'codex',
  'cursor-standalone',
  'copilot-standalone',
  'antigravity',
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
    configPath: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins.json'),
  };
}

/**
 * NFR-0005 (#271) — "Given: any generated subagent TOML When: parsed Then: parsing succeeds."
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

describe('Variant E2E — one run emits both the base and the -light variant', () => {
  let tmpRoot: string;
  let outputDir: string;
  let exitCode: number;

  const base = (target: string, ...rest: string[]): string =>
    path.join(outputDir, `${SET}-${target}`, ...rest);
  const light = (target: string, ...rest: string[]): string =>
    path.join(outputDir, `${SET}-${target}-light`, ...rest);

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'variant-e2e-'));
    outputDir = path.join(tmpRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    // NO `profile` field: the variant, not --profile, is what activates `lightweight` now.
    exitCode = await generate({
      sources: buildSources(outputDir),
      release: 'r3',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
    });
  }, 300000);

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('exits 0', () => {
    expect(exitCode).toBe(0);
  });

  it('writes BOTH destinations for every target of the rosetta set (FR-PROF-0020.AC1)', () => {
    for (const target of TARGETS) {
      expect(fs.existsSync(base(target)), `${SET}-${target} missing`).toBe(true);
      expect(fs.existsSync(light(target)), `${SET}-${target}-light missing`).toBe(true);
    }
  });

  it('only the rosetta set declares a light variant — no other set gets a -light twin', () => {
    const lightDirs = fs.readdirSync(outputDir).filter((d) => d.endsWith('-light'));
    expect(lightDirs).toHaveLength(TARGETS.length);
    expect(lightDirs.every((d) => d.startsWith(`${SET}-`))).toBe(true);
  });

  it('light coding-flow body wins ONLY in the light variant (FR-PROF-0030.AC1, FR-PROF-0040.AC3)', () => {
    const lightBody = fs.readFileSync(light('claude', 'workflows', 'coding-flow.md'), 'utf-8');
    expect(lightBody).toContain(LIGHT_MARKER);
    expect(lightBody).toContain(LIGHT_ONLY_PHASE);
    // Full replacement, not a merge: the base-only phase is gone.
    expect(lightBody).not.toContain(BASE_ONLY_PHASE);

    // The sibling base folder from the SAME run excludes the profile-scoped document entirely.
    const baseBody = fs.readFileSync(base('claude', 'workflows', 'coding-flow.md'), 'utf-8');
    expect(baseBody).not.toContain(LIGHT_MARKER);
    expect(baseBody).not.toContain(LIGHT_ONLY_PHASE);
    expect(baseBody).toContain(BASE_ONLY_PHASE);
  });

  it('every emitted agent TOML parses, in BOTH variants (NFR-0005, #271)', () => {
    expectEveryCodexAgentTomlParses(outputDir, `${SET}-codex`);
    expectEveryCodexAgentTomlParses(outputDir, `${SET}-codex-light`);
  });

  it('the manifest name/description carry the variant suffixes (FR-PROF-0021.AC1)', () => {
    const baseManifest = JSON.parse(
      fs.readFileSync(base('claude', '.claude-plugin', 'plugin.json'), 'utf-8'));
    const lightManifest = JSON.parse(
      fs.readFileSync(light('claude', '.claude-plugin', 'plugin.json'), 'utf-8'));

    expect(baseManifest.name).toBe('rosetta');
    expect(lightManifest.name).toBe('rosetta-light');
    expect(lightManifest.description).toContain('lightweight');
    expect(baseManifest.description).not.toContain('lightweight');
  });

  it('the standalone manifest name composes as <base>-standalone<suffix>', () => {
    const manifest = JSON.parse(
      fs.readFileSync(light('cursor-standalone', 'plugin.json'), 'utf-8'));
    expect(manifest.name).toBe('rosetta-standalone-light');
  });
});

describe('Variant E2E — --profile overrides every variant (debugging path)', () => {
  it('an unknown --profile aborts before any output (FR-PROF-0001, G-D)', async () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'variant-e2e-invalid-'));
    const outputDir = path.join(tmpRoot, 'output');
    try {
      const code = await silencingStderr(() => generate({
        sources: buildSources(outputDir),
        release: 'r3',
        dryRun: false,
        verbose: false,
        deterministicHooks: false,
        profile: 'does-not-exist',
      }));
      expect(code).not.toBe(0);
      // Pre-flight abort happens before buildVfs — the output directory is never created.
      expect(fs.existsSync(outputDir), 'output dir must not be created on abort').toBe(false);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }, 60000);
});

// ---------------------------------------------------------------------------------------------
// Model resolution on a FIXTURE source tree (FR-PROF-0040.AC3/AC4, FR-PROF-0011, FR-PROF-0020).
//
// The real `instructions/` models and efforts are owner-tunable (cost tiers), so no assertion here
// names a real agent's model. A test-only agent pair carries a base and a profile-scoped lightweight
// `model:` list that are fixed and deliberately different on every vocabulary; expected values are
// derived from the fixture frontmatter through the generator's own mapping.
// ---------------------------------------------------------------------------------------------
const FIXTURE_INSTRUCTIONS = path.join(__dirname, '..', 'fixtures', 'profile-instructions');
const FIXTURE_AGENT = 'zz-model-fixture';

function fixtureModel(file: string): { model: string; effort: string } {
  const data = matter(fs.readFileSync(
    path.join(FIXTURE_INSTRUCTIONS, 'r3', 'core', 'agents', file), 'utf-8')).data;
  return { model: data.model as string, effort: data.effort as string };
}

const BASE_SRC = fixtureModel(`${FIXTURE_AGENT}.md`);
const LIGHT_SRC = fixtureModel(`${FIXTURE_AGENT}~profile-lightweight-only~overwrite~.md`);

interface Resolved { claude: string; cursor: string; copilot: string; codex: CodexModelResult }
function resolveExpected(modelField: string): Resolved {
  return {
    claude: normalizeClaude(modelField, CLAUDE_VOCABULARY.map) as string,
    cursor: normalizeCursor(modelField, CURSOR_VOCABULARY.map) as string,
    copilot: normalizeCopilot(modelField, COPILOT_VOCABULARY.map) as string,
    codex: normalizeCodex(modelField, CODEX_VOCABULARY.map) as CodexModelResult,
  };
}

function readFixtureOutputs(outputDir: string, suffix: string) {
  const rd = (...p: string[]) => fs.readFileSync(path.join(outputDir, ...p), 'utf-8');
  const modelLine = (c: string) => /^model: (.*)$/m.exec(c)?.[1];
  const dest = (ide: string) => `${SET}-${ide}${suffix}`;
  return {
    claude: modelLine(rd(dest('claude'), 'agents', `${FIXTURE_AGENT}.md`)),
    claudeRaw: rd(dest('claude'), 'agents', `${FIXTURE_AGENT}.md`),
    cursor: modelLine(rd(dest('cursor'), 'agents', `${FIXTURE_AGENT}.md`)),
    copilot: modelLine(rd(dest('copilot'), 'agents', `${FIXTURE_AGENT}.agent.md`)),
    codex: parseToml(rd(dest('codex'), '.codex', 'agents', `${FIXTURE_AGENT}.toml`)) as
      Record<string, unknown>,
  };
}

describe('Profile E2E — model resolution on a fixture tree', () => {
  let tmpRoot: string;
  let baseDir: string;
  let lightDir: string;

  // One catalog run builds the base variant (no profile) and the -light variant (lightweight
  // profile) of the rosetta set side by side (FR-SET-0030); both read the fixture instructions.
  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'profile-e2e-fixture-'));
    const outputDir = path.join(tmpRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });
    baseDir = outputDir;
    lightDir = outputDir;
    const code = await generate({
      sources: { ...buildSources(outputDir), instructionsSource: FIXTURE_INSTRUCTIONS },
      release: 'r3', dryRun: false, verbose: false, deterministicHooks: false,
      publish: ['rosetta', 'rosetta-light'],
    });
    expect(code).toBe(0);
  }, 180000);

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('fixture sanity: base and light lists resolve differently on every vocabulary', () => {
    const b = resolveExpected(BASE_SRC.model);
    const l = resolveExpected(LIGHT_SRC.model);
    expect(b.claude).not.toBe(l.claude);
    expect(b.cursor).not.toBe(l.cursor);
    expect(b.copilot).not.toBe(l.copilot);
    expect(b.codex).not.toEqual(l.codex);
  });

  it('no-profile run: the base agent keeps the base model; the light document is excluded (FR-PROF-0040.AC3, AC4)', () => {
    const out = readFixtureOutputs(baseDir, '');
    const exp = resolveExpected(BASE_SRC.model);
    expect(out.claude).toBe(exp.claude);
    expect(out.cursor).toBe(exp.cursor);
    expect(out.copilot).toBe(exp.copilot);
    expect(out.codex.model).toBe(exp.codex.model);
    expect(out.codex.model_reasoning_effort).toBe(exp.codex.effort);
    expect(out.claudeRaw).toContain('Base fixture body.');
    expect(out.claudeRaw).not.toContain('Lightweight fixture body.');
    expect(out.claudeRaw).toMatch(new RegExp(`^effort: ${BASE_SRC.effort}$`, 'm'));
  });

  it('lightweight run: the agent resolves to the profile-scoped model on all four vocabularies (FR-PROF-0020)', () => {
    const out = readFixtureOutputs(lightDir, '-light');
    const exp = resolveExpected(LIGHT_SRC.model);
    expect(out.claude).toBe(exp.claude);
    expect(out.cursor).toBe(exp.cursor);
    expect(out.copilot).toBe(exp.copilot);
    expect(out.codex.model).toBe(exp.codex.model);
    expect(out.codex.model_reasoning_effort).toBe(exp.codex.effort);
    expect(out.claudeRaw).toContain('Lightweight fixture body.');
    expect(out.claudeRaw).toMatch(new RegExp(`^effort: ${LIGHT_SRC.effort}$`, 'm'));
  });
});
