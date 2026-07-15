import { readdirSync, statSync } from 'node:fs';
import { relative, sep } from 'node:path';

/**
 * Minimal glob support for evaluator file matching (`file-exists`, `llm-judge`
 * `artifacts`). Supports `**` (any depth), `*` (within a segment), `?` (one char).
 * Full-string, POSIX-path anchored. A dedicated glob dep is outside §16, and case
 * globs are simple, so this stays in-tree.
 */

/** Compile a glob to an anchored RegExp over POSIX-separated relative paths. */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**` — any number of path segments.
        i += 1;
        if (glob[i + 1] === '/') {
          i += 1;
          re += '(?:.*/)?';
        } else {
          re += '.*';
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

/** List all files under `root` as POSIX relative paths (dirs excluded). */
export function listFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = `${dir}${sep}${entry.name}`;
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() || entry.isSymbolicLink()) {
        out.push(toPosix(relative(root, full)));
      }
    }
  };
  walk(root);
  return out;
}

export function toPosix(p: string): string {
  return sep === '/' ? p : p.split(sep).join('/');
}

/** Files (from `listFiles`) that match the glob. */
export function matchGlob(files: string[], glob: string): string[] {
  const re = globToRegExp(glob);
  return files.filter((f) => re.test(f));
}
