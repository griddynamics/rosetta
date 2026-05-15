"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionId = exports.getCwd = exports.getFilePath = exports.lookupToolKind = exports.lookupEvent = void 0;
const EVENTS = {
    SessionStart: 'SessionStart',
    PrePromptSubmit: 'userPromptSubmitted',
};
const TOOL_KINDS = {
    write: ['create_file'],
    edit: ['replace_string_in_file'],
    'multi-edit': ['multi_replace_string_in_file'],
    create: ['create_file'],
    replace: ['replace_string_in_file', 'multi_replace_string_in_file'],
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
    const toolArgs = raw.toolArgs;
    if (!toolArgs)
        return null;
    try {
        const parsed = JSON.parse(toolArgs);
        return parsed?.filePath ?? parsed?.file_path ?? null;
    }
    catch {
        return null;
    }
};
exports.getFilePath = getFilePath;
const getCwd = (raw) => raw.cwd ?? null;
exports.getCwd = getCwd;
const getSessionId = (_raw) => null;
exports.getSessionId = getSessionId;
