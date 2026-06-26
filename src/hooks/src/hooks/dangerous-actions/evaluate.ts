// Rosetta-AI-reviewed: pattern definitions only — not executable SQL/shell
import { deny } from '../../runtime/result-helpers';
import { debugLogHookBranch } from '../../runtime/debug-log';
import type { HookContext, HookResult } from '../../runtime/types';
import {
  DANGEROUS_BASH,
  DANGEROUS_CONTENT,
  DANGEROUS_PATHS,
  type DangerPattern,
} from './patterns';

/**
 * Matches the `Rosetta-AI-reviewed` brand token with word boundaries on both sides.
 * Accepts any surrounding context: `# Rosetta-AI-reviewed`, `-- Rosetta-AI-reviewed`,
 * plain `Rosetta-AI-reviewed`. Rejects merged words like `XRosetta-AI-reviewedY`.
 */
const MARKER_RE = /\bRosetta-AI-reviewed\b/;

const EVIDENCE_MAX = 120;

/** User-visible payload fields where the `Rosetta-AI-reviewed` marker is accepted, by tool name.
 *  Restricted to write-time content fields only — path fields and pattern-match fields
 *  (file_path, old_string) are excluded to prevent changing the operation target. */
const MARKER_FIELDS_BY_TOOL: Readonly<Record<string, readonly string[]>> = {
  Bash:      ['command'],
  Write:     ['content'],
  Edit:      ['new_string'],
  MultiEdit: ['edits'],
};

const MCP_MARKER_FIELDS = ['command', 'sql', 'query', 'new_string', 'content'] as const;

const MCP_SHELL_FIELDS   = ['command', 'cmd', 'shell_command'] as const;
const MCP_PATH_FIELDS    = ['path', 'file_path', 'filePath', 'target', 'target_path'] as const;
const MCP_CONTENT_FIELDS = ['content', 'new_string', 'query', 'sql'] as const;

type PatternHit = { result: HookResult; pattern: DangerPattern | null };

function buildReconsiderDenyMessage(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
  redact = false,
): string {
  const evidenceLine = redact
    ? `<redacted: ${pattern.id}>`
    : (evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence);

  const overrideExample =
    toolKind === 'bash'
      ? ['Append `Rosetta-AI-reviewed` as a comment in the `command` field.']
      : toolKind === 'write'
      ? ['Append `Rosetta-AI-reviewed` as a comment in the `content` field.']
      : toolKind === 'edit'
      ? ['Append `Rosetta-AI-reviewed` as a comment in the `new_string` field.']
      : toolKind === 'multi-edit'
      ? ['Append `Rosetta-AI-reviewed` as a comment in `new_string` inside the relevant `edits[]` entry.']
      : ['Append `Rosetta-AI-reviewed` as a comment to the relevant string field.'];

  return [
    `Dangerous action detected: ${pattern.label} [${pattern.id}]`,
    'Did you use the skill? Did you analyse blast radius and whether you can recover it back? Did you intend dry run?',
    `Evidence: ${evidenceLine}`,
    `Reason: ${pattern.reason}`,
    '',
    'If you are sure and confirmed with the user, you can override by appending `Rosetta-AI-reviewed` comment to the tool call:',
    ...overrideExample,
  ].join('\n');
}

function buildHardDenyMessage(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
  redact = false,
): string {
  const evidenceLine = redact
    ? `<redacted: ${pattern.id}>`
    : (evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence);

  return [
    `HARD-DENY: ${pattern.id} — ${pattern.label} on ${toolKind}`,
    `Evidence: ${evidenceLine}`,
    `Reason: ${pattern.reason}`,
    '',
    'This pattern cannot be bypassed by the `Rosetta-AI-reviewed` marker. Human review required.',
    'AI agent: stop and ask the user to confirm this operation with full blast-radius analysis.',
    'Do not proceed until the user explicitly confirms with full blast-radius analysis.',
  ].join('\n');
}

function buildDenyForPattern(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
  redact = false,
): HookResult {
  const msg = pattern.policy === 'hard-deny'
    ? buildHardDenyMessage(pattern, toolKind, evidence, redact)
    : buildReconsiderDenyMessage(pattern, toolKind, evidence, redact);
  return deny(msg);
}

function matchPatterns(
  patterns: readonly DangerPattern[],
  value: string,
): DangerPattern | null {
  for (const p of patterns) {
    if (p.re.test(value)) return p;
  }
  return null;
}

function matchDangerousPath(filePath: string): DangerPattern | null {
  const normalizedPath = filePath.replace(/\/+$/, '');
  const basename = normalizedPath.split('/').pop() ?? normalizedPath;
  for (const p of DANGEROUS_PATHS) {
    if (p.re.test(normalizedPath)) return p;
    if (p.re.test(basename)) return p;
  }
  return null;
}

/**
 * Returns true if any user-visible string field for the given tool name
 * contains the retry marker `Rosetta-AI-reviewed`.
 *
 * Restricted to fields rendered in the IDE UI to prevent silent self-assertion
 * via hidden metadata fields such as `description`.
 */
