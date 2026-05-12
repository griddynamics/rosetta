"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const EVENTS = {
    PostToolUse: 'PostToolUse', PreToolUse: 'PreToolUse', SessionStart: 'SessionStart',
};
const TOOL_KINDS = {
    write: ['Write', 'create_file'],
    edit: ['Edit'],
    'multi-edit': ['MultiEdit'],
    create: ['Write'],
    replace: ['Edit'],
    bash: ['Bash'],
    read: ['Read'],
    'mcp-call': ['__mcp_sentinel__'],
};
const lookupEvent = (raw) => {
    for (const [k, v] of Object.entries(EVENTS))
        if (v === raw)
            return k;
    return null;
};
exports.lookupEvent = lookupEvent;
const lookupToolKind = (raw) => {
    if (raw.startsWith('mcp__'))
        return 'mcp-call';
    for (const [k, v] of Object.entries(TOOL_KINDS))
        if (v.includes(raw))
            return k;
    return null;
};
exports.lookupToolKind = lookupToolKind;
const getFilePath = (raw) => {
    const ti = raw.tool_input ?? {};
    return ti.file_path ?? ti.filePath ?? ti.path ?? null;
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => raw.cwd ?? null;
exports.getCwd = getCwd;
const getSessionId = (raw) => raw.session_id ?? null;
exports.getSessionId = getSessionId;
