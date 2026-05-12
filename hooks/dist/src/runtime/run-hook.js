"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHook = exports.runAsCli = void 0;
const path_1 = __importDefault(require("path"));
const adapter_1 = require("../adapter");
const throttle_1 = require("./throttle");
const debug_log_1 = require("./debug-log");
const path_utils_1 = require("./path-utils");
const runAsCli = (def, mod) => {
    if (require.main !== mod)
        return;
    (0, exports.runHook)(def).then(() => process.exit(0), (err) => {
        process.stderr.write(`${def.name} hook error: ${err.message}\n`);
        process.exit(1);
    });
};
exports.runAsCli = runAsCli;
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
        return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'deny', permissionDecisionReason: result.reason }, continue: false };
    if (result.kind === 'allow')
        return { hookSpecificOutput: { hookEventName: ctx.event ?? '', permissionDecision: 'allow' } };
    return {};
};
const makeDedupKey = (dedupBy, ctx, name) => [
    name,
    ...(dedupBy.includes('session') ? [ctx.sessionId ?? 'no-session'] : []),
    ...(dedupBy.includes('filePath') ? [ctx.filePath] : []),
    ...(dedupBy.includes('ide') ? [ctx.ide] : []),
    ...(dedupBy.includes('toolName') ? [ctx.toolName] : []),
    ...(dedupBy.includes('toolInput') ? [JSON.stringify(ctx.toolInput)] : []),
].join(':');
const evalFilePath = (fp, filePath) => {
    const p = filePath;
    const pl = p.toLowerCase();
    const rel = (0, path_utils_1.toRelative)(p);
    if (fp.extOneOf && !fp.extOneOf.some(e => p.endsWith(e)))
        return false;
    if (fp.extOneOfCi && !fp.extOneOfCi.some(e => pl.endsWith(e.toLowerCase())))
        return false;
    if (fp.notContainsAny && fp.notContainsAny.some(s => p.includes(s)))
        return false;
    if (fp.notTokenSegmentAny) {
        const segs = pl.split('/');
        const blocked = segs.some(seg => seg.split(/[-_.]/).some(tok => fp.notTokenSegmentAny.includes(tok)));
        if (blocked)
            return false;
    }
    if (fp.notStartsWithAny && fp.notStartsWithAny.some(s => rel.startsWith(s) || p.includes('/' + s)))
        return false;
    if (fp.notBasenameOneOf && fp.notBasenameOneOf.includes(path_1.default.basename(p)))
        return false;
    return true;
};
const evalToolInput = (ti, ctx) => {
    if (ti.commandMatchWhen) {
        const { tools, re } = ti.commandMatchWhen;
        if (tools.includes(ctx.toolName)) {
            const command = ctx.toolInput.command ?? '';
            if (!re.test(command))
                return false;
        }
    }
    return true;
};
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
        const ctx0 = toHookContext(norm);
        if (def.on.filePath && !evalFilePath(def.on.filePath, ctx0.filePath))
            return;
        if (def.on.toolInput && !evalToolInput(def.on.toolInput, ctx0))
            return;
        let markerRoot;
        if (def.on.fs?.nearestMarker) {
            const found = (0, path_utils_1.walkUp)(ctx0.cwd || process.cwd(), def.on.fs.nearestMarker);
            if (!found)
                return;
            markerRoot = found;
        }
        const ctx = markerRoot !== undefined ? { ...ctx0, markerRoot } : ctx0;
        // Platform-level dedup: collapses duplicate events from IDEs that fire multiple times per call.
        const platformKey = (0, adapter_1.dedupKey)(raw, def.name);
        if (platformKey !== null && !(0, throttle_1.acquireOnce)(platformKey))
            return;
        if (def.throttle && 'dedupBy' in def.throttle) {
            if (!(0, throttle_1.acquireOnce)(makeDedupKey(def.throttle.dedupBy, ctx, def.name)))
                return;
        }
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
