// codemap-refresh.ts — PostToolUse hook that silently re-indexes the active
// code-map backend after file edits.
//
// Fires after every Edit / Write / MultiEdit tool call.
//
// Debounce is PRE-CHECK, not post-check: the first edit in a quiet window
// schedules a single deferred refresh by ATOMICALLY creating a per-backend lock
// file. Every subsequent edit sees the lock already present and does NOT
// schedule again. So a burst of N edits produces exactly ONE sleeper, ONE node
// call, and ONE re-index (which picks up every file edited before it runs). The
// deferred process removes the lock when finished, so the next burst can
// schedule again. A stale lock (its sleeper died) is reclaimed automatically.
//
// Supported backends (detected by walking up from cwd):
//   GitNexus  — marker: .gitnexus/              command: npx gitnexus analyze --force
//   Graphify  — marker: graphify-out/graph.json command: graphify update .
//
// Rules:
//  - No stdout output — the agent must never see this hook.
//  - Logs go to ~/.cache/codemap/refresh.log only.
//  - No-op immediately if neither backend marker is found in the repo tree.
//  - Each backend is scheduled independently (its own lock).
//  - The lock is keyed by (backend, repoRoot), NOT by session — so two or three
//    agent sessions editing the SAME repo coalesce into one refresh, while
//    different repos schedule independently.
//  - Opt-in: only active when installed by the user (not auto-loaded).
//
// Exports (for testability): codemapRefreshHook, DEBOUNCE_MS

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { sideEffect } from '../runtime/result-helpers';
import { debugLog } from '../runtime/debug-log';
import { walkUp } from '../runtime/path-utils';

export const DEBOUNCE_MS = 5000;

// A lock older than this is treated as stale (its deferred process must have
// died) and is reclaimed, so a crashed sleeper can never wedge a backend.
const STALE_LOCK_MS = DEBOUNCE_MS + 60_000;

// ---------------------------------------------------------------------------
// Cache / log helpers

const ensureCacheDir = (): string => {
  const dir = path.join(os.homedir(), '.cache', 'codemap');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const log = (cacheDir: string, message: string): void => {
  try {
    const ts = new Date().toISOString();
    fs.appendFileSync(path.join(cacheDir, 'refresh.log'), `${ts}  ${message}\n`);
  } catch {
    // logging must never crash the hook
  }
};

// ---------------------------------------------------------------------------
// Debounce schedule lock — PRE-CHECK: only the first edit in a window schedules.

const lockPathForBackendRepo = (
  cacheDir: string,
  backend: string,
  repoRoot: string,
): string => {
  const key = Buffer.from(`${backend}:${repoRoot}`).toString('base64').replace(/[/+=]/g, '_');
  return path.join(cacheDir, `${key}.pending`);
};

// Atomically create the lock. Returns true IFF this call acquired it — i.e. no
// refresh was already scheduled for this backend+repo. `wx` (O_CREAT|O_EXCL) is
// the cross-process atomic primitive; on contention only one caller wins. A
// stale lock (older than STALE_LOCK_MS) is reclaimed once.
const tryAcquireSchedule = (lockPath: string): boolean => {
  const create = (): boolean => {
    try {
      const fd = fs.openSync(lockPath, 'wx');
      fs.writeSync(fd, String(Date.now()));
      fs.closeSync(fd);
      return true;
    } catch {
      return false;
    }
  };

  if (create()) return true;

  // Lock exists → a refresh is already scheduled, unless the lock is stale.
  try {
    const created = parseInt(fs.readFileSync(lockPath, 'utf-8').trim(), 10);
    if (Number.isFinite(created) && Date.now() - created > STALE_LOCK_MS) {
      fs.unlinkSync(lockPath);
      return create(); // reclaim once
    }
  } catch {
    // a racing peer mutated/removed the lock — treat as already scheduled
  }
  return false;
};

const releaseSchedule = (lockPath: string): void => {
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // already gone — fine
  }
};

// ---------------------------------------------------------------------------
// GitNexus-specific: embeddings probe

