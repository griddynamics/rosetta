"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const debug_log_1 = require("../debug-log");
const EVENTS = {
    SessionStart: 'sessionStart',
    SessionEnd: 'sessionEnd',
    PreCompact: 'preCompact',
    PrePromptSubmit: 'userPromptSubmitted',
};
const TOOL_KINDS = {
    write: ['create_file', 'create', 'Write'],
    edit: ['replace_string_in_file', 'edit', 'Edit'],
    'multi-edit': ['multi_replace_string_in_file'],
    create: ['create_file', 'create', 'Write'],
    replace: ['replace_string_in_file', 'multi_replace_string_in_file', 'edit', 'Edit'],
    bash: ['bash', 'powershell'],
    read: ['view', 'Read'],
};
const lookupEvent = (raw) => {
    for (const [k, v] of Object.entries(EVENTS)) {
        if (v === raw) {
            const result = k;
            (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'lookup-event', { raw, result, reason: 'matched-map' });
            return result;
        }
    }
    (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'lookup-event', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupEvent = lookupEvent;
const lookupToolKind = (raw) => {
    if (raw.startsWith('mcp__')) {
        (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
        return 'mcp-call';
    }
    for (const [k, v] of Object.entries(TOOL_KINDS))
        if (v.includes(raw)) {
            (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
            return k;
        }
    (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupToolKind = lookupToolKind;
const getFilePath = (raw) => {
    const toolArgs = raw.toolArgs;
    if (!toolArgs) {
        (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'get-file-path', { result: null, reason: 'missing-toolArgs' });
        return null;
    }
    try {
        const parsed = typeof toolArgs === 'string'
            ? JSON.parse(toolArgs)
            : toolArgs;
        const result = parsed?.filePath ?? parsed?.file_path ?? null;
        (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'get-file-path', {
            result,
            reason: 'parsed-toolArgs',
            parsed,
        });
        return result;
    }
    catch {
        (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'get-file-path', { result: null, reason: 'toolArgs-parse-failed' });
        return null;
    }
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => {
    const result = raw.cwd ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'get-cwd', { result });
    return result;
};
exports.getCwd = getCwd;
const getSessionId = (raw) => {
    const result = raw.sessionId ?? raw.session_id ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:copilot', 'get-session-id', { result });
    return result;
};
exports.getSessionId = getSessionId;
