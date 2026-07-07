// codex-output.ts — Codex (OpenAI) hook OUTPUT schema: types + a CLOSED-WORLD strict validator.
//
// WHY THIS EXISTS. Codex validates each hook's stdout against a STRICT per-event pydantic schema:
// ANY field not documented for that event invalidates the WHOLE output → the hook is marked FAILED
// and the tool runs UNHOOKED (deny/rewrite/advise silently do NOT apply). See docs/hooks/codex.md
// (Practical Conclusion 1) and the official OpenAI reference (https://developers.openai.com/codex/hooks).
//
// So this validator is CLOSED-WORLD: it enumerates the exact allowed key set (top-level AND inside
// hookSpecificOutput) per event and REJECTS ANY key not in that set — never "assert field X is absent"
// (a future leaked field would slip through such a check). It mirrors what Codex's own model accepts.
//
// SOURCE OF TRUTH: PreToolUse + PostToolUse are grounded in the official OpenAI schemas. SessionStart /
// SubagentStop / Stop are DERIVED FROM docs/hooks/codex.md (not the raw OpenAI docs) → lower confidence,
// marked below. Codex-ONLY — other IDEs are not strict and MUST NOT use this.

export type CodexEvent = 'PreToolUse' | 'PostToolUse' | 'SessionStart' | 'SubagentStop' | 'Stop';

// ── Types (authoring aid; the runtime validator below is the enforcement) ──────────────────────────

/** PreToolUse — deny a supported tool call (exit 0, reason carried in the body). */
export interface CodexPreToolUseDeny {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'deny';
    permissionDecisionReason: string;
  };
  systemMessage?: string;
}
/** PreToolUse — allow, optionally rewriting the tool input. `updatedInput` ONLY with allow. */
export interface CodexPreToolUseAllow {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    permissionDecision: 'allow';
    updatedInput?: { command: string } | Record<string, unknown>;
  };
  systemMessage?: string;
}
/** PreToolUse — add model-visible context WITHOUT blocking (no permissionDecision → no auto-approve). */
export interface CodexPreToolUseContext {
  hookSpecificOutput: {
    hookEventName: 'PreToolUse';
    additionalContext: string;
  };
  systemMessage?: string;
}
export type CodexPreToolUseOutput = CodexPreToolUseDeny | CodexPreToolUseAllow | CodexPreToolUseContext;

/** PostToolUse — extra developer context and/or a block (feedback replaces the tool result).
 *  NOTE: PostToolUse has NO permissionDecision. `continue:false` IS supported here (unlike PreToolUse). */
export interface CodexPostToolUseOutput {
  hookSpecificOutput?: {
    hookEventName: 'PostToolUse';
    additionalContext?: string;
  };
  decision?: 'block';
  reason?: string;
  continue?: false;
  systemMessage?: string;
}

/** SessionStart — developer context injection. DERIVED FROM codex.md (lower confidence). */
export interface CodexSessionStartOutput {
  hookSpecificOutput?: {
    hookEventName: 'SessionStart';
    additionalContext?: string;
  };
  continue?: boolean;
  stopReason?: string;
  systemMessage?: string;
  suppressOutput?: boolean;
}

/** Stop / SubagentStop — continue the turn/subagent. DERIVED FROM codex.md (lower confidence). */
export interface CodexStopOutput {
  decision?: 'block';
  reason?: string;
  continue?: boolean;
  stopReason?: string;
  systemMessage?: string;
  suppressOutput?: boolean;
}
export type CodexSubagentStopOutput = CodexStopOutput;

// ── Closed-world runtime schema ────────────────────────────────────────────────────────────────────

