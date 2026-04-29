import type { SemanticEvent, SemanticKind } from '../ide-registry';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  SessionStart:    'SessionStart',
  PrePromptSubmit: 'userPromptSubmitted',
};

const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:        ['create_file'],
  edit:         ['replace_string_in_file'],
  'multi-edit': ['multi_replace_string_in_file'],
  create:       ['create_file'],
  replace:      ['replace_string_in_file', 'multi_replace_string_in_file'],
};

export const lookupEvent = (raw: string): SemanticEvent | null => {
  for (const [k, v] of Object.entries(EVENTS)) if (v === raw) return k as SemanticEvent;
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if ((v as readonly string[]).includes(raw)) return k;
  return null;
};

export const getFilePath = (raw: Record<string, unknown>): string | null => {
  const toolArgs = raw.toolArgs;
  if (!toolArgs) return null;
  try {
    const parsed = JSON.parse(toolArgs as string) as Record<string, unknown>;
    return (parsed?.filePath as string) ?? (parsed?.file_path as string) ?? null;
  } catch { return null; }
};

export const getCwd       = (raw: Record<string, unknown>): string | null => (raw.cwd as string) ?? null;
export const getSessionId = (_raw: Record<string, unknown>): string | null => null;
