import type { SemanticEvent, SemanticKind } from '../ide-registry';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PostToolUse:     'PostToolUse',
  PreToolUse:      'PreToolUse',
  PrePromptSubmit: 'PrePromptSubmit',
};

const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:   ['Write'],
  edit:    ['Write'],
  create:  ['Write'],
  replace: ['Write'],
  bash:    ['Bash'],
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

export const getFilePath  = (raw: Record<string, unknown>): string | null =>
  ((raw.tool_info as Record<string, unknown>)?.file_path as string) ?? null;
export const getCwd       = (raw: Record<string, unknown>): string | null =>
  ((raw.tool_info as Record<string, unknown>)?.cwd as string) ?? null;
export const getSessionId = (raw: Record<string, unknown>): string | null =>
  (raw.trajectory_id as string) ?? null;
