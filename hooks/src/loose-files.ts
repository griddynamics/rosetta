// loose-files.ts — PostToolUse hook that nudges AI when .py/.js files lack a module marker.
// A .py file is "loose" if no __init__.py exists in its directory tree.
// A .js file is "loose" if no package.json exists in its directory tree.
//
// Exports (for testability): shouldCheck, isLooseFile, buildNudgeOutput, main
// Entry point (when run as hook): reads stdin via adapter, writes nudge JSON to stdout.

import path from 'path';
import { existsSync } from 'fs';
import { readStdin, normalize, formatOutput, detectIDE } from './adapter';
import { acquireOnce } from './lock';
import { debugLog } from './debug-log';
import type { NormalizedInput } from './types';

const ALLOWED_EXTENSIONS = new Set(['.py', '.js']);
const ALLOWED_TOOLS = new Set(['Write', 'Edit']);
const EXCLUDED_PATH_SEGMENTS = [
  'agents/TEMP/',
  'scripts/',
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

const isPathExcluded = (filePath: string): boolean =>
  EXCLUDED_PATH_SEGMENTS.some((segment) => filePath.includes(segment));

export const shouldCheck = (normalizedInput: NormalizedInput): boolean => {
  if (normalizedInput.hook_event_name !== 'PostToolUse') return false;
  if (!ALLOWED_TOOLS.has(normalizedInput.tool_name as string)) return false;

  const filePath = (normalizedInput.tool_input.file_path as string) || '';
  if (!ALLOWED_EXTENSIONS.has(path.extname(filePath))) return false;
  if (isPathExcluded(filePath)) return false;

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

export const buildNudgeOutput = (filePath: string): NudgeOutput => {
  const marker = MODULE_MARKERS[path.extname(filePath)] ?? 'a module marker';
  const basename = path.basename(filePath);
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        `${basename} appears to be a loose file outside a module. ` +
        `Consider adding ${marker} to its directory tree to make it part of a proper module.`,
    },
    continue: true,
    suppressOutput: false,
  };
};

export const main = async ({
  stdin = process.stdin,
  stdout = process.stdout,
}: {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
} = {}): Promise<void> => {
  const raw = await readStdin(stdin);
  debugLog('raw input received', { hook_event_name: (raw as Record<string, unknown>).hook_event_name });
  const ide = detectIDE(raw);
  const normalized = normalize(raw);
  debugLog('normalized', { ide, session_id: normalized.session_id, tool_name: normalized.tool_name });
  if (!shouldCheck(normalized)) {
    debugLog('skipped (shouldCheck=false)');
    return;
  }
  if (!acquireOnce(normalized)) {
    debugLog('skipped (duplicate)');
    return;
  }

  const filePath = (normalized.tool_input.file_path as string) || '';
  if (isLooseFile(filePath)) {
    const output = buildNudgeOutput(filePath);
    debugLog('nudge emitted', { filePath });
    stdout.write(`${JSON.stringify(formatOutput(output))}\n`);
  } else {
    debugLog('file is not loose', { filePath });
  }
};

if (require.main === module) {
  main().then(
    () => process.exit(0),
    (err: Error) => {
      process.stderr.write(`loose-files hook error: ${err.message}\n`);
      process.exit(1);
    },
  );
}
