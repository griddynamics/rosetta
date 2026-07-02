"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runHook = exports.resolveExitCode = exports.runAsCli = void 0;
const path_1 = __importDefault(require("path"));
const adapter_1 = require("../adapter");
const throttle_1 = require("./throttle");
const debug_log_1 = require("./debug-log");
const path_utils_1 = require("./path-utils");
const HOOK_ENV_NAMES = [
    'ROSETTA_DEBUG',
    'CLAUDE_PLUGIN_ROOT',
    'TMPDIR',
    'TMP',
    'TEMP',
    'HOME',
    'PWD',
    'USERPROFILE',
];
const runAsCli = (def, mod) => {
    if (require.main !== mod)
        return;
    let exitReport = null;
    process.once('exit', (actualExitCode) => {
        (0, debug_log_1.debugLogHook)(def.name, 'process-exit', {
            actualExitCode,
            intendedExitCode: exitReport?.exitCode ?? null,
            status: exitReport?.status ?? null,
            wroteOutput: exitReport?.wroteOutput ?? null,
            reason: exitReport?.reason ?? null,
        });
    });
    executeHook(def).then((report) => {
        exitReport = report;
        if (report.stderrMessage)
            process.stderr.write(report.stderrMessage);
        (0, debug_log_1.debugLogHook)(def.name, 'cli-exit', report);
        process.exit(report.exitCode);
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
    agentId: (norm.agent_id ?? norm.subagent_id) ?? null,
    turnId: (norm.turn_id ?? norm.generation_id ?? norm.execution_id) ?? null,
    transcriptPath: norm.transcript_path ?? null,
    source: norm.source ?? null,
    reason: norm.reason ?? null,
    trigger: norm.trigger ?? null,
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
// `_exitCode` on the HookResult overrides everything else — emergency escape hatch, not for
// normal use (see runtime/types.ts). Otherwise: deny -> the IDE adapter's exit code (0 unless the
// adapter overrides it); everything else -> 0. A failure resolving the code itself -> 1000.
const resolveExitCode = (result, canonical, ide) => {
    try {
        if (result._exitCode != null)
            return result._exitCode;
        if (canonical.hookSpecificOutput?.permissionDecision === 'deny')
            return (0, adapter_1.exitCodeFor)(canonical, ide);
        return 0;
    }
    catch {
        return 1000;
    }
};
exports.resolveExitCode = resolveExitCode;
const makeDedupKey = (dedupBy, ctx, name) => {
    const key = [
        name,
        ...(dedupBy.includes('session') ? [ctx.sessionId ?? 'no-session'] : []),
        ...(dedupBy.includes('filePath') ? [ctx.filePath] : []),
        ...(dedupBy.includes('ide') ? [ctx.ide] : []),
        ...(dedupBy.includes('toolName') ? [ctx.toolName] : []),
        ...(dedupBy.includes('toolInput') ? [JSON.stringify(ctx.toolInput)] : []),
    ].join(':');
    (0, debug_log_1.debugLogBranch)('run-hook', 'make-dedup-key', {
        hookName: name,
        dedupBy,
        key,
        sessionId: ctx.sessionId,
        filePath: ctx.filePath,
        ide: ctx.ide,
        toolName: ctx.toolName,
    });
    return key;
};
const evalFilePath = (fp, filePath) => {
    const p = filePath;
    const pl = p.toLowerCase();
    const rel = (0, path_utils_1.toRelative)(p);
    (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-start', {
        filePath,
        predicate: fp,
        relativePath: rel,
    });
    if (fp.extOneOf && !fp.extOneOf.some(e => p.endsWith(e))) {
        (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-result', {
            filePath,
            result: false,
            reason: 'extOneOf-mismatch',
            extOneOf: fp.extOneOf,
        });
        return false;
    }
    if (fp.extOneOfCi && !fp.extOneOfCi.some(e => pl.endsWith(e.toLowerCase()))) {
        (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-result', {
            filePath,
            result: false,
            reason: 'extOneOfCi-mismatch',
            extOneOfCi: fp.extOneOfCi,
        });
        return false;
    }
    if (fp.notContainsAny && fp.notContainsAny.some(s => p.includes(s))) {
        const matched = fp.notContainsAny.filter((s) => p.includes(s));
        (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-result', {
            filePath,
            result: false,
            reason: 'notContainsAny-blocked',
            matched,
        });
        return false;
    }
    if (fp.notTokenSegmentAny) {
        const segs = pl.split('/');
        const blocked = segs.some(seg => seg.split(/[-_.]/).some(tok => fp.notTokenSegmentAny.includes(tok)));
        if (blocked) {
            (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-result', {
                filePath,
                result: false,
                reason: 'notTokenSegmentAny-blocked',
                segments: segs,
                notTokenSegmentAny: fp.notTokenSegmentAny,
            });
            return false;
        }
    }
    if (fp.notStartsWithAny && fp.notStartsWithAny.some(s => rel.startsWith(s) || p.includes('/' + s))) {
        const matched = fp.notStartsWithAny.filter((s) => rel.startsWith(s) || p.includes('/' + s));
        (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-result', {
            filePath,
            result: false,
            reason: 'notStartsWithAny-blocked',
            matched,
            relativePath: rel,
        });
        return false;
    }
    if (fp.notBasenameOneOf && fp.notBasenameOneOf.includes(path_1.default.basename(p))) {
        (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-result', {
            filePath,
            result: false,
            reason: 'notBasenameOneOf-blocked',
            basename: path_1.default.basename(p),
            notBasenameOneOf: fp.notBasenameOneOf,
        });
        return false;
    }
    (0, debug_log_1.debugLogBranch)('run-hook', 'eval-file-path-result', {
        filePath,
        result: true,
        reason: 'passed',
    });
    return true;
};
const evalToolInput = (ti, ctx) => {
    (0, debug_log_1.debugLogBranch)('run-hook', 'eval-tool-input-start', {
        predicate: ti,
        toolName: ctx.toolName,
        toolInput: ctx.toolInput,
    });
    if (ti.commandMatchWhen) {
        const { tools, re } = ti.commandMatchWhen;
        if (tools.includes(ctx.toolName)) {
            const command = ctx.toolInput.command ?? '';
            const matched = re.test(command);
            (0, debug_log_1.debugLogBranch)('run-hook', 'eval-tool-input-command-match-when', {
                toolName: ctx.toolName,
                tools,
                command,
                matched,
                pattern: re.source,
                flags: re.flags,
            });
            if (!matched) {
                (0, debug_log_1.debugLogBranch)('run-hook', 'eval-tool-input-result', {
                    result: false,
                    reason: 'commandMatchWhen-mismatch',
                    toolName: ctx.toolName,
                });
                return false;
            }
        }
        else {
            (0, debug_log_1.debugLogBranch)('run-hook', 'eval-tool-input-command-match-when-skipped', {
                toolName: ctx.toolName,
                tools,
                reason: 'tool-not-targeted',
            });
        }
    }
    (0, debug_log_1.debugLogBranch)('run-hook', 'eval-tool-input-result', {
        result: true,
        reason: 'passed',
        toolName: ctx.toolName,
    });
    return true;
};
const runHook = async (def, opts = {}) => {
    await executeHook(def, opts);
};
exports.runHook = runHook;
const executeHook = async (def, opts = {}) => {
    const { stdin = process.stdin, stdout = process.stdout } = opts;
    try {
        (0, debug_log_1.debugLogHook)(def.name, 'received', {
            activation: def.on,
            throttle: def.throttle ?? null,
            runtime: {
                processCwd: process.cwd(),
                argv: process.argv,
                execPath: process.execPath,
                nodeVersion: process.version,
                platform: process.platform,
                env: (0, debug_log_1.collectEnvironment)(HOOK_ENV_NAMES),
            },
        });
        const raw = await (0, adapter_1.readStdin)(stdin);
        (0, debug_log_1.debugLogHook)(def.name, 'raw-input', { rawInput: raw });
        const ide = (0, adapter_1.detectIDE)(raw);
        const norm = (0, adapter_1.normalize)(raw);
        (0, debug_log_1.debugLogHook)(def.name, 'normalized', {
            ide,
            event: norm.event,
            toolKind: norm.toolKind,
            toolName: norm.tool_name ?? null,
            normalizedInput: norm,
        });
        const events = Array.isArray(def.on.event) ? def.on.event : [def.on.event];
        if (!events.includes(norm.event)) {
            (0, debug_log_1.debugLogHook)(def.name, 'skipped', {
                reason: 'event-mismatch',
                allowedEvents: events,
                actualEvent: norm.event,
            });
            return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'event-mismatch' };
        }
        (0, debug_log_1.debugLogHook)(def.name, 'event-gate', {
            matched: true,
            allowedEvents: events,
            actualEvent: norm.event,
        });
        if (def.on.toolKinds && !def.on.toolKinds.includes(norm.toolKind)) {
            (0, debug_log_1.debugLogHook)(def.name, 'skipped', {
                reason: 'tool-kind-mismatch',
                allowedToolKinds: def.on.toolKinds,
                actualToolKind: norm.toolKind,
            });
            return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'tool-kind-mismatch' };
        }
        (0, debug_log_1.debugLogHook)(def.name, 'tool-kind-gate', {
            matched: true,
            constrained: Boolean(def.on.toolKinds),
            allowedToolKinds: def.on.toolKinds ?? null,
            actualToolKind: norm.toolKind,
        });
        const ctx0 = toHookContext(norm);
        (0, debug_log_1.debugLogHook)(def.name, 'context', { hookContext: ctx0 });
        if (def.on.filePath && !evalFilePath(def.on.filePath, ctx0.filePath)) {
            (0, debug_log_1.debugLogHook)(def.name, 'skipped', {
                reason: 'file-path-predicate-failed',
                predicate: def.on.filePath,
                filePath: ctx0.filePath,
            });
            return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'file-path-predicate-failed' };
        }
        if (def.on.toolInput && !evalToolInput(def.on.toolInput, ctx0)) {
            (0, debug_log_1.debugLogHook)(def.name, 'skipped', {
                reason: 'tool-input-predicate-failed',
                predicate: def.on.toolInput,
                toolName: ctx0.toolName,
                toolInput: ctx0.toolInput,
            });
            return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'tool-input-predicate-failed' };
        }
        let markerRoot;
        if (def.on.fs?.nearestMarker) {
            const found = (0, path_utils_1.walkUp)(ctx0.cwd || process.cwd(), def.on.fs.nearestMarker);
            (0, debug_log_1.debugLogHook)(def.name, 'fs-gate', {
                nearestMarker: def.on.fs.nearestMarker,
                cwd: ctx0.cwd || process.cwd(),
                found: found ?? null,
            });
            if (!found) {
                (0, debug_log_1.debugLogHook)(def.name, 'skipped', {
                    reason: 'nearest-marker-not-found',
                    nearestMarker: def.on.fs.nearestMarker,
                    cwd: ctx0.cwd || process.cwd(),
                });
                return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'nearest-marker-not-found' };
            }
            (0, debug_log_1.debugLogHook)(def.name, 'fs-gate-passed', {
                nearestMarker: def.on.fs.nearestMarker,
                cwd: ctx0.cwd || process.cwd(),
                markerRoot: found,
            });
            markerRoot = found;
        }
        const ctx = markerRoot !== undefined ? { ...ctx0, markerRoot } : ctx0;
        (0, debug_log_1.debugLogHook)(def.name, 'context-final', { hookContext: ctx });
        // Platform-level dedup: collapses duplicate events from IDEs that fire multiple times per call.
        const platformKey = (0, adapter_1.dedupKey)(raw, def.name);
        if (platformKey !== null && !(0, throttle_1.acquireOnce)(platformKey)) {
            (0, debug_log_1.debugLogHook)(def.name, 'skipped', {
                reason: 'platform-dedup',
                platformKey,
            });
            return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'platform-dedup' };
        }
        (0, debug_log_1.debugLogHook)(def.name, 'platform-dedup', { platformKey });
        if (def.throttle && 'dedupBy' in def.throttle) {
            const dedupKeyValue = makeDedupKey(def.throttle.dedupBy, ctx, def.name);
            if (!(0, throttle_1.acquireOnce)(dedupKeyValue)) {
                (0, debug_log_1.debugLogHook)(def.name, 'skipped', {
                    reason: 'throttle-dedup',
                    throttle: def.throttle,
                    dedupKey: dedupKeyValue,
                });
                return { exitCode: 0, wroteOutput: false, status: 'skipped', reason: 'throttle-dedup' };
            }
            (0, debug_log_1.debugLogHook)(def.name, 'throttle-dedup', {
                throttle: def.throttle,
                dedupKey: dedupKeyValue,
            });
        }
        (0, debug_log_1.debugLogHook)(def.name, 'all-gates-passed', {
            event: ctx.event,
            toolKind: ctx.toolKind,
            toolName: ctx.toolName,
            filePath: ctx.filePath,
            markerRoot: ctx.markerRoot ?? null,
        });
        const result = await def.run(ctx);
        (0, debug_log_1.debugLogHook)(def.name, 'result', { hookResult: result });
        if (!result) {
            (0, debug_log_1.debugLogHook)(def.name, 'completed', {
                exitCode: 0,
                wroteOutput: false,
                reason: 'null-result',
            });
            return { exitCode: 0, wroteOutput: false, status: 'completed', reason: 'null-result' };
        }
        if (result.kind === 'side-effect') {
            const sideEffectExitCode = result._exitCode ?? 0;
            (0, debug_log_1.debugLogHook)(def.name, 'completed', {
                exitCode: sideEffectExitCode,
                wroteOutput: false,
                reason: 'side-effect',
            });
            return { exitCode: sideEffectExitCode, wroteOutput: false, status: 'completed', reason: 'side-effect' };
        }
        const canonicalOutput = toCanonical(result, ctx);
        const formattedOutput = (0, adapter_1.formatOutput)(canonicalOutput, ide);
        const outputText = JSON.stringify(formattedOutput);
        const exitCode = (0, exports.resolveExitCode)(result, canonicalOutput, ide);
        // TODO: json-cycle is only needed because this log entry carries both
        // canonicalOutputFull and finalOutputFull, which may be the same object
        // reference. Split these into two independent debugLogHook calls and remove
        // the json-cycle dependency if log consumers do not need same-entry refs.
        (0, debug_log_1.debugLogHook)(def.name, 'output', {
            hookResultFull: result,
            canonicalOutputFull: canonicalOutput,
            finalOutputFull: formattedOutput,
            finalOutputText: outputText,
            finalOutputBytes: Buffer.byteLength(outputText, 'utf8'),
        });
        stdout.write(outputText);
        (0, debug_log_1.debugLogHook)(def.name, 'completed', {
            exitCode,
            wroteOutput: true,
            finalOutputBytes: Buffer.byteLength(outputText, 'utf8'),
        });
        return { exitCode, wroteOutput: true, status: 'completed' };
    }
    catch (err) {
        const error = err;
        (0, debug_log_1.debugLogHook)(def.name, 'error', { error });
        return {
            exitCode: 1,
            wroteOutput: false,
            status: 'error',
            reason: error.message,
            stderrMessage: `${def.name} hook error: ${error.message}\n`,
        };
    }
};
