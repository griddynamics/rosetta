"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dangerousActionsHook = void 0;
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const evaluate_1 = require("./dangerous-actions/evaluate");
const cooldown_store_1 = require("./dangerous-actions/cooldown-store");
const audit_log_1 = require("./dangerous-actions/audit-log");
const result_helpers_1 = require("../runtime/result-helpers");
exports.dangerousActionsHook = (0, define_hook_1.defineHook)({
    name: 'dangerous-actions',
    on: {
        event: 'PreToolUse',
        toolKinds: ['bash', 'write', 'edit', 'multi-edit', 'mcp-call'],
    },
    run: (ctx) => {
        const patternResult = (0, evaluate_1.evalPatternOnly)(ctx);
        if (patternResult === null)
            return null;
        const cwd = ctx.cwd || process.cwd();
        const input = ctx.toolInput;
        const hash = (0, cooldown_store_1.hashCall)(ctx.toolName, input);
        const hasOverride = (0, evaluate_1.hasReviewedOverride)(input, ctx.toolName);
        // Layer B: cooldown — block immediate self-retry with override.
        if ((0, cooldown_store_1.isWithinCooldown)(cwd, hash) && hasOverride) {
            (0, audit_log_1.appendOverrideAudit)(cwd, { toolName: ctx.toolName, blockedByCooldown: true, sessionId: ctx.sessionId });
            return (0, result_helpers_1.deny)('Blocked: repeated dangerous call within 5-second cooldown — override ignored.\n' +
                'Wait 5 seconds before retrying with the override, or confirm the action explicitly.');
        }
        // Layer A: override in user-visible fields → allow and log.
        if (hasOverride) {
            (0, audit_log_1.appendOverrideAudit)(cwd, { toolName: ctx.toolName, blockedByCooldown: false, sessionId: ctx.sessionId });
            return null;
        }
        // No override → deny and record for cooldown tracking.
        (0, cooldown_store_1.recordDeny)(cwd, hash);
        return patternResult;
    },
});
(0, run_hook_1.runAsCli)(exports.dangerousActionsHook, module);
