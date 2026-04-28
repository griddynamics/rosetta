// gitnexus-refresh.ts — PostToolUse hook that silently re-indexes GitNexus after file edits.
//
// Fires after every Edit / Write / MultiEdit tool call.
// Spawns `gitnexus analyze` detached in the background with a 5-second
// debounce so multi-file edit waves coalesce into one re-index.
//
// Rules:
//  - No stdout output — the agent must never see this hook.
//  - Logs go to ~/.cache/gitnexus/refresh.log only.
//  - No-ops immediately if .gitnexus/ is not found in the repo tree.
//  - Opt-in: only active when installed by the user (not auto-loaded).
//
// Exports (for testability): main

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { readStdin, normalize } from './adapter';

const DEBOUNCE_MS = 5000;

const findRepoRoot = (startDir: string): string | null => {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.gitnexus'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};

const ensureCacheDir = (): string => {
  const dir = path.join(os.homedir(), '.cache', 'gitnexus');
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

const shouldTrigger = (cacheDir: string, repoRoot: string): boolean => {
  const key = Buffer.from(repoRoot).toString('base64').replace(/[/+=]/g, '_');
  const stampFile = path.join(cacheDir, `${key}.lastrun`);

  try {
    const stat = fs.statSync(stampFile);
    if (Date.now() - stat.mtimeMs < DEBOUNCE_MS) return false;
  } catch {
    // stamp doesn't exist yet — first run
  }

  fs.writeFileSync(stampFile, String(Date.now()));
  return true;
};

const spawnAnalyze = (repoRoot: string, cacheDir: string): void => {
  let hadEmbeddings = false;
  try {
    const meta = JSON.parse(
      fs.readFileSync(path.join(repoRoot, '.gitnexus', 'meta.json'), 'utf-8'),
    );
    hadEmbeddings = !!(meta.stats && meta.stats.embeddings > 0);
  } catch {
    // no meta — proceed without embeddings flag
  }

  const args = hadEmbeddings
    ? ['gitnexus', 'analyze', '--force', '--embeddings']
    : ['gitnexus', 'analyze', '--force'];

  const logFile = path.join(cacheDir, 'refresh.log');
  let out: number;
  try {
    out = fs.openSync(logFile, 'a');
  } catch {
    return;
  }

  try {
    const child = spawn('npx', args, {
      cwd: repoRoot,
      detached: true,
      stdio: ['ignore', out, out],
    });
    child.unref();
  } catch (err) {
    log(cacheDir, `[gitnexus-refresh] spawn failed: ${(err as Error).message}`);
  } finally {
    fs.closeSync(out);
  }
};

export const main = async (): Promise<void> => {
  let input;
  try {
    const raw = await readStdin();
    input = normalize(raw);
  } catch {
    // Unknown IDE, empty stdin, or parse failure — exit silently
    return;
  }

  if (input.hook_event_name !== 'PostToolUse') return;
  const tool = input.tool_name ?? '';
  if (!/^(Edit|Write|MultiEdit)$/.test(tool)) return;

  const cwd = input.cwd ?? process.cwd();
  const repoRoot = findRepoRoot(cwd);
  if (!repoRoot) return;

  const cacheDir = ensureCacheDir();
  if (!shouldTrigger(cacheDir, repoRoot)) return;

  log(cacheDir, `[gitnexus-refresh] triggering analyze (tool=${tool}, cwd=${cwd})`);
  spawnAnalyze(repoRoot, cacheDir);
};

if (require.main === module) {
  main().then(
    () => process.exit(0),
    (err: Error) => {
      process.stderr.write(`gitnexus-refresh hook error: ${err.message}\n`);
      process.exit(1);
    },
  );
}
