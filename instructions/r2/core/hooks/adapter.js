'use strict';
// adapter.js — Self-contained Rosetta hook adapter for all supported IDEs
//
// Detects IDE from input shape, normalizes to Claude Code canonical format,
// and formats output back to the IDE-specific shape.
//
// Detection order (most specific → least specific):
//   1. codex        — CC fields + model + turn_id
//   2. cursor       — CC fields + conversation_id + cursor_version
//   3. claude-code  — CC fields (hook_event_name + tool_input + session_id)
//   4. windsurf     — agent_action_name + trajectory_id + tool_info
//   5. copilot      — toolName + timestamp + cwd (no hook_event_name)
//
// Source: hooks/adapter.js + hooks/adapters/*.js (built into this single file)
// Public API:
//   - readStdin, normalize, formatOutput — used by hook entrypoints (prod)
//   - detectIDE — exposed for tests; prod callers should prefer normalize()

// --- Codex adapter ---
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Must be checked BEFORE claude-code (it's a superset).
const _CC_SIG = ['hook_event_name', 'tool_input', 'session_id'];
const _CODEX_EXTRA = ['model', 'turn_id'];

const CODEX = {
  name: 'codex',
  detect: (raw) =>
    _CC_SIG.every((f) => f in raw) && _CODEX_EXTRA.every((f) => f in raw),
  normalize: (raw) => raw,
  formatOutput: (canonical) => canonical,
};

// --- Cursor adapter ---
// Cursor shares hook_event_name + tool_input but uses conversation_id instead of session_id.
// hook_event_name uses camelCase ("postToolUse") — normalize() uppercases to PascalCase.
const _CURSOR_EXTRA = ['conversation_id', 'cursor_version'];
const _toPascalCase = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1) : name;

const CURSOR = {
  name: 'cursor',

  detect: (raw) =>
    ['hook_event_name', 'tool_input'].every((f) => f in raw) &&
    _CURSOR_EXTRA.every((f) => f in raw),

  normalize: ({ hook_event_name, conversation_id, ...rest }) => ({
    ...rest,
    hook_event_name: _toPascalCase(hook_event_name),
    session_id: conversation_id,
    conversation_id,
  }),

  formatOutput: ({ hookSpecificOutput = {}, continue: cont } = {}) => {
    const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
    const out = {};
    if (additionalContext) out.additional_context = additionalContext;
    if (permissionDecision) out.permission = permissionDecision;
    if (permissionDecisionReason) out.user_message = permissionDecisionReason;
    if (cont === false) out.permission = out.permission || 'deny';
    return out;
  },
};

// --- Claude Code adapter ---
// Canonical format: identity pass-through in both directions.
const CLAUDE_CODE = {
  name: 'claude-code',
  detect: (raw) => _CC_SIG.every((f) => f in raw),
  normalize: (raw) => raw,
  formatOutput: (canonical) => canonical,
};

// --- Windsurf adapter ---
// Completely different input shape: { agent_action_name, trajectory_id, tool_info }
// 12 event types mapped to canonical hook_event_name + tool_name + tool_input.
const _WINDSURF_SIG = ['agent_action_name', 'trajectory_id', 'tool_info'];
const _WINDSURF_EVENT_MAP = {
  pre_read_code:    { hook_event_name: 'PreToolUse',  tool_name: 'Read',  buildToolInput: ({ file_path }) => ({ file_path }) },
  post_read_code:   { hook_event_name: 'PostToolUse', tool_name: 'Read',  buildToolInput: ({ file_path }) => ({ file_path }) },
  pre_write_code:   { hook_event_name: 'PreToolUse',  tool_name: 'Write', buildToolInput: ({ file_path }) => ({ file_path }) },
  post_write_code:  { hook_event_name: 'PostToolUse', tool_name: 'Write', buildToolInput: ({ file_path }) => ({ file_path }) },
  pre_run_command:  { hook_event_name: 'PreToolUse',  tool_name: 'Bash',  buildToolInput: ({ command_line }) => ({ command: command_line }) },
  post_run_command: { hook_event_name: 'PostToolUse', tool_name: 'Bash',  buildToolInput: ({ command_line }) => ({ command: command_line }) },
  pre_mcp_tool_use:  { hook_event_name: 'PreToolUse',  tool_name: ({ mcp_tool_name }) => mcp_tool_name, buildToolInput: ({ mcp_tool_arguments }) => mcp_tool_arguments || {} },
  post_mcp_tool_use: { hook_event_name: 'PostToolUse', tool_name: ({ mcp_tool_name }) => mcp_tool_name, buildToolInput: ({ mcp_tool_arguments }) => mcp_tool_arguments || {} },
  pre_user_prompt:                       { hook_event_name: 'PrePromptSubmit', tool_name: null, buildToolInput: ({ user_prompt }) => ({ prompt: user_prompt }) },
  post_cascade_response:                 { hook_event_name: 'PostResponse',    tool_name: null, buildToolInput: ({ response }) => ({ response }) },
  post_cascade_response_with_transcript: { hook_event_name: 'PostResponse',    tool_name: null, buildToolInput: ({ transcript_path }) => ({ transcript_path }) },
  post_setup_worktree:                   { hook_event_name: 'PostWorktree',    tool_name: null, buildToolInput: ({ worktree_path, root_workspace_path }) => ({ worktree_path, root_workspace_path }) },
};

