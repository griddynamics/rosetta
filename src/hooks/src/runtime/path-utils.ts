import path from 'path';
import fs from 'fs';
import { debugLogBranch } from './debug-log';

export const hasExtension = (filePath: string, exts: readonly string[]): boolean => {
  const extension = path.extname(filePath);
  const result = !!filePath && exts.includes(extension);
  debugLogBranch('path-utils', 'has-extension', {
    filePath,
    extension,
    exts,
    result,
  });
  return result;
};

export const pathContainsAny = (filePath: string, segments: readonly string[]): boolean => {
  const matchedSegments = segments.filter((segment) => filePath.includes(segment));
  const result = matchedSegments.length > 0;
  debugLogBranch('path-utils', 'path-contains-any', {
    filePath,
    segments,
    matchedSegments,
    result,
  });
  return result;
};

export const pathStartsWithAny = (filePath: string, prefixes: readonly string[]): boolean => {
  const matchedPrefixes = prefixes.filter((prefix) => filePath.startsWith(prefix));
  const result = matchedPrefixes.length > 0;
  debugLogBranch('path-utils', 'path-starts-with-any', {
    filePath,
    prefixes,
    matchedPrefixes,
    result,
  });
  return result;
};

export const basenameIn = (filePath: string, basenames: readonly string[]): boolean => {
  const basename = path.basename(filePath);
  const result = basenames.includes(basename);
  debugLogBranch('path-utils', 'basename-in', {
    filePath,
    basename,
    basenames,
    result,
  });
  return result;
};

export const isInTempDir = (filePath: string): boolean => {
  const result = /(^|\/)\.?(temp|tmp)([-_.]|$|\/)/i.test(filePath);
  debugLogBranch('path-utils', 'is-in-temp-dir', {
    filePath,
    result,
  });
  return result;
};

export const toRelative = (filePath: string): string => {
  let p = filePath.replace(/\\/g, '/');
  if (p.startsWith('/')) p = p.slice(1);
  if (p.startsWith('./')) p = p.slice(2);
  debugLogBranch('path-utils', 'to-relative', {
    filePath,
    relativePath: p,
  });
  return p;
};

export const hasMarkerBeforeBoundary = (
  startDir: string,
  marker: string,
  boundary: string,
  maxLevels = 10,
): boolean => {
  let dir = startDir;
  debugLogBranch('path-utils', 'has-marker-before-boundary-start', {
    startDir,
    marker,
    boundary,
    maxLevels,
  });
  for (let i = 0; i < maxLevels; i++) {
    const markerPath = path.join(dir, marker);
    const boundaryPath = path.join(dir, boundary);
    const markerExists = fs.existsSync(markerPath);
    const boundaryExists = fs.existsSync(boundaryPath);
    debugLogBranch('path-utils', 'has-marker-before-boundary-step', {
      level: i,
      dir,
      markerPath,
      boundaryPath,
      markerExists,
      boundaryExists,
    });
    if (markerExists) {
      debugLogBranch('path-utils', 'has-marker-before-boundary-result', {
        result: true,
        reason: 'marker-found',
        dir,
        markerPath,
      });
      return true;
    }
    if (boundaryExists) {
      debugLogBranch('path-utils', 'has-marker-before-boundary-result', {
        result: false,
        reason: 'boundary-found',
        dir,
        boundaryPath,
      });
      return false;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      debugLogBranch('path-utils', 'has-marker-before-boundary-result', {
        result: false,
        reason: 'filesystem-root',
        dir,
      });
      return false;
    }
    dir = parent;
  }
  debugLogBranch('path-utils', 'has-marker-before-boundary-result', {
    result: false,
    reason: 'max-levels-reached',
    startDir,
    marker,
    boundary,
    maxLevels,
  });
  return false;
};

export const walkUp = (startDir: string, marker: string, maxLevels = 10): string | null => {
  let dir = startDir;
  debugLogBranch('path-utils', 'walk-up-start', {
    startDir,
    marker,
    maxLevels,
  });
  for (let i = 0; i < maxLevels; i++) {
    const markerPath = path.join(dir, marker);
    const markerExists = fs.existsSync(markerPath);
    debugLogBranch('path-utils', 'walk-up-step', {
      level: i,
      dir,
      markerPath,
      markerExists,
    });
    if (markerExists) {
      debugLogBranch('path-utils', 'walk-up-result', {
        result: dir,
        reason: 'marker-found',
        markerPath,
      });
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      debugLogBranch('path-utils', 'walk-up-result', {
        result: null,
        reason: 'filesystem-root',
        dir,
      });
      break;
    }
    dir = parent;
  }
  debugLogBranch('path-utils', 'walk-up-result', {
    result: null,
    reason: 'max-levels-reached-or-not-found',
    startDir,
    marker,
    maxLevels,
  });
  return null;
};
