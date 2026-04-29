"use strict";
// loose-files.ts — PostToolUse hook that nudges AI when .py/.js files lack a module marker.
// A .py file is "loose" if no __init__.py exists in its directory tree.
// A .js file is "loose" if no package.json exists in its directory tree.
//
// Exports (for testability): shouldCheck, isLooseFile, buildNudgeOutput
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNudgeOutput = exports.isLooseFile = exports.shouldCheck = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const result_helpers_1 = require("../runtime/result-helpers");
const throttle_1 = require("../runtime/throttle");
const path_utils_1 = require("../runtime/path-utils");
const debug_log_1 = require("../runtime/debug-log");
const ALLOWED_EXTENSIONS = ['.py', '.js'];
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
    if (!(0, path_utils_1.hasExtension)(filePath, ALLOWED_EXTENSIONS)) {
        (0, debug_log_1.debugLog)('skip: extension not allowed', { filePath: filePath || null, ext: path_1.default.extname(filePath) || null });
        return false;
    }
    if ((0, path_utils_1.pathContainsAny)(filePath, EXCLUDED_PATH_SEGMENTS)) {
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
const nudgeMessage = (filePath) => {
    const marker = MODULE_MARKERS[path_1.default.extname(filePath)] ?? 'a module marker';
    const basename = path_1.default.basename(filePath);
    return `${basename} appears to be a loose file outside a module. Intended? A temporary file? ${marker}?`;
};
const buildNudgeOutput = (filePath) => ({
    hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: nudgeMessage(filePath),
    },
    continue: true,
    suppressOutput: false,
});
exports.buildNudgeOutput = buildNudgeOutput;
const looseFilesHook = (0, define_hook_1.defineHook)({
    name: 'loose-files',
    on: { event: 'PostToolUse', toolKinds: ['write'] },
    run: (ctx) => {
        const toolName = ctx.toolName;
        if (toolName === 'apply_patch' || toolName === 'functions.apply_patch') {
            const command = ctx.toolInput.command ?? '';
            if (!PATCH_FILE_RE.test(command))
                return null;
        }
        if (!(0, path_utils_1.hasExtension)(ctx.filePath, ALLOWED_EXTENSIONS))
            return null;
        if ((0, path_utils_1.pathContainsAny)(ctx.filePath, EXCLUDED_PATH_SEGMENTS))
            return null;
        if (ctx.ide === 'copilot') {
            const dedupKey = `loose-files:${ctx.sessionId ?? 'no-session'}:${ctx.toolName}:${JSON.stringify(ctx.toolInput)}`;
            if (!(0, throttle_1.acquireOnce)(dedupKey))
                return null;
        }
        if (!(0, exports.isLooseFile)(ctx.filePath))
            return null;
        (0, debug_log_1.debugLog)('[loose-files] nudge', { filePath: ctx.filePath });
        return (0, result_helpers_1.advise)(nudgeMessage(ctx.filePath));
    },
});
exports.default = looseFilesHook;
if (require.main === module) {
    (0, run_hook_1.runHook)(looseFilesHook).then(() => process.exit(0), (err) => {
        process.stderr.write(`loose-files hook error: ${err.message}\n`);
        process.exit(1);
    });
}
