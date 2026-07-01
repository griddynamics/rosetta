import type { SemanticEvent, SemanticKind } from '../ide-registry';
import { debugLogBranch } from '../debug-log';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PostToolUse: 'PostToolUse',
  PreToolUse: 'PreToolUse',
  SessionStart: 'SessionStart',
  SessionEnd: 'SessionEnd',
  PreCompact: 'PreCompact',
  PostCompact: 'PostCompact',
  PrePromptSubmit: 'UserPromptSubmit',
  Stop: 'Stop',
};

const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:        ['Write', 'create_file'],
  edit:         ['Edit'],
  'multi-edit': ['MultiEdit'],
  create:       ['Write'],
  replace:      ['Edit'],
  bash:         ['Bash'],
  read:         ['Read'],
  'mcp-call':   ['__mcp_sentinel__'],
};

export const lookupEvent = (raw: string): SemanticEvent | null => {
  for (const [k, v] of Object.entries(EVENTS)) {
    if (v === raw) {
      const result = k as SemanticEvent;
      debugLogBranch('ide-row:claude-code', 'lookup-event', { raw, result, reason: 'matched-map' });
      return result;
    }
  }
  debugLogBranch('ide-row:claude-code', 'lookup-event', { raw, result: null, reason: 'no-match' });
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) {
    debugLogBranch('ide-row:claude-code', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
    return 'mcp-call';
  }
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if (v.includes(raw)) {
      debugLogBranch('ide-row:claude-code', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
      return k;
    }
  debugLogBranch('ide-row:claude-code', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
  return null;
};

export const getFilePath = (raw: Record<string, unknown>): string | null => {
  const ti = (raw.tool_input as Record<string, unknown>) ?? {};
  const result = (ti.file_path as string) ?? (ti.filePath as string) ?? (ti.path as string) ?? null;
  debugLogBranch('ide-row:claude-code', 'get-file-path', { toolInput: ti, result });
  return result;
};

export const getCwd = (raw: Record<string, unknown>): string | null => {
  const result = (raw.cwd as string) ?? null;
  debugLogBranch('ide-row:claude-code', 'get-cwd', { result });
  return result;
};

export const getSessionId = (raw: Record<string, unknown>): string | null => {
  const result = (raw.session_id as string) ?? null;
  debugLogBranch('ide-row:claude-code', 'get-session-id', { result });
  return result;
};
