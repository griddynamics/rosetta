"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mdFileAdvisoryHook = exports.advisoryMessage = void 0;
const path_1 = __importDefault(require("path"));
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const result_helpers_1 = require("../runtime/result-helpers");
const debug_log_1 = require("../runtime/debug-log");
const advisoryMessage = (filePath) => {
    const name = path_1.default.basename(filePath);
    return `[Rosetta Advisory] ${name} is created in non-standard location, think if it is truly needed or you should have updated existing file.`;
};
exports.advisoryMessage = advisoryMessage;
exports.mdFileAdvisoryHook = (0, define_hook_1.defineHook)({
    name: 'md-file-advisory',
    on: {
        event: 'PostToolUse',
        toolKinds: ['write', 'edit', 'multi-edit', 'patch', 'create', 'replace'],
        filePath: {
            extOneOfCi: ['.md'],
            notTokenSegmentAny: ['tmp', 'temp'],
            notStartsWithAny: ['docs/', 'agents/', 'plans/', 'refsrc/'],
            notBasenameOneOf: ['README.md', 'CHANGELOG.md'],
        },
    },
    run: (ctx) => {
        const message = (0, exports.advisoryMessage)(ctx.filePath);
        (0, debug_log_1.debugLogHookBranch)('md-file-advisory', 'advisory-issued', {
            filePath: ctx.filePath,
            basename: path_1.default.basename(ctx.filePath),
            message,
        });
        return (0, result_helpers_1.advise)(message);
    },
});
(0, run_hook_1.runAsCli)(exports.mdFileAdvisoryHook, module);
