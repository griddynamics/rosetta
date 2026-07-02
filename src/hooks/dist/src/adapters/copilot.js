"use strict";
// adapters/copilot.ts — Adapter for GitHub Copilot CLI
// Docs: https://docs.github.com/en/copilot/tutorials/copilot-cli-hooks
//      https://docs.github.com/en/copilot/reference/hooks-configuration
//
// Copilot has a minimal schema: { timestamp, cwd, toolName, toolArgs }
// Key differences from Claude Code:
//   - toolName (camelCase) instead of tool_name
//   - toolArgs is a JSON STRING (not an object) — must be parsed
//   - No session_id, hook_event_name, tool_use_id
//   - postToolUse adds toolResult: { resultType, textResultForLlm }
//   - Other events: sessionStart { source, initialPrompt }, sessionEnd { reason },
//     userPromptSubmitted { prompt }, errorOccurred { error }
Object.defineProperty(exports, "__esModule", { value: true });
exports.copilot = exports.dedupKey = void 0;
const copilot_1 = require("../runtime/ide-rows/copilot");
const IDE = 'copilot';
// Copilot sends no explicit hook_event_name — infer semantic event from raw shape.
// PostToolUse/PreToolUse are null in EVENTS (copilot doesn't send event names for tools),
// so we derive them from the presence of toolResult.
const inferEvent = (raw) => {
    if ('toolName' in raw) {
        const toolKind = (0, copilot_1.lookupToolKind)(raw.toolName);
        if (toolKind === 'read')
            return 'PreRead';
        return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
    }
    if ('source' in raw || 'initialPrompt' in raw)
        return 'SessionStart';
    if ('reason' in raw)
        return 'SessionEnd';
    if ('trigger' in raw || 'customInstructions' in raw || 'custom_instructions' in raw)
        return 'PreCompact';
    if ('prompt' in raw)
        return 'PrePromptSubmit';
    return null;
};
const inferHookEventName = (raw) => {
    const event = inferEvent(raw);
    if (event)
        return event;
    if ('reason' in raw)
        return 'SessionEnd';
    if ('error' in raw)
        return 'Error';
    return 'Unknown';
};
const parseToolArgs = (raw) => {
    const { toolArgs } = raw;
    if (!toolArgs)
        return {};
    try {
        const parsed = typeof toolArgs === 'string' ? JSON.parse(toolArgs) : toolArgs;
        return typeof parsed === 'object' && parsed !== null
            ? parsed
            : { _raw: toolArgs };
    }
    catch {
        return { _raw: toolArgs };
    }
};
const detect = (raw) => !('hook_event_name' in raw) &&
    ('timestamp' in raw) &&
    ('cwd' in raw) &&
    inferEvent(raw) !== null;
const normalize = (raw) => {
    const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
    const normalizedToolName = typeof toolName === 'string' ? toolName : '';
    return {
        ide: IDE,
        event: inferEvent(raw),
        toolKind: normalizedToolName ? (0, copilot_1.lookupToolKind)(normalizedToolName) : null,
        hook_event_name: inferHookEventName(raw),
        session_id: (raw.sessionId ?? raw.session_id) || undefined,
        tool_name: normalizedToolName || undefined,
        tool_input: parseToolArgs(raw),
        tool_use_id: undefined,
        cwd: cwd,
        tool_response: toolResult ?? undefined,
        file_path: (0, copilot_1.getFilePath)(raw) ?? '',
        source: raw.source,
        reason: raw.reason,
        trigger: raw.trigger,
        transcript_path: (raw.transcriptPath ?? raw.transcript_path) || undefined,
        _copilot: { timestamp, toolName: normalizedToolName || undefined, toolArgs, toolResult },
    };
};
const formatOutput = (canonical) => {
    const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
    const { permissionDecision, permissionDecisionReason, additionalContext, hookEventName } = hookSpecificOutput;
    const out = {};
    if (permissionDecision)
        out.permissionDecision = permissionDecision;
    if (permissionDecisionReason)
        out.permissionDecisionReason = permissionDecisionReason;
    if (cont === false && !out.permissionDecision)
        out.permissionDecision = 'deny';
    if (additionalContext)
        out.hookSpecificOutput = { hookEventName, additionalContext };
    return out;
};
const dedupKey = (raw, hookName) => {
    if (!detect(raw))
        return null; // VS Code CC-fallback shape — no dedup needed
    return `copilot:${hookName}:${raw.toolName}:${raw.toolArgs ?? ''}`;
};
exports.dedupKey = dedupKey;
exports.copilot = { name: 'copilot', detect, normalize, formatOutput, dedupKey: exports.dedupKey };
