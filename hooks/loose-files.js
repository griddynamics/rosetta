'use strict';
// loose-files.js — PostToolUse hook that nudges AI when .py/.js files lack a module marker.
// A .py file is "loose" if no __init__.py exists in its directory tree.
// A .js file is "loose" if no package.json exists in its directory tree.
//
// Exports (for testability): shouldCheck, isLooseFile, buildNudgeOutput
// Entry point (when run as hook): reads stdin via adapter, writes nudge JSON to stdout.

const path = require('path');
const fs_default = require('fs');
const { readStdin, normalize } = require('./adapter');

const ALLOWED_EXTENSIONS = new Set(['.py', '.js']);
const ALLOWED_TOOLS = new Set(['Write', 'Edit']);
const EXCLUDED_PATH_SEGMENTS = [
  'agents/TEMP/',
  'scripts/',
  'node_modules/',
  '.venv/',
  '__pycache__/',
];
const MODULE_MARKERS = {
  '.py': '__init__.py',
  '.js': 'package.json',
};
const MAX_WALK_LEVELS = 10;

/**
 * Returns true if this hook should process the given normalized input.
 * Filters by event type, tool name, file extension, and excluded directories.
 * @param {object} normalizedInput
 * @returns {boolean}
 */
function shouldCheck(normalizedInput) {
  if (normalizedInput.hook_event_name !== 'PostToolUse') return false;
  if (!ALLOWED_TOOLS.has(normalizedInput.tool_name)) return false;
  const filePath = (normalizedInput.tool_input || {}).file_path || '';
  if (!ALLOWED_EXTENSIONS.has(path.extname(filePath))) return false;
  for (const segment of EXCLUDED_PATH_SEGMENTS) {
    if (filePath.includes(segment)) return false;
  }
  return true;
}

/**
 * Walk up the directory tree from filePath looking for the module marker file.
 * .py → __init__.py, .js → package.json
 * Stops at a .git directory or after MAX_WALK_LEVELS levels.
 * Returns true if no marker found (file is loose), false if marker found.
 * @param {string} filePath
 * @param {{ existsSync: (p: string) => boolean }} [fs]
 * @returns {boolean}
 */
function isLooseFile(filePath, fs = fs_default) {
  const ext = path.extname(filePath);
  const marker = MODULE_MARKERS[ext];
  if (!marker) return false;

  let dir = path.dirname(filePath);
  for (let level = 0; level < MAX_WALK_LEVELS; level++) {
    if (fs.existsSync(path.join(dir, '.git'))) return true;
    if (fs.existsSync(path.join(dir, marker))) return false;
    const parent = path.dirname(dir);
    if (parent === dir) break; // reached filesystem root
    dir = parent;
  }
  return true;
}

/**
 * Build the nudge JSON output for stdout.
 * @param {string} filePath
 * @returns {{ hookSpecificOutput: object, continue: boolean, suppressOutput: boolean }}
 */
function buildNudgeOutput(filePath) {
  const ext = path.extname(filePath);
  const marker = MODULE_MARKERS[ext] || 'a module marker';
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
}

// Main entrypoint when run as a Claude Code hook
if (require.main === module) {
  (async () => {
    const raw = await readStdin();
    const normalized = normalize(raw);
    if (!shouldCheck(normalized)) {
      process.exit(0);
    }
    const filePath = normalized.tool_input.file_path;
    if (isLooseFile(filePath)) {
      process.stdout.write(JSON.stringify(buildNudgeOutput(filePath)) + '\n');
    }
    process.exit(0);
  })().catch((err) => {
    process.stderr.write(`loose-files hook error: ${err.message}\n`);
    process.exit(1);
  });
}

module.exports = { shouldCheck, isLooseFile, buildNudgeOutput };
