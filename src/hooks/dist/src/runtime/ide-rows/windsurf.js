"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const debug_log_1 = require("../debug-log");
const EVENTS = {
    PostToolUse: 'PostToolUse',
    PreToolUse: 'PreToolUse',
    PreRead: 'PreRead',
    PrePromptSubmit: 'PrePromptSubmit',
};
const TOOL_KINDS = {
    write: ['Write'],
    edit: ['Write'],
    create: ['Write'],
    replace: ['Write'],
    bash: ['Bash'],
    read: ['Read'],
    'mcp-call': ['__mcp_sentinel__'],
};
const lookupEvent = (raw) => {
    for (const [k, v] of Object.entries(EVENTS)) {
        if (v === raw) {
            const result = k;
            (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'lookup-event', { raw, result, reason: 'matched-map' });
            return result;
        }
    }
    (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'lookup-event', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupEvent = lookupEvent;
const lookupToolKind = (raw) => {
    if (raw.startsWith('mcp__')) {
        if (/(^|__)read(_|$)/i.test(raw)) {
            (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'lookup-tool-kind', { raw, result: 'read', reason: 'mcp-read-special-case' });
            return 'read';
        }
        (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
        return 'mcp-call';
    }
    for (const [k, v] of Object.entries(TOOL_KINDS))
        if (v.includes(raw)) {
            (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
            return k;
        }
    (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupToolKind = lookupToolKind;
const getFilePath = (raw) => {
    const toolInfo = raw.tool_info ?? {};
    const result = toolInfo.file_path ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'get-file-path', { toolInfo, result });
    return result;
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => {
    const toolInfo = raw.tool_info ?? {};
    const result = toolInfo.cwd ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'get-cwd', { toolInfo, result });
    return result;
};
exports.getCwd = getCwd;
const getSessionId = (raw) => {
    const result = raw.trajectory_id ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:windsurf', 'get-session-id', { result });
    return result;
};
exports.getSessionId = getSessionId;
