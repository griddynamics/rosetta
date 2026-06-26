// adapters/cursor.ts — Adapter for Cursor IDE
// Docs: https://cursor.com/docs/reference/hooks
//
// Cursor is very close to Claude Code — shares hook_event_name, tool_name, tool_input,
// tool_use_id, cwd — but replaces session_id with conversation_id and adds cursor-specific
// extras: generation_id, cursor_version, workspace_roots, user_email, transcript_path, duration.
//
// hook_event_name casing: Cursor uses camelCase ("postToolUse") vs CC PascalCase ("PostToolUse").
// normalize() derives the semantic event via registry (which handles the casing difference).

import { lookupEvent, lookupToolKind, getFilePath, getCwd } from '../runtime/ide-rows/cursor';
import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const IDE = 'cursor' as const;
const CURSOR_SIGNATURE = ['hook_event_name', 'cursor_version'] as const;

const toPascalCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

const detect = (raw: Record<string, unknown>): boolean =>
  CURSOR_SIGNATURE.every((f) => f in raw);

const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const { hook_event_name, conversation_id, ...rest } = raw;
  const rawEventName = hook_event_name as string;
  const baseEvent = lookupEvent(rawEventName);
  const toolKind = lookupToolKind((raw.tool_name as string) ?? '');
  return {
    ...rest,
    ide:          IDE,
    event:        baseEvent,
    toolKind,
    hook_event_name: baseEvent === 'PreRead' ? 'PreRead' : toPascalCase(rawEventName),
    session_id:   ((conversation_id as string) ?? (raw.session_id as string)) as string | undefined,
    conversation_id,
    file_path:    getFilePath(raw) ?? '',
    cwd:          getCwd(raw) ?? undefined,
  } as unknown as NormalizedInput;
};

const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
  const out: Record<string, unknown> = {};
  if (additionalContext) out.additional_context = additionalContext;
  if (permissionDecision) out.permission = permissionDecision;
  if (permissionDecisionReason) out.user_message = permissionDecisionReason;
  if (cont === false) out.permission = out.permission ?? 'deny';
  return out;
};

export const cursor: IdeAdapter = { name: 'cursor', detect, normalize, formatOutput };
