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

import { lookupToolKind, getFilePath } from '../runtime/ide-rows/copilot';
import type { SemanticEvent } from '../runtime/ide-registry';
import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const IDE = 'copilot' as const;
const COPILOT_SIGNATURE = ['toolName', 'timestamp', 'cwd'] as const;

// Copilot sends no explicit hook_event_name — infer semantic event from raw shape.
// PostToolUse/PreToolUse are null in EVENTS (copilot doesn't send event names for tools),
// so we derive them from the presence of toolResult.
const inferEvent = (raw: Record<string, unknown>): SemanticEvent | null => {
  if ('toolName' in raw) return 'toolResult' in raw ? 'PostToolUse' : 'PreToolUse';
  if ('source' in raw || 'initialPrompt' in raw) return 'SessionStart';
  if ('prompt' in raw) return 'PrePromptSubmit';
  return null;
};

const inferHookEventName = (raw: Record<string, unknown>): string => {
  const event = inferEvent(raw);
  if (event) return event;
  if ('reason' in raw) return 'SessionEnd';
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
    ide:             IDE,
    event:           inferEvent(raw),
    toolKind:        lookupToolKind(toolName as string),
    hook_event_name: inferHookEventName(raw),
    session_id:      undefined,
    tool_name:       toolName as string,
    tool_input:      parseToolArgs(raw),
    tool_use_id:     undefined,
    cwd:             cwd as string | undefined,
    tool_response:   toolResult ?? undefined,
    file_path:       getFilePath(raw) ?? '',
    _copilot:        { timestamp, toolName, toolArgs, toolResult },
  } as unknown as NormalizedInput;
};

const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { permissionDecision, permissionDecisionReason, additionalContext, hookEventName } = hookSpecificOutput;
  const out: Record<string, unknown> = {};
  if (permissionDecision) out.permissionDecision = permissionDecision;
  if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason;
  if (cont === false && !out.permissionDecision) out.permissionDecision = 'deny';
  if (additionalContext) out.hookSpecificOutput = { hookEventName, additionalContext };
  return out;
};

export const dedupKey = (raw: Record<string, unknown>, hookName: string): string | null => {
  if (!detect(raw)) return null; // VS Code CC-fallback shape — no dedup needed
  return `copilot:${hookName}:${raw.toolName as string}:${(raw.toolArgs as string) ?? ''}`;
};

export const copilot: IdeAdapter = { name: 'copilot', detect, normalize, formatOutput, dedupKey };
