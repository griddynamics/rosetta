"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readOnceResetHook = void 0;
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const read_once_shared_1 = require("./read-once-shared");
exports.readOnceResetHook = (0, define_hook_1.defineHook)({
    name: 'read-once-reset',
    on: {
        event: ['PreCompact', 'PostCompact'],
    },
    run: read_once_shared_1.resetReadOnceSession,
});
(0, run_hook_1.runAsCli)(exports.readOnceResetHook, module);
