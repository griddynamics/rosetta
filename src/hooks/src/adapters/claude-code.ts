// adapters/claude-code.ts — Adapter for Claude Code IDE
// Canonical format: this is the reference format all other adapters normalize to.
// Detection: hook_event_name + tool_input + session_id present, no Codex/Cursor extras.

import { lookupEvent, lookupToolKind, getFilePath, getCwd, getSessionId } from '../runtime/ide-rows/claude-code';
import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const IDE = 'claude-code' as const;
const CC_SIGNATURE = ['hook_event_name', 'session_id'] as const;

const detect = (raw: Record<string, unknown>): boolean =>
  CC_SIGNATURE.every((f) => f in raw);

const normalize = (raw: Record<string, unknown>): NormalizedInput => {
  const baseEvent = lookupEvent(raw.hook_event_name as string);
  const toolKind = lookupToolKind((raw.tool_name as string) ?? '');
  const event = baseEvent === 'PreToolUse' && toolKind === 'read' ? 'PreRead' : baseEvent;
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
  (canonical ?? {}) as Record<string, unknown>; // identity — already canonical

export const claudeCode: IdeAdapter = { name: 'claude-code', detect, normalize, formatOutput };
