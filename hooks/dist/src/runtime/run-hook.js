"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHook = void 0;
const adapter_1 = require("../adapter");
const throttle_1 = require("./throttle");
const debug_log_1 = require("./debug-log");
const toHookContext = (norm) => ({
    ide: norm.ide,
    event: norm.event,
    toolKind: norm.toolKind,
    toolName: norm.tool_name ?? '',
    filePath: norm.file_path ?? '',
    cwd: norm.cwd ?? '',
    sessionId: norm.session_id ?? null,
    toolInput: norm.tool_input,
    toolResponse: norm.tool_response,
});
const toCanonical = (result, ctx) => {
    if (result.kind === 'advise')
        return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'allow', additionalContext: result.message } };
    if (result.kind === 'deny')
        return { hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: result.reason }, continue: false };
    if (result.kind === 'allow')
        return { hookSpecificOutput: { permissionDecision: 'allow' } };
    return {};
};
const makeDedupKey = (dedupBy, ctx, name) => [
    name,
    ...(dedupBy.includes('session') ? [ctx.sessionId ?? 'no-session'] : []),
    ...(dedupBy.includes('filePath') ? [ctx.filePath] : []),
    ...(dedupBy.includes('ide') ? [ctx.ide] : []),
].join(':');
const runHook = async (def, opts = {}) => {
    const { stdin = process.stdin, stdout = process.stdout } = opts;
    try {
        const raw = await (0, adapter_1.readStdin)(stdin);
        const ide = (0, adapter_1.detectIDE)(raw);
        const norm = (0, adapter_1.normalize)(raw);
        (0, debug_log_1.debugLog)(`[runHook:${def.name}]`, { ide, event: norm.event, toolKind: norm.toolKind });
        if (norm.event !== def.on.event)
            return;
        if (!def.on.toolKinds.includes(norm.toolKind))
            return;
        if (def.throttle && 'dedupBy' in def.throttle) {
            const ctx0 = toHookContext(norm);
            if (!(0, throttle_1.acquireOnce)(makeDedupKey(def.throttle.dedupBy, ctx0, def.name)))
                return;
        }
        const ctx = toHookContext(norm);
        const result = await def.run(ctx);
        if (!result || result.kind === 'side-effect')
            return;
        stdout.write(JSON.stringify((0, adapter_1.formatOutput)(toCanonical(result, ctx), ide)));
    }
    catch (err) {
        (0, debug_log_1.debugLog)(`[runHook:${def.name}] error`, { err: err.message });
    }
};
exports.runHook = runHook;
