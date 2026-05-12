// # Rosetta-reviewed: pattern definitions only — not executable SQL/shell
import { deny } from '../../runtime/result-helpers';
import { debugLog } from '../../runtime/debug-log';
import type { HookContext, HookResult } from '../../runtime/types';
import {
  DANGEROUS_BASH,
  DANGEROUS_CONTENT,
  DANGEROUS_PATHS,
  type DangerPattern,
} from './patterns';

/** Regex that matches `# Rosetta-AI-reviewed` (must follow whitespace or appear at line start). */
const MARKER_RE = /(?:^|\s)#\s+Rosetta-AI-reviewed\b/;

const EVIDENCE_MAX = 120;

/** User-visible fields accepted for the `# Rosetta-AI-reviewed` marker, by tool name. */
const MARKER_FIELDS_BY_TOOL: Readonly<Record<string, readonly string[]>> = {
  Bash:      ['command'],
  Write:     ['content', 'file_path'],
  Edit:      ['new_string', 'old_string', 'file_path'],
  MultiEdit: ['file_path', 'edits'],
};

const MCP_MARKER_FIELDS = ['command', 'sql', 'query', 'new_string', 'content'] as const;

const MCP_SHELL_FIELDS   = ['command', 'cmd', 'shell_command'] as const;
const MCP_PATH_FIELDS    = ['path', 'file_path', 'filePath', 'target', 'target_path'] as const;
const MCP_CONTENT_FIELDS = ['content', 'new_string', 'query', 'sql'] as const;

function buildReconsiderDenyMessage(
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
    `Reason: ${pattern.reason}`,
    '',
    'If you have considered the blast radius and confirm this is intentional,',
    'retry with `# Rosetta-AI-reviewed` appended to the command.',
    '',
    'Example: `rm -rf /tmp/cache  # Rosetta-AI-reviewed`',
    '(SQL fields: use `-- # Rosetta-AI-reviewed` or `/* # Rosetta-AI-reviewed */`)',
    '',
    'See `skills/dangerous-actions` for the retry protocol.',
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
    'This pattern cannot be bypassed by `# Rosetta-AI-reviewed`. Human review required.',
    'If you genuinely need this operation, ask the user explicitly with full blast-radius',
    'analysis before retrying.',
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

/** Finds the first matched DangerPattern for a given context, mirroring evalPatternRaw logic. */
function findMatchedPattern(ctx: HookContext): DangerPattern | null {
  const input = ctx.toolInput;
  switch (ctx.toolKind) {
    case 'bash': {
      const cmd = input.command;
      return typeof cmd === 'string' ? matchPatterns(DANGEROUS_BASH, cmd) : null;
    }
    case 'write': {
      const fp = input.file_path;
      if (typeof fp === 'string') {
        const m = matchDangerousPath(fp);
        if (m) return m;
      }
      const content = input.content;
      return typeof content === 'string' ? matchPatterns(DANGEROUS_CONTENT, content) : null;
    }
    case 'edit': {
      const fp = input.file_path;
      if (typeof fp === 'string') {
        const m = matchDangerousPath(fp);
        if (m) return m;
      }
      const ns = input.new_string;
      return typeof ns === 'string' ? matchPatterns(DANGEROUS_CONTENT, ns) : null;
    }
    case 'multi-edit': {
      const fp = input.file_path;
      if (typeof fp === 'string') {
        const m = matchDangerousPath(fp);
        if (m) return m;
      }
      const edits = input.edits;
      if (Array.isArray(edits)) {
        for (const e of edits) {
          const m = matchPatterns(DANGEROUS_CONTENT, e.new_string);
          if (m) return m;
        }
      }
      return null;
    }
    case 'mcp-call': {
      for (const f of MCP_SHELL_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
          const m = matchPatterns(DANGEROUS_BASH, v);
          if (m) return m;
        }
      }
      for (const f of MCP_PATH_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
          const m = matchDangerousPath(v);
          if (m) return m;
        }
      }
      for (const f of MCP_CONTENT_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
          const m = matchPatterns(DANGEROUS_CONTENT, v);
          if (m) return m;
        }
      }
      return null;
    }
    default: return null;
  }
}

