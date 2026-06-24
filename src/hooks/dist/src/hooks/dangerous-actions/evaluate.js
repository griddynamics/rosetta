"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAIReviewedMarker = hasAIReviewedMarker;
exports.evalPatternAndPolicy = evalPatternAndPolicy;
exports.evaluateDangerous = evaluateDangerous;
// Rosetta-AI-reviewed: pattern definitions only — not executable SQL/shell
const result_helpers_1 = require("../../runtime/result-helpers");
const debug_log_1 = require("../../runtime/debug-log");
const patterns_1 = require("./patterns");
// Global copies of the secret detectors, for replace-all scrubbing. Built once
// from `.source` so the stateful `g` flag never leaks back into the shared
// (`.test()`-based) pattern objects.
const SECRET_SCRUB_RES = patterns_1.SECRET_VALUE_PATTERNS.map((re) => new RegExp(re.source, 'g'));
/** Replace any secret value found in `text` with `<redacted>`. Returns `text`
 *  unchanged when it contains no secret, so non-secret evidence is unaffected. */
function redactSecrets(text) {
    let out = text;
    for (const re of SECRET_SCRUB_RES)
        out = out.replace(re, '<redacted>');
    return out;
}
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
/** Render the `Evidence:` line. `redact` (content branch) hides the whole payload;
 *  otherwise the evidence is shown but with any embedded secret scrubbed first, then
 *  truncated — so bash/path/MCP-shell denials never echo a credential back. */
