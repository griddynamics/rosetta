'use strict';
// adapters/copilot.js — Adapter for GitHub Copilot CLI
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

const COPILOT_SIGNATURE = ['toolName', 'timestamp', 'cwd'];

// Infer canonical hook_event_name from the Copilot event shape.
// Copilot does not send hook_event_name; we derive it from fields present.
const inferHookEventName = (raw) => {
  if ('toolName' in raw) return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
  if ('reason' in raw) return 'SessionEnd';
  if ('source' in raw || 'initialPrompt' in raw) return 'SessionStart';
  if ('prompt' in raw) return 'PrePromptSubmit';
  if ('error' in raw) return 'Error';
  return 'Unknown';
};

// Safely parse toolArgs — it arrives as a JSON string.
// Returns empty object on failure rather than throwing.
const parseToolArgs = ({ toolArgs }) => {
  if (!toolArgs) return {};
  try {
    const parsed = JSON.parse(toolArgs);
    return typeof parsed === 'object' && parsed !== null ? parsed : { _raw: toolArgs };
  } catch {
    return { _raw: toolArgs };
  }
};

module.exports = {
  name: 'copilot',

  // Require the Copilot minimal signature AND the absence of hook_event_name
  // (to avoid matching Claude Code shapes).
  detect: (raw) =>
    COPILOT_SIGNATURE.every((f) => f in raw) && !('hook_event_name' in raw),

  normalize: (raw) => {
    const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
    return {
      hook_event_name: inferHookEventName(raw),
      session_id: undefined,       // Copilot has no session_id
      tool_name: toolName,
      tool_input: parseToolArgs(raw),
      tool_use_id: undefined,
      cwd,
      tool_response: toolResult || undefined,
      _copilot: { timestamp, toolName, toolArgs, toolResult },
    };
  },

  // Copilot only consumes preToolUse output: { permissionDecision, permissionDecisionReason }
  // PostToolUse output is ignored.
  formatOutput: ({ hookSpecificOutput = {}, continue: cont } = {}) => {
    const { permissionDecision, permissionDecisionReason } = hookSpecificOutput;
    const out = {};
    if (permissionDecision) out.permissionDecision = permissionDecision;
    if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason;
    if (cont === false && !out.permissionDecision) out.permissionDecision = 'deny';
    return out;
  },
};
