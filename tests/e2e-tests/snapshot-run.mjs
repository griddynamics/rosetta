#!/usr/bin/env node
/**
 * snapshot-run.mjs — copy a completed Curiocity e2e run into the git-tracked
 * `results-history/` so runs can be compared over time.
 *
 * It copies Curiocity's OWN output files VERBATIM (no hand-authored summaries) plus a
 * small factual `snapshot-meta.json` provenance stamp (source path, curiocity version,
 * git commit + dirty flag, timestamps). Ephemeral full output lives in the gitignored
 * `.runtime/results/`; this makes a durable, curated copy. Committing is manual (repo
 * policy: no auto-commit).
 *
 * Usage:
 *   node tests/e2e-tests/snapshot-run.mjs [<run-dir>]
 *     <run-dir>  a Curiocity run directory (one containing `suite.json`).
 *                Default: the most recently modified such dir under `.runtime/results/`.
 *
 * The snapshot is the FULL run tree (incl. raw-transcript.jsonl / trajectory.jsonl /
 * screen.log / workspace.diff / views/*.md) — the complete record needed to revalidate
 * how a past run behaved. If history grows too heavy, prune by editing PRUNE below.
 */
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');
const RESULTS_ROOT = join(HERE, '.runtime', 'results');
const HISTORY_ROOT = join(HERE, 'results-history');

/** Basenames to exclude from the copy (none by default — full fidelity). */
const PRUNE = new Set([]);

/** Recursively find every directory that directly contains a `suite.json`. */
function findRunDirs(root) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isFile() && e.name === 'suite.json')) found.push(dir);
    for (const e of entries) if (e.isDirectory()) walk(join(dir, e.name));
  };
  walk(root);
  return found;
}

function newest(dirs) {
  return dirs
    .map((d) => ({ d, mtime: statSync(d).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.d;
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

const argDir = process.argv[2] ? resolve(process.argv[2]) : undefined;
const runDir = argDir ?? (existsSync(RESULTS_ROOT) ? newest(findRunDirs(RESULTS_ROOT)) : undefined);

if (!runDir || !existsSync(join(runDir, 'suite.json'))) {
  console.error(
    `no Curiocity run found.\n  looked in: ${argDir ?? RESULTS_ROOT}\n  a run dir must contain suite.json.`,
  );
  process.exit(1);
}

const stamp = runDir.split('/').filter(Boolean).pop();
const dest = join(HISTORY_ROOT, stamp);

cpSync(runDir, dest, {
  recursive: true,
  filter: (src) => !PRUNE.has(src.split('/').filter(Boolean).pop()),
});

let suiteCreated = null;
try {
  suiteCreated = JSON.parse(readFileSync(join(runDir, 'suite.json'), 'utf8')).createdAt ?? null;
} catch {
  /* leave null */
}

const pkgVersion = (() => {
  try {
    return JSON.parse(readFileSync(join(REPO_ROOT, 'src', 'curiocity', 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
})();

const meta = {
  sourcePath: runDir.replace(`${REPO_ROOT}/`, ''),
  curiocityVersion: pkgVersion,
  gitCommit: git('rev-parse HEAD'),
  gitDirty: (git('status --porcelain') ?? '') !== '',
  suiteCreatedAt: suiteCreated,
  snapshottedAt: new Date().toISOString(),
};
writeFileSync(join(dest, 'snapshot-meta.json'), `${JSON.stringify(meta, null, 2)}\n`);

console.log(`snapshot → ${dest.replace(`${REPO_ROOT}/`, '')}`);
console.log(JSON.stringify(meta, null, 2));