function renderEvidence(pattern, evidence, redact) {
    if (redact)
        return `<redacted: ${pattern.id}>`;
    const scrubbed = redactSecrets(evidence);
    return scrubbed.length > EVIDENCE_MAX ? scrubbed.slice(0, EVIDENCE_MAX) + '…' : scrubbed;
}
function buildReconsiderDenyMessage(pattern, toolKind, evidence, redact = false) {
    const evidenceLine = renderEvidence(pattern, evidence, redact);
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
function buildHardDenyMessage(pattern, toolKind, evidence, redact = false) {
    const evidenceLine = renderEvidence(pattern, evidence, redact);
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
function buildDenyForPattern(pattern, toolKind, evidence, redact = false) {
    const msg = pattern.policy === 'hard-deny'
        ? buildHardDenyMessage(pattern, toolKind, evidence, redact)
        : buildReconsiderDenyMessage(pattern, toolKind, evidence, redact);
    return (0, result_helpers_1.deny)(msg);
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
function stripQuotes(s) {
    return s.replace(/^['"]+|['"]+$/g, '');
}
/**
 * Extract path-like candidates from a shell command so DANGEROUS_PATHS (some of
 * which are anchored to a basename, e.g. `^id_rsa$`) can be applied without
 * misfiring on arbitrary words. A token is a candidate only if it is:
 *   (a) a redirection target — the file after `>`, `>>`, `>|`, `2>`, … — or
 *   (b) any token containing a `/` (i.e. it actually looks like a path), or
 *   (c) an UNQUOTED leading-dot token (`vim .env`, `cat .pgpass`).
 * So `> ~/.ssh/id_rsa`, `cat foo/.env` and a bare `vim .env` are checked, but a
 * bare `id_rsa` in a commit message — and a `.env` inside a quoted string — are
 * not, avoiding false hard-denies on names that merely appear in text.
 */
function extractPathCandidates(command) {
    const candidates = new Set();
    // (a) Redirection targets: optional fd, `>`/`>>`, optional `|`, then the target.
    const redirectRe = /(?:^|[\s;&|()`])\d*>>?\|?\s*("[^"]*"|'[^']*'|[^\s;&|<>()]+)/g;
    let m;
    while ((m = redirectRe.exec(command)) !== null) {
        const target = stripQuotes(m[1]);
        if (target)
            candidates.add(target);
    }
    // (b) Any whitespace/operator-delimited token that contains a path separator.
    for (const raw of command.split(/[\s;&|()`]+/)) {
        const tok = stripQuotes(raw).replace(/^[<>]+/, '');
        if (tok.includes('/'))
            candidates.add(tok);
    }
    // (c) Bare leading-dot tokens used as a direct argument (e.g. `vim .env`,
    //     `cat .pgpass`). Quoted regions are blanked first so a sensitive name
    //     inside a commit message / string (`git commit -m "fix .env"`) is NOT
    //     matched — keeping these (often hard-deny) names free of false positives.
    const unquoted = command.replace(/"[^"]*"|'[^']*'/g, ' ');
    for (const raw of unquoted.split(/[\s;&|()`]+/)) {
        const tok = raw.replace(/^[<>]+/, '');
        if (tok.startsWith('.') && !tok.includes('/'))
            candidates.add(tok);
    }
    return [...candidates];
}
/**
 * Evaluate a shell command string against ALL THREE pattern sets (G-1):
 *   1. DANGEROUS_BASH  — command patterns (rm, git push --force, …)
 *   2. DANGEROUS_PATHS — applied to path candidates the command writes to / uses
 *   3. DANGEROUS_CONTENT — secret values / destructive SQL embedded in the command
 * Bash patterns are checked first so a command's primary danger (e.g. rm) is the
 * one surfaced; an embedded secret in the evidence is still scrubbed by renderEvidence.
 * Shared by the Bash tool and MCP shell fields so both get identical coverage.
 */
function evalShellString(command, toolKind) {
    const bashPattern = matchPatterns(patterns_1.DANGEROUS_BASH, command);
    if (bashPattern)
        return { result: buildDenyForPattern(bashPattern, toolKind, command), pattern: bashPattern };
    for (const candidate of extractPathCandidates(command)) {
        const pathPattern = matchDangerousPath(candidate);
        if (pathPattern)
            return { result: buildDenyForPattern(pathPattern, toolKind, command), pattern: pathPattern };
    }
    const contentPattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, command);
    if (contentPattern)
        return { result: buildDenyForPattern(contentPattern, toolKind, command), pattern: contentPattern };
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
            return { result: buildDenyForPattern(pattern, 'write', filePath), pattern };
    }
    const content = ctx.toolInput.content;
    if (typeof content === 'string') {
        const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, content);
        if (pattern)
            return { result: buildDenyForPattern(pattern, 'write', content, true), pattern };
    }
    return { result: null, pattern: null };
}
function evalEdit(ctx) {
    const filePath = ctx.toolInput.file_path;
    if (typeof filePath === 'string') {
        const pattern = matchDangerousPath(filePath);
        if (pattern)
            return { result: buildDenyForPattern(pattern, 'edit', filePath), pattern };
    }
    const newString = ctx.toolInput.new_string;
    if (typeof newString === 'string') {
        const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, newString);
        if (pattern)
            return { result: buildDenyForPattern(pattern, 'edit', newString, true), pattern };
    }
    return { result: null, pattern: null };
}
function evalMultiEdit(ctx) {
    const filePath = ctx.toolInput.file_path;
    if (typeof filePath === 'string') {
        const pattern = matchDangerousPath(filePath);
        if (pattern)
            return { result: buildDenyForPattern(pattern, 'multi-edit', filePath), pattern };
    }
    const edits = ctx.toolInput.edits;
    if (Array.isArray(edits)) {
        for (const edit of edits) {
            if (edit && typeof edit === 'object') {
                const ns = edit.new_string;
                if (typeof ns === 'string') {
                    const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, ns);
                    if (pattern)
                        return { result: buildDenyForPattern(pattern, 'multi-edit', ns, true), pattern };
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
                return { result: buildDenyForPattern(pattern, ctx.toolName, v), pattern };
        }
    }
    for (const f of MCP_CONTENT_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
            const pattern = matchPatterns(patterns_1.DANGEROUS_CONTENT, v);
            if (pattern)
                return { result: buildDenyForPattern(pattern, ctx.toolName, v, true), pattern };
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
 * Applies policy tier: hard-deny patterns block regardless of marker.
 * Returns null if safe (no match or marker honored on reconsider-tier pattern).
 *
 * @internal Used by unit tests.
 */
function evaluateDangerous(ctx) {
    const { result, pattern } = evalPatternAndPolicy(ctx);
    if (result === null)
        return null;
    if (pattern?.policy === 'hard-deny')
        return result;
    const input = ctx.toolInput;
    if (hasAIReviewedMarker(input, ctx.toolName)) {
        (0, debug_log_1.debugLog)('[dangerous-actions] AI-reviewed marker honored', { toolName: ctx.toolName });
        return null;
    }
    return result;
}
