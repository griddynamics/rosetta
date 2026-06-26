"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const debug_log_1 = require("../debug-log");
const EVENTS = {
    PostToolUse: 'postToolUse',
    PreToolUse: 'preToolUse',
    PreRead: 'beforeReadFile',
    SessionStart: 'sessionStart',
    SessionEnd: 'sessionEnd',
    PreCompact: 'preCompact',
    PrePromptSubmit: 'beforeSubmitPrompt',
};
const TOOL_KINDS = {
    write: ['Write'],
    edit: ['Edit', 'Write'],
    create: ['Write'],
    replace: ['Edit', 'Write'],
    bash: ['Bash', 'Shell'],
    read: ['Read'],
    'mcp-call': ['__mcp_sentinel__'],
};
const lookupEvent = (raw) => {
    if (raw === 'beforeTabFileRead') {
        (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'lookup-event', { raw, result: 'PreRead', reason: 'cursor-special-case' });
        return 'PreRead';
    }
    for (const [k, v] of Object.entries(EVENTS)) {
        if (v === raw) {
            const result = k;
            (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'lookup-event', { raw, result, reason: 'matched-map' });
            return result;
        }
    }
    (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'lookup-event', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupEvent = lookupEvent;
const lookupToolKind = (raw) => {
    if (raw.startsWith('mcp__')) {
        (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
        return 'mcp-call';
    }
    for (const [k, v] of Object.entries(TOOL_KINDS))
        if (v.includes(raw)) {
            (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
            return k;
        }
    (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupToolKind = lookupToolKind;
const getFilePath = (raw) => {
    const ti = raw.tool_input ?? {};
    const result = ti.file_path ?? ti.filePath ?? ti.path ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'get-file-path', { toolInput: ti, result });
    return result;
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => {
    const result = raw.cwd ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'get-cwd', { result });
    return result;
};
exports.getCwd = getCwd;
const getSessionId = (raw) => {
    const result = raw.conversation_id ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:cursor', 'get-session-id', { result });
    return result;
};
exports.getSessionId = getSessionId;
