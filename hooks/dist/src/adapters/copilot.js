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
exports.copilot = void 0;
const ide_registry_1 = require("../runtime/ide-registry");
const IDE = 'copilot';
const COPILOT_SIGNATURE = ['toolName', 'timestamp', 'cwd'];
// Copilot sends no explicit hook_event_name — infer semantic event from raw shape.
// PostToolUse/PreToolUse are null in EVENTS (copilot doesn't send event names for tools),
// so we derive them from the presence of toolResult.
const inferEvent = (raw) => {
    if ('toolName' in raw)
        return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
    if ('source' in raw || 'initialPrompt' in raw)
        return 'SessionStart';
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
        const parsed = JSON.parse(toolArgs);
        return typeof parsed === 'object' && parsed !== null
            ? parsed
            : { _raw: toolArgs };
    }
    catch {
        return { _raw: toolArgs };
    }
};
const detect = (raw) => COPILOT_SIGNATURE.every((f) => f in raw) && !('hook_event_name' in raw);
const normalize = (raw) => {
    const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
    return {
        ide: IDE,
        event: inferEvent(raw),
        toolKind: (0, ide_registry_1.reverseLookupToolKind)(IDE, toolName),
        hook_event_name: inferHookEventName(raw),
        session_id: undefined,
        tool_name: toolName,
        tool_input: parseToolArgs(raw),
        tool_use_id: undefined,
        cwd: cwd,
        tool_response: toolResult ?? undefined,
        file_path: ide_registry_1.PROPERTIES.filePath[IDE](raw) ?? '',
        _copilot: { timestamp, toolName, toolArgs, toolResult },
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
exports.copilot = { name: 'copilot', detect, normalize, formatOutput };
