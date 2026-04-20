'use strict';
// adapters/windsurf.js — Adapter for Windsurf (Codeium) Cascade IDE
// Docs: https://docs.windsurf.com/windsurf/cascade/hooks
//
// Windsurf has a completely different input shape:
//   { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info }
// All event data is nested inside tool_info with event-specific schemas.
//
// 12 event types are mapped to canonical hook_event_name + tool_name + tool_input.
// 4 events have no CC equivalent and use new canonical names (PrePromptSubmit, PostResponse, PostWorktree).

const WINDSURF_SIGNATURE = ['agent_action_name', 'trajectory_id', 'tool_info'];

// Maps Windsurf agent_action_name → { hook_event_name, tool_name, buildToolInput }
const EVENT_MAP = {
  pre_read_code: {
    hook_event_name: 'PreToolUse',
    tool_name: 'Read',
    buildToolInput: (ti) => ({ file_path: ti.file_path }),
  },
  post_read_code: {
    hook_event_name: 'PostToolUse',
    tool_name: 'Read',
    buildToolInput: (ti) => ({ file_path: ti.file_path }),
  },
  pre_write_code: {
    hook_event_name: 'PreToolUse',
    tool_name: 'Write',
    buildToolInput: (ti) => ({ file_path: ti.file_path }),
  },
  post_write_code: {
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    buildToolInput: (ti) => ({ file_path: ti.file_path }),
  },
  pre_run_command: {
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    buildToolInput: (ti) => ({ command: ti.command_line }),
  },
  post_run_command: {
    hook_event_name: 'PostToolUse',
    tool_name: 'Bash',
    buildToolInput: (ti) => ({ command: ti.command_line }),
  },
  pre_mcp_tool_use: {
    hook_event_name: 'PreToolUse',
    tool_name: (ti) => ti.mcp_tool_name,
    buildToolInput: (ti) => ti.mcp_tool_arguments || {},
  },
  post_mcp_tool_use: {
    hook_event_name: 'PostToolUse',
    tool_name: (ti) => ti.mcp_tool_name,
    buildToolInput: (ti) => ti.mcp_tool_arguments || {},
  },
  // Events without CC equivalent — use new canonical names
  pre_user_prompt: {
    hook_event_name: 'PrePromptSubmit',
    tool_name: null,
    buildToolInput: (ti) => ({ prompt: ti.user_prompt }),
  },
  post_cascade_response: {
    hook_event_name: 'PostResponse',
    tool_name: null,
    buildToolInput: (ti) => ({ response: ti.response }),
  },
  post_cascade_response_with_transcript: {
    hook_event_name: 'PostResponse',
    tool_name: null,
    buildToolInput: (ti) => ({ transcript_path: ti.transcript_path }),
  },
  post_setup_worktree: {
    hook_event_name: 'PostWorktree',
    tool_name: null,
    buildToolInput: (ti) => ({
      worktree_path: ti.worktree_path,
      root_workspace_path: ti.root_workspace_path,
    }),
  },
};

module.exports = {
  name: 'windsurf',

  detect(raw) {
    return WINDSURF_SIGNATURE.every((f) => f in raw);
  },

  normalize(raw) {
    const eventDef = EVENT_MAP[raw.agent_action_name];
    const ti = raw.tool_info || {};

    const hook_event_name = eventDef
      ? eventDef.hook_event_name
      : raw.agent_action_name; // unknown events: pass through as-is

    const tool_name = eventDef
      ? (typeof eventDef.tool_name === 'function' ? eventDef.tool_name(ti) : eventDef.tool_name)
      : null;

    const tool_input = eventDef ? eventDef.buildToolInput(ti) : ti;

    return {
      // Canonical fields
      hook_event_name,
      session_id: raw.trajectory_id,
      tool_name,
      tool_input,
      cwd: ti.cwd || undefined,
      // Windsurf-specific extras preserved
      _windsurf: {
        agent_action_name: raw.agent_action_name,
        execution_id: raw.execution_id,
        timestamp: raw.timestamp,
        model_name: raw.model_name,
        tool_info: ti,
      },
    };
  },

  formatOutput(canonical) {
    // Windsurf output is exit-code based for pre-hooks (exit 2 = block).
    // For PostToolUse hooks, stdout output is shown when show_output: true.
    // Return additionalContext as a plain string for stdout, wrapped in standard shape.
    const hs = canonical.hookSpecificOutput || {};
    const out = {};

    if (hs.additionalContext) {
      out.additionalContext = hs.additionalContext;
    }
    if (hs.permissionDecision === 'deny') {
      out._exitCode = 2;
    }

    return out;
  },
};
