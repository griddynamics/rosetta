#!/usr/bin/env node
/**
 * MANUAL UTILITY ONLY — NOT used by the E2E workflow or any automated path.
 *
 * The E2E cases consume the maintainer-provided fixture archives in `test-library/`
 * (`spring-boot-react-mysql-not-initialized.zip` for `coding-vanilla`,
 * `...-initialized.zip` for `coding-rosetta`) copied verbatim to `<case>/src.zip` — those
 * archives are the source of truth and are NOT reprocessed. This script exists only for
 * ad-hoc local experiments where someone wants to derive a fresh `src.zip` from a raw
 * fixture; the CI workflow does not call it.
 *
 * Build a Curiocity case `src.zip` from a Spring fixture archive.
 *
 * - Flattens the fixture's single top-level project directory (its CONTENTS become the
 *   zip root, so the workspace has `spring-boot-server/`, `react-client/`, ... at top).
 * - Excludes cruft that must not reach the agent workspace: `.git`, `__MACOSX`,
 *   `.DS_Store`, `.idea`, `.claude`, `spring-boot-server/target`, `react-client/build`,
 *   `node_modules`, and the large lockfiles.
 * - Uses the system `unzip`/`zip` (not a JS archiver) so unix permission bits survive —
 *   critically the executable bit on `spring-boot-server/mvnw`, or `./mvnw test` fails.
 *
 * Usage:
 *   node build-src-zip.mjs <outSrcZip> [sourceFixtureZip]
 * Defaults sourceFixtureZip to test-library/spring-boot-react-mysql.zip at the repo root.
 *
 * NOTE (per-case fixtures): both cases currently build from the same fixture. The plan's
 * handoff gate replaces these with proper per-case fixtures — a clean one for `coding`
 * and a Rosetta-pre-initialized one for `coding-rosetta` — by passing a different
 * sourceFixtureZip per case; no script change needed.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

const outArg = process.argv[2];
if (!outArg) {
  console.error('usage: node build-src-zip.mjs <outSrcZip> [sourceFixtureZip]');
  process.exit(2);
}
const outZip = isAbsolute(outArg) ? outArg : resolve(process.cwd(), outArg);
const sourceArg = process.argv[3] ?? join(repoRoot, 'test-library', 'spring-boot-react-mysql.zip');
const sourceZip = isAbsolute(sourceArg) ? sourceArg : resolve(process.cwd(), sourceArg);

if (!existsSync(sourceZip)) {
  console.error(`source fixture not found: ${sourceZip}`);
  process.exit(2);
}

// Relative glob patterns (from the flattened root) to drop before zipping.
const EXCLUDE = [
  '.git',
  '__MACOSX',
  '.idea',
  '.claude',
  'spring-boot-server/target',
  'react-client/build',
  'react-client/node_modules',
  'react-client/package-lock.json',
  'react-client/yarn.lock',
];

const work = mkdtempSync(join(tmpdir(), 'curiocity-srczip-'));
try {
  const extractDir = join(work, 'x');
  mkdirSync(extractDir, { recursive: true });
  execFileSync('unzip', ['-q', sourceZip, '-d', extractDir], { stdio: 'inherit' });

  // Find the single top-level project directory to flatten.
  const tops = readdirSync(extractDir).filter((n) => n !== '__MACOSX');
  const dirs = tops.filter((n) => statSync(join(extractDir, n)).isDirectory());
  if (dirs.length !== 1) {
    console.error(`expected exactly one top-level project dir, found: ${dirs.join(', ') || '(none)'}`);
    process.exit(2);
  }
  const root = join(extractDir, dirs[0]);

  // Drop excluded paths.
  for (const rel of EXCLUDE) {
    const p = join(root, rel);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
  // Drop every .DS_Store anywhere.
  execFileSync('find', [root, '-name', '.DS_Store', '-delete']);

  // Guarantee the Maven wrapper is executable (defensive — it already is in the fixture).
  const mvnw = join(root, 'spring-boot-server', 'mvnw');
  if (existsSync(mvnw)) execFileSync('chmod', ['+x', mvnw]);

  // Fresh output.
  if (existsSync(outZip)) rmSync(outZip);
  mkdirSync(dirname(outZip), { recursive: true });

  // Zip the CONTENTS of root (flattened). `zip` preserves unix perms (mvnw stays +x).
  // `-X` strips extra Mac attributes so no `__MACOSX` sidecars are produced.
  execFileSync('zip', ['-q', '-r', '-X', outZip, '.'], { cwd: root, stdio: 'inherit' });

  const bytes = statSync(outZip).size;
  console.log(`built ${outZip} (${(bytes / 1024).toFixed(0)} KB) from ${sourceZip}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
