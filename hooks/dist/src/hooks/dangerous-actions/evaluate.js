"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAIReviewedMarker = hasAIReviewedMarker;
exports.evalPatternAndPolicy = evalPatternAndPolicy;
exports.evaluateDangerous = evaluateDangerous;
// # Rosetta-reviewed: pattern definitions only — not executable SQL/shell
const result_helpers_1 = require("../../runtime/result-helpers");
const debug_log_1 = require("../../runtime/debug-log");
const patterns_1 = require("./patterns");
/**
 * Matches `# Rosetta-AI-reviewed` preceded by whitespace or at line start.
 * Both `#` and `Rosetta-AI-reviewed` must be separated by at least one space.
 * Examples: `rm -rf /tmp  # Rosetta-AI-reviewed`, `-- # Rosetta-AI-reviewed`
 */
const MARKER_RE = /(?:^|\s)#\s+Rosetta-AI-reviewed\b/;
const EVIDENCE_MAX = 120;
/** User-visible fields accepted for the `# Rosetta-AI-reviewed` marker, by tool name. */
const MARKER_FIELDS_BY_TOOL = {
    Bash: ['command'],
    Write: ['content', 'file_path'],
    Edit: ['new_string', 'old_string', 'file_path'],
    MultiEdit: ['file_path', 'edits'],
};
const MCP_MARKER_FIELDS = ['command', 'sql', 'query', 'new_string', 'content'];
const MCP_SHELL_FIELDS = ['command', 'cmd', 'shell_command'];
const MCP_PATH_FIELDS = ['path', 'file_path', 'filePath', 'target', 'target_path'];
const MCP_CONTENT_FIELDS = ['content', 'new_string', 'query', 'sql'];
function buildReconsiderDenyMessage(pattern, toolKind, evidence, redact = false) {
    const evidenceLine = redact
        ? `<redacted: ${pattern.id}>`
        : (evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence);
    const retryLines = toolKind === 'bash'
        ? [
            'retry with `# Rosetta-AI-reviewed` appended to the command.',
            '',
            'Example: `rm -rf /tmp/cache  # Rosetta-AI-reviewed`',
            '(SQL via bash: use `-- # Rosetta-AI-reviewed`; spaces around `#` are required)',
        ]
        : toolKind === 'write' || toolKind === 'edit' || toolKind === 'multi-edit'
            ? [
                'retry with `# Rosetta-AI-reviewed` added as a trailing comment in `new_string`.',
                '',
                'Example: `DROP TABLE old_events; -- # Rosetta-AI-reviewed`',
                '(spaces around `#` are required)',
            ]
            : [
                'retry with `# Rosetta-AI-reviewed` appended to the relevant string field.',
                '(spaces around `#` are required)',
            ];
    return [
        `Blocked: ${pattern.id} — ${pattern.label} on ${toolKind}`,
        `Evidence: ${evidenceLine}`,
        `Reason: ${pattern.reason}`,
        '',
        'If you have considered the blast radius and confirm this is intentional,',
        ...retryLines,
    ].join('\n');
}
function buildHardDenyMessage(pattern, toolKind, evidence, redact = false) {
    const evidenceLine = redact
        ? `<redacted: ${pattern.id}>`
        : (evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence);
    return [
        `HARD-DENY: ${pattern.id} — ${pattern.label} on ${toolKind}`,
        `Evidence: ${evidenceLine}`,
        `Reason: ${pattern.reason}`,
        '',
        'This pattern cannot be bypassed by `# Rosetta-AI-reviewed`. Human review required.',
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
 * contains the retry marker `# Rosetta-AI-reviewed`.
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
function evalBash(ctx) {
    const command = ctx.toolInput.command;
    if (typeof command !== 'string')
        return { result: null, pattern: null };
    const pattern = matchPatterns(patterns_1.DANGEROUS_BASH, command);
    if (!pattern)
        return { result: null, pattern: null };
    return { result: buildDenyForPattern(pattern, 'bash', command), pattern };
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
            const pattern = matchPatterns(patterns_1.DANGEROUS_BASH, v);
            if (pattern)
                return { result: buildDenyForPattern(pattern, ctx.toolName, v), pattern };
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
