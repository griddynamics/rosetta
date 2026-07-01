"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.lintFormatAdvisoryHook = exports.advisoryMessage = void 0;
// src/hooks/src/hooks/lint-format-advisory.ts
const path_1 = __importDefault(require("path"));
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const result_helpers_1 = require("../runtime/result-helpers");
const debug_log_1 = require("../runtime/debug-log");
const MONITORED_EXTENSIONS = [
    '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
    '.py', '.cs', '.ps1', '.cmd', '.java', '.go', '.rs', '.md',
];
const advisoryMessage = (filePath) => {
    const name = path_1.default.basename(filePath);
    return `[Rosetta Advisory] ${name} modified. If not already planned, add a step to run syntax, type, lint, and format checks before commit.`;
};
exports.advisoryMessage = advisoryMessage;
exports.lintFormatAdvisoryHook = (0, define_hook_1.defineHook)({
    name: 'lint-format-advisory',
    on: {
        event: 'PostToolUse',
        toolKinds: ['write', 'edit', 'multi-edit', 'patch', 'create', 'replace'],
        filePath: {
            extOneOfCi: MONITORED_EXTENSIONS,
            notContainsAny: [
                'node_modules/', '.venv/', '__pycache__/',
                'dist/', 'build/', '.git/',
            ],
        },
    },
    throttle: { dedupBy: ['session', 'filePath'] },
    run: (ctx) => {
        const message = (0, exports.advisoryMessage)(ctx.filePath);
        (0, debug_log_1.debugLogHookBranch)('lint-format-advisory', 'advisory-issued', {
            filePath: ctx.filePath,
            basename: path_1.default.basename(ctx.filePath),
            message,
        });
        return (0, result_helpers_1.advise)(message);
    },
});
(0, run_hook_1.runAsCli)(exports.lintFormatAdvisoryHook, module);
