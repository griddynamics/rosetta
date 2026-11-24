// Shared fake-repo builder for customization / publish tests (FR-CUST-*, FR-CLI-0036).
// Layout: instructions/r3/core from fixtures/cust-instructions, template plugins, the
// sample-plugins-publish.json catalog, a `lightweight` profile, empty hook bundle dirs.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ResolvedSources } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
export const CUSTOMIZATIONS_DIR = path.join(FIXTURES_DIR, 'customizations');

export function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

export function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFilesRecursive(full));
    else out.push(full);
  }
  return out;
}

/** Byte snapshot of a tree: relative path → hex-free Buffer string (latin1). */
export function snapshotTree(dir: string): Record<string, string> {
  const snap: Record<string, string> = {};
  for (const f of listFilesRecursive(dir)) {
    snap[path.relative(dir, f)] = fs.readFileSync(f).toString('latin1');
  }
  return snap;
}

export interface CustRepoOptions {
  /** Catalog file under fixtures/ (default sample-plugins-publish.json). */
  catalog?: string;
}

export function buildCustRepo(opts: CustRepoOptions = {}): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'cust-'));
  copyDirSync(
    path.join(FIXTURES_DIR, 'cust-instructions', 'r3', 'core'),
    path.join(repo, 'instructions', 'r3', 'core'),
  );
  const pluginsRoot = path.join(repo, 'src', 'rosettify-plugins', 'plugins');
  for (const ide of ['claude', 'codex']) {
    copyDirSync(path.join(FIXTURES_DIR, 'sample-plugins', `template-${ide}`), path.join(pluginsRoot, `template-${ide}`));
  }
  for (const ide of ['claude', 'codex']) {
    fs.mkdirSync(path.join(repo, 'src', 'hooks', 'dist', 'bundles', ide), { recursive: true });
  }
  write(path.join(repo, 'src', 'rosettify-plugins', 'profiles', 'lightweight.json'), '{}');
  fs.copyFileSync(
    path.join(FIXTURES_DIR, opts.catalog ?? 'sample-plugins-publish.json'),
    path.join(repo, 'src', 'rosettify-plugins', 'plugins.json'),
  );
  fs.mkdirSync(path.join(repo, '.git'), { recursive: true });
  return repo;
}

export function buildCustSources(repo: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(repo, 'instructions'),
    pluginsSource: path.join(repo, 'src', 'rosettify-plugins', 'plugins'),
    hooksSource: path.join(repo, 'src', 'hooks'),
    outputDir,
    profileSource: path.join(repo, 'src', 'rosettify-plugins', 'profiles'),
    configPath: path.join(repo, 'src', 'rosettify-plugins', 'plugins.json'),
  };
}

/** Run fn with process.stderr captured; returns the captured text. */
export async function captureStderr<T>(fn: () => Promise<T>): Promise<{ result: T; stderr: string }> {
  const orig = process.stderr.write.bind(process.stderr);
  let stderr = '';
  (process.stderr as NodeJS.WriteStream).write = ((chunk: string | Uint8Array) => {
    stderr += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8');
    return true;
  }) as typeof process.stderr.write;
  try {
    return { result: await fn(), stderr };
  } finally {
    (process.stderr as NodeJS.WriteStream).write = orig;
  }
}
