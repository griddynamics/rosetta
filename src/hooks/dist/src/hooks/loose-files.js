"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.looseFilesHook = exports.nudgeMessage = exports.isLooseFile = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const result_helpers_1 = require("../runtime/result-helpers");
const path_utils_1 = require("../runtime/path-utils");
const debug_log_1 = require("../runtime/debug-log");
const MODULE_MARKERS = {
    '.py': '__init__.py',
    '.js': 'package.json',
};
const isLooseFile = (filePath, _fs = { existsSync: fs_1.existsSync }) => {
    const marker = MODULE_MARKERS[path_1.default.extname(filePath)];
    if (!marker)
        return false;
    return !(0, path_utils_1.hasMarkerBeforeBoundary)(path_1.default.dirname(filePath), marker, '.git');
};
exports.isLooseFile = isLooseFile;
const nudgeMessage = (filePath) => {
    const marker = MODULE_MARKERS[path_1.default.extname(filePath)] ?? 'a module marker';
    const basename = path_1.default.basename(filePath);
    return `${basename} appears to be a loose file outside a module. Intended? A temporary file? ${marker}?`;
};
exports.nudgeMessage = nudgeMessage;
exports.looseFilesHook = (0, define_hook_1.defineHook)({
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
        const marker = MODULE_MARKERS[path_1.default.extname(ctx.filePath)] ?? null;
        const loose = (0, exports.isLooseFile)(ctx.filePath);
        (0, debug_log_1.debugLogHookBranch)('loose-files', 'classification', {
            filePath: ctx.filePath,
            marker,
            loose,
        });
        if (!loose) {
            (0, debug_log_1.debugLogHookBranch)('loose-files', 'within-module-no-advisory', {
                filePath: ctx.filePath,
                marker,
            });
            return null;
        }
        const message = (0, exports.nudgeMessage)(ctx.filePath);
        (0, debug_log_1.debugLogHookBranch)('loose-files', 'advisory-issued', {
            filePath: ctx.filePath,
            marker,
            message,
        });
        return (0, result_helpers_1.advise)(message);
    },
});
(0, run_hook_1.runAsCli)(exports.looseFilesHook, module);