const getEmbeddingsFlag = (repoRoot: string): boolean => {
  try {
    const meta = JSON.parse(
      fs.readFileSync(path.join(repoRoot, '.gitnexus', 'meta.json'), 'utf-8'),
    );
    return !!(meta.stats && meta.stats.embeddings > 0);
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Build the refresh command string for a given backend

const buildRefreshCommand = (backend: string, repoRoot: string): string => {
  if (backend === 'gitnexus') {
    const hadEmbeddings = getEmbeddingsFlag(repoRoot);
    const extraFlags = hadEmbeddings ? ' --embeddings' : '';
    return `npx gitnexus analyze --force${extraFlags}`;
  }
  // graphify
  return 'graphify update .';
};

// Escape a value for embedding inside a single-quoted JS string literal in the
// deferred `node -e` script. No shell is involved (we spawn node directly, not
// via `sh -c`), so ONLY JS-string escaping is needed — backslash then quote.
// This is correct on Windows, Linux, and macOS (no shell expansion to worry
// about, and Windows backslash paths are handled).
const jsEmbed = (v: string): string =>
  v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// ---------------------------------------------------------------------------
// Spawn the single deferred (debounced) refresh for one backend. A detached
// `node` process waits DEBOUNCE_MS, runs the refresh once, and ALWAYS removes
// the lock (success or failure) so the next edit burst can schedule again.
// No `sh`/`sleep` is used, so this runs identically on Windows, Linux, macOS.

const spawnDeferredRefresh = (
  backend: string,
  repoRoot: string,
  cacheDir: string,
  lockPath: string,
): void => {
  const refreshCmd = buildRefreshCommand(backend, repoRoot);
  const logFilePath = jsEmbed(path.join(cacheDir, 'refresh.log'));
  const escapedLockPath = jsEmbed(lockPath);
  const escapedRepoRoot = jsEmbed(repoRoot);
  const escapedRefreshCmd = jsEmbed(refreshCmd);

  // Deferred body: wait the debounce window, run the refresh once, then release
  // the lock in `finally` so a failed refresh never leaves the backend wedged.
  const deferredScript = [
    `const cp = require('child_process'), fs = require('fs');`,
    `setTimeout(function () {`,
    `  try {`,
    `    cp.execSync('${escapedRefreshCmd}', { cwd: '${escapedRepoRoot}', stdio: 'inherit' });`,
    `  } catch (e) {`,
    `    try { fs.appendFileSync('${logFilePath}', new Date().toISOString() + '  [codemap-refresh][${backend}] deferred error: ' + (e.message || e) + '\\n'); } catch (e2) {}`,
    `  } finally {`,
    `    try { fs.unlinkSync('${escapedLockPath}'); } catch (e3) {}`,
    `  }`,
    `}, ${DEBOUNCE_MS});`,
  ].join(' ');

  const logFile = path.join(cacheDir, 'refresh.log');
  let out: number;
  try {
    out = fs.openSync(logFile, 'a');
  } catch {
    releaseSchedule(lockPath); // could not even open the log — don't wedge the lock
    return;
  }

  try {
    const child = spawn(process.execPath, ['-e', deferredScript], {
      cwd: repoRoot,
      detached: true,
      stdio: ['ignore', out, out],
    });
    child.unref();
  } catch (err) {
    log(cacheDir, `[codemap-refresh][${backend}] spawn failed: ${(err as Error).message}`);
    releaseSchedule(lockPath); // nothing will run the deferred body — release now
  } finally {
    fs.closeSync(out);
  }
};

// ---------------------------------------------------------------------------
// Detect backends

interface BackendInfo {
  name: string;
  repoRoot: string;
}

const detectBackends = (cwd: string): BackendInfo[] => {
  const results: BackendInfo[] = [];

  const gitnexusRoot = walkUp(cwd, '.gitnexus');
  if (gitnexusRoot) {
    results.push({ name: 'gitnexus', repoRoot: gitnexusRoot });
  }

  // Graphify marker is a file inside a directory, so walk up looking for the file.
  const graphifyRoot = walkUp(cwd, path.join('graphify-out', 'graph.json'));
  if (graphifyRoot) {
    results.push({ name: 'graphify', repoRoot: graphifyRoot });
  }

  return results;
};

// ---------------------------------------------------------------------------

export const codemapRefreshHook = defineHook({
  name: 'codemap-refresh',
  on: {
    event: 'PostToolUse',
    toolKinds: ['write', 'edit', 'multi-edit'],
  },
  run: (ctx) => {
    const cwd = ctx.cwd || process.cwd();
    const backends = detectBackends(cwd);

    if (backends.length === 0) {
      return sideEffect(); // no-op: neither backend installed
    }

    const cacheDir = ensureCacheDir();

    for (const backend of backends) {
      const lockPath = lockPathForBackendRepo(cacheDir, backend.name, backend.repoRoot);

      // PRE-CHECK: if a refresh is already scheduled for this backend+repo, do
      // NOT schedule another. Only the first edit in the window spawns.
      if (!tryAcquireSchedule(lockPath)) {
        debugLog('[codemap-refresh] already scheduled — skipping', {
          backend: backend.name,
          repoRoot: backend.repoRoot,
        });
        continue;
      }

      log(
        cacheDir,
        `[codemap-refresh][${backend.name}] scheduled refresh (tool=${ctx.toolName}, cwd=${ctx.cwd})`,
      );
      spawnDeferredRefresh(backend.name, backend.repoRoot, cacheDir, lockPath);
    }

    return sideEffect();
  },
});

runAsCli(codemapRefreshHook, module);
