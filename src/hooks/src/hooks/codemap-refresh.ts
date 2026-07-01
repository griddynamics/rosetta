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
//  - Logs go to ~/.rosetta/rosetta.log only when ROSETTA_DEBUG=1.
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
import { debugLogHookBranch, getDebugLogPath, isDebugLoggingEnabled } from '../runtime/debug-log';
import {
  ensureDirectory,
  hashedFilePath,
  releaseLockFile,
  tryAcquireTimedLock,
} from '../runtime/file-coordination';
import { walkUp } from '../runtime/path-utils';

export const DEBOUNCE_MS = 5000;

// A lock older than this is treated as stale (its deferred process must have
// died) and is reclaimed, so a crashed sleeper can never wedge a backend.
const STALE_LOCK_MS = DEBOUNCE_MS + 60_000;

// ---------------------------------------------------------------------------
// Cache / coordination helpers

const ensureCacheDir = (): string => {
  const dir = path.join(os.homedir(), '.cache', 'codemap');
  ensureDirectory(dir);
  return dir;
};

// ---------------------------------------------------------------------------
// Debounce schedule lock — PRE-CHECK: only the first edit in a window schedules.

const lockPathForBackendRepo = (
  cacheDir: string,
  backend: string,
  repoRoot: string,
): string => {
  return hashedFilePath(cacheDir, `codemap-refresh:${backend}:${repoRoot}`, '.pending');
};

// Atomically create the lock. Returns true IFF this call acquired it — i.e. no
// refresh was already scheduled for this backend+repo. `wx` (O_CREAT|O_EXCL) is
// the cross-process atomic primitive; on contention only one caller wins. A
// stale lock (older than STALE_LOCK_MS) is reclaimed once.
const tryAcquireSchedule = (lockPath: string): boolean => {
  return tryAcquireTimedLock(lockPath, { staleAfterMs: STALE_LOCK_MS });
};

const releaseSchedule = (lockPath: string): void => {
  releaseLockFile(lockPath);
};

// ---------------------------------------------------------------------------
// GitNexus-specific: embeddings probe

const getEmbeddingsFlag = (repoRoot: string): boolean => {
  try {
    const meta = JSON.parse(
      fs.readFileSync(path.join(repoRoot, '.gitnexus', 'meta.json'), 'utf-8'),
    );
    const enabled = !!(meta.stats && meta.stats.embeddings > 0);
    debugLogHookBranch('codemap-refresh', 'embeddings-flag-detected', {
      repoRoot,
      enabled,
      embeddings: meta.stats?.embeddings ?? null,
    });
    return enabled;
  } catch {
    debugLogHookBranch('codemap-refresh', 'embeddings-flag-missing-or-invalid', {
      repoRoot,
    });
    return false;
  }
};

// ---------------------------------------------------------------------------
// Build the refresh command string for a given backend

