// Rosetta-AI-reviewed: pattern definitions only — not executable SQL/shell
import { advise, deny } from '../../runtime/result-helpers';
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

/** Render the `Evidence:` line. `redact` (content branch) hides the whole payload
 *  (it can be large / arbitrary); otherwise the evidence is shown, truncated to a cap. */
function renderEvidence(pattern: DangerPattern, evidence: string, redact: boolean): string {
  if (redact) return `<redacted: ${pattern.id}>`;
  return evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence;
}

function buildReconsiderDenyMessage(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
  redact = false,
): string {
  const evidenceLine = renderEvidence(pattern, evidence, redact);

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

/** Non-blocking safety nudge (policy 'advise'). Warns the agent about an
 *  irreversible-loss action without denying it — the action still proceeds. */
function buildAdviseMessage(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
  redact = false,
): string {
  const evidenceLine = renderEvidence(pattern, evidence, redact);

  return [
    `Heads-up: ${pattern.label} on ${toolKind} [${pattern.id}]`,
    `Evidence: ${evidenceLine}`,
    `Reason: ${pattern.reason}`,
    '',
    'This is a non-blocking safety notice, not a block. Confirm this is intended — ' +
      'that you are not clobbering a file the user still needs — before proceeding.',
  ].join('\n');
}

/** Build the hook result for a matched pattern, dispatching on its policy tier.
 *  'advise' → non-blocking notice; 'reconsider' → soft-deny (overridable). */
function buildResultForPattern(
  pattern: DangerPattern,
  toolKind: string,
  evidence: string,
  redact = false,
): HookResult {
  if (pattern.policy === 'advise') {
    return advise(buildAdviseMessage(pattern, toolKind, evidence, redact));
  }
  return deny(buildReconsiderDenyMessage(pattern, toolKind, evidence, redact));
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

function stripQuotes(s: string): string {
  return s.replace(/^['"]+|['"]+$/g, '');
}

/**
 * Extract path-like candidates from a shell command so DANGEROUS_PATHS (some of
 * which are anchored to a basename, e.g. `^id_rsa$`) can be applied without
 * misfiring on arbitrary words. A token is a candidate only if it is:
 *   (a) a redirection target — the file after `>`, `>>`, `>|`, `2>`, … — or
 *   (b) any token containing a `/` (i.e. it actually looks like a path), or
 *   (c) an UNQUOTED leading-dot token (`cat .pgpass`).
 * So `> ~/.ssh/id_rsa` and a bare `cat .pgpass` are checked, but a bare `id_rsa`
 * in a commit message — and a sensitive name inside a quoted string — are not,
 * avoiding false notices on names that merely appear in text.
 */
function extractPathCandidates(command: string): string[] {
  const candidates = new Set<string>();

  // (a) Redirection targets: optional fd, `>`/`>>`, optional `|`, then the target.
  const redirectRe = /(?:^|[\s;&|()`])\d*>>?\|?\s*("[^"]*"|'[^']*'|[^\s;&|<>()]+)/g;
  let m: RegExpExecArray | null;
  while ((m = redirectRe.exec(command)) !== null) {
    const target = stripQuotes(m[1]);
    if (target) candidates.add(target);
  }

  // (b) Any whitespace/operator-delimited token that contains a path separator.
  for (const raw of command.split(/[\s;&|()`]+/)) {
    const tok = stripQuotes(raw).replace(/^[<>]+/, '');
    if (tok.includes('/')) candidates.add(tok);
  }

  // (c) Bare leading-dot tokens used as a direct argument (e.g. `cat .pgpass`).
  //     Quoted regions are blanked first so a sensitive name inside a commit
  //     message / string (`git commit -m "fix .pgpass"`) is NOT matched —
  //     keeping these names free of false positives.
  const unquoted = command.replace(/"[^"]*"|'[^']*'/g, ' ');
  for (const raw of unquoted.split(/[\s;&|()`]+/)) {
    const tok = raw.replace(/^[<>]+/, '');
    if (tok.startsWith('.') && !tok.includes('/')) candidates.add(tok);
  }

  return [...candidates];
}

/**
 * Evaluate a shell command string against ALL THREE pattern sets (G-1):
 *   1. DANGEROUS_BASH  — command patterns (rm, git push --force, …)
 *   2. DANGEROUS_PATHS — path candidates the command writes to (advise-tier notices)
 *   3. DANGEROUS_CONTENT — destructive SQL embedded in the command
 * Bash patterns are checked first so a command's primary danger (e.g. rm) is the
 * one surfaced. Shared by the Bash tool and MCP shell fields so both get identical coverage.
 */
function evalShellString(command: string, toolKind: string): PatternHit {
  const bashPattern = matchPatterns(DANGEROUS_BASH, command);
  if (bashPattern) return { result: buildResultForPattern(bashPattern, toolKind, command), pattern: bashPattern };

  for (const candidate of extractPathCandidates(command)) {
    const pathPattern = matchDangerousPath(candidate);
    if (pathPattern) return { result: buildResultForPattern(pathPattern, toolKind, command), pattern: pathPattern };
  }

  const contentPattern = matchPatterns(DANGEROUS_CONTENT, command);
  if (contentPattern) return { result: buildResultForPattern(contentPattern, toolKind, command), pattern: contentPattern };

  return { result: null, pattern: null };
}

function evalBash(ctx: HookContext): PatternHit {
  const command = ctx.toolInput.command;
  if (typeof command !== 'string') return { result: null, pattern: null };
  return evalShellString(command, 'bash');
}

function evalWrite(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildResultForPattern(pattern, 'write', filePath), pattern };
  }
  const content = ctx.toolInput.content;
  if (typeof content === 'string') {
    const pattern = matchPatterns(DANGEROUS_CONTENT, content);
    if (pattern) return { result: buildResultForPattern(pattern, 'write', content, true), pattern };
  }
  return { result: null, pattern: null };
}

function evalEdit(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildResultForPattern(pattern, 'edit', filePath), pattern };
  }
  const newString = ctx.toolInput.new_string;
  if (typeof newString === 'string') {
    const pattern = matchPatterns(DANGEROUS_CONTENT, newString);
    if (pattern) return { result: buildResultForPattern(pattern, 'edit', newString, true), pattern };
  }
  return { result: null, pattern: null };
}

function evalMultiEdit(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildResultForPattern(pattern, 'multi-edit', filePath), pattern };
  }
  const edits = ctx.toolInput.edits;
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      if (edit && typeof edit === 'object') {
        const ns = (edit as Record<string, unknown>).new_string;
        if (typeof ns === 'string') {
          const pattern = matchPatterns(DANGEROUS_CONTENT, ns);
          if (pattern) return { result: buildResultForPattern(pattern, 'multi-edit', ns, true), pattern };
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
      const hit = evalShellString(v, ctx.toolName);
      if (hit.pattern) return hit;
    }
  }
  for (const f of MCP_PATH_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const pattern = matchDangerousPath(v);
      if (pattern) return { result: buildResultForPattern(pattern, ctx.toolName, v), pattern };
    }
  }
  for (const f of MCP_CONTENT_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const pattern = matchPatterns(DANGEROUS_CONTENT, v);
      if (pattern) return { result: buildResultForPattern(pattern, ctx.toolName, v, true), pattern };
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
 * Applies policy tier:
 *   - 'advise'    → non-blocking notice, always surfaced (marker is irrelevant).
 *   - 'reconsider'→ soft-deny: block this attempt unless the AI-reviewed marker is
 *                   present (the AI can re-issue with it, or stop and ask the user).
 * The hook never hard-denies — a determined, user-sanctioned action is always
 * reachable via the marker. Returns null if safe (no match or marker honored).
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

  // Non-blocking advise-tier notices are always surfaced (marker is irrelevant).
  // There is no hard-deny tier — the hook only soft-denies (reconsider) or advises.
  if (pattern?.policy === 'advise') {
    debugLogHookBranch('dangerous-actions', 'advise', {
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
