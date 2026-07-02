"use strict";
// adapters/copilot.ts — Adapter for GitHub Copilot (VS Code + Copilot CLI)
// Docs: https://docs.github.com/en/copilot/reference/hooks-reference (CLI, R1)
//      https://code.visualstudio.com/docs/agent-customization/hooks (VS Code, R2/R3)
//
// Copilot has TWO wire shapes, both handled here — see docs/hooks/copilot.md:
//   - Copilot CLI camelCase fire (R1): { timestamp, cwd, toolName, toolArgs (JSON string) },
//     no hook_event_name/session_id/tool_use_id.
//   - VS Code + Copilot CLI PascalCase fire (R3): { hook_event_name, session_id, tool_name,
//     tool_input (object), tool_use_id, tool_response (string, VS Code) }.
//   - Copilot CLI PascalCase fire also carries tool_result (object, snake_case) instead of
//     tool_response.
// Normalize handles both; the shape actually reaching normalize() depends on the caller
// (bundle-pinned entrypoints always route Copilot traffic here regardless of which fire it is).
Object.defineProperty(exports, "__esModule", { value: true });
exports.copilot = void 0;
const copilot_1 = require("../runtime/ide-rows/copilot");
const IDE = 'copilot';
const rawToolName = (raw) => (raw.tool_name ?? raw.toolName) || '';
// Copilot's camelCase fire sends no explicit hook_event_name — infer semantic event from
// raw shape. The snake_case fire (VS Code + CLI PascalCase) DOES send hook_event_name, but
// PreToolUse still needs tool-kind-based PreRead reclassification either way — PostToolUse
// on a read-kind tool must stay PostToolUse (a prior version returned PreRead unconditionally
// once a read-kind tool matched, before checking Pre/Post at all, which made read-once fire a
// second, spurious time on every completed read — see hooks-verify.md).
const inferEvent = (raw) => {
    const explicit = raw.hook_event_name;
    const toolName = rawToolName(raw);
    if (toolName) {
        const hasResult = 'toolResult' in raw || 'tool_result' in raw || 'tool_response' in raw;
        const isPost = explicit === 'PostToolUse' || (explicit === undefined && hasResult);
        if (isPost)
            return 'PostToolUse';
        return (0, copilot_1.lookupToolKind)(toolName) === 'read' ? 'PreRead' : 'PreToolUse';
    }
    if (explicit === 'SessionStart' || 'source' in raw || 'initialPrompt' in raw || 'initial_prompt' in raw)
        return 'SessionStart';
    if (explicit === 'SessionEnd')
        return 'SessionEnd';
    if (explicit === 'PreCompact' || 'trigger' in raw || 'customInstructions' in raw || 'custom_instructions' in raw)
        return 'PreCompact';
    if ('prompt' in raw)
        return 'PrePromptSubmit';
    if ('reason' in raw)
        return 'SessionEnd';
    return null;
};
const inferHookEventName = (raw) => {
    const explicit = raw.hook_event_name;
    if (explicit)
        return explicit;
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
    const { cwd, timestamp, toolArgs, toolResult } = raw;
    const normalizedToolName = rawToolName(raw);
    const toolInput = raw.tool_input ?? parseToolArgs(raw);
    // tool_response (string, VS Code) / tool_result (object snake, CLI) / toolResult (object camel, CLI).
    const toolResponse = raw.tool_response ?? raw.tool_result ?? toolResult ?? undefined;
    return {
        ide: IDE,
        event: inferEvent(raw),
        toolKind: normalizedToolName ? (0, copilot_1.lookupToolKind)(normalizedToolName) : null,
        hook_event_name: inferHookEventName(raw),
        session_id: (raw.session_id ?? raw.sessionId) || undefined,
        tool_name: normalizedToolName || undefined,
        tool_input: toolInput,
        tool_use_id: raw.tool_use_id || undefined,
        cwd: cwd,
        tool_response: toolResponse,
        file_path: (0, copilot_1.getFilePath)(raw) ?? '',
        source: raw.source,
        reason: raw.reason,
        trigger: raw.trigger,
        transcript_path: (raw.transcript_path ?? raw.transcriptPath) || undefined,
        _copilot: { timestamp, toolName: normalizedToolName || undefined, toolArgs, toolResult },
    };
};
// Merged emit (docs/hooks/copilot.md): additionalContext / permissionDecision /
// permissionDecisionReason each go at BOTH top-level (R1, honored by Copilot CLI) AND nested
// in hookSpecificOutput (R3, honored by VS Code) — one runtime ignores whichever placement
// isn't its own, so both must be present for the value to reach either runtime.
// (!) This function is NOT event-aware and applies the same merge to every event, including
// SubagentStop — whose R3 output is documented as top-level-only, no hookSpecificOutput
// wrapper at all. No current Rosetta hook targets SubagentStop (or Stop) with an
// additionalContext/deny-shaped result, so this is currently unreachable in practice; if a
// future hook does, verify empirically whether VS Code's SubagentStop handler tolerates (or
// rejects) an extra, unexpected hookSpecificOutput field before assuming this merge is safe
// there too.
const formatOutput = (canonical) => {
    const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
    const { permissionDecision, permissionDecisionReason, additionalContext, hookEventName } = hookSpecificOutput;
    const resolvedDecision = permissionDecision ?? (cont === false ? 'deny' : undefined);
    const out = {};
    if (resolvedDecision)
        out.permissionDecision = resolvedDecision;
    if (permissionDecisionReason)
        out.permissionDecisionReason = permissionDecisionReason;
    if (additionalContext)
        out.additionalContext = additionalContext;
    if (resolvedDecision || permissionDecisionReason || additionalContext) {
        const nested = {};
        if (hookEventName)
            nested.hookEventName = hookEventName;
        if (resolvedDecision)
            nested.permissionDecision = resolvedDecision;
        if (permissionDecisionReason)
            nested.permissionDecisionReason = permissionDecisionReason;
        if (additionalContext)
            nested.additionalContext = additionalContext;
        out.hookSpecificOutput = nested;
    }
    return out;
};
exports.copilot = { name: 'copilot', detect, normalize, formatOutput };
