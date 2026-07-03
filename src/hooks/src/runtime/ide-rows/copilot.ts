import type { SemanticEvent, SemanticKind } from '../ide-registry';
import { debugLogBranch } from '../debug-log';

const EVENTS: Partial<Record<SemanticEvent, string>> = {
  SessionStart:    'sessionStart',
  SessionEnd:      'sessionEnd',
  PreCompact:      'preCompact',
  PrePromptSubmit: 'userPromptSubmitted',
  // Registration guidance: register PascalCase "Stop" only — VS Code fires only PascalCase,
  // and Copilot CLI's PascalCase fire works fine too (avoids the camelCase "agentStop" double-fire).
  Stop:            'Stop',
};

const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:        ['create_file', 'create', 'Write'],
  edit:         ['replace_string_in_file', 'edit', 'Edit'],
  'multi-edit': ['multi_replace_string_in_file'],
  create:       ['create_file', 'create', 'Write'],
  replace:      ['replace_string_in_file', 'multi_replace_string_in_file', 'edit', 'Edit'],
  // 'bash'/'view' = Copilot CLI camelCase fire; 'Bash' = Copilot CLI's OWN PascalCase fire
  // (distinct from VS Code, which never sends 'Bash'); 'run_in_terminal'/'read_file' = VS Code.
  bash:         ['bash', 'powershell', 'Bash', 'run_in_terminal'],
  read:         ['view', 'Read', 'read_file'],
};

export const lookupEvent = (raw: string): SemanticEvent | null => {
  for (const [k, v] of Object.entries(EVENTS)) {
    if (v === raw) {
      const result = k as SemanticEvent;
      debugLogBranch('ide-row:copilot', 'lookup-event', { raw, result, reason: 'matched-map' });
      return result;
    }
  }
  debugLogBranch('ide-row:copilot', 'lookup-event', { raw, result: null, reason: 'no-match' });
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) {
    debugLogBranch('ide-row:copilot', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
    return 'mcp-call';
  }
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if ((v as readonly string[]).includes(raw)) {
      debugLogBranch('ide-row:copilot', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
      return k;
    }
  debugLogBranch('ide-row:copilot', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
  return null;
};

export const getFilePath = (raw: Record<string, unknown>): string | null => {
  // VS Code (R3) sends tool_input as an already-parsed object.
  const toolInput = raw.tool_input;
  if (toolInput && typeof toolInput === 'object') {
    const parsed = toolInput as Record<string, unknown>;
    // `path` covers the CLI `view` tool (and VS Code read_file), which carries its target under `path`
    // (grounded: docs/hooks/copilot-cli-logs.txt toolArgs `{"path":"…"}`) — not filePath/file_path.
    const result = (parsed.filePath as string) ?? (parsed.file_path as string) ?? (parsed.path as string) ?? null;
    debugLogBranch('ide-row:copilot', 'get-file-path', { result, reason: 'tool_input-object', parsed });
    return result;
  }
  // Copilot CLI (R1) sends toolArgs as a JSON string that must be parsed.
  const toolArgs = raw.toolArgs;
  if (!toolArgs) {
    debugLogBranch('ide-row:copilot', 'get-file-path', { result: null, reason: 'missing-toolArgs' });
    return null;
  }
  try {
    const parsed = typeof toolArgs === 'string'
      ? JSON.parse(toolArgs) as Record<string, unknown>
      : toolArgs as Record<string, unknown>;
    // CLI `view` carries its target under `path` (grounded: copilot-cli-logs.txt toolArgs `{"path":"…"}`).
    const result = (parsed?.filePath as string) ?? (parsed?.file_path as string) ?? (parsed?.path as string) ?? null;
    debugLogBranch('ide-row:copilot', 'get-file-path', {
      result,
      reason: 'parsed-toolArgs',
      parsed,
    });
    return result;
  } catch {
    debugLogBranch('ide-row:copilot', 'get-file-path', { result: null, reason: 'toolArgs-parse-failed' });
    return null;
  }
};

export const getCwd = (raw: Record<string, unknown>): string | null => {
  const result = (raw.cwd as string) ?? null;
  debugLogBranch('ide-row:copilot', 'get-cwd', { result });
  return result;
};

export const getSessionId = (raw: Record<string, unknown>): string | null => {
  const result = (raw.sessionId as string) ?? (raw.session_id as string) ?? null;
  debugLogBranch('ide-row:copilot', 'get-session-id', { result });
  return result;
};
