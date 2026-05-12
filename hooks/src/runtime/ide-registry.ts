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

// IMPORTANT: Verify exact tool names against hooks/tests/fixtures/*.json before finalizing.
export const TOOL_KINDS = {
  write: {
    'claude-code': ['Write', 'create_file'],
    'codex':       ['Write', 'apply_patch', 'functions.apply_patch'],
    'cursor':      ['Write'],
    'windsurf':    ['Write'],
    'copilot':     ['create_file'],
  },
  edit: {
    'claude-code': ['Edit'],
    'codex':       ['apply_patch', 'functions.apply_patch'],
    'cursor':      ['Edit'],
    'windsurf':    ['Write'],  // Windsurf post_write_code covers both write+edit
    'copilot':     ['replace_string_in_file'],
  },
  'multi-edit': {
    'claude-code': ['MultiEdit'],
    'codex':       null,
    'cursor':      null,
    'windsurf':    null,
    'copilot':     ['multi_replace_string_in_file'],
  },
  patch: {
    'claude-code': null,
    'codex':       ['apply_patch', 'functions.apply_patch'],
    'cursor':      null,
    'windsurf':    null,
    'copilot':     null,
  },
  create: {
    'claude-code': ['Write'],
    'codex':       ['Write', 'apply_patch', 'functions.apply_patch'],
    'cursor':      ['Write'],
    'windsurf':    ['Write'],
    'copilot':     ['create_file'],
  },
  replace: {
    'claude-code': ['Edit'],
    'codex':       ['apply_patch', 'functions.apply_patch'],
    'cursor':      ['Edit'],
    'windsurf':    ['Write'],
    'copilot':     ['replace_string_in_file', 'multi_replace_string_in_file'],
  },
  bash: {
    'claude-code': ['Bash'],
    'codex':       ['Bash', 'shell'],
    'cursor':      ['Bash'],
    'windsurf':    ['Bash'],
    'copilot':     null,
  },
  read: {
    'claude-code': ['Read'],
    'codex':       ['Read'],
    'cursor':      ['Read'],
    'windsurf':    ['Read'],
    'copilot':     null,
  },
  'mcp-call': {
    'claude-code': ['__mcp_sentinel__'],
    'codex':       null,
    'cursor':      null,
    'windsurf':    null,
    'copilot':     null,
  },
} as const satisfies Record<string, IdeMap<readonly string[]>>;

export type SemanticKind = keyof typeof TOOL_KINDS;

export const reverseLookupToolKind = (ide: IdeName, raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) return 'mcp-call';
  for (const [key, map] of Object.entries(TOOL_KINDS)) {
    const names = map[ide];
    if (Array.isArray(names) && (names as readonly string[]).includes(raw))
      return key as SemanticKind;
  }
  return null;
};

const PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;

const extractFromPatch = (raw: Record<string, unknown>): string | null => {
  const command = (raw.tool_input as Record<string, unknown> | undefined)?.command as string ?? '';
  return PATCH_FILE_RE.exec(command)?.[1]?.trim() ?? null;
};

const parseToolArgsFilePath = (raw: Record<string, unknown>): string | null => {
  const { toolArgs } = raw;
  if (!toolArgs) return null;
  try {
    const parsed = JSON.parse(toolArgs as string) as Record<string, unknown>;
    return (parsed?.filePath as string) ?? (parsed?.file_path as string) ?? null;
  } catch { return null; }
};

export const PROPERTIES = {
  filePath: {
    'claude-code': (raw: Record<string, unknown>): string | null => {
      const ti = (raw.tool_input as Record<string, unknown>) ?? {};
      return (ti.file_path as string) ?? (ti.filePath as string) ?? (ti.path as string) ?? null;
    },
    'codex': (raw: Record<string, unknown>): string | null => {
      const tool = (raw.tool_name as string) ?? '';
      if (tool === 'apply_patch' || tool === 'functions.apply_patch') return extractFromPatch(raw);
      const ti = (raw.tool_input as Record<string, unknown>) ?? {};
      return (ti.file_path as string) ?? null;
    },
    'cursor': (raw: Record<string, unknown>): string | null => {
      const ti = (raw.tool_input as Record<string, unknown>) ?? {};
      return (ti.file_path as string) ?? (ti.filePath as string) ?? (ti.path as string) ?? null;
    },
    'windsurf': (raw: Record<string, unknown>): string | null => {
      const ti = (raw.tool_info as Record<string, unknown>) ?? {};
      return (ti.file_path as string) ?? null;
    },
    'copilot': parseToolArgsFilePath,
  },
  cwd: {
    'claude-code': (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
    'codex':       (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
    'cursor':      (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
    'windsurf':    (raw: Record<string, unknown>) => ((raw.tool_info as Record<string, unknown> | undefined)?.cwd as string) ?? null,
    'copilot':     (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
  },
  sessionId: {
    'claude-code': (raw: Record<string, unknown>) => (raw.session_id as string) ?? null,
    'codex':       (raw: Record<string, unknown>) => (raw.session_id as string) ?? null,
    'cursor':      (raw: Record<string, unknown>) => (raw.conversation_id as string) ?? null,
    'windsurf':    (raw: Record<string, unknown>) => (raw.trajectory_id as string) ?? null,
    'copilot':     (_raw: Record<string, unknown>) => null,
  },
} as const satisfies Record<string, IdeMap<(raw: Record<string, unknown>) => string | null>>;
