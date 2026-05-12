"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dangerousActionsHook = void 0;
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const evaluate_1 = require("./dangerous-actions/evaluate");
exports.dangerousActionsHook = (0, define_hook_1.defineHook)({
    name: 'dangerous-actions',
    on: {
        event: 'PreToolUse',
        toolKinds: ['bash', 'write', 'edit', 'multi-edit', 'mcp-call'],
    },
    run: (ctx) => (0, evaluate_1.evaluateDangerous)(ctx),
});
(0, run_hook_1.runAsCli)(exports.dangerousActionsHook, module);
