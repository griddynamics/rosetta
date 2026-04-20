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
// Exports (for testability): detectIDE, normalize, formatOutput, readStdin

// --- Codex adapter ---
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Must be checked BEFORE claude-code (it's a superset).
const _CC_SIG = ['hook_event_name', 'tool_input', 'session_id'];
const _CODEX_EXTRA = ['model', 'turn_id'];

const CODEX = {
  name: 'codex',
  detect(raw) {
    return _CC_SIG.every((f) => f in raw) && _CODEX_EXTRA.every((f) => f in raw);
  },
  normalize(raw) { return raw; },
  formatOutput(canonical) { return canonical; },
};

// --- Cursor adapter ---
// Cursor shares hook_event_name + tool_input but uses conversation_id instead of session_id.
// hook_event_name uses camelCase ("postToolUse") — normalize() uppercases to PascalCase.
const _CURSOR_EXTRA = ['conversation_id', 'cursor_version'];

const CURSOR = {
  name: 'cursor',
  detect(raw) {
    return (
      ['hook_event_name', 'tool_input'].every((f) => f in raw) &&
      _CURSOR_EXTRA.every((f) => f in raw)
    );
  },
  normalize(raw) {
    const hook_event_name = raw.hook_event_name
      ? raw.hook_event_name.charAt(0).toUpperCase() + raw.hook_event_name.slice(1)
      : raw.hook_event_name;
    return { ...raw, hook_event_name, session_id: raw.conversation_id };
  },
  formatOutput(canonical) {
    const out = {};
    const hs = canonical.hookSpecificOutput || {};
    if (hs.additionalContext) out.additional_context = hs.additionalContext;
    if (hs.permissionDecision) out.permission = hs.permissionDecision;
    if (hs.permissionDecisionReason) out.user_message = hs.permissionDecisionReason;
    if (canonical.continue === false) out.permission = out.permission || 'deny';
    return out;
  },
};

// --- Claude Code adapter ---
// Canonical format: identity pass-through in both directions.
const CLAUDE_CODE = {
  name: 'claude-code',
  detect(raw) { return _CC_SIG.every((f) => f in raw); },
  normalize(raw) { return raw; },
  formatOutput(canonical) { return canonical; },
};

// --- Windsurf adapter ---
// Completely different input shape: { agent_action_name, trajectory_id, tool_info }
// 12 event types mapped to canonical hook_event_name + tool_name + tool_input.
const _WINDSURF_SIG = ['agent_action_name', 'trajectory_id', 'tool_info'];
const _WINDSURF_EVENT_MAP = {
  pre_read_code:   { hook_event_name: 'PreToolUse',  tool_name: 'Read',  buildToolInput: (ti) => ({ file_path: ti.file_path }) },
  post_read_code:  { hook_event_name: 'PostToolUse', tool_name: 'Read',  buildToolInput: (ti) => ({ file_path: ti.file_path }) },
  pre_write_code:  { hook_event_name: 'PreToolUse',  tool_name: 'Write', buildToolInput: (ti) => ({ file_path: ti.file_path }) },
  post_write_code: { hook_event_name: 'PostToolUse', tool_name: 'Write', buildToolInput: (ti) => ({ file_path: ti.file_path }) },
  pre_run_command: { hook_event_name: 'PreToolUse',  tool_name: 'Bash',  buildToolInput: (ti) => ({ command: ti.command_line }) },
  post_run_command:{ hook_event_name: 'PostToolUse', tool_name: 'Bash',  buildToolInput: (ti) => ({ command: ti.command_line }) },
  pre_mcp_tool_use:  { hook_event_name: 'PreToolUse',  tool_name: (ti) => ti.mcp_tool_name, buildToolInput: (ti) => ti.mcp_tool_arguments || {} },
  post_mcp_tool_use: { hook_event_name: 'PostToolUse', tool_name: (ti) => ti.mcp_tool_name, buildToolInput: (ti) => ti.mcp_tool_arguments || {} },
  pre_user_prompt:                    { hook_event_name: 'PrePromptSubmit', tool_name: null, buildToolInput: (ti) => ({ prompt: ti.user_prompt }) },
  post_cascade_response:              { hook_event_name: 'PostResponse',    tool_name: null, buildToolInput: (ti) => ({ response: ti.response }) },
  post_cascade_response_with_transcript: { hook_event_name: 'PostResponse', tool_name: null, buildToolInput: (ti) => ({ transcript_path: ti.transcript_path }) },
  post_setup_worktree: { hook_event_name: 'PostWorktree', tool_name: null, buildToolInput: (ti) => ({ worktree_path: ti.worktree_path, root_workspace_path: ti.root_workspace_path }) },
};

const WINDSURF = {
  name: 'windsurf',
  detect(raw) { return _WINDSURF_SIG.every((f) => f in raw); },
  normalize(raw) {
    const eventDef = _WINDSURF_EVENT_MAP[raw.agent_action_name];
    const ti = raw.tool_info || {};
    const hook_event_name = eventDef ? eventDef.hook_event_name : raw.agent_action_name;
    const tool_name = eventDef
      ? (typeof eventDef.tool_name === 'function' ? eventDef.tool_name(ti) : eventDef.tool_name)
      : null;
    const tool_input = eventDef ? eventDef.buildToolInput(ti) : ti;
    return {
      hook_event_name, session_id: raw.trajectory_id, tool_name, tool_input,
      cwd: ti.cwd || undefined,
      _windsurf: { agent_action_name: raw.agent_action_name, execution_id: raw.execution_id, timestamp: raw.timestamp, model_name: raw.model_name, tool_info: ti },
    };
  },
  formatOutput(canonical) {
    const out = {};
    const hs = canonical.hookSpecificOutput || {};
    if (hs.additionalContext) out.additionalContext = hs.additionalContext;
    if (hs.permissionDecision === 'deny') out._exitCode = 2;
    return out;
  },
};

// --- Copilot adapter ---
// Minimal schema: { timestamp, cwd, toolName, toolArgs }
// toolArgs is a JSON STRING — must be parsed.
const _COPILOT_SIG = ['toolName', 'timestamp', 'cwd'];

function _inferCopilotEvent(raw) {
  if ('toolName' in raw) return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
  if ('reason' in raw) return 'SessionEnd';
  if ('source' in raw || 'initialPrompt' in raw) return 'SessionStart';
  if ('prompt' in raw) return 'PrePromptSubmit';
  if ('error' in raw) return 'Error';
  return 'Unknown';
}

function _parseCopilotToolArgs(raw) {
  if (!raw.toolArgs) return {};
  try {
    const parsed = JSON.parse(raw.toolArgs);
    return typeof parsed === 'object' && parsed !== null ? parsed : { _raw: raw.toolArgs };
  } catch {
    return { _raw: raw.toolArgs };
  }
}

const COPILOT = {
  name: 'copilot',
  detect(raw) {
    return _COPILOT_SIG.every((f) => f in raw) && !('hook_event_name' in raw);
  },
  normalize(raw) {
    return {
      hook_event_name: _inferCopilotEvent(raw),
      session_id: undefined,
      tool_name: raw.toolName,
      tool_input: _parseCopilotToolArgs(raw),
      tool_use_id: undefined,
      cwd: raw.cwd,
      tool_response: raw.toolResult || undefined,
      _copilot: { timestamp: raw.timestamp, toolName: raw.toolName, toolArgs: raw.toolArgs, toolResult: raw.toolResult },
    };
  },
  formatOutput(canonical) {
    const out = {};
    const hs = canonical.hookSpecificOutput || {};
    if (hs.permissionDecision) out.permissionDecision = hs.permissionDecision;
    if (hs.permissionDecisionReason) out.permissionDecisionReason = hs.permissionDecisionReason;
    if (canonical.continue === false && !out.permissionDecision) out.permissionDecision = 'deny';
    return out;
  },
};

// --- Orchestrator ---

const ADAPTERS = [CODEX, CURSOR, CLAUDE_CODE, WINDSURF, COPILOT];

function detectIDE(rawInput) {
  if (rawInput === null || rawInput === undefined) {
    throw new Error('Invalid input: null or undefined');
  }
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    throw new Error('Invalid input: expected a plain object');
  }
  const adapter = ADAPTERS.find((a) => a.detect(rawInput));
  if (!adapter) {
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(rawInput))}`);
  }
  return adapter.name;
}

function normalize(rawInput) {
  const ide = detectIDE(rawInput);
  const adapter = ADAPTERS.find((a) => a.name === ide);
  return adapter.normalize(rawInput);
}

function formatOutput(canonicalOutput, ide) {
  const adapter = ADAPTERS.find((a) => a.name === ide);
  if (!adapter) return canonicalOutput;
  return adapter.formatOutput(canonicalOutput);
}

async function readStdin(stream = process.stdin) {
  return new Promise((resolve, reject) => {
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
}

module.exports = { readStdin, normalize, formatOutput, detectIDE };
