// adapters/windsurf.ts — Adapter for Windsurf (Codeium) Cascade IDE
// Docs: https://docs.windsurf.com/windsurf/cascade/hooks
//
// Windsurf has a completely different input shape:
//   { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info }
// All event data is nested inside tool_info with event-specific schemas.
//
// 12 event types are mapped to canonical hook_event_name + tool_name + tool_input.
// 4 events have no CC equivalent and use new canonical names (PrePromptSubmit, PostResponse, PostWorktree).

import type { NormalizedInput, CanonicalOutput } from '../adapter';

const WINDSURF_SIGNATURE = ['agent_action_name', 'trajectory_id', 'tool_info'] as const;

type ToolNameResolver =
  | string
  | null
  | ((toolInfo: Record<string, unknown>) => string | null);

interface EventDef {
  hook_event_name: string;
  tool_name: ToolNameResolver;
  buildToolInput: (toolInfo: Record<string, unknown>) => Record<string, unknown>;
}

// Maps Windsurf agent_action_name → { hook_event_name, tool_name, buildToolInput }
const EVENT_MAP: Record<string, EventDef> = {
  pre_read_code:    { hook_event_name: 'PreToolUse',  tool_name: 'Read',  buildToolInput: ({ file_path }) => ({ file_path }) },
  post_read_code:   { hook_event_name: 'PostToolUse', tool_name: 'Read',  buildToolInput: ({ file_path }) => ({ file_path }) },
  pre_write_code:   { hook_event_name: 'PreToolUse',  tool_name: 'Write', buildToolInput: ({ file_path }) => ({ file_path }) },
  post_write_code:  { hook_event_name: 'PostToolUse', tool_name: 'Write', buildToolInput: ({ file_path }) => ({ file_path }) },
  pre_run_command:  { hook_event_name: 'PreToolUse',  tool_name: 'Bash',  buildToolInput: ({ command_line }) => ({ command: command_line }) },
  post_run_command: { hook_event_name: 'PostToolUse', tool_name: 'Bash',  buildToolInput: ({ command_line }) => ({ command: command_line }) },
  pre_mcp_tool_use:  { hook_event_name: 'PreToolUse',  tool_name: ({ mcp_tool_name }) => mcp_tool_name as string, buildToolInput: ({ mcp_tool_arguments }) => (mcp_tool_arguments as Record<string, unknown>) || {} },
  post_mcp_tool_use: { hook_event_name: 'PostToolUse', tool_name: ({ mcp_tool_name }) => mcp_tool_name as string, buildToolInput: ({ mcp_tool_arguments }) => (mcp_tool_arguments as Record<string, unknown>) || {} },
  // Events without CC equivalent — use new canonical names
  pre_user_prompt:                       { hook_event_name: 'PrePromptSubmit', tool_name: null, buildToolInput: ({ user_prompt }) => ({ prompt: user_prompt }) },
  post_cascade_response:                 { hook_event_name: 'PostResponse',    tool_name: null, buildToolInput: ({ response }) => ({ response }) },
  post_cascade_response_with_transcript: { hook_event_name: 'PostResponse',    tool_name: null, buildToolInput: ({ transcript_path }) => ({ transcript_path }) },
  post_setup_worktree:                   { hook_event_name: 'PostWorktree',    tool_name: null, buildToolInput: ({ worktree_path, root_workspace_path }) => ({ worktree_path, root_workspace_path }) },
};

const resolveToolName = (eventDef: EventDef, toolInfo: Record<string, unknown>): string | null =>
  typeof eventDef.tool_name === 'function' ? eventDef.tool_name(toolInfo) : eventDef.tool_name;

export const name = 'windsurf';

export const detect = (raw: Record<string, unknown>): boolean =>
  WINDSURF_SIGNATURE.every((f) => f in raw);

export const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info } = raw;
  const eventDef = EVENT_MAP[agent_action_name as string];
  const ti = (tool_info as Record<string, unknown>) || {};

  return {
    hook_event_name: eventDef ? eventDef.hook_event_name : (agent_action_name as string),
    session_id: trajectory_id as string,
    tool_name: eventDef ? resolveToolName(eventDef, ti) : null,
    tool_input: eventDef ? eventDef.buildToolInput(ti) : ti,
    cwd: (ti.cwd as string) ?? undefined,
    _windsurf: { agent_action_name, execution_id, timestamp, model_name, tool_info: ti },
  } as unknown as NormalizedInput;
};

export const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  const { hookSpecificOutput = {} } = canonical ?? {};
  const { additionalContext, permissionDecision } = hookSpecificOutput;
  const out: Record<string, unknown> = {};
  if (additionalContext) out.additionalContext = additionalContext;
  if (permissionDecision === 'deny') out._exitCode = 2;
  return out;
};
