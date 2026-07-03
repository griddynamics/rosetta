// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).

import { lookupEvent, lookupToolKind, getFilePath, getCwd, getSessionId } from '../runtime/ide-rows/codex';
import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const IDE = 'codex' as const;
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'] as const;
const CODEX_EXTRA = ['model'] as const;

const detect = (raw: Record<string, unknown>): boolean =>
  CC_SIGNATURE.every((f) => f in raw) &&
  CODEX_EXTRA.every((f) => f in raw) &&
  !('cursor_version' in raw);

// NOTE: Codex has NO dedicated read tool and does NOT route reads through MCP —
// no manufacturer doc describes an MCP read path. File reads happen through the
// shell (cat/sed/…) and are caught by read-once's `bash` path (it parses the
// command string). Do NOT reintroduce MCP→read promotion here.
const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const event = lookupEvent(raw.hook_event_name as string);
  const toolName = (raw.tool_name as string) ?? '';
  const toolKind = lookupToolKind(toolName);
  return {
    ...(raw as unknown as NormalizedInput),
    ide:        IDE,
    event,
    toolKind,
    file_path:  getFilePath(raw) ?? '',
    cwd:        getCwd(raw) ?? undefined,
    session_id: getSessionId(raw) ?? undefined,
  };
};

const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> =>
  (canonical ?? {}) as Record<string, unknown>; // identity pass-through

export const codex: IdeAdapter = { name: 'codex', detect, normalize, formatOutput };
