// adapters/codex.ts — Adapter for Codex (OpenAI) IDE
// Codex shares the Claude Code signature but adds model + turn_id at top level.
// Detection: must check Codex extras BEFORE claude-code (it's a superset).

import { lookupEvent, lookupToolKind, getFilePath, getCwd, getSessionId, rawEventName } from '../runtime/ide-rows/codex';
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

// Project the canonical (Claude-Code-superset) output down to EXACTLY the fields Codex's STRICT per-event
// schema allows. Codex rejects the WHOLE output on any undocumented field (→ hook fails, tool runs
// unhooked), so identity pass-through leaked illegal fields: `permissionDecision` into PostToolUse and
// top-level `continue:false` into PreToolUse denies. The authoritative shapes + the closed-world
// validator live in adapters/codex-output.ts (grounded in the official OpenAI PreToolUse/PostToolUse
// docs). Rosetta emits only advise / deny / allow / side-effect (empty) — mapped here as:
//   PreToolUse  deny    → nested permissionDecision:"deny" + reason (NO top-level `continue`)
//   PreToolUse  advise  → additionalContext ONLY (never permissionDecision — that would AUTO-APPROVE)
//   PreToolUse  allow   → permissionDecision:"allow" (defensive; no hook returns allow())
//   PostToolUse advise  → additionalContext ONLY (NO permissionDecision — illegal on PostToolUse)
//   side-effect / null  → {} (no stdout)
// hookEventName is emitted as the RAW wire literal (rawEventName), not the internal SemanticEvent.
const formatOutput = (canonical?: CanonicalOutput): Record<string, unknown> => {
  if (!canonical || Object.keys(canonical).length === 0) return {};
  const hs = canonical.hookSpecificOutput;
  if (!hs) return {};
  const event = rawEventName(hs.hookEventName);

  if (event === 'PreToolUse') {
    if (hs.permissionDecision === 'deny')
      return { hookSpecificOutput: { hookEventName: event, permissionDecision: 'deny', permissionDecisionReason: hs.permissionDecisionReason } };
    if (hs.additionalContext != null)
      return { hookSpecificOutput: { hookEventName: event, additionalContext: hs.additionalContext } };
    if (hs.permissionDecision === 'allow')
      return { hookSpecificOutput: { hookEventName: event, permissionDecision: 'allow' } };
    return {};
  }

  if (event === 'PostToolUse') {
    const nested: Record<string, unknown> = { hookEventName: event };
    if (hs.additionalContext != null) nested.additionalContext = hs.additionalContext;
    return { hookSpecificOutput: nested };
  }

  // Other wired events (SessionStart / SubagentStop / Stop): no active hook emits output through here,
  // but project defensively to context-only — never leak permissionDecision or top-level continue.
  const nested: Record<string, unknown> = { hookEventName: event };
  if (hs.additionalContext != null) nested.additionalContext = hs.additionalContext;
  return { hookSpecificOutput: nested };
};

export const codex: IdeAdapter = { name: 'codex', detect, normalize, formatOutput };
