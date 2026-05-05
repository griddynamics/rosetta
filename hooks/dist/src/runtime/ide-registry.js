"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROPERTIES = exports.reverseLookupToolKind = exports.TOOL_KINDS = exports.reverseLookupEvent = exports.EVENTS = void 0;
exports.EVENTS = {
    PostToolUse: { 'claude-code': 'PostToolUse', 'codex': 'PostToolUse', 'cursor': 'postToolUse', 'windsurf': 'PostToolUse', 'copilot': null },
    PreToolUse: { 'claude-code': 'PreToolUse', 'codex': 'PreToolUse', 'cursor': 'preToolUse', 'windsurf': 'PreToolUse', 'copilot': null },
    SessionStart: { 'claude-code': 'SessionStart', 'codex': null, 'cursor': 'sessionStart', 'windsurf': null, 'copilot': 'SessionStart' },
    PrePromptSubmit: { 'claude-code': null, 'codex': null, 'cursor': 'userPromptSubmitted', 'windsurf': 'PrePromptSubmit', 'copilot': 'userPromptSubmitted' },
};
const reverseLookupEvent = (ide, raw) => {
    for (const [key, map] of Object.entries(exports.EVENTS)) {
        if (map[ide] === raw)
            return key;
    }
    return null;
};
exports.reverseLookupEvent = reverseLookupEvent;
// IMPORTANT: Verify exact tool names against hooks/tests/fixtures/*.json before finalizing.
exports.TOOL_KINDS = {
    write: {
        'claude-code': ['Write', 'create_file'],
        'codex': ['Write', 'apply_patch', 'functions.apply_patch'],
        'cursor': ['Write'],
        'windsurf': ['Write'],
        'copilot': ['create_file'],
    },
    edit: {
        'claude-code': ['Edit'],
        'codex': ['apply_patch', 'functions.apply_patch'],
        'cursor': ['Edit'],
        'windsurf': ['Write'], // Windsurf post_write_code covers both write+edit
        'copilot': ['replace_string_in_file'],
    },
    'multi-edit': {
        'claude-code': ['MultiEdit'],
        'codex': null,
        'cursor': null,
        'windsurf': null,
        'copilot': ['multi_replace_string_in_file'],
    },
    patch: {
        'claude-code': null,
        'codex': ['apply_patch', 'functions.apply_patch'],
        'cursor': null,
        'windsurf': null,
        'copilot': null,
    },
    create: {
        'claude-code': ['Write'],
        'codex': ['Write', 'apply_patch', 'functions.apply_patch'],
        'cursor': ['Write'],
        'windsurf': ['Write'],
        'copilot': ['create_file'],
    },
    replace: {
        'claude-code': ['Edit'],
        'codex': ['apply_patch', 'functions.apply_patch'],
        'cursor': ['Edit'],
        'windsurf': ['Write'],
        'copilot': ['replace_string_in_file', 'multi_replace_string_in_file'],
    },
    bash: {
        'claude-code': ['Bash'],
        'codex': ['Bash', 'shell'],
        'cursor': ['Bash'],
        'windsurf': ['Bash'],
        'copilot': null,
    },
    read: {
        'claude-code': ['Read'],
        'codex': ['Read'],
        'cursor': ['Read'],
        'windsurf': ['Read'],
        'copilot': null,
    },
    'mcp-call': {
        'claude-code': ['__mcp_sentinel__'],
        'codex': null,
        'cursor': null,
        'windsurf': null,
        'copilot': null,
    },
};
const reverseLookupToolKind = (ide, raw) => {
    if (raw.startsWith('mcp__'))
        return 'mcp-call';
    for (const [key, map] of Object.entries(exports.TOOL_KINDS)) {
        const names = map[ide];
        if (Array.isArray(names) && names.includes(raw))
            return key;
    }
    return null;
};
exports.reverseLookupToolKind = reverseLookupToolKind;
const PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;
const extractFromPatch = (raw) => {
    const command = raw.tool_input?.command ?? '';
    return PATCH_FILE_RE.exec(command)?.[1]?.trim() ?? null;
};
const parseToolArgsFilePath = (raw) => {
    const { toolArgs } = raw;
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
exports.PROPERTIES = {
    filePath: {
        'claude-code': (raw) => {
            const ti = raw.tool_input ?? {};
            return ti.file_path ?? ti.filePath ?? ti.path ?? null;
        },
        'codex': (raw) => {
            const tool = raw.tool_name ?? '';
            if (tool === 'apply_patch' || tool === 'functions.apply_patch')
                return extractFromPatch(raw);
            const ti = raw.tool_input ?? {};
            return ti.file_path ?? null;
        },
        'cursor': (raw) => {
            const ti = raw.tool_input ?? {};
            return ti.file_path ?? ti.filePath ?? ti.path ?? null;
        },
        'windsurf': (raw) => {
            const ti = raw.tool_info ?? {};
            return ti.file_path ?? null;
        },
        'copilot': parseToolArgsFilePath,
    },
    cwd: {
        'claude-code': (raw) => raw.cwd ?? null,
        'codex': (raw) => raw.cwd ?? null,
        'cursor': (raw) => raw.cwd ?? null,
        'windsurf': (raw) => raw.tool_info?.cwd ?? null,
        'copilot': (raw) => raw.cwd ?? null,
    },
    sessionId: {
        'claude-code': (raw) => raw.session_id ?? null,
        'codex': (raw) => raw.session_id ?? null,
        'cursor': (raw) => raw.conversation_id ?? null,
        'windsurf': (raw) => raw.trajectory_id ?? null,
        'copilot': (_raw) => null,
    },
};
