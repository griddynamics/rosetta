"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAIReviewedMarker = hasAIReviewedMarker;
exports.evalPatternAndPolicy = evalPatternAndPolicy;
exports.evaluateDangerous = evaluateDangerous;
// Rosetta-AI-reviewed: pattern definitions only — not executable SQL/shell
const result_helpers_1 = require("../../runtime/result-helpers");
const debug_log_1 = require("../../runtime/debug-log");
const patterns_1 = require("./patterns");
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
const MARKER_FIELDS_BY_TOOL = {
    Bash: ['command'],
    Write: ['content'],
    Edit: ['new_string'],
    MultiEdit: ['edits'],
};
const MCP_MARKER_FIELDS = ['command', 'sql', 'query', 'new_string', 'content'];
const MCP_SHELL_FIELDS = ['command', 'cmd', 'shell_command'];
const MCP_PATH_FIELDS = ['path', 'file_path', 'filePath', 'target', 'target_path'];
const MCP_CONTENT_FIELDS = ['content', 'new_string', 'query', 'sql'];
/** Render the `Evidence:` line: show what was actually flagged, truncated to a cap.
 *  The hook is a tripwire, not a gateway — it never hides or rewrites the payload. */
function renderEvidence(evidence) {
    return evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence;
}
function buildReconsiderDenyMessage(pattern, toolKind, evidence) {
    const evidenceLine = renderEvidence(evidence);
    const overrideExample = toolKind === 'bash'
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
function buildAdviseMessage(pattern, toolKind, evidence) {
    const evidenceLine = renderEvidence(evidence);
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
function buildResultForPattern(pattern, toolKind, evidence) {
    if (pattern.policy === 'advise') {
        return (0, result_helpers_1.advise)(buildAdviseMessage(pattern, toolKind, evidence));
    }
    return (0, result_helpers_1.deny)(buildReconsiderDenyMessage(pattern, toolKind, evidence));
}
function matchPatterns(patterns, value) {
    for (const p of patterns) {
        if (p.re.test(value))
            return p;
    }
    return null;
}
function matchDangerousPath(filePath) {
    const normalizedPath = filePath.replace(/\/+$/, '');
    const basename = normalizedPath.split('/').pop() ?? normalizedPath;
    for (const p of patterns_1.DANGEROUS_PATHS) {
        if (p.re.test(normalizedPath))
            return p;
        if (p.re.test(basename))
            return p;
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
function hasAIReviewedMarker(input, toolName) {
    const fields = toolName.startsWith('mcp__')
        ? MCP_MARKER_FIELDS
        : (MARKER_FIELDS_BY_TOOL[toolName] ?? MCP_MARKER_FIELDS);
    return fields.some(f => {
        const v = input[f];
        if (typeof v === 'string')
            return MARKER_RE.test(v);
        if (Array.isArray(v)) {
            return v.some(item => {
                if (typeof item === 'string')
                    return MARKER_RE.test(item);
                if (item && typeof item === 'object') {
                    return Object.values(item)
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
function evalShellString(command, toolKind) {
    const bashPattern = matchPatterns(patterns_1.DANGEROUS_BASH, command);
    if (bashPattern)
        return { result: buildResultForPattern(bashPattern, toolKind, command), pattern: bashPattern };
    const contentPattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, command);
    if (contentPattern)
        return { result: buildResultForPattern(contentPattern, toolKind, command), pattern: contentPattern };
    return { result: null, pattern: null };
}
function evalBash(ctx) {
    const command = ctx.toolInput.command;
    if (typeof command !== 'string')
        return { result: null, pattern: null };
    return evalShellString(command, 'bash');
}
function evalWrite(ctx) {
    const filePath = ctx.toolInput.file_path;
    if (typeof filePath === 'string') {
        const pattern = matchDangerousPath(filePath);
        if (pattern)
            return { result: buildResultForPattern(pattern, 'write', filePath), pattern };
    }
    const content = ctx.toolInput.content;
    if (typeof content === 'string') {
        const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, content);
        if (pattern)
            return { result: buildResultForPattern(pattern, 'write', content), pattern };
    }
    return { result: null, pattern: null };
}
function evalEdit(ctx) {
    const filePath = ctx.toolInput.file_path;
    if (typeof filePath === 'string') {
        const pattern = matchDangerousPath(filePath);
        if (pattern)
            return { result: buildResultForPattern(pattern, 'edit', filePath), pattern };
    }
    const newString = ctx.toolInput.new_string;
    if (typeof newString === 'string') {
        const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, newString);
        if (pattern)
            return { result: buildResultForPattern(pattern, 'edit', newString), pattern };
    }
    return { result: null, pattern: null };
}
function evalMultiEdit(ctx) {
    const filePath = ctx.toolInput.file_path;
    if (typeof filePath === 'string') {
        const pattern = matchDangerousPath(filePath);
        if (pattern)
            return { result: buildResultForPattern(pattern, 'multi-edit', filePath), pattern };
    }
    const edits = ctx.toolInput.edits;
    if (Array.isArray(edits)) {
        for (const edit of edits) {
            if (edit && typeof edit === 'object') {
                const ns = edit.new_string;
                if (typeof ns === 'string') {
                    const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, ns);
                    if (pattern)
                        return { result: buildResultForPattern(pattern, 'multi-edit', ns), pattern };
                }
            }
        }
    }
    return { result: null, pattern: null };
}
function evalMcpCall(ctx) {
    const input = ctx.toolInput;
    for (const f of MCP_SHELL_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
            const hit = evalShellString(v, ctx.toolName);
            if (hit.pattern)
                return hit;
        }
    }
    for (const f of MCP_PATH_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
            const pattern = matchDangerousPath(v);
            if (pattern)
                return { result: buildResultForPattern(pattern, ctx.toolName, v), pattern };
        }
    }
    for (const f of MCP_CONTENT_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
            const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, v);
            if (pattern)
                return { result: buildResultForPattern(pattern, ctx.toolName, v), pattern };
        }
    }
    return { result: null, pattern: null };
}
/** Single traversal: detects the first matching pattern and returns both deny result and pattern. */
function detectDanger(ctx) {
    switch (ctx.toolKind) {
        case 'bash': return evalBash(ctx);
        case 'write': return evalWrite(ctx);
        case 'edit': return evalEdit(ctx);
        case 'multi-edit': return evalMultiEdit(ctx);
        case 'mcp-call': return evalMcpCall(ctx);
        default: return { result: null, pattern: null };
    }
}
/** Returns both the deny result and the matched pattern for policy-aware callers. */
function evalPatternAndPolicy(ctx) {
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
function evaluateDangerous(ctx) {
    const { result, pattern } = evalPatternAndPolicy(ctx);
    if (result === null) {
        (0, debug_log_1.debugLogHookBranch)('dangerous-actions', 'no-match-allow', {
            toolKind: ctx.toolKind,
            toolName: ctx.toolName,
        });
        return null;
    }
    // Non-blocking advise-tier notices are always surfaced (marker is irrelevant).
    // There is no hard-deny tier — the hook only soft-denies (reconsider) or advises.
    if (pattern?.policy === 'advise') {
        (0, debug_log_1.debugLogHookBranch)('dangerous-actions', 'advise', {
            toolKind: ctx.toolKind,
            toolName: ctx.toolName,
            patternId: pattern.id,
            patternLabel: pattern.label,
        });
        return result;
    }
    const input = ctx.toolInput;
    if (hasAIReviewedMarker(input, ctx.toolName)) {
        (0, debug_log_1.debugLogHookBranch)('dangerous-actions', 'ai-reviewed-marker-honored', {
            toolKind: ctx.toolKind,
            toolName: ctx.toolName,
            patternId: pattern?.id ?? null,
            patternLabel: pattern?.label ?? null,
        });
        return null;
    }
    (0, debug_log_1.debugLogHookBranch)('dangerous-actions', 'reconsider-deny', {
        toolKind: ctx.toolKind,
        toolName: ctx.toolName,
        patternId: pattern?.id ?? null,
        patternLabel: pattern?.label ?? null,
    });
    return result;
}
