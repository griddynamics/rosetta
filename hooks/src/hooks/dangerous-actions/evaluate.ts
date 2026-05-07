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
 * Returns true if any string value in toolInput (including nested array items)
 * contains the word `reviewed` at a word boundary.
 */
function hasReviewedOverride(input: Readonly<Record<string, unknown>>): boolean {
  for (const v of Object.values(input)) {
    if (typeof v === 'string') {
      if (REVIEWED_RE.test(v)) return true;
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string' && REVIEWED_RE.test(item)) return true;
        if (item && typeof item === 'object') {
          for (const inner of Object.values(item as Record<string, unknown>)) {
            if (typeof inner === 'string' && REVIEWED_RE.test(inner)) return true;
          }
        }
      }
    }
  }
  return false;
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

/**
 * Pure evaluation function for the dangerous-actions hook.
 * Returns a HookResult (deny) if the context is dangerous, or null if safe.
 * No IO or side effects.
 */
export function evaluateDangerous(ctx: HookContext): HookResult {
  const result = (() => {
    switch (ctx.toolKind) {
      case 'bash':       return evalBash(ctx);
      case 'write':      return evalWrite(ctx);
      case 'edit':       return evalEdit(ctx);
      case 'multi-edit': return evalMultiEdit(ctx);
      case 'mcp-call':   return evalMcpCall(ctx);
      default:           return null;
    }
  })();
  if (result === null) return null;
  if (hasReviewedOverride(ctx.toolInput)) return null;
  return result;
}
