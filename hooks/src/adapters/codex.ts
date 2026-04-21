// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).

import type { NormalizedInput, CanonicalOutput } from '../adapter';

const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'] as const;
const CODEX_EXTRA = ['model', 'turn_id'] as const;

export const name = 'codex';

export const detect = (raw: Record<string, unknown>): boolean =>
  CC_SIGNATURE.every((f) => f in raw) && CODEX_EXTRA.every((f) => f in raw);

export const normalize = (raw: Record<string, unknown>): NormalizedInput =>
  raw as unknown as NormalizedInput; // already canonical; extras preserved

export const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> =>
  (canonical ?? {}) as Record<string, unknown>; // identity pass-through
