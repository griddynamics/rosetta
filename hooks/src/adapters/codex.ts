// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).

import { lookupEvent, lookupToolKind, getFilePath, getCwd, getSessionId } from '../runtime/ide-rows/codex';
import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const IDE = 'codex' as const;
const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'] as const;
const CODEX_EXTRA = ['model', 'turn_id'] as const;

const detect = (raw: Record<string, unknown>): boolean =>
  CC_SIGNATURE.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw);

const normalize = (raw: Record<string, unknown>): NormalizedInput => ({
  ...(raw as unknown as NormalizedInput),
  ide:        IDE,
  event:      lookupEvent(raw.hook_event_name as string),
  toolKind:   lookupToolKind(raw.tool_name as string),
  file_path:  getFilePath(raw) ?? '',
  cwd:        getCwd(raw) ?? undefined,
  session_id: getSessionId(raw) ?? undefined,
});

const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> =>
  (canonical ?? {}) as Record<string, unknown>; // identity pass-through

export const codex: IdeAdapter = { name: 'codex', detect, normalize, formatOutput };
