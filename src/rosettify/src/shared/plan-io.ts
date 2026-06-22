// Implements FR-SHRD-0009 (read resilience with retry) and FR-PLAN-0024 (atomic write with rename-as-guard).

import * as fs from "fs";
import * as path from "path";
import type { RunEnvelope } from "../registry/types.js";
import { err } from "./envelope.js";
import { logger } from "./logger.js";
import {
  PLAN_BACKUP_RETENTION,
  PLAN_BACKUP_MAX_RETRIES,
  PLAN_READ_RETRY_DELAY_MS,
  PLAN_READ_MAX_RETRIES,
} from "./constants.js";
import {
  ERR_PLAN_FILE_CORRUPTED,
  ERR_BACKUP_CREATE_FAILED,
} from "../commands/plan/errors.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns all backup file names (just the basename, not full path) for a plan file. */
function listBackups(dir: string, basename: string): string[] {
  try {
    const entries = fs.readdirSync(dir);
    // FR-PLAN-0024 — backup naming convention: <basename>.bakNNN
    return entries.filter((e) => /^.+\.bak\d+$/.test(e) && e.startsWith(basename + ".bak"));
  } catch {
    return [];
  }
}

/** Parses the NNN suffix from a backup name like "plan.json.bak042" → 42. Returns -1 if invalid. */
function parseBackupIndex(basename: string, backupName: string): number {
  const prefix = basename + ".bak";
  if (!backupName.startsWith(prefix)) return -1;
  const suffix = backupName.slice(prefix.length);
  if (!/^\d+$/.test(suffix)) return -1;
  return parseInt(suffix, 10);
}

/** Computes next backup path: finds max existing index + 1. */
function nextBackupPath(filePath: string): string {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const backups = listBackups(dir, basename);
  let maxIdx = -1;
  for (const b of backups) {
    const idx = parseBackupIndex(basename, b);
    if (idx > maxIdx) maxIdx = idx;
  }
  const nextIdx = maxIdx + 1;
  // FR-PLAN-0024 step 3 — 3-digit zero-padded for cosmetics
  const padded = String(nextIdx).padStart(3, "0");
  return path.join(dir, `${basename}.bak${padded}`);
}

/** Prunes oldest backups beyond retention count. FR-PLAN-0024 step 7. */
function pruneBackups(filePath: string, retention: number): void {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);
  const backups = listBackups(dir, basename);
  if (backups.length <= retention) return;

  // Sort by index ascending — oldest first
  const sorted = backups
    .map((b) => ({ name: b, idx: parseBackupIndex(basename, b) }))
    .filter((x) => x.idx >= 0)
    .sort((a, b) => a.idx - b.idx);

  const toDelete = sorted.slice(0, sorted.length - retention);
  for (const { name } of toDelete) {
    try {
      fs.unlinkSync(path.join(dir, name));
      logger.info({ file: name }, "pruned old backup");
    } catch {
      // best-effort
    }
  }
}

// ---------------------------------------------------------------------------
// Public: Read with resilience (FR-SHRD-0009)
// ---------------------------------------------------------------------------

/**
 * Reads the plan file.
 * - If file exists: parse and return it; injects previous_version=null if missing (back-compat).
 * - If file missing AND backup exists: sleep PLAN_READ_RETRY_DELAY_MS, retry up to PLAN_READ_MAX_RETRIES.
 * - If file missing AND no backup: return null immediately.
 * - If parse fails: throws (caller converts to plan_file_corrupted).
 */
export async function readPlanWithRetry<Plan extends { previous_version?: string | null }>(
  filePath: string,
): Promise<Plan | null> {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath);

  for (let attempt = 0; attempt <= PLAN_READ_MAX_RETRIES; attempt++) {
    if (fs.existsSync(filePath)) {
      // FR-SHRD-0009 — file present, parse it
      const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Plan;
      // FR-PLAN-0017 — back-compat: inject previous_version:null if absent
      if (!("previous_version" in raw)) {
        (raw as Record<string, unknown>)["previous_version"] = null;
      }
      return raw;
    }

    // File missing — check for backups
    const backups = listBackups(dir, basename);
    if (backups.length === 0) {
      // FR-SHRD-0009 — no backup, return immediately
      return null;
    }

    if (attempt >= PLAN_READ_MAX_RETRIES) {
      // Exhausted retries
      return null;
    }

    // FR-SHRD-0009 — backup exists, wait and retry
    logger.info({ filePath, attempt }, "plan file missing but backup exists, retrying read");
    await new Promise<void>((resolve) => setTimeout(resolve, PLAN_READ_RETRY_DELAY_MS));
  }

  return null;
}

// ---------------------------------------------------------------------------
// Public: Atomic write with backup chain (FR-PLAN-0024)
// ---------------------------------------------------------------------------

/**
 * Wraps a plan mutation in the rename-as-guard write cycle (FR-PLAN-0024).
 *
 * Used only when an existing plan file is being mutated. First-ever create writes
 * (file does not yet exist) bypass this helper and call savePlan directly with
 * previous_version=null, per FR-PLAN-0024 ("first-ever create: skip steps 1, 3, 5, 7").
 *
 * Retry loop bounded to PLAN_BACKUP_MAX_RETRIES.
 * Any failure within the cycle restarts from step 1.
 * Mutation returning ok:false bubbles immediately (logic error, not a write failure).
 */
