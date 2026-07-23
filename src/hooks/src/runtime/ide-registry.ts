import { debugLogBranch } from './debug-log';

export type IdeName = 'claude-code' | 'codex' | 'cursor' | 'windsurf' | 'copilot' | 'antigravity';
export type IdeMap<T> = Record<IdeName, T | null>;

export const EVENTS = {
  PostToolUse:     { 'claude-code': 'PostToolUse',  'codex': 'PostToolUse',  'cursor': 'postToolUse',        'windsurf': 'PostToolUse',      'copilot': null, 'antigravity': 'PostToolUse' },
  PreToolUse:      { 'claude-code': 'PreToolUse',   'codex': 'PreToolUse',   'cursor': 'preToolUse',         'windsurf': 'PreToolUse',       'copilot': null, 'antigravity': 'PreToolUse' },
  PreRead:         { 'claude-code': null,           'codex': null,           'cursor': 'beforeReadFile',     'windsurf': 'PreRead',          'copilot': null, 'antigravity': null },
  SessionStart:    { 'claude-code': 'SessionStart', 'codex': 'SessionStart',  'cursor': 'sessionStart',       'windsurf': null,               'copilot': 'sessionStart', 'antigravity': null },
  SessionEnd:      { 'claude-code': 'SessionEnd',   'codex': null,           'cursor': 'sessionEnd',         'windsurf': null,               'copilot': 'sessionEnd', 'antigravity': null },
  PreCompact:      { 'claude-code': 'PreCompact',   'codex': 'PreCompact',    'cursor': 'preCompact',         'windsurf': null,               'copilot': 'preCompact', 'antigravity': null },
  PostCompact:     { 'claude-code': 'PostCompact',  'codex': 'PostCompact',   'cursor': null,                 'windsurf': null,               'copilot': null, 'antigravity': null },
  PrePromptSubmit: { 'claude-code': 'UserPromptSubmit', 'codex': 'UserPromptSubmit', 'cursor': 'beforeSubmitPrompt', 'windsurf': 'PrePromptSubmit', 'copilot': 'userPromptSubmitted', 'antigravity': null },
  // Blockable turn-stop (prevents the agent from stopping). No hook logic uses this yet.
  Stop:            { 'claude-code': 'Stop',         'codex': 'Stop',          'cursor': 'stop',               'windsurf': null,               'copilot': 'Stop', 'antigravity': 'Stop' },
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
    'antigravity': ['write_to_file'],
  },
  edit: {
    'claude-code': ['Edit'],
    'codex':       ['apply_patch', 'functions.apply_patch'],
    'cursor':      ['Edit'],
    'windsurf':    ['Write'],  // Windsurf post_write_code covers both write+edit
    'copilot':     ['replace_string_in_file'],
    'antigravity': ['replace_file_content'],
  },
  'multi-edit': {
    'claude-code': ['MultiEdit'],
    'codex':       null,
    'cursor':      null,
    'windsurf':    null,
    'copilot':     ['multi_replace_string_in_file'],
    'antigravity': ['multi_replace_file_content'],
  },
  patch: {
    'claude-code': null,
    'codex':       ['apply_patch', 'functions.apply_patch'],
    'cursor':      null,
    'windsurf':    null,
    'copilot':     null,
    'antigravity': null,
  },
  create: {
    'claude-code': ['Write'],
    'codex':       ['Write', 'apply_patch', 'functions.apply_patch'],
    'cursor':      ['Write'],
    'windsurf':    ['Write'],
    'copilot':     ['create_file'],
    'antigravity': ['write_to_file'],
  },
  replace: {
    'claude-code': ['Edit'],
    'codex':       ['apply_patch', 'functions.apply_patch'],
    'cursor':      ['Edit'],
    'windsurf':    ['Write'],
    'copilot':     ['replace_string_in_file', 'multi_replace_string_in_file'],
    'antigravity': ['replace_file_content', 'multi_replace_file_content'],
  },
  bash: {
    'claude-code': ['Bash'],
    'codex':       ['Bash', 'shell'],
    'cursor':      ['Bash', 'Shell'],
    'windsurf':    ['Bash'],
    'copilot':     ['bash', 'powershell', 'Bash', 'run_in_terminal'],
    'antigravity': ['run_command'],
  },
  read: {
    'claude-code': ['Read'],
    'codex':       null,
    'cursor':      ['Read'],
    'windsurf':    ['Read'],
    'copilot':     ['view', 'Read', 'read_file'],
    'antigravity': ['view_file'],
  },
  'mcp-call': {
    'claude-code': ['__mcp_sentinel__'],
    'codex':       ['__mcp_sentinel__'],
    'cursor':      ['__mcp_sentinel__'],
    'windsurf':    ['__mcp_sentinel__'],
    'copilot':     null,
    'antigravity': ['__mcp_sentinel__'],
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

// Antigravity's toolCall.args field names are PascalCase and vary by tool name (docs/hooks/antigravity.md
// Tool Vocabulary table) — unlike every other IDE's flat tool_input, so filePath/cwd extraction must
// switch on toolCall.name. Mirrored (not reused) in runtime/ide-rows/antigravity.ts's getFilePath/getCwd,
// which the adapter actually calls; kept here too so PROPERTIES stays exhaustive per-IDE like every other row.
const antigravityToolCall = (raw: Record<string, unknown>): { name?: string; args?: Record<string, unknown> } | null =>
  (raw.toolCall as { name?: string; args?: Record<string, unknown> } | null | undefined) ?? null;

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
    'antigravity': (raw: Record<string, unknown>): string | null => {
      const toolCall = antigravityToolCall(raw);
      if (!toolCall?.name) return null;
      const args = toolCall.args ?? {};
      switch (toolCall.name) {
        case 'view_file': return (args.AbsolutePath as string) ?? null;
        case 'write_to_file':
        case 'replace_file_content':
        case 'multi_replace_file_content':
          return (args.TargetFile as string) ?? null;
        default: return null;
      }
    },
  },
  cwd: {
    'claude-code': (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
    'codex':       (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
    'cursor':      (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
    'windsurf':    (raw: Record<string, unknown>) => ((raw.tool_info as Record<string, unknown> | undefined)?.cwd as string) ?? null,
    'copilot':     (raw: Record<string, unknown>) => (raw.cwd as string) ?? null,
    // cwd ← workspacePaths[0], EXCEPT run_command, whose own args.Cwd (the shell's working
    // directory for that command) is more precise (docs/hooks/antigravity.md Adapter Mapping).
    'antigravity': (raw: Record<string, unknown>): string | null => {
      const toolCall = antigravityToolCall(raw);
      if (toolCall?.name === 'run_command') {
        const cwd = toolCall.args?.Cwd;
        if (typeof cwd === 'string') return cwd;
      }
      const workspacePaths = raw.workspacePaths as string[] | undefined;
      return workspacePaths?.[0] ?? null;
    },
  },
  sessionId: {
    'claude-code': (raw: Record<string, unknown>) => (raw.session_id as string) ?? null,
    'codex':       (raw: Record<string, unknown>) => (raw.session_id as string) ?? null,
    'cursor':      (raw: Record<string, unknown>) => (raw.conversation_id as string) ?? null,
    'windsurf':    (raw: Record<string, unknown>) => (raw.trajectory_id as string) ?? null,
    'copilot':     (raw: Record<string, unknown>) =>
      (raw.sessionId as string) ?? (raw.session_id as string) ?? null,
    'antigravity': (raw: Record<string, unknown>) => (raw.conversationId as string) ?? null,
  },
} as const satisfies Record<string, IdeMap<(raw: Record<string, unknown>) => string | null>>;
