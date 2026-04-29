// loose-files.ts — PostToolUse hook that nudges AI when .py/.js files lack a module marker.
// A .py file is "loose" if no __init__.py exists in its directory tree.
// A .js file is "loose" if no package.json exists in its directory tree.
//
// Exports (for testability): shouldCheck, isLooseFile, buildNudgeOutput

import path from 'path';
import { existsSync } from 'fs';
import { defineHook } from '../runtime/define-hook';
import { runHook } from '../runtime/run-hook';
import { advise } from '../runtime/result-helpers';
import { acquireOnce } from '../runtime/throttle';
import { hasExtension, pathContainsAny } from '../runtime/path-utils';
import { debugLog } from '../runtime/debug-log';
import type { NormalizedInput } from '../types';

const ALLOWED_EXTENSIONS = ['.py', '.js'] as const;
const ALLOWED_TOOLS = new Set(['Write', 'apply_patch', 'functions.apply_patch', 'create_file']);
const PATCH_FILE_RE = /^\*\*\* (?:Add|Create) File: (.+)$/m;
const EXCLUDED_PATH_SEGMENTS = [
  'agents/TEMP/',
  'scripts/',
  'tests/',
  'validation/',
  'node_modules/',
  '.venv/',
  '__pycache__/',
];
const MODULE_MARKERS: Record<string, string> = {
  '.py': '__init__.py',
  '.js': 'package.json',
};
const MAX_WALK_LEVELS = 10;

interface FsLike {
  existsSync: (filePath: string) => boolean;
}

interface NudgeOutput {
  hookSpecificOutput: { hookEventName: string; additionalContext: string };
  continue: boolean;
  suppressOutput: boolean;
}

export const shouldCheck = (normalizedInput: NormalizedInput): boolean => {
  if (normalizedInput.hook_event_name !== 'PostToolUse') {
    debugLog('skip: not PostToolUse', { hook_event_name: normalizedInput.hook_event_name });
    return false;
  }
  if (!ALLOWED_TOOLS.has(normalizedInput.tool_name as string)) {
    debugLog('skip: tool not in ALLOWED_TOOLS', { tool_name: normalizedInput.tool_name });
    return false;
  }

  const toolName = normalizedInput.tool_name as string;
  if (toolName === 'apply_patch' || toolName === 'functions.apply_patch') {
    const command = (normalizedInput.tool_input?.command as string) ?? '';
    if (!PATCH_FILE_RE.test(command)) {
      debugLog('skip: patch is not file creation (no Add/Create File marker)', { command: command.slice(0, 80) });
      return false;
    }
  }

  const filePath = normalizedInput.file_path ?? '';
  if (!hasExtension(filePath, ALLOWED_EXTENSIONS)) {
    debugLog('skip: extension not allowed', { filePath: filePath || null, ext: path.extname(filePath) || null });
    return false;
  }
  if (pathContainsAny(filePath, EXCLUDED_PATH_SEGMENTS)) {
    debugLog('skip: path excluded', { filePath });
    return false;
  }

  return true;
};

export const isLooseFile = (filePath: string, fs: FsLike = { existsSync }): boolean => {
  const marker = MODULE_MARKERS[path.extname(filePath)];
  if (!marker) return false;

  let dir = path.dirname(filePath);
  for (let level = 0; level < MAX_WALK_LEVELS; level++) {
    if (fs.existsSync(path.join(dir, marker))) return false;
    if (fs.existsSync(path.join(dir, '.git'))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return true;
};

const nudgeMessage = (filePath: string): string => {
  const marker = MODULE_MARKERS[path.extname(filePath)] ?? 'a module marker';
  const basename = path.basename(filePath);
  return `${basename} appears to be a loose file outside a module. Intended? A temporary file? ${marker}?`;
};

export const buildNudgeOutput = (filePath: string): NudgeOutput => ({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    additionalContext: nudgeMessage(filePath),
  },
  continue: true,
  suppressOutput: false,
});

const looseFilesHook = defineHook({
  name: 'loose-files',
  on: { event: 'PostToolUse', toolKinds: ['write'] },
  run: (ctx) => {
    const toolName = ctx.toolName;
    if (toolName === 'apply_patch' || toolName === 'functions.apply_patch') {
      const command = (ctx.toolInput.command as string) ?? '';
      if (!PATCH_FILE_RE.test(command)) return null;
    }
    if (!hasExtension(ctx.filePath, ALLOWED_EXTENSIONS)) return null;
    if (pathContainsAny(ctx.filePath, EXCLUDED_PATH_SEGMENTS)) return null;
    if (ctx.ide === 'copilot') {
      const dedupKey = `loose-files:${ctx.sessionId ?? 'no-session'}:${ctx.toolName}:${JSON.stringify(ctx.toolInput)}`;
      if (!acquireOnce(dedupKey)) return null;
    }
    if (!isLooseFile(ctx.filePath)) return null;
    debugLog('[loose-files] nudge', { filePath: ctx.filePath });
    return advise(nudgeMessage(ctx.filePath));
  },
});

export default looseFilesHook;

if (require.main === module) {
  runHook(looseFilesHook).then(
    () => process.exit(0),
    (err: Error) => {
      process.stderr.write(`loose-files hook error: ${err.message}\n`);
      process.exit(1);
    },
  );
}