const buildRefreshCommand = (backend: string, repoRoot: string): string => {
  if (backend === 'gitnexus') {
    const hadEmbeddings = getEmbeddingsFlag(repoRoot);
    const extraFlags = hadEmbeddings ? ' --embeddings' : '';
    const command = `npx gitnexus analyze --force${extraFlags}`;
    debugLogHookBranch('codemap-refresh', 'refresh-command-built', {
      backend,
      repoRoot,
      command,
      hadEmbeddings,
    });
    return command;
  }
  const command = 'graphify update .';
  debugLogHookBranch('codemap-refresh', 'refresh-command-built', {
    backend,
    repoRoot,
    command,
    hadEmbeddings: false,
  });
  return command;
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
  const escapedLockPath = jsEmbed(lockPath);
  const escapedRepoRoot = jsEmbed(repoRoot);
  const escapedRefreshCmd = jsEmbed(refreshCmd);
  const escapedDebugLogPath = jsEmbed(getDebugLogPath());
  const debugEnabled = isDebugLoggingEnabled();

  // Deferred body: wait the debounce window, run the refresh once, then release
  // the lock in `finally` so a failed refresh never leaves the backend wedged.
  const deferredScript = [
    `const cp = require('child_process'), fs = require('fs'), path = require('path');`,
    `const DEBUG_ENABLED = ${debugEnabled ? 'true' : 'false'};`,
    `const DEBUG_LOG_PATH = '${escapedDebugLogPath}';`,
    `const serializeError = function (error) {`,
    `  if (!error || typeof error !== 'object') return { message: String(error) };`,
    `  return { name: error.name || 'Error', message: error.message || String(error), stack: error.stack || null };`,
    `};`,
    `const emit = function (branch, context) {`,
    `  if (!DEBUG_ENABLED) return;`,
    `  try { fs.mkdirSync(path.dirname(DEBUG_LOG_PATH), { recursive: true }); } catch (e0) {}`,
    `  try {`,
    `    fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify({`,
    `      ts: new Date().toISOString(),`,
    `      msg: 'hook:codemap-refresh:branch:' + branch,`,
    `      pid: process.pid,`,
    `      ppid: process.ppid,`,
    `      ...context,`,
    `    }) + '\\n');`,
    `  } catch (e1) {}`,
    `};`,
    `emit('deferred-process-created', { backend: '${backend}', repoRoot: '${escapedRepoRoot}', lockPath: '${escapedLockPath}', refreshCmd: '${escapedRefreshCmd}', debounceMs: ${DEBOUNCE_MS} });`,
    `setTimeout(function () {`,
    `  emit('deferred-exec-start', { backend: '${backend}', repoRoot: '${escapedRepoRoot}', lockPath: '${escapedLockPath}', refreshCmd: '${escapedRefreshCmd}' });`,
    `  try {`,
    `    cp.execSync('${escapedRefreshCmd}', { cwd: '${escapedRepoRoot}', stdio: 'ignore' });`,
    `    emit('deferred-exec-success', { backend: '${backend}', repoRoot: '${escapedRepoRoot}', lockPath: '${escapedLockPath}', refreshCmd: '${escapedRefreshCmd}' });`,
    `  } catch (e) {`,
    `    emit('deferred-exec-failed', { backend: '${backend}', repoRoot: '${escapedRepoRoot}', lockPath: '${escapedLockPath}', refreshCmd: '${escapedRefreshCmd}', error: serializeError(e) });`,
    `  } finally {`,
    `    emit('deferred-lock-release-start', { backend: '${backend}', repoRoot: '${escapedRepoRoot}', lockPath: '${escapedLockPath}' });`,
    `    try {`,
    `      fs.unlinkSync('${escapedLockPath}');`,
    `      emit('deferred-lock-released', { backend: '${backend}', repoRoot: '${escapedRepoRoot}', lockPath: '${escapedLockPath}' });`,
    `    } catch (e3) {`,
    `      emit('deferred-lock-release-failed', { backend: '${backend}', repoRoot: '${escapedRepoRoot}', lockPath: '${escapedLockPath}', error: serializeError(e3) });`,
    `    }`,
    `  }`,
    `}, ${DEBOUNCE_MS});`,
  ].join(' ');

  debugLogHookBranch('codemap-refresh', 'deferred-refresh-prepared', {
    backend,
    repoRoot,
    lockPath,
    refreshCmd,
    debugEnabled,
    debugLogPath: getDebugLogPath(),
  });

  try {
    const child = spawn(process.execPath, ['-e', deferredScript], {
      cwd: repoRoot,
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
    debugLogHookBranch('codemap-refresh', 'deferred-refresh-spawned', {
      backend,
      repoRoot,
      lockPath,
      command: process.execPath,
      args: ['-e', deferredScript],
    });
  } catch (err) {
    debugLogHookBranch('codemap-refresh', 'deferred-refresh-spawn-failed', {
      backend,
      repoRoot,
      lockPath,
      error: err as Error,
    });
    releaseSchedule(lockPath); // nothing will run the deferred body — release now
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

  debugLogHookBranch('codemap-refresh', 'backends-detected', {
    cwd,
    backends: results,
  });
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
      debugLogHookBranch('codemap-refresh', 'no-backends-noop', {
        cwd,
      });
      return sideEffect(); // no-op: neither backend installed
    }

    const cacheDir = ensureCacheDir();
    debugLogHookBranch('codemap-refresh', 'coordination-dir-ready', {
      cwd,
      cacheDir,
      backendCount: backends.length,
    });

    for (const backend of backends) {
      const lockPath = lockPathForBackendRepo(cacheDir, backend.name, backend.repoRoot);
      debugLogHookBranch('codemap-refresh', 'schedule-attempt', {
        backend: backend.name,
        repoRoot: backend.repoRoot,
        lockPath,
      });

      // PRE-CHECK: if a refresh is already scheduled for this backend+repo, do
      // NOT schedule another. Only the first edit in the window spawns.
      if (!tryAcquireSchedule(lockPath)) {
        debugLogHookBranch('codemap-refresh', 'already-scheduled-skip', {
          backend: backend.name,
          repoRoot: backend.repoRoot,
          lockPath,
        });
        continue;
      }

      debugLogHookBranch('codemap-refresh', 'schedule-acquired', {
        backend: backend.name,
        repoRoot: backend.repoRoot,
        lockPath,
      });
      debugLogHookBranch('codemap-refresh', 'refresh-scheduled', {
        backend: backend.name,
        repoRoot: backend.repoRoot,
        lockPath,
        toolName: ctx.toolName,
        cwd: ctx.cwd,
      });
      spawnDeferredRefresh(backend.name, backend.repoRoot, cacheDir, lockPath);
    }

    return sideEffect();
  },
});

runAsCli(codemapRefreshHook, module);
