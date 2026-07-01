import type { SemanticEvent, SemanticKind } from '../ide-registry';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PostToolUse:     'postToolUse',
  PreToolUse:      'preToolUse',
  SessionStart:    'sessionStart',
  PrePromptSubmit: 'userPromptSubmitted',
};

const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:   ['Write'],
  edit:    ['Edit'],
  create:  ['Write'],
  replace: ['Edit'],
  // Cursor runs shell commands via a tool named `Shell` (Claude Code uses `Bash`).
  // Both must map to the `bash` kind or the dangerous-actions guard never fires in Cursor.
  bash:    ['Bash', 'Shell'],
  read:    ['Read'],
};

export const lookupEvent = (raw: string): SemanticEvent | null => {
  for (const [k, v] of Object.entries(EVENTS)) if (v === raw) return k as SemanticEvent;
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if (v.includes(raw)) return k;
  return null;
};

export const getFilePath = (raw: Record<string, unknown>): string | null => {
  const ti = (raw.tool_input as Record<string, unknown>) ?? {};
  return (ti.file_path as string) ?? (ti.filePath as string) ?? (ti.path as string) ?? null;
};

export const getCwd       = (raw: Record<string, unknown>): string | null => (raw.cwd as string) ?? null;
export const getSessionId = (raw: Record<string, unknown>): string | null => (raw.conversation_id as string) ?? null;
