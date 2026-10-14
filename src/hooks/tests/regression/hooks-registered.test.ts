// hooks-registered.test.ts — Regression guard: every hook-carrying plugin folder ships hook
// documents whose registrations and bundles agree, in BOTH directions, at BOTH postures.
//
// Both install paths are covered: the full plugin (`rosetta*`) and the split plugin (`core*`).
// The hook-carrying folders are DERIVED from src/rosettify-plugins/plugins.json (sets with a
// non-empty `hooks` list x variant destinationSuffix x target), never hard-coded. A census
// guard requires the hooks.json documents found in each folder to equal the per-target table.
//
// Posture (the generator's --deterministic-hooks switch) is detected from the folder itself:
//   shipped  — the bundle dir has no *.js: the document must reference no hook at all.
//   advisory — the bundle dir has *.js: forward (every bundle, minus the declared exceptions, is
//              referenced) and reverse (every referenced hook has a bundle) must both hold.
// The detected branch is part of each test name (`posture shape: shipped|advisory`) and is asserted;
// there is no skip.
//
// ROSETTA_PLUGINS_DIR points the test at another generated tree (e.g. a posture-true scratch).

import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';
import { shipsHooks } from '../helpers/release';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const HOOKS_DIR = path.resolve(ROOT, 'src', 'hooks', 'src', 'hooks');
const PLUGINS_DIR = process.env.ROSETTA_PLUGINS_DIR ?? path.resolve(ROOT, 'plugins');
const CATALOG = path.resolve(ROOT, 'src', 'rosettify-plugins', 'plugins.json');

interface HookDoc {
  /** hooks.json, relative to the plugin folder. */
  jsonPath: string;
  /** Folder holding the generated bundles, relative to the plugin folder. */
  bundleDir: string;
}
interface TargetDocs {
  docs: HookDoc[];
  manifestPath: string;
}

// Documents each target ships (FR-VAR-0030): per target the hooks.json files and where their
// bundles live. Copilot keeps the plugin form in `.github/plugin/` (plus a root copy) and the
// standalone staging form in `hooks/`; Codex keeps bundles in `.codex/hooks/` for both forms.
const TARGET_DOCS: Record<string, TargetDocs> = {
  claude: {
    manifestPath: '.claude-plugin/plugin.json',
    docs: [{ jsonPath: 'hooks/hooks.json', bundleDir: 'hooks' }],
  },
  cursor: {
    manifestPath: '.cursor-plugin/plugin.json',
    docs: [
      { jsonPath: 'hooks/hooks.json', bundleDir: 'hooks' },
      { jsonPath: 'hooks.json', bundleDir: 'hooks' },
    ],
  },
  copilot: {
    manifestPath: '.github/plugin/plugin.json',
    docs: [
      { jsonPath: '.github/plugin/hooks.json', bundleDir: 'hooks' },
      { jsonPath: 'hooks.json', bundleDir: 'hooks' },
      { jsonPath: 'hooks/hooks.json', bundleDir: 'hooks' },
    ],
  },
  codex: {
    manifestPath: '.codex-plugin/plugin.json',
    docs: [
      { jsonPath: '.codex/hooks.json', bundleDir: '.codex/hooks' },
      { jsonPath: '.codex-plugin/hooks.json', bundleDir: '.codex/hooks' },
    ],
  },
  antigravity: {
    manifestPath: 'plugin.json',
    docs: [{ jsonPath: 'hooks.json', bundleDir: 'hooks' }],
  },
  'cursor-standalone': {
    manifestPath: 'plugin.json',
    docs: [{ jsonPath: '.cursor/hooks.json', bundleDir: '.cursor/hooks' }],
  },
  'copilot-standalone': {
    manifestPath: 'plugin.json',
    docs: [{ jsonPath: '.github/hooks/hooks.json', bundleDir: '.github/hooks' }],
  },
};

// Bundles that are never registered as entry points.
//   read-once-shared: a library imported at bundle time.
const NEVER_REGISTERED: ReadonlySet<string> = new Set(['read-once-shared']);
// Bundles built for an IDE but deliberately not registered there.
//   antigravity: no compaction event, so read-once-reset has nothing to bind to
//   (docs/hooks/antigravity.md:44). Applies to every `*-antigravity*` folder.
const UNREGISTERED_BY_IDE: Record<string, readonly string[]> = { antigravity: ['read-once-reset'] };

// hooks.json copies shipped as harness reference material are not plugin hook documents.
const HARNESS_REFERENCE = /(^|\/)skills\/harness\/references\/hooks\//;

interface Catalog {
  targets: string[];
  sets: { name: string; hooks: string[]; variants: { destinationSuffix: string }[] }[];
}
const catalog: Catalog = JSON.parse(readFileSync(CATALOG, 'utf-8'));

