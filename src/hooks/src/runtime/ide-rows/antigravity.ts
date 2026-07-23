import type { SemanticEvent, SemanticKind } from '../ide-registry';
import { debugLogBranch } from '../debug-log';

// Only PreToolUse/PostToolUse/Stop carry a Rosetta SemanticEvent mapping — Antigravity has NO
// SessionStart (CLI rewrites a registered SessionStart to null; its closest analog is
// PreInvocation @ invocationNum:0, per docs/hooks/antigravity.md). PreInvocation/PostInvocation
// are intentionally absent here: they have no natural existing SemanticEvent to map to, and their
// wire payloads are byte-identical (verified: docs/hooks/agy-cli-logs.txt) — nothing distinguishes
// them by shape, so leaving both unmapped (like other IDEs' absent events) is correct and has zero
// functional impact (no Rosetta hook targets either event today).
const EVENTS: Partial<Record<SemanticEvent, string>> = {
  PreToolUse:  'PreToolUse',
  PostToolUse: 'PostToolUse',
  Stop:        'Stop',
};

// toolCall.name → SemanticKind (docs/hooks/antigravity.md Tool Vocabulary). 'write' before
// 'create' and 'edit' before 'replace' is load-bearing: lookupToolKind returns the FIRST matching
// key below, and loose-files.ts gates on toolKinds:['write'] only (not 'create'), while
// codemap-refresh.ts gates on ['write','edit','multi-edit'] only (not 'replace') — the same
// ordering convention as ide-rows/copilot.ts.
const TOOL_KINDS: Partial<Record<SemanticKind, readonly string[]>> = {
  write:        ['write_to_file'],
  edit:         ['replace_file_content'],
  'multi-edit': ['multi_replace_file_content'],
  create:       ['write_to_file'],
  replace:      ['replace_file_content', 'multi_replace_file_content'],
  bash:         ['run_command'],
  read:         ['view_file'],
  // Every other documented tool (list_dir, find_by_name, grep_search, search_web,
  // read_url_content, browser_*, invoke_subagent/define_subagent/manage_subagents, send_message,
  // manage_task, schedule, list_permissions, ask_permission, ask_question, generate_image) has no
  // SemanticKind — falls through to null below, exactly as docs/hooks/antigravity.md specifies.
};

export const lookupEvent = (raw: string): SemanticEvent | null => {
  for (const [k, v] of Object.entries(EVENTS)) {
    if (v === raw) {
      const result = k as SemanticEvent;
      debugLogBranch('ide-row:antigravity', 'lookup-event', { raw, result, reason: 'matched-map' });
      return result;
    }
  }
  debugLogBranch('ide-row:antigravity', 'lookup-event', { raw, result: null, reason: 'no-match' });
  return null;
};

export const lookupToolKind = (raw: string): SemanticKind | null => {
  if (raw.startsWith('mcp__')) {
    debugLogBranch('ide-row:antigravity', 'lookup-tool-kind', { raw, result: 'mcp-call', reason: 'mcp-prefix' });
    return 'mcp-call';
  }
  for (const [k, v] of Object.entries(TOOL_KINDS) as [SemanticKind, readonly string[]][])
    if ((v as readonly string[]).includes(raw)) {
      debugLogBranch('ide-row:antigravity', 'lookup-tool-kind', { raw, result: k, reason: 'matched-map' });
      return k;
    }
  debugLogBranch('ide-row:antigravity', 'lookup-tool-kind', { raw, result: null, reason: 'no-match' });
  return null;
};

type RawToolCall = { name?: string; args?: Record<string, unknown> } | null | undefined;

// file_path per Tool Vocabulary path field (docs/hooks/antigravity.md): view_file→AbsolutePath,
// write_to_file/replace_file_content/multi_replace_file_content→TargetFile. run_command has no
// file target (its Cwd is a working directory, not a file — see getCwd). Every other tool (and
// PostToolUse, whose toolCall is null by contract) yields null here.
export const getFilePath = (raw: Record<string, unknown>): string | null => {
  const toolCall = raw.toolCall as RawToolCall;
  if (!toolCall?.name) {
    debugLogBranch('ide-row:antigravity', 'get-file-path', { result: null, reason: 'no-toolCall' });
    return null;
  }
  const args = toolCall.args ?? {};
  let result: string | null;
  switch (toolCall.name) {
    case 'view_file':
      result = (args.AbsolutePath as string) ?? null;
      break;
    case 'write_to_file':
    case 'replace_file_content':
    case 'multi_replace_file_content':
      result = (args.TargetFile as string) ?? null;
      break;
    default:
      result = null;
  }
  debugLogBranch('ide-row:antigravity', 'get-file-path', { result, reason: 'toolCall', toolName: toolCall.name });
  return result;
};

// cwd ← workspacePaths[0], EXCEPT run_command, whose own args.Cwd (docs/hooks/antigravity.md
// Adapter Mapping: "cwd ← workspacePaths[0] (or toolCall.args.Cwd for run_command)") is more precise.
export const getCwd = (raw: Record<string, unknown>): string | null => {
  const toolCall = raw.toolCall as RawToolCall;
  if (toolCall?.name === 'run_command') {
    const cwd = toolCall.args?.Cwd;
    if (typeof cwd === 'string') {
      debugLogBranch('ide-row:antigravity', 'get-cwd', { result: cwd, reason: 'run_command-args-Cwd' });
      return cwd;
    }
  }
  const workspacePaths = raw.workspacePaths as string[] | undefined;
  const result = workspacePaths?.[0] ?? null;
  debugLogBranch('ide-row:antigravity', 'get-cwd', { result, reason: 'workspacePaths[0]' });
  return result;
};

export const getSessionId = (raw: Record<string, unknown>): string | null => {
  const result = (raw.conversationId as string) ?? null;
  debugLogBranch('ide-row:antigravity', 'get-session-id', { result });
  return result;
};
