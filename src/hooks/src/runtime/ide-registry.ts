import { debugLogBranch } from './debug-log';

export type IdeName = 'claude-code' | 'codex' | 'cursor' | 'windsurf' | 'copilot';
export type IdeMap<T> = Record<IdeName, T | null>;

export const EVENTS = {
  PostToolUse:     { 'claude-code': 'PostToolUse',  'codex': 'PostToolUse',  'cursor': 'postToolUse',        'windsurf': 'PostToolUse',      'copilot': null },
  PreToolUse:      { 'claude-code': 'PreToolUse',   'codex': 'PreToolUse',   'cursor': 'preToolUse',         'windsurf': 'PreToolUse',       'copilot': null },
  PreRead:         { 'claude-code': null,           'codex': null,           'cursor': 'beforeReadFile',     'windsurf': 'PreRead',          'copilot': null },
  SessionStart:    { 'claude-code': 'SessionStart', 'codex': 'SessionStart',  'cursor': 'sessionStart',       'windsurf': null,               'copilot': 'sessionStart' },
  SessionEnd:      { 'claude-code': 'SessionEnd',   'codex': null,           'cursor': 'sessionEnd',         'windsurf': null,               'copilot': 'sessionEnd' },
  PreCompact:      { 'claude-code': 'PreCompact',   'codex': 'PreCompact',    'cursor': 'preCompact',         'windsurf': null,               'copilot': 'preCompact' },
  PostCompact:     { 'claude-code': 'PostCompact',  'codex': 'PostCompact',   'cursor': null,                 'windsurf': null,               'copilot': null },
  PrePromptSubmit: { 'claude-code': 'UserPromptSubmit', 'codex': 'UserPromptSubmit', 'cursor': 'beforeSubmitPrompt', 'windsurf': 'PrePromptSubmit', 'copilot': 'userPromptSubmitted' },
  // Blockable turn-stop (prevents the agent from stopping). No hook logic uses this yet.
  Stop:            { 'claude-code': 'Stop',         'codex': 'Stop',          'cursor': 'stop',               'windsurf': null,               'copilot': 'Stop' },
} as const satisfies Record<string, IdeMap<string>>;

export type SemanticEvent = keyof typeof EVENTS;

export const reverseLookupEvent = (ide: IdeName, raw: string): SemanticEvent | null => {
  for (const [key, map] of Object.entries(EVENTS)) {
    if (map[ide] === raw) {
      const result = key as SemanticEvent;
      debugLogBranch('ide-registry', 'reverse-lookup-event', {
        ide,
        raw,
        result,
        reason: 'matched-map',
      });
      return result;
    }
  }
  debugLogBranch('ide-registry', 'reverse-lookup-event', {
    ide,
    raw,
    result: null,
    reason: 'no-match',
  });
  return null;
};

// IMPORTANT: Verify exact tool names against src/hooks/tests/fixtures/*.json before finalizing.
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
    'cursor':      ['Bash', 'Shell'],
    'windsurf':    ['Bash'],
    'copilot':     ['bash', 'powershell'],
  },
  read: {
    'claude-code': ['Read'],
    'codex':       null,
    'cursor':      ['Read'],
    'windsurf':    ['Read'],
    'copilot':     ['view', 'Read'],
  },
  'mcp-call': {
    'claude-code': ['__mcp_sentinel__'],
    'codex':       ['__mcp_sentinel__'],
    'cursor':      ['__mcp_sentinel__'],
    'windsurf':    ['__mcp_sentinel__'],
    'copilot':     null,
  },
} as const satisfies Record<string, IdeMap<readonly string[]>>;

export type SemanticKind = keyof typeof TOOL_KINDS;

export const reverseLookupToolKind = (ide: IdeName, raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) {
    if (ide !== 'codex' && /(^|__)read(_|$)/i.test(raw)) {
      debugLogBranch('ide-registry', 'reverse-lookup-tool-kind', {
        ide,
        raw,
        result: 'read',
        reason: 'mcp-read-special-case',
      });
      return 'read';
    }
    debugLogBranch('ide-registry', 'reverse-lookup-tool-kind', {
      ide,
      raw,
      result: 'mcp-call',
      reason: 'mcp-prefix',
    });
    return 'mcp-call';
  }
  for (const [key, map] of Object.entries(TOOL_KINDS)) {
    const names = map[ide];
    if (Array.isArray(names) && (names as readonly string[]).includes(raw)) {
      const result = key as SemanticKind;
      debugLogBranch('ide-registry', 'reverse-lookup-tool-kind', {
        ide,
        raw,
        result,
        reason: 'matched-map',
      });
      return result;
    }
  }
  debugLogBranch('ide-registry', 'reverse-lookup-tool-kind', {
    ide,
    raw,
    result: null,
    reason: 'no-match',
  });
  return null;
};

const PATCH_FILE_RE = /^\*\*\* (?:Update|Add|Create) File: (.+)$/m;

const extractFromPatch = (raw: Record<string, unknown>): string | null => {
  const command = (raw.tool_input as Record<string, unknown> | undefined)?.command as string ?? '';
  const result = PATCH_FILE_RE.exec(command)?.[1]?.trim() ?? null;
  debugLogBranch('ide-registry', 'extract-from-patch', {
    command,
    result,
  });
  return result;
};

const parseToolArgsFilePath = (raw: Record<string, unknown>): string | null => {
  const { toolArgs } = raw;
  if (!toolArgs) {
    debugLogBranch('ide-registry', 'parse-tool-args-file-path', {
      result: null,
      reason: 'missing-toolArgs',
    });
    return null;
  }
  try {
    const parsed = typeof toolArgs === 'string'
      ? JSON.parse(toolArgs) as Record<string, unknown>
      : toolArgs as Record<string, unknown>;
    const result = (parsed?.filePath as string) ?? (parsed?.file_path as string) ?? null;
    debugLogBranch('ide-registry', 'parse-tool-args-file-path', {
      result,
      reason: 'parsed-toolArgs',
      parsed,
    });
    return result;
  } catch {
    debugLogBranch('ide-registry', 'parse-tool-args-file-path', {
      result: null,
      reason: 'toolArgs-parse-failed',
    });
    return null;
  }
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
    'copilot':     (raw: Record<string, unknown>) =>
      (raw.sessionId as string) ?? (raw.session_id as string) ?? null,
  },
} as const satisfies Record<string, IdeMap<(raw: Record<string, unknown>) => string | null>>;