const hookCarryingFolders = (): { folder: string; target: string }[] =>
  catalog.sets
    .filter((s) => s.hooks.length > 0)
    .flatMap((s) =>
      s.variants.flatMap((v) =>
        catalog.targets.map((target) => ({ folder: `${s.name}-${target}${v.destinationSuffix}`, target })),
      ),
    );

const discoverHooks = (): string[] =>
  readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => f.replace('.ts', ''));

/** hooks.json documents under a folder, relative and sorted, harness reference copies excluded. */
function findHookDocs(folderPath: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(folderPath, full).split(path.sep).join('/');
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'hooks.json' && !HARNESS_REFERENCE.test(rel)) found.push(rel);
    }
  };
  walk(folderPath);
  return found.sort();
}

const bundlesIn = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => f.replace(/\.js$/, ''))
    : [];

// `plugin.json` contains the substring `plugin.js`, so the name must not continue into letters.
const referencedHooks = (raw: string): Set<string> =>
  new Set([...raw.matchAll(/([A-Za-z0-9_-]+)\.js(?![A-Za-z0-9])/g)].map((m) => m[1]));

const folders = hookCarryingFolders();
const hookNames = discoverHooks();

describe('hooks-registered — census of hook documents per hook-carrying folder', () => {
  test('hooks are discovered in src/ and the catalog yields hook-carrying folders', () => {
    expect(hookNames.length).toBeGreaterThan(0);
    expect(folders.length).toBeGreaterThan(0);
  });

  test('every catalog target has a document table row', () => {
    for (const target of catalog.targets) {
      expect(TARGET_DOCS[target], `no hook-document table row for target "${target}"`).toBeDefined();
    }
  });

  for (const { folder, target } of folders) {
    test(`${folder}: hooks.json documents equal the ${target} table`, () => {
      const folderPath = path.join(PLUGINS_DIR, folder);
      expect(existsSync(folderPath), `Missing hook-carrying folder: ${folderPath}`).toBe(true);
      const expected = TARGET_DOCS[target].docs.map((d) => d.jsonPath).sort();
      const actual = findHookDocs(folderPath);
      const unexpected = actual.filter((p) => !expected.includes(p));
      const missing = expected.filter((p) => !actual.includes(p));
      expect(unexpected, `${folder}: hooks.json not in the table`).toEqual([]);
      expect(missing, `${folder}: table entry with no document`).toEqual([]);
    });
  }
});

describe('hooks-registered — registrations and bundles agree in both directions', () => {
  for (const { folder, target } of folders) {
    const { docs, manifestPath } = TARGET_DOCS[target];
    for (const { jsonPath, bundleDir } of docs) {
      describe(`${folder} :: ${jsonPath}`, () => {
        const folderPath = path.join(PLUGINS_DIR, folder);
        const jsonFile = path.join(folderPath, jsonPath);
        let rawJson: string | null = null;
        try { rawJson = readFileSync(jsonFile, 'utf-8'); } catch { /* reported by the test below */ }

        test('hooks.json exists and is valid JSON', () => {
          expect(rawJson, `Missing: ${jsonFile}`).not.toBeNull();
          expect(() => JSON.parse(rawJson as string)).not.toThrow();
        });

        test('references only hooks that exist in src/', () => {
          expect(rawJson, `Missing: ${jsonFile}`).not.toBeNull();
          for (const name of referencedHooks(rawJson as string)) {
            expect(hookNames, `unknown hook "${name}.js" referenced in ${folder}/${jsonPath}`).toContain(name);
          }
        });

        // The branch is decided at collection time so it is part of the test name (visible in any reporter).
        const bundles = bundlesIn(path.join(folderPath, bundleDir));
        const branch = bundles.length === 0 ? 'shipped' : 'advisory';

        test(`posture shape: ${branch} (${branch === 'shipped' ? 'no bundles, no references' : 'forward and reverse'})`, () => {
          expect(rawJson, `Missing: ${jsonFile}`).not.toBeNull();
          const referenced = referencedHooks(rawJson as string);

          if (branch === 'shipped') {
            // The shipped posture carries no advisory hook anywhere in the document.
            expect([...referenced], `${folder}/${jsonPath} registers hooks but ships no bundles`).toEqual([]);
            return;
          }
          // Advisory bundles are only legitimate from the designated hooks release onward.
          expect(shipsHooks(path.join(folderPath, manifestPath)), `${folder} ships bundles below the hooks release`).toBe(true);
          const exceptions = new Set([...NEVER_REGISTERED, ...(target === 'antigravity' ? UNREGISTERED_BY_IDE.antigravity : [])]);
          // forward: a bundle that is built must be registered
          const unregistered = bundles.filter((b) => !exceptions.has(b) && !referenced.has(b));
          expect(unregistered, `bundles not registered in ${folder}/${jsonPath}`).toEqual([]);
          // reverse: a registered hook must have a bundle
          const dangling = [...referenced].filter((r) => !bundles.includes(r));
          expect(dangling, `registered hooks without a bundle in ${folder}/${bundleDir}`).toEqual([]);
        });
      });
    }
  }
});
