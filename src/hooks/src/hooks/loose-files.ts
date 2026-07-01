import path from 'path';
import { existsSync } from 'fs';
import { defineHook } from '../runtime/define-hook';
import { runAsCli } from '../runtime/run-hook';
import { advise } from '../runtime/result-helpers';
import { hasMarkerBeforeBoundary } from '../runtime/path-utils';
import { debugLogHookBranch } from '../runtime/debug-log';

const MODULE_MARKERS: Record<string, string> = {
  '.py': '__init__.py',
  '.js': 'package.json',
};

interface FsLike { existsSync: (p: string) => boolean }

export const isLooseFile = (filePath: string, _fs: FsLike = { existsSync }): boolean => {
  const marker = MODULE_MARKERS[path.extname(filePath)];
  if (!marker) return false;
  return !hasMarkerBeforeBoundary(path.dirname(filePath), marker, '.git');
};

export const nudgeMessage = (filePath: string): string => {
  const marker = MODULE_MARKERS[path.extname(filePath)] ?? 'a module marker';
  const basename = path.basename(filePath);
  return `${basename} appears to be a loose file outside a module. Intended? A temporary file? ${marker}?`;
};

export const looseFilesHook = defineHook({
  name: 'loose-files',
  on: {
    event: 'PostToolUse',
    toolKinds: ['write'],
    filePath: {
      extOneOf: ['.py', '.js'],
      notContainsAny: [
        'agents/TEMP/', 'scripts/', 'tests/', 'validation/',
        'node_modules/', '.venv/', '__pycache__/',
      ],
    },
    toolInput: {
      commandMatchWhen: {
        tools: ['apply_patch', 'functions.apply_patch'],
        re: /^\*\*\* (?:Add|Create) File:/m,
      },
    },
  },
  run: (ctx) => {
    const marker = MODULE_MARKERS[path.extname(ctx.filePath)] ?? null;
    const loose = isLooseFile(ctx.filePath);
    debugLogHookBranch('loose-files', 'classification', {
      filePath: ctx.filePath,
      marker,
      loose,
    });
    if (!loose) {
      debugLogHookBranch('loose-files', 'within-module-no-advisory', {
        filePath: ctx.filePath,
        marker,
      });
      return null;
    }
    const message = nudgeMessage(ctx.filePath);
    debugLogHookBranch('loose-files', 'advisory-issued', {
      filePath: ctx.filePath,
      marker,
      message,
    });
    return advise(message);
  },
});

runAsCli(looseFilesHook, module);
