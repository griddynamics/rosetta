import { deny } from '../../runtime/result-helpers';
import type { HookContext, HookResult } from '../../runtime/types';
import {
  DANGEROUS_BASH,
  DANGEROUS_CONTENT,
  DANGEROUS_PATHS,
  type DangerPattern,
} from './patterns';

/** Regex that matches the word `reviewed` at a word boundary. */
const REVIEWED_RE = /\breviewed\b/;

/** Max length of the evidence snippet shown in deny messages. */
const EVIDENCE_MAX = 120;

/** User-visible fields accepted for the `reviewed` override, by tool name. */
const OVERRIDE_FIELDS_BY_TOOL: Readonly<Record<string, readonly string[]>> = {
  Bash:      ['command'],
  Write:     ['content', 'file_path'],
  Edit:      ['new_string', 'old_string', 'file_path'],
  MultiEdit: ['file_path', 'edits'],
};

/** Fields scanned for `reviewed` in MCP tool calls. */
const MCP_OVERRIDE_FIELDS = ['command', 'sql', 'query', 'new_string', 'content'] as const;

const MCP_SHELL_FIELDS   = ['command', 'cmd', 'shell_command'] as const;
const MCP_PATH_FIELDS    = ['path', 'file_path', 'filePath', 'target', 'target_path'] as const;
const MCP_CONTENT_FIELDS = ['content', 'new_string', 'query', 'sql'] as const;

function buildDenyMessage(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
  redact = false,
): string {
  const evidenceLine = redact
    ? `<redacted: ${pattern.id}>`
    : (evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence);

  return [
    `Blocked: ${pattern.id} — ${pattern.label} on ${toolKind}`,
    `Evidence: ${evidenceLine}`,
    '',
    'Override: include `reviewed` anywhere in the tool call (command, content, or any visible string field).',
    'Alternative: use soft delete, dry-run, --force-with-lease, or a staging environment.',
  ].join('\n');
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

/**
 * Test a file path against DANGEROUS_PATHS patterns.
 * Patterns anchored with ^ (basename-only) are tested against the basename.
 * All patterns are also tested against the full path.
 */
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
 * contains `reviewed` at a word boundary.
 *
 * Intentionally restricted to fields rendered in the IDE UI so the agent
 * cannot silently self-assert the override via hidden metadata fields
 * such as `description`.
 */
export function hasReviewedOverride(
  input: Readonly<Record<string, unknown>>,
  toolName: string,
): boolean {
  const fields = toolName.startsWith('mcp__')
    ? MCP_OVERRIDE_FIELDS
    : (OVERRIDE_FIELDS_BY_TOOL[toolName] ?? MCP_OVERRIDE_FIELDS);

  return fields.some(f => {
    const v = input[f];
    if (typeof v === 'string') return REVIEWED_RE.test(v);
    if (Array.isArray(v)) {
      return v.some(item => {
        if (typeof item === 'string') return REVIEWED_RE.test(item);
        if (item && typeof item === 'object') {
          return Object.values(item as Record<string, unknown>)
            .some(inner => typeof inner === 'string' && REVIEWED_RE.test(inner));
        }
        return false;
      });
    }
    return false;
  });
}

function evalBash(ctx: HookContext): HookResult {
  const command = ctx.toolInput.command;
  if (typeof command !== 'string') return null;
  const matched = matchPatterns(DANGEROUS_BASH, command);
  if (!matched) return null;
  return deny(buildDenyMessage(matched, 'bash', command));
}

function evalWrite(ctx: HookContext): HookResult {
  const filePath = ctx.toolInput.file_path;
  const content  = ctx.toolInput.content;
  if (typeof filePath !== 'string' || typeof content !== 'string') return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, 'write', filePath));

  const contentMatch = matchPatterns(DANGEROUS_CONTENT, content);
  if (contentMatch) return deny(buildDenyMessage(contentMatch, 'write', content, true));

  return null;
}

function evalEdit(ctx: HookContext): HookResult {
  const filePath  = ctx.toolInput.file_path;
  const newString = ctx.toolInput.new_string;
  if (typeof filePath !== 'string' || typeof newString !== 'string') return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, 'edit', filePath));

  const contentMatch = matchPatterns(DANGEROUS_CONTENT, newString);
  if (contentMatch) return deny(buildDenyMessage(contentMatch, 'edit', newString, true));

  return null;
}

function evalMultiEdit(ctx: HookContext): HookResult {
  const filePath = ctx.toolInput.file_path;
  const edits    = ctx.toolInput.edits;
  if (typeof filePath !== 'string' || !Array.isArray(edits)) return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, 'multi-edit', filePath));

  for (const edit of edits) {
    const contentMatch = matchPatterns(DANGEROUS_CONTENT, edit.new_string);
    if (contentMatch) return deny(buildDenyMessage(contentMatch, 'multi-edit', edit.new_string, true));
  }

  return null;
}

function evalMcpCall(ctx: HookContext): HookResult {
  const input = ctx.toolInput;

  for (const f of MCP_SHELL_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const m = matchPatterns(DANGEROUS_BASH, v);
      if (m) return deny(buildDenyMessage(m, ctx.toolName, v));
    }
  }

  for (const f of MCP_PATH_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const m = matchDangerousPath(v);
      if (m) return deny(buildDenyMessage(m, ctx.toolName, v));
    }
  }

  for (const f of MCP_CONTENT_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const m = matchPatterns(DANGEROUS_CONTENT, v);
      if (m) return deny(buildDenyMessage(m, ctx.toolName, v, true));
    }
  }

  return null;
}

/** Inner pattern-only evaluation — no override check, no IO. */
function evalPatternRaw(ctx: HookContext): HookResult {
  switch (ctx.toolKind) {
    case 'bash':       return evalBash(ctx);
    case 'write':      return evalWrite(ctx);
    case 'edit':       return evalEdit(ctx);
    case 'multi-edit': return evalMultiEdit(ctx);
    case 'mcp-call':   return evalMcpCall(ctx);
    default:           return null;
  }
}

/**
 * Pure evaluation function for the dangerous-actions hook.
 * Returns a deny HookResult if dangerous, null if safe.
 * No IO or side effects.
 *
 * @internal Used by unit tests. Production entry point is `dangerousActionsHook`
 * in `dangerous-actions.ts`, which adds cooldown (Layer B) and audit (Layer C).
 */
export function evaluateDangerous(ctx: HookContext): HookResult {
  const result = evalPatternRaw(ctx);
  if (result === null) return null;
  if (hasReviewedOverride(ctx.toolInput as Record<string, unknown>, ctx.toolName)) return null;
  return result;
}

/**
 * Pattern-only evaluation — no override check.
 * Used by the hook entry point so cooldown logic can interpose between
 * pattern detection and override resolution.
 */
export function evalPatternOnly(ctx: HookContext): HookResult {
  return evalPatternRaw(ctx);
}