interface EventSchema {
  /** Allowed top-level keys (closed set). */
  top: ReadonlySet<string>;
  /** Allowed keys inside hookSpecificOutput (closed set), or null if hookSpecificOutput is not allowed. */
  nested: ReadonlySet<string> | null;
  /** Event-specific rules (literals, types, conditionals). Pushes human-readable errors. */
  rules: (obj: Record<string, unknown>, errs: string[]) => void;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isString = (v: unknown): v is string => typeof v === 'string';

const checkClosedKeys = (obj: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, errs: string[]): void => {
  for (const k of Object.keys(obj))
    if (!allowed.has(k)) errs.push(`${where}: unexpected key "${k}" (not in Codex ${where} schema)`);
};

/** Pull hookSpecificOutput as a validated object, or record an error and return null. */
const hso = (obj: Record<string, unknown>, errs: string[]): Record<string, unknown> | null => {
  if (!('hookSpecificOutput' in obj)) return null;
  const v = obj.hookSpecificOutput;
  if (!isPlainObject(v)) { errs.push('hookSpecificOutput: must be an object'); return null; }
  return v;
};

const requireEventName = (nested: Record<string, unknown> | null, event: CodexEvent, errs: string[]): void => {
  if (nested && nested.hookEventName !== event)
    errs.push(`hookSpecificOutput.hookEventName: expected "${event}", got ${JSON.stringify(nested.hookEventName)}`);
};

const SCHEMAS: Record<CodexEvent, EventSchema> = {
  // PreToolUse — official OpenAI schema. Legacy top-level {decision,reason} is accepted by Codex but
  // deliberately NOT allowed here (Rosetta uses the modern nested permissionDecision form only).
  PreToolUse: {
    top: new Set(['hookSpecificOutput', 'systemMessage']),
    nested: new Set(['hookEventName', 'permissionDecision', 'permissionDecisionReason', 'additionalContext', 'updatedInput']),
    rules: (obj, errs) => {
      const n = hso(obj, errs);
      if (!n) { errs.push('PreToolUse: hookSpecificOutput is required'); return; }
      requireEventName(n, 'PreToolUse', errs);
      const pd = n.permissionDecision;
      if (pd !== undefined && pd !== 'allow' && pd !== 'deny')
        errs.push(`permissionDecision: must be "allow" or "deny" (got ${JSON.stringify(pd)}; "ask" is unsupported)`);
      if (pd === 'deny' && !isString(n.permissionDecisionReason))
        errs.push('permissionDecisionReason: required (string) when permissionDecision is "deny"');
      if ('permissionDecisionReason' in n && pd !== 'deny')
        errs.push('permissionDecisionReason: only valid with permissionDecision "deny"');
      if ('updatedInput' in n && pd !== 'allow')
        errs.push('updatedInput: only valid with permissionDecision "allow"');
      if ('additionalContext' in n && !isString(n.additionalContext))
        errs.push('additionalContext: must be a string');
      if (systemMessagePresentButNotString(obj)) errs.push('systemMessage: must be a string');
    },
  },

  // PostToolUse — official OpenAI schema. NO permissionDecision. `continue` may only be false.
  PostToolUse: {
    top: new Set(['hookSpecificOutput', 'decision', 'reason', 'continue', 'systemMessage']),
    nested: new Set(['hookEventName', 'additionalContext']),
    rules: (obj, errs) => {
      const n = hso(obj, errs);
      requireEventName(n, 'PostToolUse', errs);
      if (n && 'additionalContext' in n && !isString(n.additionalContext))
        errs.push('additionalContext: must be a string');
      if ('decision' in obj) {
        if (obj.decision !== 'block') errs.push(`decision: must be "block" (got ${JSON.stringify(obj.decision)})`);
        if (!isString(obj.reason)) errs.push('reason: required (string) when decision is "block"');
      }
      if ('continue' in obj && obj.continue !== false)
        errs.push('continue: only false is supported on PostToolUse');
      if (systemMessagePresentButNotString(obj)) errs.push('systemMessage: must be a string');
    },
  },

  // SessionStart — DERIVED FROM codex.md (lower confidence).
  SessionStart: {
    top: new Set(['hookSpecificOutput', 'continue', 'stopReason', 'systemMessage', 'suppressOutput']),
    nested: new Set(['hookEventName', 'additionalContext']),
    rules: (obj, errs) => {
      const n = hso(obj, errs);
      requireEventName(n, 'SessionStart', errs);
      if (n && 'additionalContext' in n && !isString(n.additionalContext))
        errs.push('additionalContext: must be a string');
      if (systemMessagePresentButNotString(obj)) errs.push('systemMessage: must be a string');
    },
  },

  // Stop / SubagentStop — DERIVED FROM codex.md (lower confidence). Top-level decision:"block" + reason.
  Stop: stopSchema('Stop'),
  SubagentStop: stopSchema('SubagentStop'),
};

function systemMessagePresentButNotString(obj: Record<string, unknown>): boolean {
  return 'systemMessage' in obj && !isString(obj.systemMessage);
}

function stopSchema(_event: 'Stop' | 'SubagentStop'): EventSchema {
  return {
    top: new Set(['decision', 'reason', 'continue', 'stopReason', 'systemMessage', 'suppressOutput']),
    nested: null, // no hookSpecificOutput shape documented for Stop/SubagentStop
    rules: (obj, errs) => {
      if ('decision' in obj) {
        if (obj.decision !== 'block') errs.push(`decision: must be "block" (got ${JSON.stringify(obj.decision)})`);
        if (!isString(obj.reason)) errs.push('reason: required (string) when decision is "block"');
      }
      if (systemMessagePresentButNotString(obj)) errs.push('systemMessage: must be a string');
    },
  };
}

export interface CodexValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * CLOSED-WORLD strict validation of a Codex hook output object for a given event.
 * `{}` (no output) is always valid — Codex writes nothing for side-effect / null results.
 */
export const validateCodexOutput = (event: CodexEvent, obj: unknown): CodexValidationResult => {
  const errors: string[] = [];
  if (!isPlainObject(obj)) return { ok: false, errors: ['output: must be a JSON object'] };
  // Empty object = "no output" — always valid.
  if (Object.keys(obj).length === 0) return { ok: true, errors };

  const schema = SCHEMAS[event];
  if (!schema) return { ok: false, errors: [`unknown Codex event "${event}"`] };

  checkClosedKeys(obj, schema.top, 'top-level', errors);
  const nested = obj.hookSpecificOutput;
  if (isPlainObject(nested)) {
    if (schema.nested === null) errors.push(`${event}: hookSpecificOutput is not allowed`);
    else checkClosedKeys(nested, schema.nested, 'hookSpecificOutput', errors);
  }
  schema.rules(obj, errors);
  return { ok: errors.length === 0, errors };
};

/** Throwing wrapper for tests — fails loudly with the full error list and the offending object. */
export const assertCodexOutput = (event: CodexEvent, obj: unknown): void => {
  const { ok, errors } = validateCodexOutput(event, obj);
  if (!ok)
    throw new Error(
      `Codex ${event} output violates the strict schema:\n  - ${errors.join('\n  - ')}\n` +
        `Output was: ${JSON.stringify(obj)}`,
    );
};

/**
 * Expected process exit code for a Codex hook output. Rosetta carries deny/advise in the JSON body at
 * exit 0 (verified accepted — docs/hooks/codex.md capability matrix + resolveExitCode has no Codex
 * override). The exit-code-2 + stderr path that Codex ALSO supports is intentionally not used by Rosetta.
 */
export const expectedCodexExit = (_event: CodexEvent, _obj: unknown): number => 0;
