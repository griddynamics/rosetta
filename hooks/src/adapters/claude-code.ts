// adapters/claude-code.ts — Adapter for Claude Code IDE
// Canonical format: this is the reference format all other adapters normalize to.
// Detection: hook_event_name + tool_input + session_id present, no Codex/Cursor extras.

import type { IdeAdapter, NormalizedInput, CanonicalOutput } from '../types';

const CC_SIGNATURE = ['hook_event_name', 'tool_input', 'session_id'] as const;

const detect = (raw: Record<string, unknown>): boolean =>
  CC_SIGNATURE.every((f) => f in raw);

const normalize = (raw: Record<string, unknown>): NormalizedInput =>
  raw as unknown as NormalizedInput; // identity — already canonical

const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> =>
  (canonical ?? {}) as Record<string, unknown>; // identity — already canonical

export const claudeCode: IdeAdapter = { name: 'claude-code', detect, normalize, formatOutput };
