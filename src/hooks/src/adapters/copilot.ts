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

import { lookupEvent, lookupToolKind, getFilePath } from '../runtime/ide-rows/copilot';
import type { SemanticEvent } from '../runtime/ide-registry';
import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const IDE = 'copilot' as const;

const rawToolName = (raw: Record<string, unknown>): string =>
  ((raw.tool_name ?? raw.toolName) as string) || '';

// Copilot's camelCase fire sends no explicit hook_event_name — infer semantic event from
// raw shape. The snake_case fire (VS Code + CLI PascalCase) DOES send hook_event_name, but
// PreToolUse still needs tool-kind-based PreRead reclassification either way — PostToolUse
// on a read-kind tool must stay PostToolUse (a prior version returned PreRead unconditionally
// once a read-kind tool matched, before checking Pre/Post at all, which made read-once fire a
// second, spurious time on every completed read — see hooks-verify.md).
const inferEvent = (raw: Record<string, unknown>): SemanticEvent | null => {
  const explicit = raw.hook_event_name as string | undefined;
  const toolName = rawToolName(raw);
  if (toolName) {
    const hasResult = 'toolResult' in raw || 'tool_result' in raw || 'tool_response' in raw;
    const isPost = explicit === 'PostToolUse' || (explicit === undefined && hasResult);
    if (isPost) return 'PostToolUse';
    return lookupToolKind(toolName) === 'read' ? 'PreRead' : 'PreToolUse';
  }
  if (explicit === 'SessionStart' || 'source' in raw || 'initialPrompt' in raw || 'initial_prompt' in raw) return 'SessionStart';
  if (explicit === 'SessionEnd') return 'SessionEnd';
  if (explicit === 'PreCompact' || 'trigger' in raw || 'customInstructions' in raw || 'custom_instructions' in raw) return 'PreCompact';
  if ('prompt' in raw) return 'PrePromptSubmit';
  if ('reason' in raw) return 'SessionEnd';
  // Registry-driven fallback for any explicit event the heuristics above don't special-case — most
  // importantly `Stop` (real payloads carry hook_event_name "Stop"; the registry maps Stop→'Stop').
  // Without this, a real Stop normalized to event:null despite the event being present and known
  // (docs/hooks-verify.md OI-8). `SubagentStop` stays null by design (intentionally not in the registry).
  if (explicit) return lookupEvent(explicit);
  return null;
};

const inferHookEventName = (raw: Record<string, unknown>): string => {
  const explicit = raw.hook_event_name as string | undefined;
  if (explicit) return explicit;
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
    const parsed = typeof toolArgs === 'string' ? JSON.parse(toolArgs) as unknown : toolArgs;
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : { _raw: toolArgs };
  } catch {
    return { _raw: toolArgs };
  }
};

const detect = (raw: Record<string, unknown>): boolean =>
  !('hook_event_name' in raw) &&
  ('timestamp' in raw) &&
  ('cwd' in raw) &&
  inferEvent(raw) !== null;

const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const { cwd, timestamp, toolArgs, toolResult } = raw;
  const normalizedToolName = rawToolName(raw);
  const toolInput = (raw.tool_input as Record<string, unknown> | undefined) ?? parseToolArgs(raw);
  // tool_response (string, VS Code) / tool_result (object snake, CLI) / toolResult (object camel, CLI).
  const toolResponse = raw.tool_response ?? raw.tool_result ?? toolResult ?? undefined;
  return {
    ide:             IDE,
    event:           inferEvent(raw),
    toolKind:        normalizedToolName ? lookupToolKind(normalizedToolName) : null,
    hook_event_name: inferHookEventName(raw),
    session_id:      ((raw.session_id as string) ?? (raw.sessionId as string)) || undefined,
    tool_name:       normalizedToolName || undefined,
    tool_input:      toolInput,
    tool_use_id:     (raw.tool_use_id as string) || undefined,
    cwd:             cwd as string | undefined,
    tool_response:   toolResponse,
    file_path:       getFilePath(raw) ?? '',
    source:          raw.source as string | undefined,
    reason:          raw.reason as string | undefined,
    trigger:         raw.trigger as string | undefined,
    transcript_path: ((raw.transcript_path as string) ?? (raw.transcriptPath as string)) || undefined,
    _copilot:        { timestamp, toolName: normalizedToolName || undefined, toolArgs, toolResult },
  } as unknown as NormalizedInput;
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
const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { permissionDecision, permissionDecisionReason, additionalContext, hookEventName } = hookSpecificOutput;
  const resolvedDecision = permissionDecision ?? (cont === false ? 'deny' : undefined);
  const out: Record<string, unknown> = {};
  if (resolvedDecision) out.permissionDecision = resolvedDecision;
  if (permissionDecisionReason) out.permissionDecisionReason = permissionDecisionReason;
  if (additionalContext) out.additionalContext = additionalContext;

  if (resolvedDecision || permissionDecisionReason || additionalContext) {
    const nested: Record<string, unknown> = {};
    if (hookEventName) nested.hookEventName = hookEventName;
    if (resolvedDecision) nested.permissionDecision = resolvedDecision;
    if (permissionDecisionReason) nested.permissionDecisionReason = permissionDecisionReason;
    if (additionalContext) nested.additionalContext = additionalContext;
    out.hookSpecificOutput = nested;
  }
  return out;
};

export const copilot: IdeAdapter = { name: 'copilot', detect, normalize, formatOutput };
