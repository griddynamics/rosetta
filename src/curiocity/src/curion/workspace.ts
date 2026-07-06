import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import extract from 'extract-zip';
import { execa } from 'execa';

/**
 * Trial workspace management (§7 steps 1, 6, 8). Every trial gets a fresh mkdtemp
 * workspace (D16); `src.zip` is unzipped in (stripping `__MACOSX`), or an inline
 * `--src` dir is copied. A snapshot of the unzipped source is kept so `collect`
 * can produce the workspace diff vs the ORIGINAL source (§5.4), i.e. before setup.
 */

export function createWorkspace(): string {
  return mkdtempSync(join(tmpdir(), 'curiocity-ws-'));
}

export function createCtrlDir(): string {
  return mkdtempSync(join(tmpdir(), 'curiocity-ctrl-'));
}

/** Unzip `src.zip` into the workspace; strip the macOS `__MACOSX` sidecar (§7). */
export async function unzipSource(zipPath: string, workspace: string): Promise<void> {
  await extract(zipPath, { dir: workspace });
  const macosx = join(workspace, '__MACOSX');
  if (existsSync(macosx)) rmSync(macosx, { recursive: true, force: true });
}

/** Copy an inline `--src <dir>` into the workspace. */
export function copySource(srcDir: string, workspace: string): void {
  cpSync(srcDir, workspace, { recursive: true });
}

/** Snapshot the current workspace to a sibling temp dir (baseline for the diff). */
export function snapshotSource(workspace: string): string {
  const snapshot = mkdtempSync(join(tmpdir(), 'curiocity-src-'));
  cpSync(workspace, snapshot, { recursive: true });
  return snapshot;
}

/**
 * Unified diff of `workspace` vs the unzipped-source `snapshot` (§5.4). Uses the
 * ubiquitous `diff -ruN` (exit code 1 = differences, not an error). Returns '' when
 * identical or when `diff` is unavailable.
 */
export async function computeDiff(snapshot: string, workspace: string): Promise<string> {
  try {
    const result = await execa('diff', ['-ruN', snapshot, workspace], { reject: false });
    return result.stdout ?? '';
  } catch {
    return '';
  }
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
