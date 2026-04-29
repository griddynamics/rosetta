"use strict";
// loose-files.ts — PostToolUse hook that nudges AI when .py/.js files lack a module marker.
// A .py file is "loose" if no __init__.py exists in its directory tree.
// A .js file is "loose" if no package.json exists in its directory tree.
//
// Exports (for testability): shouldCheck, isLooseFile, buildNudgeOutput, main
// Entry point (when run as hook): reads stdin via adapter, writes nudge JSON to stdout.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.buildNudgeOutput = exports.isLooseFile = exports.shouldCheck = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const adapter_1 = require("./adapter");
const lock_1 = require("./lock");
const debug_log_1 = require("./debug-log");
const ALLOWED_EXTENSIONS = new Set(['.py', '.js']);
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
const MODULE_MARKERS = {
    '.py': '__init__.py',
    '.js': 'package.json',
};
const MAX_WALK_LEVELS = 10;
const isPathExcluded = (filePath) => EXCLUDED_PATH_SEGMENTS.some((segment) => filePath.includes(segment));
const shouldCheck = (normalizedInput) => {
    if (normalizedInput.hook_event_name !== 'PostToolUse') {
        (0, debug_log_1.debugLog)('skip: not PostToolUse', { hook_event_name: normalizedInput.hook_event_name });
        return false;
    }
    if (!ALLOWED_TOOLS.has(normalizedInput.tool_name)) {
        (0, debug_log_1.debugLog)('skip: tool not in ALLOWED_TOOLS', { tool_name: normalizedInput.tool_name });
        return false;
    }
    const toolName = normalizedInput.tool_name;
    if (toolName === 'apply_patch' || toolName === 'functions.apply_patch') {
        const command = normalizedInput.tool_input?.command ?? '';
        if (!PATCH_FILE_RE.test(command)) {
            (0, debug_log_1.debugLog)('skip: patch is not file creation (no Add/Create File marker)', { command: command.slice(0, 80) });
            return false;
        }
    }
    const filePath = normalizedInput.file_path ?? '';
    const ext = path_1.default.extname(filePath);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        (0, debug_log_1.debugLog)('skip: extension not allowed', { filePath: filePath || null, ext: ext || null });
        return false;
    }
    if (isPathExcluded(filePath)) {
        (0, debug_log_1.debugLog)('skip: path excluded', { filePath });
        return false;
    }
    return true;
};
exports.shouldCheck = shouldCheck;
const isLooseFile = (filePath, fs = { existsSync: fs_1.existsSync }) => {
    const marker = MODULE_MARKERS[path_1.default.extname(filePath)];
    if (!marker)
        return false;
    let dir = path_1.default.dirname(filePath);
    for (let level = 0; level < MAX_WALK_LEVELS; level++) {
        if (fs.existsSync(path_1.default.join(dir, marker)))
            return false;
        if (fs.existsSync(path_1.default.join(dir, '.git')))
            return true;
        const parent = path_1.default.dirname(dir);
        if (parent === dir)
            break; // reached filesystem root
        dir = parent;
    }
    return true;
};
exports.isLooseFile = isLooseFile;
const buildNudgeOutput = (filePath) => {
    const marker = MODULE_MARKERS[path_1.default.extname(filePath)] ?? 'a module marker';
    const basename = path_1.default.basename(filePath);
    return {
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `${basename} appears to be a loose file outside a module. Intended? A temporary file? ${marker}?`,
        },
        continue: true,
        suppressOutput: false,
    };
};
exports.buildNudgeOutput = buildNudgeOutput;
const main = async ({ stdin = process.stdin, stdout = process.stdout, } = {}) => {
    const raw = await (0, adapter_1.readStdin)(stdin);
    (0, debug_log_1.debugLog)('raw input received', { hook_event_name: raw.hook_event_name });
    const ide = (0, adapter_1.detectIDE)(raw);
    const normalized = (0, adapter_1.normalize)(raw);
    (0, debug_log_1.debugLog)('normalized', { ide, session_id: normalized.session_id, tool_name: normalized.tool_name });
    if (!(0, exports.shouldCheck)(normalized)) {
        (0, debug_log_1.debugLog)('skipped (shouldCheck=false)');
        return;
    }
    if (ide === 'copilot' && !(0, lock_1.acquireOnce)(normalized)) {
        (0, debug_log_1.debugLog)('skipped (duplicate)');
        return;
    }
    const filePath = normalized.file_path ?? '';
    if ((0, exports.isLooseFile)(filePath)) {
        const output = (0, exports.buildNudgeOutput)(filePath);
        const json = JSON.stringify((0, adapter_1.formatOutput)(output, ide));
        (0, debug_log_1.debugLog)('nudge emitted', { filePath, output: json });
        stdout.write(`${json}\n`);
    }
    else {
        (0, debug_log_1.debugLog)('file is not loose', { filePath });
    }
};
exports.main = main;
if (require.main === module) {
    (0, exports.main)().then(() => process.exit(0), (err) => {
        process.stderr.write(`loose-files hook error: ${err.message}\n`);
        process.exit(1);
    });
}