export function hasAIReviewedMarker(
  input: Readonly<Record<string, unknown>>,
  toolName: string,
): boolean {
  const fields = toolName.startsWith('mcp__')
    ? MCP_MARKER_FIELDS
    : (MARKER_FIELDS_BY_TOOL[toolName] ?? MCP_MARKER_FIELDS);

  return fields.some(f => {
    const v = input[f];
    if (typeof v === 'string') return MARKER_RE.test(v);
    if (Array.isArray(v)) {
      return v.some(item => {
        if (typeof item === 'string') return MARKER_RE.test(item);
        if (item && typeof item === 'object') {
          return Object.values(item as Record<string, unknown>)
            .some(inner => typeof inner === 'string' && MARKER_RE.test(inner));
        }
        return false;
      });
    }
    return false;
  });
}

function evalBash(ctx: HookContext): PatternHit {
  const command = ctx.toolInput.command;
  if (typeof command !== 'string') return { result: null, pattern: null };
  const pattern = matchPatterns(DANGEROUS_BASH, command);
  if (!pattern) return { result: null, pattern: null };
  return { result: buildDenyForPattern(pattern, 'bash', command), pattern };
}

function evalWrite(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildDenyForPattern(pattern, 'write', filePath), pattern };
  }
  const content = ctx.toolInput.content;
  if (typeof content === 'string') {
    const pattern = matchPatterns(DANGEROUS_CONTENT, content);
    if (pattern) return { result: buildDenyForPattern(pattern, 'write', content, true), pattern };
  }
  return { result: null, pattern: null };
}

function evalEdit(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildDenyForPattern(pattern, 'edit', filePath), pattern };
  }
  const newString = ctx.toolInput.new_string;
  if (typeof newString === 'string') {
    const pattern = matchPatterns(DANGEROUS_CONTENT, newString);
    if (pattern) return { result: buildDenyForPattern(pattern, 'edit', newString, true), pattern };
  }
  return { result: null, pattern: null };
}

function evalMultiEdit(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildDenyForPattern(pattern, 'multi-edit', filePath), pattern };
  }
  const edits = ctx.toolInput.edits;
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      if (edit && typeof edit === 'object') {
        const ns = (edit as Record<string, unknown>).new_string;
        if (typeof ns === 'string') {
          const pattern = matchPatterns(DANGEROUS_CONTENT, ns);
          if (pattern) return { result: buildDenyForPattern(pattern, 'multi-edit', ns, true), pattern };
        }
      }
    }
  }
  return { result: null, pattern: null };
}

function evalMcpCall(ctx: HookContext): PatternHit {
  const input = ctx.toolInput;

  for (const f of MCP_SHELL_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const pattern = matchPatterns(DANGEROUS_BASH, v);
      if (pattern) return { result: buildDenyForPattern(pattern, ctx.toolName, v), pattern };
    }
  }
  for (const f of MCP_PATH_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const pattern = matchDangerousPath(v);
      if (pattern) return { result: buildDenyForPattern(pattern, ctx.toolName, v), pattern };
    }
  }
  for (const f of MCP_CONTENT_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const pattern = matchPatterns(DANGEROUS_CONTENT, v);
      if (pattern) return { result: buildDenyForPattern(pattern, ctx.toolName, v, true), pattern };
    }
  }
  return { result: null, pattern: null };
}

/** Single traversal: detects the first matching pattern and returns both deny result and pattern. */
function detectDanger(ctx: HookContext): PatternHit {
  switch (ctx.toolKind) {
    case 'bash':       return evalBash(ctx);
    case 'write':      return evalWrite(ctx);
    case 'edit':       return evalEdit(ctx);
    case 'multi-edit': return evalMultiEdit(ctx);
    case 'mcp-call':   return evalMcpCall(ctx);
    default:           return { result: null, pattern: null };
  }
}

/** Returns both the deny result and the matched pattern for policy-aware callers. */
export function evalPatternAndPolicy(ctx: HookContext): { result: HookResult; pattern: DangerPattern | null } {
  return detectDanger(ctx);
}

/**
 * Pure evaluation for the dangerous-actions hook.
 * Applies policy tier: hard-deny patterns block regardless of marker.
 * Returns null if safe (no match or marker honored on reconsider-tier pattern).
 *
 * @internal Used by unit tests.
 */
export function evaluateDangerous(ctx: HookContext): HookResult {
  const { result, pattern } = evalPatternAndPolicy(ctx);
  if (result === null) {
    debugLogHookBranch('dangerous-actions', 'no-match-allow', {
      toolKind: ctx.toolKind,
      toolName: ctx.toolName,
    });
    return null;
  }

  if (pattern?.policy === 'hard-deny') {
    debugLogHookBranch('dangerous-actions', 'hard-deny', {
      toolKind: ctx.toolKind,
      toolName: ctx.toolName,
      patternId: pattern.id,
      patternLabel: pattern.label,
    });
    return result;
  }

  const input = ctx.toolInput as Record<string, unknown>;
  if (hasAIReviewedMarker(input, ctx.toolName)) {
    debugLogHookBranch('dangerous-actions', 'ai-reviewed-marker-honored', {
      toolKind: ctx.toolKind,
      toolName: ctx.toolName,
      patternId: pattern?.id ?? null,
      patternLabel: pattern?.label ?? null,
    });
    return null;
  }
  debugLogHookBranch('dangerous-actions', 'reconsider-deny', {
    toolKind: ctx.toolKind,
    toolName: ctx.toolName,
    patternId: pattern?.id ?? null,
    patternLabel: pattern?.label ?? null,
  });
  return result;
}