/**
 * Returns true if any user-visible string field for the given tool name
 * contains the retry marker `# Rosetta-AI-reviewed`.
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

function evalBash(ctx: HookContext): HookResult {
  const command = ctx.toolInput.command;
  if (typeof command !== 'string') return null;
  const matched = matchPatterns(DANGEROUS_BASH, command);
  if (!matched) return null;
  return buildDenyForPattern(matched, 'bash', command);
}

function evalWrite(ctx: HookContext): HookResult {
  const filePath = ctx.toolInput.file_path;
  const content  = ctx.toolInput.content;
  if (typeof filePath !== 'string' || typeof content !== 'string') return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return buildDenyForPattern(pathMatch, 'write', filePath);

  const contentMatch = matchPatterns(DANGEROUS_CONTENT, content);
  if (contentMatch) return buildDenyForPattern(contentMatch, 'write', content, true);

  return null;
}

function evalEdit(ctx: HookContext): HookResult {
  const filePath  = ctx.toolInput.file_path;
  const newString = ctx.toolInput.new_string;
  if (typeof filePath !== 'string' || typeof newString !== 'string') return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return buildDenyForPattern(pathMatch, 'edit', filePath);

  const contentMatch = matchPatterns(DANGEROUS_CONTENT, newString);
  if (contentMatch) return buildDenyForPattern(contentMatch, 'edit', newString, true);

  return null;
}

function evalMultiEdit(ctx: HookContext): HookResult {
  const filePath = ctx.toolInput.file_path;
  const edits    = ctx.toolInput.edits;
  if (typeof filePath !== 'string' || !Array.isArray(edits)) return null;

  const pathMatch = matchDangerousPath(filePath);
  if (pathMatch) return buildDenyForPattern(pathMatch, 'multi-edit', filePath);

  for (const edit of edits) {
    const contentMatch = matchPatterns(DANGEROUS_CONTENT, edit.new_string);
    if (contentMatch) return buildDenyForPattern(contentMatch, 'multi-edit', edit.new_string, true);
  }

  return null;
}

function evalMcpCall(ctx: HookContext): HookResult {
  const input = ctx.toolInput;

  for (const f of MCP_SHELL_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const m = matchPatterns(DANGEROUS_BASH, v);
      if (m) return buildDenyForPattern(m, ctx.toolName, v);
    }
  }

  for (const f of MCP_PATH_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const m = matchDangerousPath(v);
      if (m) return buildDenyForPattern(m, ctx.toolName, v);
    }
  }

  for (const f of MCP_CONTENT_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const m = matchPatterns(DANGEROUS_CONTENT, v);
      if (m) return buildDenyForPattern(m, ctx.toolName, v, true);
    }
  }

  return null;
}

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
 * Pure evaluation for the dangerous-actions hook.
 * Applies policy tier: hard-deny patterns block regardless of marker.
 * Returns null if safe (no match or marker honored on reconsider-tier pattern).
 *
 * @internal Used by unit tests.
 */
export function evaluateDangerous(ctx: HookContext): HookResult {
  const result = evalPatternRaw(ctx);
  if (result === null) return null;

  const pattern = findMatchedPattern(ctx);
  if (pattern?.policy === 'hard-deny') return result;

  const input = ctx.toolInput as Record<string, unknown>;
  if (hasAIReviewedMarker(input, ctx.toolName)) {
    debugLog('[dangerous-actions] AI-reviewed marker honored', { toolName: ctx.toolName });
    return null;
  }
  return result;
}

/** Returns both the deny result and the matched pattern for policy-aware callers. */
export function evalPatternAndPolicy(ctx: HookContext): { result: HookResult; pattern: DangerPattern | null } {
  return { result: evalPatternRaw(ctx), pattern: findMatchedPattern(ctx) };
}
