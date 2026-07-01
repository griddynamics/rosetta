"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readOnceHook = void 0;
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const read_once_shared_1 = require("./read-once-shared");
exports.readOnceHook = (0, define_hook_1.defineHook)({
    name: 'read-once',
    on: {
        event: ['PreRead', 'PreToolUse'],
        toolKinds: ['read', 'bash'],
    },
    run: read_once_shared_1.handleReadOnce,
});
(0, run_hook_1.runAsCli)(exports.readOnceHook, module);
