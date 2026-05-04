import type { SemanticEvent, SemanticKind } from '../ide-registry';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PostToolUse: 'PostToolUse', PreToolUse: 'PreToolUse',
};

// Matches "*** (Update|Add|Create) File: <path>" in apply_patch command strings
const PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;

const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:   ['Write', 'apply_patch', 'functions.apply_patch'],
  edit:    ['apply_patch', 'functions.apply_patch'],
  create:  ['Write', 'apply_patch', 'functions.apply_patch'],
  replace: ['apply_patch', 'functions.apply_patch'],
  patch:   ['apply_patch', 'functions.apply_patch'],
  bash:    ['Bash', 'shell'],
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
  const tool = (raw.tool_name as string) ?? '';
  if (tool === 'apply_patch' || tool === 'functions.apply_patch') {
    const cmd = ((raw.tool_input as Record<string, unknown>)?.command as string) ?? '';
    const match = PATCH_FILE_RE.exec(cmd);
    return match?.[1]?.trim() ?? null;
  }
  return ((raw.tool_input as Record<string, unknown>)?.file_path as string) ?? null;
};

export const getCwd       = (raw: Record<string, unknown>): string | null => (raw.cwd as string) ?? null;
export const getSessionId = (raw: Record<string, unknown>): string | null => (raw.session_id as string) ?? null;
