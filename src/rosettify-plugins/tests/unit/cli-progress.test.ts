// FR-CLI-0042 — progress channel separation. cli.ts runs main() at import (top-level
// `main().catch(...)`), so this must spawn it as a subprocess rather than importing it.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.join(__dirname, '..', '..');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLI_ENTRY = path.join(PACKAGE_ROOT, 'src', 'cli.ts');
const TSX_BIN = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'tsx');

function runCli(args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(TSX_BIN, [CLI_ENTRY, ...args], {
    cwd: PACKAGE_ROOT,
    encoding: 'utf-8',
    // --dry-run measured ~2.7MB of payload on stdout (FR-CLI-0042); the 1MB spawnSync default
    // truncates the pipe and kills the child with SIGTERM before it can exit cleanly.
    maxBuffer: 16 * 1024 * 1024,
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('cli.ts progress channel (FR-CLI-0042)', () => {
  it('a normal run leaves stdout empty; progress appears on stderr', { timeout: 30_000 }, () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-fr-cli-0042-'));
    try {
      const { status, stdout, stderr } = runCli([
        '--source', REPO_ROOT,
        '--domain', 'qe',
        '--output', outputDir,
      ]);
      expect(status).toBe(0);
      expect(stdout).toBe('');
      expect(stderr.length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('--dry-run puts the would-write payload on stdout while progress stays on stderr', { timeout: 30_000 }, () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-fr-cli-0042-dry-'));
    try {
      const { status, stdout, stderr } = runCli([
        '--source', REPO_ROOT,
        '--domain', 'qe',
        '--output', outputDir,
        '--dry-run',
      ]);
      expect(status).toBe(0);
      expect(stdout.length).toBeGreaterThan(0);
      expect(stderr.length).toBeGreaterThan(0);
      // dry-run never writes the output directory
      expect(fs.existsSync(outputDir) && fs.readdirSync(outputDir).length > 0).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
