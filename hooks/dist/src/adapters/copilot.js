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
const COPILOT_SIGNATURE = ['toolName', 'timestamp', 'cwd'];
const inferHookEventName = (raw) => {
    if ('toolName' in raw)
        return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
    if ('reason' in raw)
        return 'SessionEnd';
    if ('source' in raw || 'initialPrompt' in raw)
        return 'SessionStart';
    if ('prompt' in raw)
        return 'PrePromptSubmit';
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
        hook_event_name: inferHookEventName(raw),
        session_id: undefined,
        tool_name: toolName,
        tool_input: parseToolArgs(raw),
        tool_use_id: undefined,
        cwd: cwd,
        tool_response: toolResult ?? undefined,
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
