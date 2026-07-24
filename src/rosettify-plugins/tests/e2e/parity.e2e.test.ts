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
  type Target,
} from './parity-derive-structure.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Repo root: up from tests/e2e/ → tests/ → rosettify-plugins/ → src/ → <repo root>.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PLUGINS_SOURCE = path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins');
const CORE_SOURCE = path.join(REPO_ROOT, 'instructions', 'r3', 'core');

// FR-CLI-0020: ResolvedSources pointing at the real repo (mirrors sample/antigravity e2e).
function buildSources(instructionsSource: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource,
    pluginsSource: PLUGINS_SOURCE,
    hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
    outputDir,
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

describe('Parity E2E — per-target structural parity (NFR-0001)', () => {
  let tmpRoot: string;
  let outputDir: string;
  const actualPaths = new Map<Target, Set<string>>();

  beforeAll(async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-structural-'));
    outputDir = path.join(tmpRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    await generate({
      sources: buildSources(path.join(REPO_ROOT, 'instructions'), outputDir),
      release: 'r3',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
    });

    for (const target of TARGETS) {
      actualPaths.set(target, listGeneratedPaths(path.join(outputDir, target)));
    }
  }, 180000);

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('generates output for all seven targets', () => {
    for (const target of TARGETS) {
      expect(actualPaths.get(target)!.size, `${target} produced no files`).toBeGreaterThan(0);
    }
  });

  for (const target of TARGETS) {
    it(`${target}: generated file paths match structure derived from source + mapping contract`, () => {
      const expected = deriveExpectedPaths(target, CORE_SOURCE, PLUGINS_SOURCE);
      const actual = actualPaths.get(target)!;

      const onlyExpected = [...expected].filter((p) => !actual.has(p)).sort();
      const onlyActual = [...actual].filter((p) => !expected.has(p)).sort();
      if (onlyExpected.length || onlyActual.length) {
        console.error(reportDiff(target, expected, actual));
      }
      expect(onlyExpected, `${target}: paths derived but not generated`).toEqual([]);
      expect(onlyActual, `${target}: paths generated but not derived`).toEqual([]);
    });
  }

  it('no target output contains a *.tmpl file (rendered siblings only)', () => {
    for (const target of TARGETS) {
      const tmpl = [...actualPaths.get(target)!].filter((p) => p.endsWith('.tmpl'));
      expect(tmpl, `${target} must contain no .tmpl files`).toEqual([]);
    }
  });

  it('deterministicHooks:false ⇒ no *.js hook bundles in any target output', () => {
    for (const target of TARGETS) {
      const js = [...actualPaths.get(target)!].filter((p) => p.endsWith('.js'));
      expect(js, `${target} must contain no .js bundles when deterministicHooks is false`).toEqual([]);
    }
  });
});

// ─── Robustness: add/remove content safety ──────────────────────────────────────
//
// Proves the gate is derived, not frozen: injecting a throwaway source skill makes that skill's
// mapped output path appear in BOTH the derived-expected set AND the generated-actual set — with
// no edit to the test or the derivation. The same mechanism covers removal (fewer source files ⇒
// fewer derived + generated paths).

describe('Parity E2E — robustness (derived, not frozen)', () => {
  const PROBE = '__parity_probe__';
  let tmpRoot: string;

  afterAll(() => {
    if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('a newly injected source skill appears in both derived-expected and generated-actual, no test edit', async () => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-probe-'));
    const instructionsSource = path.join(tmpRoot, 'instructions');
    // Copy the real instruction tree, then inject a throwaway skill into r3/core.
    fs.cpSync(path.join(REPO_ROOT, 'instructions'), instructionsSource, { recursive: true });
    const probeCore = path.join(instructionsSource, 'r3', 'core');
    const probeSkillDir = path.join(probeCore, 'skills', PROBE);
    fs.mkdirSync(probeSkillDir, { recursive: true });
    fs.writeFileSync(
      path.join(probeSkillDir, 'SKILL.md'),
      `---\nname: ${PROBE}\ndescription: throwaway parity probe skill\n---\nprobe body\n`,
      'utf-8',
    );

    const outputDir = path.join(tmpRoot, 'output');
    fs.mkdirSync(outputDir, { recursive: true });
    await generate({
      sources: buildSources(instructionsSource, outputDir),
      release: 'r3',
      domain: 'core',
      dryRun: false,
      verbose: false,
      deterministicHooks: false,
    });

    const probeRel = `skills/${PROBE}/SKILL.md`;
    // core-claude keeps skills at the plugin root; core-antigravity also passes source skills through.
    for (const target of ['core-claude', 'core-antigravity'] as const) {
      const expected = deriveExpectedPaths(target, probeCore, PLUGINS_SOURCE);
      const actual = listGeneratedPaths(path.join(outputDir, target));
      expect(expected.has(probeRel), `${target}: derived-expected missing the probe skill`).toBe(true);
      expect(actual.has(probeRel), `${target}: generated-actual missing the probe skill`).toBe(true);
      // And full parity still holds with the probe present (derivation tracked the new file).
      const onlyExpected = [...expected].filter((p) => !actual.has(p)).sort();
      const onlyActual = [...actual].filter((p) => !expected.has(p)).sort();
      expect(onlyExpected, `${target}: derived-but-not-generated with probe present`).toEqual([]);
      expect(onlyActual, `${target}: generated-but-not-derived with probe present`).toEqual([]);
    }
  }, 180000);
});
