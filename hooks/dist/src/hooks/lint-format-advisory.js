"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lintFormatAdvisoryHook = exports.advisoryMessage = void 0;
// hooks/src/hooks/lint-format-advisory.ts
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const result_helpers_1 = require("../runtime/result-helpers");
const MONITORED_EXTENSIONS = [
    '.html', '.css', '.js', '.ts', '.jsx', '.tsx',
    '.py', '.cs', '.ps1', '.cmd', '.java', '.go', '.rs', '.md',
];
const advisoryMessage = (filePath) => `Files were modified. Add a plan step (if not already present) to run syntax, type, lint, and format checks on: ${filePath}.`;
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
    run: (ctx) => (0, result_helpers_1.advise)((0, exports.advisoryMessage)(ctx.filePath)),
});
(0, run_hook_1.runAsCli)(exports.lintFormatAdvisoryHook, module);
