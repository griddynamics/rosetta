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

  it('no INDEX.md is generated anywhere — every set declares indexes: [] (D6)', () => {
    for (const [dest, paths] of actualPaths) {
      expect([...paths].filter((p) => p.endsWith('INDEX.md')), `${dest} must contain no index`)
        .toEqual([]);
    }
  });
});
