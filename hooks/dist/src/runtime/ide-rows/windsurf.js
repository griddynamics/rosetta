"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const EVENTS = {
    PostToolUse: 'PostToolUse',
    PreToolUse: 'PreToolUse',
    PrePromptSubmit: 'PrePromptSubmit',
};
const TOOL_KINDS = {
    write: ['Write'],
    edit: ['Write'],
    create: ['Write'],
    replace: ['Write'],
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
const getFilePath = (raw) => raw.tool_info?.file_path ?? null;
exports.getFilePath = getFilePath;
const getCwd = (raw) => raw.tool_info?.cwd ?? null;
exports.getCwd = getCwd;
const getSessionId = (raw) => raw.trajectory_id ?? null;
exports.getSessionId = getSessionId;
