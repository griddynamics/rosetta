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

/**
 * Infer canonical hook_event_name from the Copilot event shape.
 * Copilot does not send hook_event_name; we derive it from fields present.
 */
function inferHookEventName(raw) {
  if ('toolName' in raw) {
    return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
  }
  if ('reason' in raw) return 'SessionEnd';
  if ('source' in raw || 'initialPrompt' in raw) return 'SessionStart';
  if ('prompt' in raw) return 'PrePromptSubmit';
  if ('error' in raw) return 'Error';
  return 'Unknown';
}

/**
 * Safely parse toolArgs — it arrives as a JSON string.
 * Returns empty object on failure rather than throwing.
 */
function parseToolArgs(raw) {
  if (!raw.toolArgs) return {};
  try {
    const parsed = JSON.parse(raw.toolArgs);
    return typeof parsed === 'object' && parsed !== null ? parsed : { _raw: raw.toolArgs };
  } catch {
    return { _raw: raw.toolArgs };
  }
}

module.exports = {
  name: 'copilot',

  detect(raw) {
    // Copilot is the most minimal shape. Require toolName (camelCase) + timestamp + cwd.
    // Also ensure hook_event_name is NOT present (to avoid matching CC).
    return (
      COPILOT_SIGNATURE.every((f) => f in raw) &&
      !('hook_event_name' in raw)
    );
  },

  normalize(raw) {
    const hook_event_name = inferHookEventName(raw);
    const tool_input = parseToolArgs(raw);

    return {
      // Canonical fields
      hook_event_name,
      session_id: undefined,       // Copilot has no session_id
      tool_name: raw.toolName,
      tool_input,
      tool_use_id: undefined,
      cwd: raw.cwd,
      // Preserve result if present
      tool_response: raw.toolResult || undefined,
      // Copilot-specific extras preserved
      _copilot: {
        timestamp: raw.timestamp,
        toolName: raw.toolName,
        toolArgs: raw.toolArgs,
        toolResult: raw.toolResult,
      },
    };
  },

  formatOutput(canonical) {
    // Copilot only processes preToolUse output: { permissionDecision, permissionDecisionReason }
    // postToolUse output is ignored.
    const hs = canonical.hookSpecificOutput || {};
    const out = {};

    if (hs.permissionDecision) {
      out.permissionDecision = hs.permissionDecision;
    }
    if (hs.permissionDecisionReason) {
      out.permissionDecisionReason = hs.permissionDecisionReason;
    }
    if (canonical.continue === false && !out.permissionDecision) {
      out.permissionDecision = 'deny';
    }

    return out;
  },
};
