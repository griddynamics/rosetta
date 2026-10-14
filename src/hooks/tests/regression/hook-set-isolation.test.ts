// hook-set-isolation.test.ts — Regression guard: the domain sets (workflows, qe, search,
// modernization) carry NO hooks. Hooks ship only in the hook-carrying sets (`rosetta*` and
// `core*`), so installing a domain set beside `core` can never register a hook twice.
//
// The folders are DERIVED from src/rosettify-plugins/plugins.json (sets with an empty `hooks`
// list x variant destinationSuffix x target), never hard-coded. Each folder must exist and hold
// no hooks.json and no *.js, except the harness skill's reference copies under
// skills/harness/references/hooks/.
//
// ROSETTA_PLUGINS_DIR points the test at another generated tree (e.g. a posture-true scratch).

import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const PLUGINS_DIR = process.env.ROSETTA_PLUGINS_DIR ?? path.resolve(ROOT, 'plugins');
const CATALOG = path.resolve(ROOT, 'src', 'rosettify-plugins', 'plugins.json');

// hooks.json copies and scripts shipped as harness reference material are not plugin hooks.
const HARNESS_REFERENCE = /(^|\/)skills\/harness\/references\/hooks\//;

interface Catalog {
  targets: string[];
  sets: { name: string; hooks: string[]; variants: { destinationSuffix: string }[] }[];
}
const catalog: Catalog = JSON.parse(readFileSync(CATALOG, 'utf-8'));

const domainFolders = (): string[] =>
  catalog.sets
    .filter((s) => s.hooks.length === 0)
    .flatMap((s) => s.variants.flatMap((v) => catalog.targets.map((t) => `${s.name}-${t}${v.destinationSuffix}`)));

/** Relative paths of every file under a folder, harness reference copies excluded. */
function listFiles(folderPath: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(folderPath, full).split(path.sep).join('/');
      if (entry.isDirectory()) walk(full);
      else if (!HARNESS_REFERENCE.test(rel)) found.push(rel);
    }
  };
  walk(folderPath);
  return found;
}

const folders = domainFolders();

describe('hook-set-isolation — domain-set plugins carry no hooks', () => {
  test('the catalog yields domain-set folders', () => {
    expect(folders.length).toBeGreaterThan(0);
  });

  for (const folder of folders) {
    describe(folder, () => {
      const folderPath = path.join(PLUGINS_DIR, folder);

      test('exists', () => {
        expect(existsSync(folderPath), `Missing domain-set folder: ${folderPath}`).toBe(true);
      });

      test('has no hooks.json and no *.js outside the harness reference copies', () => {
        expect(existsSync(folderPath), `Missing domain-set folder: ${folderPath}`).toBe(true);
        const files = listFiles(folderPath);
        const hookDocs = files.filter((f) => path.posix.basename(f) === 'hooks.json');
        const scripts = files.filter((f) => f.endsWith('.js'));
        expect(hookDocs, `${folder} carries hooks.json`).toEqual([]);
        expect(scripts, `${folder} carries *.js`).toEqual([]);
      });
    });
  }
});
