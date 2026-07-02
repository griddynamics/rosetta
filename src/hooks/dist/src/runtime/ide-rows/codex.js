"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const debug_log_1 = require("../debug-log");
const EVENTS = {
    PostToolUse: 'PostToolUse',
    PreToolUse: 'PreToolUse',
    SessionStart: 'SessionStart',
    PreCompact: 'PreCompact',
    PostCompact: 'PostCompact',
    PrePromptSubmit: 'UserPromptSubmit',
};
// Matches "*** (Update|Add|Create) File: <path>" in apply_patch command strings
const PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;
const TOOL_KINDS = {
    write: ['Write', 'apply_patch', 'functions.apply_patch'],
    edit: ['apply_patch', 'functions.apply_patch'],
    create: ['Write', 'apply_patch', 'functions.apply_patch'],
    replace: ['apply_patch', 'functions.apply_patch'],
    patch: ['apply_patch', 'functions.apply_patch'],
    bash: ['Bash', 'shell'],
    'mcp-call': ['__mcp_sentinel__'],
};
const lookupEvent = (raw) => {
    for (const [k, v] of Object.entries(EVENTS)) {
        if (v === raw) {
            const result = k;
            (0, debug_log_1.debugLogBranch)('ide-row:codex', 'lookup-event', { raw, result, reason: 'matched-map' });
            return result;
        }
    }
    (0, debug_log_1.debugLogBranch)('ide-row:codex', 'lookup-event', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupEvent = lookupEvent;
const lookupToolKind = (raw) => {
    if (raw.startsWith('mcp__')) {
        (0, debug_log_1.debugLogBranch)('ide-row:codex', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
        return 'mcp-call';
    }
    for (const [k, v] of Object.entries(TOOL_KINDS))
        if (v.includes(raw)) {
            (0, debug_log_1.debugLogBranch)('ide-row:codex', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
            return k;
        }
    (0, debug_log_1.debugLogBranch)('ide-row:codex', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
    return null;
};
exports.lookupToolKind = lookupToolKind;
const getFilePath = (raw) => {
    const tool = raw.tool_name ?? '';
    if (tool === 'apply_patch' || tool === 'functions.apply_patch') {
        const cmd = raw.tool_input?.command ?? '';
        const match = PATCH_FILE_RE.exec(cmd);
        const result = match?.[1]?.trim() ?? null;
        (0, debug_log_1.debugLogBranch)('ide-row:codex', 'get-file-path', {
            tool,
            result,
            reason: 'patch-command',
            command: cmd,
        });
        return result;
    }
    if (tool.startsWith('mcp__')) {
        const ti = raw.tool_input ?? {};
        const result = ti.file_path ?? ti.filePath ?? ti.path ?? null;
        (0, debug_log_1.debugLogBranch)('ide-row:codex', 'get-file-path', {
            tool,
            result,
            reason: 'mcp-input',
            toolInput: ti,
        });
        return result;
    }
    const toolInput = raw.tool_input ?? {};
    const result = toolInput.file_path ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:codex', 'get-file-path', {
        tool,
        result,
        reason: 'tool-input-file-path',
        toolInput,
    });
    return result;
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => {
    const result = raw.cwd ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:codex', 'get-cwd', { result });
    return result;
};
exports.getCwd = getCwd;
const getSessionId = (raw) => {
    const result = raw.session_id ?? null;
    (0, debug_log_1.debugLogBranch)('ide-row:codex', 'get-session-id', { result });
    return result;
};
exports.getSessionId = getSessionId;