const _resolveWindsurfToolName = (eventDef, toolInfo) =>
  typeof eventDef.tool_name === 'function' ? eventDef.tool_name(toolInfo) : eventDef.tool_name;

const WINDSURF = {
  name: 'windsurf',

  detect: (raw) => _WINDSURF_SIG.every((f) => f in raw),

  normalize: (raw) => {
    const { agent_action_name, trajectory_id, execution_id, timestamp, model_name, tool_info } = raw;
    const eventDef = _WINDSURF_EVENT_MAP[agent_action_name];
    const ti = tool_info || {};

    return {
      hook_event_name: eventDef ? eventDef.hook_event_name : agent_action_name,
      session_id: trajectory_id,
      tool_name: eventDef ? _resolveWindsurfToolName(eventDef, ti) : null,
      tool_input: eventDef ? eventDef.buildToolInput(ti) : ti,
      cwd: ti.cwd || undefined,
      _windsurf: { agent_action_name, execution_id, timestamp, model_name, tool_info: ti },
    };
  },

  formatOutput: ({ hookSpecificOutput = {} } = {}) => {
    const { additionalContext, permissionDecision } = hookSpecificOutput;
    const out = {};
    if (additionalContext) out.additionalContext = additionalContext;
    if (permissionDecision === 'deny') out._exitCode = 2;
    return out;
  },
};

// --- Copilot adapter ---
// Minimal schema: { timestamp, cwd, toolName, toolArgs }
// toolArgs is a JSON STRING — must be parsed.
const _COPILOT_SIG = ['toolName', 'timestamp', 'cwd'];

const _inferCopilotEvent = (raw) => {
  if ('toolName' in raw) return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
  if ('reason' in raw) return 'SessionEnd';
  if ('source' in raw || 'initialPrompt' in raw) return 'SessionStart';
  if ('prompt' in raw) return 'PrePromptSubmit';
  if ('error' in raw) return 'Error';
  return 'Unknown';
};

const _parseCopilotToolArgs = ({ toolArgs }) => {
  if (!toolArgs) return {};
  try {
    const parsed = JSON.parse(toolArgs);
    return typeof parsed === 'object' && parsed !== null ? parsed : { _raw: toolArgs };
  } catch {
    return { _raw: toolArgs };
  }
};

const COPILOT = {
  name: 'copilot',

  detect: (raw) =>
    _COPILOT_SIG.every((f) => f in raw) && !('hook_event_name' in raw),

  normalize: (raw) => {
    const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
    return {
      hook_event_name: _inferCopilotEvent(raw),
      session_id: undefined,
      tool_name: toolName,
      tool_input: _parseCopilotToolArgs(raw),
      tool_use_id: undefined,
      cwd,
      tool_response: toolResult || undefined,
      _copilot: { timestamp, toolName, toolArgs, toolResult },
    };
  },

  formatOutput: ({ hookSpecificOutput = {}, continue: cont } = {}) => {
    const { permissionDecision, permissionDecisionReason } = hookSpecificOutput;
    const out = {};
    if (permissionDecision) out.permissionDecision = permissionDecision;
    if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason;
    if (cont === false && !out.permissionDecision) out.permissionDecision = 'deny';
    return out;
  },
};

// --- Orchestrator ---

const ADAPTERS = {
  codex: CODEX,
  cursor: CURSOR,
  'claude-code': CLAUDE_CODE,
  windsurf: WINDSURF,
  copilot: COPILOT,
};

// Detection is an ordered chain — a superset like codex must match before
// claude-code, so this order is load-bearing and not derived from Object.keys.
const DETECTION_ORDER = ['codex', 'cursor', 'claude-code', 'windsurf', 'copilot'];

const detectIDE = (rawInput) => {
  if (rawInput === null || rawInput === undefined) {
    throw new Error('Invalid input: null or undefined');
  }
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    throw new Error('Invalid input: expected a plain object');
  }
  const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(rawInput));
  if (!ide) {
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(rawInput))}`);
  }
  return ide;
};

const normalize = (rawInput) => ADAPTERS[detectIDE(rawInput)].normalize(rawInput);

const formatOutput = (canonicalOutput, ide) => {
  const adapter = ADAPTERS[ide];
  return adapter ? adapter.formatOutput(canonicalOutput) : canonicalOutput;
};

const readStdin = (stream = process.stdin) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(String(chunk)));
    stream.on('end', () => {
      const raw = chunks.join('').trim();
      if (!raw) return reject(new Error('Invalid input: empty stdin'));
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`JSON parse error: ${err.message}`));
      }
    });
    stream.on('error', reject);
  });

module.exports = { readStdin, normalize, formatOutput, detectIDE };
