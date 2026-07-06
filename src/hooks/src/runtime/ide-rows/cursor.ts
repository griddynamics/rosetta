import type { SemanticEvent, SemanticKind } from '../ide-registry';
import { debugLogBranch } from '../debug-log';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PostToolUse:     'postToolUse',
  PreToolUse:      'preToolUse',
  PreRead:         'beforeReadFile',
  SessionStart:    'sessionStart',
  SessionEnd:      'sessionEnd',
  PreCompact:      'preCompact',
  PrePromptSubmit: 'beforeSubmitPrompt',
  Stop:            'stop',
};

// Tool names are Cursor-specific (docs/hooks/cursor.md Practical Conclusion 6): Shell/Read/Write/
// Grep/Task + Tab variants TabRead/TabWrite. Read/TabRead are file reads; Write/TabWrite are writes.
const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:   ['Write', 'TabWrite'],
  edit:    ['Edit', 'Write', 'TabWrite'],
  create:  ['Write', 'TabWrite'],
  replace: ['Edit', 'Write', 'TabWrite'],
  bash:    ['Bash', 'Shell'],
  read:    ['Read', 'TabRead'],
  'mcp-call': ['__mcp_sentinel__'],
};

export const lookupEvent = (raw: string): SemanticEvent | null => {
  if (raw === 'beforeTabFileRead') {
    debugLogBranch('ide-row:cursor', 'lookup-event', { raw, result: 'PreRead', reason: 'cursor-special-case' });
    return 'PreRead';
  }
  for (const [k, v] of Object.entries(EVENTS)) {
    if (v === raw) {
      const result = k as SemanticEvent;
      debugLogBranch('ide-row:cursor', 'lookup-event', { raw, result, reason: 'matched-map' });
      return result;
    }
  }
  debugLogBranch('ide-row:cursor', 'lookup-event', { raw, result: null, reason: 'no-match' });
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) {
    debugLogBranch('ide-row:cursor', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
    return 'mcp-call';
  }
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if (v.includes(raw)) {
      debugLogBranch('ide-row:cursor', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
      return k;
    }
  debugLogBranch('ide-row:cursor', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
  return null;
};

export const getFilePath = (raw: Record<string, unknown>): string | null => {
  const ti = (raw.tool_input as Record<string, unknown>) ?? {};
  // Granular read/edit hooks (beforeReadFile / beforeTabFileRead / afterFileEdit) carry file_path at
  // the TOP LEVEL with no tool_input wrapper (docs/hooks/cursor.md:56). getFilePath's sole job is to
  // return the path when the payload has one, so fall back to the top level — else read-once & friends
  // silently see no path for Cursor's native read event (docs/hooks-verify.md OI-8).
  const result =
    (ti.file_path as string) ?? (ti.filePath as string) ?? (ti.path as string) ??
    (raw.file_path as string) ?? (raw.filePath as string) ?? (raw.path as string) ?? null;
  debugLogBranch('ide-row:cursor', 'get-file-path', { toolInput: ti, topLevel: raw.file_path ?? null, result });
  return result;
};

// Cursor's granular hooks omit `tool_name`, but the event unambiguously identifies the tool:
// "Read" is Cursor's file-read tool name (observed in generic preToolUse — docs/hooks/cursor-logs.txt,
// 8× "tool_name":"Read"); "TabRead" is the Tab-read variant (docs/hooks/cursor.md Practical Conclusion 6).
// "Shell" is Cursor's shell tool name (docs/hooks/cursor.md:223, Practical Conclusion 6); the granular
// beforeShellExecution/afterShellExecution hooks are the Shell tool's per-class layer (they double-fire
// with preToolUse for one Shell call — Practical Conclusion 2), so their tool is unambiguously "Shell".
// Grounded derivation, not invention — the canonical must carry the tool name when it is knowable. (The
// event itself stays null for the shell hooks: Rosetta has no semantic event for them; only toolKind is
// derivable — the same shape already produced by postToolUseFailure, which carries toolKind on a null event.)
const EVENT_TOOL_NAME: Record<string, string> = {
  beforeReadFile: 'Read',
  beforeTabFileRead: 'TabRead',
  beforeShellExecution: 'Shell',
  afterShellExecution: 'Shell',
};

export const getToolName = (raw: Record<string, unknown>): string | undefined => {
  const explicit = raw.tool_name as string | undefined;
  const result = explicit ?? EVENT_TOOL_NAME[raw.hook_event_name as string];
  debugLogBranch('ide-row:cursor', 'get-tool-name', { explicit: explicit ?? null, event: raw.hook_event_name, result: result ?? null });
  return result;
};

export const getCwd = (raw: Record<string, unknown>): string | null => {
  const result = (raw.cwd as string) ?? null;
  debugLogBranch('ide-row:cursor', 'get-cwd', { result });
  return result;
};

export const getSessionId = (raw: Record<string, unknown>): string | null => {
  const result = (raw.conversation_id as string) ?? null;
  debugLogBranch('ide-row:cursor', 'get-session-id', { result });
  return result;
};
