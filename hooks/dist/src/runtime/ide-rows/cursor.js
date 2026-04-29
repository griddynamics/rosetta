"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const EVENTS = {
    PostToolUse: 'postToolUse',
    PreToolUse: 'preToolUse',
    SessionStart: 'sessionStart',
    PrePromptSubmit: 'userPromptSubmitted',
};
const TOOL_KINDS = {
    write: ['Write'],
    edit: ['Edit'],
    create: ['Write'],
    replace: ['Edit'],
    bash: ['Bash'],
    read: ['Read'],
};
const lookupEvent = (raw) => {
    for (const [k, v] of Object.entries(EVENTS))
        if (v === raw)
            return k;
    return null;
};
exports.lookupEvent = lookupEvent;
const lookupToolKind = (raw) => {
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
const getSessionId = (raw) => raw.conversation_id ?? null;
exports.getSessionId = getSessionId;