export async function atomicWriteWithBackup<Plan extends { previous_version?: string | null; updated_at: string }, T>(
  filePath: string,
  mutate: (plan: Plan) => { ok: true; result: T; updated: Plan } | { ok: false; error: string; include_help?: boolean },
  savePlan: (filePath: string, plan: Plan) => void,
  options?: { maxRetries?: number; retention?: number },
): Promise<RunEnvelope<{ result: T; backupPath: string | null }>> {
  const maxRetries = options?.maxRetries ?? PLAN_BACKUP_MAX_RETRIES;
  const retention = options?.retention ?? PLAN_BACKUP_RETENTION;

  // FR-PLAN-0024 write cycle. The FR statement names rename-as-guard, but neither plain
  // renameSync (POSIX rename overwrites the target — clobbers another writer's bak) nor
  // hardlink claim (two writers can both hardlink the same source inode before either
  // unlinks it; the second's unlink then destroys the first's freshly-written file) actually
  // serializes concurrent writers in a multi-process scenario (verified by MPP test: 3/30
  // lost writes with hardlink; 1/10 with plain rename). The only POSIX primitive that
  // gives true exclusion across processes is an atomic-create primitive. mkdir(2) creates
  // a directory atomically and fails with EEXIST if the path exists, so we use a `.lock`
  // directory as a mutex around the entire read-mutate-rename-write cycle. Inside the lock
  // the simpler renameSync semantics suffice because no other writer can be in the cycle.
  const lockPath = filePath + ".lock";
  const lockStaleMs = 30_000; // a process holding the lock longer than this is treated as crashed
  const lockSpinMs = 20;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Step 0a: Acquire the lock. mkdirSync is atomic.
    let lockHeld = false;
    try {
      fs.mkdirSync(lockPath);
      lockHeld = true;
    } catch (e: unknown) {
      const code = (e as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") {
        logger.warn({ attempt, lockPath, error: String(e) }, "lock acquire failed (non-EEXIST), restarting");
        await new Promise<void>((r) => setTimeout(r, lockSpinMs));
        continue;
      }
      // EEXIST: another writer holds the lock — or its previous holder crashed.
      try {
        const stat = fs.statSync(lockPath);
        const age = Date.now() - stat.mtimeMs;
        if (age > lockStaleMs) {
          logger.warn({ lockPath, ageMs: age }, "removing stale lock");
          try { fs.rmdirSync(lockPath); } catch { /* race with another writer is fine */ }
        }
      } catch {
        // lock disappeared between EEXIST and statSync — race is fine, just retry
      }
      await new Promise<void>((r) => setTimeout(r, lockSpinMs + Math.floor(Math.random() * lockSpinMs)));
      continue;
    }

    try {
      // Step 1: Read with resilience
      let current: Plan | null;
      try {
        current = await readPlanWithRetry<Plan>(filePath);
      } catch (e) {
        // parse failure — treat as corrupted, bubble immediately
        return err(ERR_PLAN_FILE_CORRUPTED);
      }

      if (!current) return err("plan_not_found");

      // Step 2: Apply mutation in memory
      const fnResult = mutate(current);
      if (!fnResult.ok) {
        // Logic error — do not retry
        return err(fnResult.error, fnResult.include_help ?? false);
      }

      // Step 3: Compute next backup name (we hold the lock, so the directory scan is stable)
      const bakPath = nextBackupPath(filePath);

      // Step 4: Set previous_version on the mutated plan
      const toWrite = { ...fnResult.updated, previous_version: bakPath } as Plan;

      // Step 5: Move current file to backup. We hold the exclusive lock so renameSync
      // semantics are safe — bakPath cannot exist (we just computed max+1), and no other
      // writer is racing for filePath.
      try {
        fs.renameSync(filePath, bakPath); // FR-PLAN-0024 step 5 — guarded by lock
      } catch (renameErr) {
        // Should not happen inside the lock; if it does, surface and restart.
        logger.warn({ attempt, filePath, bakPath, error: String(renameErr) }, "rename failed under lock, restarting");
        continue;
      }

      // Step 6: Write new plan content
      try {
        savePlan(filePath, toWrite); // FR-PLAN-0026 — pretty-formatted on disk
      } catch (writeErr) {
        // Roll back: rename the bak back to file path.
        try { fs.renameSync(bakPath, filePath); } catch { /* best-effort */ }
        logger.warn({ attempt, filePath, bakPath, error: String(writeErr) }, "write failed after rename, rolled back, restarting");
        continue;
      }

      // Step 7: Prune oldest backups beyond retention
      pruneBackups(filePath, retention);

      logger.info({ filePath, bakPath, attempt }, "atomic write complete");
      return { ok: true, result: { result: fnResult.result, backupPath: bakPath }, error: null, include_help: false };
    } finally {
      if (lockHeld) {
        try { fs.rmdirSync(lockPath); } catch { /* best-effort */ }
      }
    }
  }

  // FR-PLAN-0024 — exhausted retries
  return err(ERR_BACKUP_CREATE_FAILED);
}
