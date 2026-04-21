// adapters/cursor.ts — Adapter for Cursor IDE
// Docs: https://cursor.com/docs/reference/hooks
//
// Cursor is very close to Claude Code — shares hook_event_name, tool_name, tool_input,
// tool_use_id, cwd — but replaces session_id with conversation_id and adds cursor-specific
// extras: generation_id, cursor_version, workspace_roots, user_email, transcript_path, duration.
//
// hook_event_name casing: Cursor uses camelCase ("postToolUse") vs CC PascalCase ("PostToolUse").
// normalize() uppercases the first letter to produce the canonical PascalCase form.

import type { NormalizedInput, CanonicalOutput } from '../adapter';

const CC_SIGNATURE = ['hook_event_name', 'tool_input'] as const;
const CURSOR_EXTRA = ['conversation_id', 'cursor_version'] as const;

const toPascalCase = (s: string): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

export const name = 'cursor';

export const detect = (raw: Record<string, unknown>): boolean =>
  CC_SIGNATURE.every((f) => f in raw) && CURSOR_EXTRA.every((f) => f in raw);

export const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const { hook_event_name, conversation_id, ...rest } = raw;
  return {
    ...rest,
    hook_event_name: toPascalCase(hook_event_name as string),
    session_id: conversation_id as string,
    conversation_id,
  } as unknown as NormalizedInput;
};

export const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  const { hookSpecificOutput = {}, continue: cont } = canonical ?? {};
  const { additionalContext, permissionDecision, permissionDecisionReason } = hookSpecificOutput;
  const out: Record<string, unknown> = {};
  if (additionalContext) out.additional_context = additionalContext;
  if (permissionDecision) out.permission = permissionDecision;
  if (permissionDecisionReason) out.user_message = permissionDecisionReason;
  if (cont === false) out.permission = out.permission ?? 'deny';
  return out;
};
