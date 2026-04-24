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

import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const COPILOT_SIGNATURE = ['toolName', 'timestamp', 'cwd'] as const;

const inferHookEventName = (raw: Record<string, unknown>): string => {
  if ('toolName' in raw) return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
  if ('reason' in raw) return 'SessionEnd';
  if ('source' in raw || 'initialPrompt' in raw) return 'SessionStart';
  if ('prompt' in raw) return 'PrePromptSubmit';
  if ('error' in raw) return 'Error';
  return 'Unknown';
};

const parseToolArgs = (raw: Record<string, unknown>): Record<string, unknown> => {
  const { toolArgs } = raw;
  if (!toolArgs) return {};
  try {
    const parsed = JSON.parse(toolArgs as string) as unknown;
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : { _raw: toolArgs };
  } catch {
    return { _raw: toolArgs };
  }
};

const detect = (raw: Record<string, unknown>): boolean =>
  COPILOT_SIGNATURE.every((f) => f in raw) && !('hook_event_name' in raw);

const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const { toolName, cwd, toolArgs, toolResult, timestamp } = raw;
  return {
    hook_event_name: inferHookEventName(raw),
    session_id: undefined,
    tool_name: toolName as string,
    tool_input: parseToolArgs(raw),
    tool_use_id: undefined,
    cwd: cwd as string | undefined,
    tool_response: toolResult ?? undefined,
    _copilot: { timestamp, toolName, toolArgs, toolResult },
  } as unknown as NormalizedInput;
};

const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { permissionDecision, permissionDecisionReason } = hookSpecificOutput;
  const out: Record<string, unknown> = {};
  if (permissionDecision) out.permissionDecision = permissionDecision;
  if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason;
  if (cont === false && !out.permissionDecision) out.permissionDecision = 'deny';
  return out;
};

export const copilot: IdeAdapter = { name: 'copilot', detect, normalize, formatOutput };
