/**
 * Parity E2E — per-target STRUCTURAL parity gate (NFR-0001).
 *
 * For EACH of the 7 targets, this test:
 *   1. DERIVES the expected set of output file paths from the ACTUAL instruction source folder
 *      (`instructions/r3/core`) + the target's documented mapping contract (see
 *      parity-derive-structure.ts — an independent restatement of STRUCTURES.md / FR-VAR-* /
 *      FR-COPY-*, NOT copied from the generator implementation and NOT a hardcoded list).
 *   2. GENERATES that target into a temp dir with the real generate() API (release r3, domain
 *      core, deterministicHooks:false), using the real repo inputs.
 *   3. Compares the expected path set vs the generated path set and asserts they are EQUAL. On a
 *      mismatch it prints the set difference (only-in-expected / only-in-actual) so the failure is
 *      actionable.
 *
 * STRUCTURE / PATHS ONLY — this test never reads or compares file CONTENT. Because expected paths
 * are derived from the LIVE source, the owner can freely add or remove skills / workflows / rules
 * / subagents: a new source file appears in BOTH the derived-expected and the generated-actual
 * sets, so the gate stays green with no test edits (proved by the robustness probe below).
 *
 * deterministicHooks:false ⇒ NO `*.js` hook bundles and NO PreToolUse blocks are produced, so the
 * derivation does not expect them.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate } from '../../src/index.js';
import type { ResolvedSources } from '../../src/types.js';
import {
  TARGETS,
  deriveExpectedPaths,
  listGeneratedPaths,
  type SetShape,
  type Target,
} from './parity-derive-structure.js';
import { loadPluginCatalog, selectSets } from '../../src/spec/plugin-sets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root: up from tests/e2e/ → tests/ → rosettify-plugins/ → src/ → <repo root>.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PLUGINS_SOURCE = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins');
const INSTRUCTIONS_SOURCE = path.join(REPO_ROOT, 'instructions');
const PROFILE_SOURCE = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'profiles');
const CONFIG_PATH = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins.json');

// DATA-CFG-0007: the gate is parameterized over the SETS the shipped catalog declares, not a
// hardcoded seven-target list. Adding or removing a set in plugins.json therefore changes what this
// test covers with no test edit — the same property that already lets the source tree grow freely.
const CATALOG = loadPluginCatalog(CONFIG_PATH);
const R3_SETS = selectSets(CATALOG, 'r3', undefined);

/** Every (set, variant) pair an r3 run produces, as the oracle's SetShape plus its folder suffix. */
const BUILDS: Array<{ set: SetShape; destinationSuffix: string; activeProfile: string | null }> =
  R3_SETS.flatMap((set) =>
    set.variants.map((variant) => ({
      set: {
        name: set.name,
        folders: set.folders,
        template: set.template,
        bootstrap: set.bootstrap,
        hooks: set.hooks,
      },
      destinationSuffix: variant.destinationSuffix,
      activeProfile: variant.profile,
    })),
  );

const sourceDirsFor = (set: SetShape): string[] =>
  set.folders.map((f) => path.join(INSTRUCTIONS_SOURCE, 'r3', f));

// FR-CLI-0020: ResolvedSources pointing at the real repo (mirrors sample/antigravity e2e).
// FR-CLI-0033: profileSource resolved the same way pluginsSource/hooksSource are — unused unless
// a run passes `profile`, so this is a no-op for every existing no-profile call site below.
function buildSources(instructionsSource: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource,
    pluginsSource: PLUGINS_SOURCE,
    hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
    outputDir,
    profileSource: PROFILE_SOURCE,
    configPath: CONFIG_PATH,
  };
}

