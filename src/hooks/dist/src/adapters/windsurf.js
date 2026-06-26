"use strict";
// adapters/windsurf.ts — Adapter for Windsurf (Codeium) Cascade IDE
// Docs: https://docs.windsurf.com/windsurf/cascade/hooks
//
// Windsurf has a completely different input shape:
//   { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info }
// All event data is nested inside tool_info with event-specific schemas.
//
// 12 event types are mapped to canonical hook_event_name + tool_name + tool_input.
// 4 events have no CC equivalent and use new canonical names (PrePromptSubmit, PostResponse, PostWorktree).
Object.defineProperty(exports, "__esModule", { value: true });
exports.windsurf = void 0;
const windsurf_1 = require("../runtime/ide-rows/windsurf");
const IDE = 'windsurf';
const WINDSURF_SIGNATURE = ['agent_action_name', 'trajectory_id', 'tool_info'];
// Maps Windsurf agent_action_name → { hook_event_name, tool_name, buildToolInput }
const EVENT_MAP = {
    pre_read_code: { hook_event_name: 'PreRead', tool_name: 'Read', buildToolInput: ({ file_path }) => ({ file_path }) },
    post_read_code: { hook_event_name: 'PostToolUse', tool_name: 'Read', buildToolInput: ({ file_path }) => ({ file_path }) },
    pre_write_code: { hook_event_name: 'PreToolUse', tool_name: 'Write', buildToolInput: ({ file_path }) => ({ file_path }) },
    post_write_code: { hook_event_name: 'PostToolUse', tool_name: 'Write', buildToolInput: ({ file_path }) => ({ file_path }) },
    pre_run_command: { hook_event_name: 'PreToolUse', tool_name: 'Bash', buildToolInput: ({ command_line }) => ({ command: command_line }) },
    post_run_command: { hook_event_name: 'PostToolUse', tool_name: 'Bash', buildToolInput: ({ command_line }) => ({ command: command_line }) },
    pre_mcp_tool_use: { hook_event_name: 'PreToolUse', tool_name: ({ mcp_tool_name }) => `mcp__${String(mcp_tool_name ?? '')}`, buildToolInput: ({ mcp_tool_arguments }) => mcp_tool_arguments || {} },
    post_mcp_tool_use: { hook_event_name: 'PostToolUse', tool_name: ({ mcp_tool_name }) => `mcp__${String(mcp_tool_name ?? '')}`, buildToolInput: ({ mcp_tool_arguments }) => mcp_tool_arguments || {} },
    // Events without CC equivalent — use new canonical names
    pre_user_prompt: { hook_event_name: 'PrePromptSubmit', tool_name: null, buildToolInput: ({ user_prompt }) => ({ prompt: user_prompt }) },
    post_cascade_response: { hook_event_name: 'PostResponse', tool_name: null, buildToolInput: ({ response }) => ({ response }) },
    post_cascade_response_with_transcript: { hook_event_name: 'PostResponse', tool_name: null, buildToolInput: ({ transcript_path }) => ({ transcript_path }) },
    post_setup_worktree: { hook_event_name: 'PostWorktree', tool_name: null, buildToolInput: ({ worktree_path, root_workspace_path }) => ({ worktree_path, root_workspace_path }) },
};
const resolveToolName = (eventDef, toolInfo) => typeof eventDef.tool_name === 'function' ? eventDef.tool_name(toolInfo) : eventDef.tool_name;
const detect = (raw) => WINDSURF_SIGNATURE.every((f) => f in raw);
const normalize = (raw) => {
    const { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info } = raw;
    const eventDef = EVENT_MAP[agent_action_name];
    const ti = tool_info || {};
    const mappedHookEventName = eventDef ? eventDef.hook_event_name : agent_action_name;
    const mappedToolName = eventDef ? resolveToolName(eventDef, ti) : null;
    return {
        ide: IDE,
        event: (0, windsurf_1.lookupEvent)(mappedHookEventName),
        toolKind: (0, windsurf_1.lookupToolKind)(mappedToolName ?? ''),
        hook_event_name: mappedHookEventName,
        session_id: trajectory_id,
        execution_id: execution_id,
        tool_name: mappedToolName,
        tool_input: eventDef ? eventDef.buildToolInput(ti) : ti,
        file_path: (0, windsurf_1.getFilePath)(raw) ?? '',
        cwd: (0, windsurf_1.getCwd)(raw) ?? undefined,
        transcript_path: ti.transcript_path ?? undefined,
        _windsurf: { agent_action_name, execution_id, timestamp, model_name, tool_info: ti },
    };
};
const formatOutput = (canonical) => {
    const { hookSpecificOutput = {} } = canonical ?? {};
    const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
    const out = {};
    if (additionalContext) {
        out.additionalContext = additionalContext;
    }
    else if (permissionDecision === 'deny' && permissionDecisionReason) {
        out.additionalContext = permissionDecisionReason;
    }
    if (permissionDecision === 'deny')
        out._exitCode = 2;
    return out;
};
exports.windsurf = { name: 'windsurf', detect, normalize, formatOutput };
