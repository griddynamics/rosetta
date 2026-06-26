import type { SemanticEvent, SemanticKind } from '../ide-registry';
import { debugLogBranch } from '../debug-log';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PostToolUse:     'PostToolUse',
  PreToolUse:      'PreToolUse',
  PreRead:         'PreRead',
  PrePromptSubmit: 'PrePromptSubmit',
};

const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:   ['Write'],
  edit:    ['Write'],
  create:  ['Write'],
  replace: ['Write'],
  bash:    ['Bash'],
  read:    ['Read'],
  'mcp-call': ['__mcp_sentinel__'],
};

export const lookupEvent = (raw: string): SemanticEvent | null => {
  for (const [k, v] of Object.entries(EVENTS)) {
    if (v === raw) {
      const result = k as SemanticEvent;
      debugLogBranch('ide-row:windsurf', 'lookup-event', { raw, result, reason: 'matched-map' });
      return result;
    }
  }
  debugLogBranch('ide-row:windsurf', 'lookup-event', { raw, result: null, reason: 'no-match' });
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) {
    if (/(^|__)read(_|$)/i.test(raw)) {
      debugLogBranch('ide-row:windsurf', 'lookup-tool-kind', { raw, result: 'read', reason: 'mcp-read-special-case' });
      return 'read';
    }
    debugLogBranch('ide-row:windsurf', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
    return 'mcp-call';
  }
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if (v.includes(raw)) {
      debugLogBranch('ide-row:windsurf', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
      return k;
    }
  debugLogBranch('ide-row:windsurf', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
  return null;
};

export const getFilePath = (raw: Record<string, unknown>): string | null => {
  const toolInfo = (raw.tool_info as Record<string, unknown>) ?? {};
  const result = (toolInfo.file_path as string) ?? null;
  debugLogBranch('ide-row:windsurf', 'get-file-path', { toolInfo, result });
  return result;
};

export const getCwd = (raw: Record<string, unknown>): string | null => {
  const toolInfo = (raw.tool_info as Record<string, unknown>) ?? {};
  const result = (toolInfo.cwd as string) ?? null;
  debugLogBranch('ide-row:windsurf', 'get-cwd', { toolInfo, result });
  return result;
};

export const getSessionId = (raw: Record<string, unknown>): string | null => {
  const result = (raw.trajectory_id as string) ?? null;
  debugLogBranch('ide-row:windsurf', 'get-session-id', { result });
  return result;
};
