import { deny } from '../runtime/result-helpers';
import type { HookContext, HookResult } from '../runtime/types';
import {
  DANGEROUS_BASH,
  DANGEROUS_CONTENT,
  DANGEROUS_PATHS,
  type DangerPattern,
} from './dangerous-actions-patterns';

/** Regex that matches `# reviewed` as a standalone shell comment token. */
const REVIEWED_RE = /(?:^|\s)#\s*reviewed(?:\s|:|$)/;

/** Max length of the evidence snippet shown in deny messages. */
const EVIDENCE_MAX = 120;

function buildDenyMessage(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
): string {
  const snippet = evidence.length > EVIDENCE_MAX
    ? evidence.slice(0, EVIDENCE_MAX) + '…'
    : evidence;

  return [
    'Blocked by rosetta dangerous-actions hook.',
    '',
    `Rule:     ${pattern.id} — ${pattern.label}`,
    `Tool:     ${toolKind}`,
    `Evidence: ${snippet}`,
    '',
    'Did you consider this as a dangerous activity?',
    '',
    'To proceed (Bash only): re-issue the command with a `# reviewed` shell',
    'comment, e.g. `<command> # reviewed: <one-line reason>`. Doing so asserts',
    'on behalf of the user that this destructive operation is intentional.',
    '',
    'For Write/Edit/MultiEdit there is no inline override — ask the user to',
    'confirm in chat, then retry. Consider also: is there a non-destructive',
    'alternative (soft delete, dry-run, --force-with-lease, staging env)?',
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
    // Test full path first (covers patterns with / in them like aws-credentials)
    if (p.re.test(filePath)) return p;
    // Test basename for patterns anchored at start (e.g. ^\.env)
    if (p.re.test(basename)) return p;
  }
  return null;
}

function evalBash(ctx: HookContext): HookResult {
  const command = ctx.toolInput.command;
  if (typeof command !== 'string') return null;
  const matched = matchPatterns(DANGEROUS_BASH, command);
  if (!matched) return null;

  // Allow inline override: `# reviewed` as a shell comment token
  if (REVIEWED_RE.test(command)) return null;

  return deny(buildDenyMessage(matched, 'bash', command));
}

function evalWrite(ctx: HookContext): HookResult {
  const filePath = ctx.toolInput.file_path;
  const content  = ctx.toolInput.content;
  if (typeof filePath !== 'string' || typeof content !== 'string') return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, 'write', filePath));

  const contentMatch = matchPatterns(DANGEROUS_CONTENT, content);
  if (contentMatch) return deny(buildDenyMessage(contentMatch, 'write', content));

  return null;
}

function evalEdit(ctx: HookContext): HookResult {
  const filePath  = ctx.toolInput.file_path;
  const newString = ctx.toolInput.new_string;
  if (typeof filePath !== 'string' || typeof newString !== 'string') return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return deny(buildDenyMessage(pathMatch, 'edit', filePath));

  const contentMatch = matchPatterns(DANGEROUS_CONTENT, newString);
  if (contentMatch) return deny(buildDenyMessage(contentMatch, 'edit', newString));

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
    if (contentMatch) return deny(buildDenyMessage(contentMatch, 'multi-edit', edit.new_string));
  }

  return null;
}

/**
 * Pure evaluation function for the dangerous-actions hook.
 * Returns a HookResult (deny) if the context is dangerous, or null if safe.
 * No IO or side effects.
 */
export function evaluateDangerous(ctx: HookContext): HookResult {
  switch (ctx.toolKind) {
    case 'bash':       return evalBash(ctx);
    case 'write':      return evalWrite(ctx);
    case 'edit':       return evalEdit(ctx);
    case 'multi-edit': return evalMultiEdit(ctx);
    default:           return null;
  }
}