function reportDiff(target: string, expected: Set<string>, actual: Set<string>): string {
  const onlyExpected = [...expected].filter((p) => !actual.has(p)).sort();
  const onlyActual = [...actual].filter((p) => !expected.has(p)).sort();
  return [
    `${target}: structural parity mismatch (expected ${expected.size} paths, generated ${actual.size}).`,
    `  only-in-expected (derived, not generated): ${onlyExpected.length ? onlyExpected.join(', ') : '(none)'}`,
    `  only-in-actual (generated, not derived):   ${onlyActual.length ? onlyActual.join(', ') : '(none)'}`,
  ].join('\n');
}

describe('Parity E2E — per-set, per-target structural parity (NFR-0001)', () => {
  let tmpRoot: string;
  let outputDir: string;
  const actualPaths = new Map<string, Set<string>>();

  const destinationOf = (setName: string, target: Target, suffix: string): string =>
    `${setName}-${target}${suffix}`;

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-structural-'));
    outputDir = path.join(tmpRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    // ONE invocation produces every set x variant x target folder.
    await generate({
      sources: buildSources(INSTRUCTIONS_SOURCE, outputDir),
      release: 'r3',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
    });

    for (const build of BUILDS) {
      for (const target of TARGETS) {
        const dest = destinationOf(build.set.name, target, build.destinationSuffix);
        actualPaths.set(dest, listGeneratedPaths(path.join(outputDir, dest)));
      }
    }
  }, 300000);

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('one invocation produces every declared set x variant x target folder', () => {
    const expected = BUILDS.length * TARGETS.length;
    expect(fs.readdirSync(outputDir).sort()).toHaveLength(expected);
    for (const [dest, paths] of actualPaths) {
      expect(paths.size, `${dest} produced no files`).toBeGreaterThan(0);
    }
  });

  for (const build of BUILDS) {
    for (const target of TARGETS) {
      const dest = destinationOf(build.set.name, target, build.destinationSuffix);

      it(`${dest}: generated paths match structure derived from source + mapping contract`, () => {
        const expected = deriveExpectedPaths(
          target, build.set, sourceDirsFor(build.set), PLUGINS_SOURCE, build.activeProfile,
        );
        const actual = actualPaths.get(dest)!;

        const onlyExpected = [...expected].filter((p) => !actual.has(p)).sort();
        const onlyActual = [...actual].filter((p) => !expected.has(p)).sort();
        if (onlyExpected.length || onlyActual.length) {
          console.error(reportDiff(dest, expected, actual));
        }
        expect(onlyExpected, `${dest}: paths derived but not generated`).toEqual([]);
        expect(onlyActual, `${dest}: paths generated but not derived`).toEqual([]);
      });
    }
  }

  it('no output contains a *.tmpl file (rendered siblings only)', () => {
    for (const [dest, paths] of actualPaths) {
      expect([...paths].filter((p) => p.endsWith('.tmpl')), `${dest} must contain no .tmpl`)
        .toEqual([]);
    }
  });

  it('deterministicHooks:false ⇒ no *.js hook bundles in any output', () => {
    // Scoped to HOOK bundles specifically: instruction content legitimately ships its own .js
    // (e.g. skills/harness/scripts/tester.js), which is source material, not a synced bundle.
    for (const [dest, paths] of actualPaths) {
      const bundles = [...paths].filter(
        (p) => p.endsWith('.js') && /(^|\/)(hooks|\.codex\/hooks|\.cursor\/hooks)\//.test(p),
      );
      expect(bundles, `${dest} must contain no .js hook bundles`).toEqual([]);
    }
  });

  // FR-VAR-0072 — the regression that was missing. The predecessor injection was DECLARED
  // correctly and simply never fired (it matched a `# PREP STEP 1:` anchor absent from the real
  // rule), so only an assertion on GENERATED OUTPUT catches this class of failure.
  describe('standalone distributions declare their extraction root', () => {
    const hostFor: Record<string, { path: string; root: string; workflows: string }> = {
      'cursor-standalone': {
        path: path.join('.cursor', 'rules', 'plugin-files-mode.mdc'),
        root: '.cursor',
        workflows: 'commands',
      },
      'copilot-standalone': {
        path: path.join('.github', 'instructions', 'plugin-files-mode.instructions.md'),
        root: '.github',
        workflows: 'prompts',
      },
    };

    // Only sets that actually ship a rules/ folder carry the host document.
    const buildsWithRules = BUILDS.filter((b) => b.set.folders.includes('core'));

    for (const build of buildsWithRules) {
      for (const [target, expected] of Object.entries(hostFor)) {
        const dest = destinationOf(build.set.name, target as Target, build.destinationSuffix);

        it(`${dest}: plugin-files-mode states root ${expected.root} and ${expected.workflows}/`, () => {
          const file = path.join(outputDir, dest, expected.path);
          expect(fs.existsSync(file), `${file} must exist`).toBe(true);
          const content = fs.readFileSync(file, 'utf-8');

          expect(content).toContain(`Rosetta plugin root: \`${expected.root}\``);
          expect(content).toContain(`relative to \`${expected.root}/\``);
          expect(content).toContain(`\`${expected.workflows}/`);
          // Inside the block, so it is part of the always-loaded rule body.
          expect(content.indexOf('STANDALONE DISTRIBUTION'))
            .toBeLessThan(content.indexOf('</rosetta:plugin_files_mode>'));
        });
      }
    }

    // FR-ARCH-0058 — the enumerated glob and the appended declaration must AGREE. Both live in
    // the same always-loaded block, so a contradiction is worse than either statement alone: a
    // reader has no way to tell which is right.
    it('copilot-standalone documents the real *.prompt.md workflow glob, with no contradiction', () => {
      for (const build of buildsWithRules) {
        const dest = destinationOf(build.set.name, 'copilot-standalone' as Target, build.destinationSuffix);
        const file = path.join(outputDir, dest, hostFor['copilot-standalone'].path);
        const content = fs.readFileSync(file, 'utf-8');

        // The enumerated glob was left as `prompts/*.md` by the folder-level rewrite, which
        // matches none of the emitted `adhoc-flow.prompt.md` files.
        expect(content, `${dest} enumerated glob`).toContain('WORKFLOW/COMMAND `prompts/*.prompt.md`');
        expect(content, `${dest} stale glob must be gone`)
          .not.toContain('WORKFLOW/COMMAND `prompts/*.md`');

        // And a real emitted workflow actually has that extension.
        const prompts = [...actualPaths.get(dest)!].filter((f) => f.includes('/prompts/'));
        expect(prompts.length, `${dest} ships prompts`).toBeGreaterThan(0);
        expect(prompts.every((f) => f.endsWith('.prompt.md')), `${dest} prompt extensions`).toBe(true);
      }
    });

    it('marketplace targets carry NO standalone declaration', () => {
      for (const build of buildsWithRules) {
        for (const target of ['claude', 'cursor', 'copilot'] as Target[]) {
          const dest = destinationOf(build.set.name, target, build.destinationSuffix);
          const files = [...actualPaths.get(dest)!].filter((f) => f.includes('plugin-files-mode'));
          for (const rel of files) {
            const content = fs.readFileSync(path.join(outputDir, dest, rel), 'utf-8');
            expect(content, `${dest}/${rel}`).not.toContain('STANDALONE DISTRIBUTION');
          }
        }
      }
    });
  });

  // FR-ARCH-0058 — EVERY documented unit glob must match real files on disk.
  //
  // plugin-files-mode enumerates where each unit kind lives, and it loads every session. A
  // folder-level rewrite (FR-ARCH-0049) relocates the FOLDER but leaves the `*.md` suffix inside a
  // glob string, so any target that RENAMES its files (`*.mdc`, `*.agent.md`, `*.prompt.md`) used
  // to document a pattern matching nothing. Five such globs were corrected with literal pairs;
  // this sweep is the gate that keeps the whole matrix honest rather than re-checking five spots.
  describe('every documented unit glob resolves to real files', () => {
    // The prefix each target's enumerated globs are relative to. Codex writes its list
    // ROOT-relative (INT-IDE-0002), so its globs already carry `.agents/` / `.codex/` and resolve
    // from the output root — hence '' rather than '.agents'.
    const PLUGIN_ROOT: Record<string, string> = {
      claude: '', cursor: '', copilot: '', antigravity: '', codex: '',
      'cursor-standalone': '.cursor', 'copilot-standalone': '.github',
    };
    const KINDS = ['RULE', 'SKILL', 'AGENT/SUBAGENT', 'WORKFLOW/COMMAND'];

    // No exceptions remain: every documented glob on every target resolves to real files.
    // Codex's four globs are ROOT-relative (INT-IDE-0002) — it is the one target whose content
    // spans two roots (`.agents/` for instructions, `.codex/agents/` for TOML subagents) — and the
    // sweep resolves them from the output root rather than a plugin root for that reason.
    const KNOWN_MISMATCHES = new Set<string>();

    it('matches actual on-disk extensions for all seven targets', () => {
      const found: string[] = [];

      for (const target of TARGETS) {
        const dest = destinationOf('rosetta', target, '');
        const paths = actualPaths.get(dest)!;
        const rel = [...paths].find((f) => f.split('/').pop()!.startsWith('plugin-files-mode'));
        expect(rel, `${dest}: no plugin-files-mode document`).toBeDefined();

        const text = fs.readFileSync(path.join(outputDir, dest, rel!), 'utf-8');
        // Only the enumerated list — `USE SKILL \`load-project-context\`` earlier in the document
        // is a skill NAME, not a path glob.
        const anchor = text.indexOf('relative to the plugin that OWNS that unit:');
        expect(anchor, `${dest}: enumeration not found`).toBeGreaterThanOrEqual(0);
        const enumeration = text.slice(anchor);

        const root = PLUGIN_ROOT[target];
        const prefix = root ? `${root}/` : '';

        for (const kind of KINDS) {
          const m = new RegExp(`${kind.replace('/', '\\/')} \`([^\`]*)\``).exec(enumeration);
          if (!m) continue;
          const globText = m[1];
          const key = `${target}:${kind}`;

          // `<folder>/*<ext>` — every file directly in that folder must carry <ext>. The folder
          // may itself be nested (Codex's root-relative `.agents/rules/*.md`).
          const simple = /^(.+)\/\*(\..+)$/.exec(globText);
          if (simple) {
            const [, folder, ext] = simple;
            const inFolder = [...paths].filter((f) => {
              const p2 = f.startsWith(prefix) ? f.slice(prefix.length) : null;
              return p2 !== null && p2.startsWith(`${folder}/`) && !p2.slice(folder.length + 1).includes('/');
            });
            const ok = inFolder.length > 0 && inFolder.every((f) => f.endsWith(ext));
            if (!ok) found.push(key);
            continue;
          }

          // `<folder>/*<suffix>/<leaf>` — at least one subfolder must provide the leaf.
          const nested = /^(.+)\/\*([^/]*)\/(.+)$/.exec(globText);
          if (nested) {
            const [, folder, suffix, leaf] = nested;
            const ok = [...paths].some((f) => {
              const p2 = f.startsWith(prefix) ? f.slice(prefix.length) : null;
              if (p2 === null || !p2.startsWith(`${folder}/`) || !p2.endsWith(`/${leaf}`)) return false;
              const sub = p2.slice(folder.length + 1, p2.length - leaf.length - 1);
              return !sub.includes('/') && sub.endsWith(suffix);
            });
            if (!ok) found.push(key);
            continue;
          }

          found.push(key); // unrecognised glob shape — treat as a failure, not a skip
        }
      }

      expect(found.sort()).toEqual([...KNOWN_MISMATCHES].sort());
    });
  });

  it('no INDEX.md is generated anywhere — every set declares indexes: [] (D6)', () => {
    for (const [dest, paths] of actualPaths) {
      expect([...paths].filter((p) => p.endsWith('INDEX.md')), `${dest} must contain no index`)
        .toEqual([]);
    }
  });
});
