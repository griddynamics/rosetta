// adapters/claude-code.ts — Adapter for Claude Code IDE
// Canonical format: this is the reference format all other adapters normalize to.
// Detection: hook_event_name + tool_input + session_id present, no Codex/Cursor extras.

import type { NormalizedInput, CanonicalOutput } from '../adapter';

const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'] as const;

export const name = 'claude-code';

export const detect = (raw: Record<string, unknown>): boolean =>
  CC_SIGNATURE.every((f) => f in raw);

export const normalize = (raw: Record<string, unknown>): NormalizedInput =>
  raw as unknown as NormalizedInput; // identity — already canonical

export const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> =>
  (canonical ?? {}) as Record<string, unknown>; // identity — already canonical
