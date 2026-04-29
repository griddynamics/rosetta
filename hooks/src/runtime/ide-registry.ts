export type IdeName = 'claude-code' | 'codex' | 'cursor' | 'windsurf' | 'copilot';
export type IdeMap<T> = Record<IdeName, T | null>;

export const EVENTS = {
  PostToolUse:     { 'claude-code': 'PostToolUse', 'codex': 'PostToolUse', 'cursor': 'postToolUse',          'windsurf': 'PostToolUse',      'copilot': null },
  PreToolUse:      { 'claude-code': 'PreToolUse',  'codex': 'PreToolUse',  'cursor': 'preToolUse',           'windsurf': 'PreToolUse',       'copilot': null },
  SessionStart:    { 'claude-code': 'SessionStart', 'codex': null,          'cursor': 'sessionStart',         'windsurf': null,               'copilot': 'SessionStart' },
  PrePromptSubmit: { 'claude-code': null,           'codex': null,          'cursor': 'userPromptSubmitted',  'windsurf': 'PrePromptSubmit',  'copilot': 'userPromptSubmitted' },
} as const satisfies Record<string, IdeMap<string>>;

export type SemanticEvent = keyof typeof EVENTS;

export const reverseLookupEvent = (ide: IdeName, raw: string): SemanticEvent | null => {
  for (const [key, map] of Object.entries(EVENTS)) {
    if (map[ide] === raw) return key as SemanticEvent;
  }
  return null;
};
