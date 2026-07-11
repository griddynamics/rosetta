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

/** The write-time field an override marker should be appended to, by tool kind.
 *  MCP tools (toolKind is the mcp__… name) fall through to the generic wording. */
function overrideField(toolKind: string): string {
  switch (toolKind) {
    case 'bash':       return '`command`';
    case 'write':      return '`content`';
    case 'edit':       return '`new_string`';
    case 'multi-edit': return '`new_string` (in the relevant `edits[]` entry)';
    default:           return 'the relevant string';
  }
}

/** Soft-deny message (policy 'reconsider'). Per the review directive the message is
 *  intentionally minimal: a static generic reason, one coaching line, and how to
 *  override. It NEVER echoes the command/payload — the AI already knows what it ran. */
function buildReconsiderDenyMessage(pattern: DangerPattern, toolKind: string): string {
  return [
    `Dangerous action [${pattern.id}]: ${pattern.reason}`,
    'Check blast radius / recoverability first.',
    `Override: append \`# Rosetta-AI-reviewed\` comment to the ${overrideField(toolKind)} field if intended.`,
  ].join('\n');
}

/** Non-blocking safety nudge (policy 'advise'). Warns without denying — the action
 *  still proceeds. Same minimal shape: static reason, no evidence echo. */
function buildAdviseMessage(pattern: DangerPattern): string {
  return [
    `Heads-up [${pattern.id}]: ${pattern.reason}`,
    'Non-blocking notice — confirm this is intended before proceeding.',
  ].join('\n');
}

/** Build the hook result for a matched pattern, dispatching on its policy tier.
 *  'advise' → non-blocking notice; 'reconsider' → soft-deny (overridable). */
function buildResultForPattern(pattern: DangerPattern, toolKind: string): HookResult {
  if (pattern.policy === 'advise') {
    return advise(buildAdviseMessage(pattern));
  }
  return deny(buildReconsiderDenyMessage(pattern, toolKind));
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

/**
 * Evaluate a shell command string against the two pattern sets that apply to a
 * free-form command:
 *   1. DANGEROUS_BASH    — command patterns (rm, git push --force, …)
 *   2. DANGEROUS_CONTENT — destructive SQL embedded in the command (e.g. psql -c "DROP …")
 * Bash patterns are checked first so a command's primary danger (e.g. rm) is the
 * one surfaced. Shared by the Bash tool and MCP shell fields so both get identical coverage.
 *
 * NOTE: DANGEROUS_PATHS is intentionally NOT scanned here. Those are advise-tier
 * key/credential-file notices; a direct Write/Edit to such a file is still caught by
 * matchDangerousPath in evalWrite/evalEdit. Extracting path targets from a free-form
 * shell string (redirects, quoting) added real complexity for only that narrow,
 * non-blocking case, so it was dropped.
 */
function evalShellString(command: string, toolKind: string): PatternHit {
  const bashPattern = matchPatterns(DANGEROUS_BASH, command);
  if (bashPattern) return { result: buildResultForPattern(bashPattern, toolKind), pattern: bashPattern };

  const contentPattern = matchPatterns(DANGEROUS_CONTENT, command);
  if (contentPattern) return { result: buildResultForPattern(contentPattern, toolKind), pattern: contentPattern };

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
    if (pattern) return { result: buildResultForPattern(pattern, 'write'), pattern };
  }
  const content = ctx.toolInput.content;
  if (typeof content === 'string') {
    const pattern = matchPatterns(DANGEROUS_CONTENT, content);
    if (pattern) return { result: buildResultForPattern(pattern, 'write'), pattern };
  }
  return { result: null, pattern: null };
}

function evalEdit(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildResultForPattern(pattern, 'edit'), pattern };
  }
  const newString = ctx.toolInput.new_string;
  if (typeof newString === 'string') {
    const pattern = matchPatterns(DANGEROUS_CONTENT, newString);
    if (pattern) return { result: buildResultForPattern(pattern, 'edit'), pattern };
  }
  return { result: null, pattern: null };
}

function evalMultiEdit(ctx: HookContext): PatternHit {
  const filePath = ctx.toolInput.file_path;
  if (typeof filePath === 'string') {
    const pattern = matchDangerousPath(filePath);
    if (pattern) return { result: buildResultForPattern(pattern, 'multi-edit'), pattern };
  }
  const edits = ctx.toolInput.edits;
  if (Array.isArray(edits)) {
    for (const edit of edits) {
      if (edit && typeof edit === 'object') {
        const ns = (edit as Record<string, unknown>).new_string;
        if (typeof ns === 'string') {
          const pattern = matchPatterns(DANGEROUS_CONTENT, ns);
          if (pattern) return { result: buildResultForPattern(pattern, 'multi-edit'), pattern };
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
      if (pattern) return { result: buildResultForPattern(pattern, ctx.toolName), pattern };
    }
  }
  for (const f of MCP_CONTENT_FIELDS) {
    const v = input[f];
    if (typeof v === 'string') {
      const pattern = matchPatterns(DANGEROUS_CONTENT, v);
      if (pattern) return { result: buildResultForPattern(pattern, ctx.toolName), pattern };
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
