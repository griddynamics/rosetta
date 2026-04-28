// gitnexus-refresh.ts — PostToolUse hook that silently re-indexes GitNexus after file edits.
//
// Fires after every Edit / Write / MultiEdit tool call.
// Uses trailing-edge debounce: spawns a deferred process that sleeps for
// DEBOUNCE_MS, then only runs `gitnexus analyze` if no newer invocation
// has occurred. This ensures multi-file edit bursts coalesce into a single
// re-index that fires after the burst ends.
//
// Rules:
//  - No stdout output — the agent must never see this hook.
//  - Logs go to ~/.cache/gitnexus/refresh.log only.
//  - No-ops immediately if .gitnexus/ is not found in the repo tree.
//  - Opt-in: only active when installed by the user (not auto-loaded).
//
// Exports (for testability): main, DEBOUNCE_MS

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { readStdin, normalize } from './adapter';

export const DEBOUNCE_MS = 5000;

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

const stampKeyForRepo = (repoRoot: string): string =>
  Buffer.from(repoRoot).toString('base64').replace(/[/+=]/g, '_');

const writePendingStamp = (cacheDir: string, repoRoot: string): string => {
  const key = stampKeyForRepo(repoRoot);
  const stampFile = path.join(cacheDir, `${key}.pending`);
  const token = String(Date.now());
  fs.writeFileSync(stampFile, token);
  return stampFile;
};

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

const spawnDeferredAnalyze = (
  repoRoot: string,
  cacheDir: string,
  stampFile: string,
): void => {
  const hadEmbeddings = getEmbeddingsFlag(repoRoot);
  const extraFlags = hadEmbeddings ? ' --embeddings' : '';
  const debounceSeconds = Math.ceil(DEBOUNCE_MS / 1000);

  // The deferred script sleeps, then checks if this invocation's stamp is still
  // the latest. Only if Date.now() - stampValue >= DEBOUNCE_MS (meaning no newer
  // write reset the timer) does it proceed with analyze.
  const nodeScript = [
    `const fs = require('fs');`,
    `try {`,
    `  const stamp = parseInt(fs.readFileSync('${stampFile}', 'utf-8'));`,
    `  if (Date.now() - stamp < ${DEBOUNCE_MS}) process.exit(0);`,
    `  require('child_process').execSync(`,
    `    'npx gitnexus analyze --force${extraFlags}',`,
    `    { cwd: '${repoRoot.replace(/'/g, "'\\''")}', stdio: 'inherit' }`,
    `  );`,
    `} catch(e) {`,
    `  fs.appendFileSync('${path.join(cacheDir, 'refresh.log').replace(/'/g, "'\\''")}',`,
    `    new Date().toISOString() + '  [gitnexus-refresh] deferred error: ' + (e.message||e) + '\\n');`,
    `}`,
  ].join(' ');
  const script = `sleep ${debounceSeconds} && node -e "${nodeScript}"`;

  const logFile = path.join(cacheDir, 'refresh.log');
  let out: number;
  try {
    out = fs.openSync(logFile, 'a');
  } catch {
    return;
  }

  try {
    const child = spawn('sh', ['-c', script], {
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
    return;
  }

  if (input.hook_event_name !== 'PostToolUse') return;
  const tool = input.tool_name ?? '';
  if (!/^(Edit|Write|MultiEdit)$/.test(tool)) return;

  const cwd = input.cwd ?? process.cwd();
  const repoRoot = findRepoRoot(cwd);
  if (!repoRoot) return;

  const cacheDir = ensureCacheDir();
  const stampFile = writePendingStamp(cacheDir, repoRoot);

  log(cacheDir, `[gitnexus-refresh] pending analyze (tool=${tool}, cwd=${cwd})`);
  spawnDeferredAnalyze(repoRoot, cacheDir, stampFile);
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
