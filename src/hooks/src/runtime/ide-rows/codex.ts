import type { SemanticEvent, SemanticKind } from '../ide-registry';
import { debugLogBranch } from '../debug-log';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PostToolUse: 'PostToolUse',
  PreToolUse: 'PreToolUse',
  SessionStart: 'SessionStart',
  PreCompact: 'PreCompact',
  PostCompact: 'PostCompact',
  PrePromptSubmit: 'UserPromptSubmit',
  Stop: 'Stop',
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
  'mcp-call': ['__mcp_sentinel__'],
};

// Reverse of EVENTS: semantic event → the RAW Codex wire literal that its output schema requires.
// Identity for most events; the one real remap is PrePromptSubmit → "UserPromptSubmit". Falls back to
// the semantic name for events not in the map. Used by the adapter's formatOutput so emitted
// hookEventName is always the raw literal Codex validates against (fixes the SemanticEvent leak).
export const rawEventName = (semantic: string | undefined): string =>
  semantic ? (EVENTS[semantic as SemanticEvent] ?? semantic) : '';

export const lookupEvent = (raw: string): SemanticEvent | null => {
  for (const [k, v] of Object.entries(EVENTS)) {
    if (v === raw) {
      const result = k as SemanticEvent;
      debugLogBranch('ide-row:codex', 'lookup-event', { raw, result, reason: 'matched-map' });
      return result;
    }
  }
  debugLogBranch('ide-row:codex', 'lookup-event', { raw, result: null, reason: 'no-match' });
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) {
    debugLogBranch('ide-row:codex', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
    return 'mcp-call';
  }
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if (v.includes(raw)) {
      debugLogBranch('ide-row:codex', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
      return k;
    }
  debugLogBranch('ide-row:codex', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
  return null;
};

export const getFilePath = (raw: Record<string, unknown>): string | null => {
  const tool = (raw.tool_name as string) ?? '';
  if (tool === 'apply_patch' || tool === 'functions.apply_patch') {
    const cmd = ((raw.tool_input as Record<string, unknown>)?.command as string) ?? '';
    const match = PATCH_FILE_RE.exec(cmd);
    const result = match?.[1]?.trim() ?? null;
    debugLogBranch('ide-row:codex', 'get-file-path', {
      tool,
      result,
      reason: 'patch-command',
      command: cmd,
    });
    return result;
  }
  if (tool.startsWith('mcp__')) {
    const ti = (raw.tool_input as Record<string, unknown>) ?? {};
    const result = (ti.file_path as string) ?? (ti.filePath as string) ?? (ti.path as string) ?? null;
    debugLogBranch('ide-row:codex', 'get-file-path', {
      tool,
      result,
      reason: 'mcp-input',
      toolInput: ti,
    });
    return result;
  }
  const toolInput = (raw.tool_input as Record<string, unknown>) ?? {};
  const result = (toolInput.file_path as string) ?? null;
  debugLogBranch('ide-row:codex', 'get-file-path', {
    tool,
    result,
    reason: 'tool-input-file-path',
    toolInput,
  });
  return result;
};

export const getCwd = (raw: Record<string, unknown>): string | null => {
  const result = (raw.cwd as string) ?? null;
  debugLogBranch('ide-row:codex', 'get-cwd', { result });
  return result;
};

export const getSessionId = (raw: Record<string, unknown>): string | null => {
  const result = (raw.session_id as string) ?? null;
  debugLogBranch('ide-row:codex', 'get-session-id', { result });
  return result;
};
