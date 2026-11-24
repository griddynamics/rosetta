// FR-CLI-0050, FR-ARCH-0045 — `--dry-run` emits every would-write when stdout is a PIPE. Pipe
// writes are asynchronous, so the payload is complete only if the CLI lets stdout drain before
// the process ends. cli.ts runs main() at import, so it is spawned as a subprocess (same pattern
// as cli-progress.test.ts).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.join(__dirname, '..', '..');
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const CLI_ENTRY = path.join(PACKAGE_ROOT, 'src', 'cli.ts');
const TSX_BIN = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'tsx');

interface CliResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

// Asynchronous spawn, stdout and stderr read as pipes while the child runs. `timeout` kills a
// child that does not end by itself, so a hang fails the exit-code assertion instead of the test
// timing out. `closeStdoutEarly` closes the read end after the first chunk, as `| head` does.
function runCliPiped(args: string[], closeStdoutEarly = false): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(TSX_BIN, [CLI_ENTRY, ...args], {
      cwd: PACKAGE_ROOT,
      env: { ...process.env, ROSETTIFY_PLUGINS_LOG_LEVEL: 'info' },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 25_000,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on('data', (chunk: Buffer) => {
      stdout.push(chunk);
      if (closeStdoutEarly) child.stdout.destroy();
    });
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
    child.on('error', reject);
    child.on('close', (code, signal) => {
      resolve({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf-8'),
        stderr: Buffer.concat(stderr).toString('utf-8'),
      });
    });
  });
}

describe('cli.ts --dry-run on a piped stdout (FR-CLI-0050)', () => {
  it('emits one would-write header per file a real run writes, then ends by itself', { timeout: 60_000 }, async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-fr-cli-0050-'));
    try {
      // --publish rosetta keeps the payload at ~32MB (one plugin, seven targets) instead of ~97MB.
      const args = ['--source', REPO_ROOT, '--publish', 'rosetta', '--output', outputDir];

      const dry = await runCliPiped([...args, '--dry-run']);
      expect(dry.signal).toBeNull();
      expect(dry.code).toBe(0);
      const headers = (dry.stdout.match(/^=== DRY-RUN: /gm) ?? []).length;

      const real = await runCliPiped(args);
      expect(real.signal).toBeNull();
      expect(real.code).toBe(0);
      const written = fs.readdirSync(outputDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile()).length;

      expect(written).toBeGreaterThan(0);
      expect(headers).toBe(written);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('ends quietly with the run\'s exit status when the reader closes the pipe early', { timeout: 30_000 }, async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-fr-cli-0050-early-'));
    try {
      const { code, signal, stderr } = await runCliPiped(
        ['--source', REPO_ROOT, '--publish', 'rosetta', '--output', outputDir, '--dry-run'],
        true,
      );
      expect(signal).toBeNull();
      expect(code).toBe(0);
      expect(stderr).not.toContain('EPIPE');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
