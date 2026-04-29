import path from 'path';
import fs from 'fs';

export const hasExtension = (filePath: string, exts: readonly string[]): boolean =>
  !!filePath && exts.includes(path.extname(filePath));

export const pathContainsAny = (filePath: string, segments: readonly string[]): boolean =>
  segments.some(s => filePath.includes(s));

export const pathStartsWithAny = (filePath: string, prefixes: readonly string[]): boolean =>
  prefixes.some(p => filePath.startsWith(p));

export const basenameIn = (filePath: string, basenames: readonly string[]): boolean =>
  basenames.includes(path.basename(filePath));

export const isInTempDir = (filePath: string): boolean =>
  /(^|\/)\.?(temp|tmp)([-_.]|$|\/)/i.test(filePath);

export const toRelative = (filePath: string): string => {
  let p = filePath.replace(/\\/g, '/');
  if (p.startsWith('/')) p = p.slice(1);
  if (p.startsWith('./')) p = p.slice(2);
  return p;
};

export const hasMarkerBeforeBoundary = (
  startDir: string,
  marker: string,
  boundary: string,
  maxLevels = 10,
): boolean => {
  let dir = startDir;
  for (let i = 0; i < maxLevels; i++) {
    if (fs.existsSync(path.join(dir, marker)))   return true;
    if (fs.existsSync(path.join(dir, boundary))) return false;
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
  return false;
};

export const walkUp = (startDir: string, marker: string, maxLevels = 10): string | null => {
  let dir = startDir;
  for (let i = 0; i < maxLevels; i++) {
    if (fs.existsSync(path.join(dir, marker))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
};
