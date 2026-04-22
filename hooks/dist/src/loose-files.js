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
const isPathExcluded = (filePath) => EXCLUDED_PATH_SEGMENTS.some((segment) => filePath.includes(segment));
const shouldCheck = (normalizedInput) => {
    if (normalizedInput.hook_event_name !== 'PostToolUse')
        return false;
    if (!ALLOWED_TOOLS.has(normalizedInput.tool_name))
        return false;
    const filePath = normalizedInput.tool_input.file_path || '';
    if (!ALLOWED_EXTENSIONS.has(path_1.default.extname(filePath)))
        return false;
    if (isPathExcluded(filePath))
        return false;
    return true;
};
exports.shouldCheck = shouldCheck;
const isLooseFile = (filePath, fs = { existsSync: fs_1.existsSync }) => {
    const marker = MODULE_MARKERS[path_1.default.extname(filePath)];
    if (!marker)
        return false;
    let dir = path_1.default.dirname(filePath);
    for (let level = 0; level < MAX_WALK_LEVELS; level++) {
        if (fs.existsSync(path_1.default.join(dir, '.git')))
            return true;
        if (fs.existsSync(path_1.default.join(dir, marker)))
            return false;
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
            additionalContext: `${basename} appears to be a loose file outside a module. ` +
                `Consider adding ${marker} to its directory tree to make it part of a proper module.`,
        },
        continue: true,
        suppressOutput: false,
    };
};
exports.buildNudgeOutput = buildNudgeOutput;
const main = async ({ stdin = process.stdin, stdout = process.stdout, } = {}) => {
    const raw = await (0, adapter_1.readStdin)(stdin);
    (0, debug_log_1.debugLog)('raw input received', { hook_event_name: raw.hook_event_name });
    const normalized = (0, adapter_1.normalize)(raw);
    (0, debug_log_1.debugLog)('normalized', { session_id: normalized.session_id, tool_name: normalized.tool_name });
    if (!(0, exports.shouldCheck)(normalized)) {
        (0, debug_log_1.debugLog)('skipped (shouldCheck=false)');
        return;
    }
    if (!(0, lock_1.acquireOnce)(normalized)) {
        (0, debug_log_1.debugLog)('skipped (duplicate)');
        return;
    }
    const filePath = normalized.tool_input.file_path || '';
    if ((0, exports.isLooseFile)(filePath)) {
        const output = (0, exports.buildNudgeOutput)(filePath);
        (0, debug_log_1.debugLog)('nudge emitted', { filePath });
        stdout.write(`${JSON.stringify(output)}\n`);
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
