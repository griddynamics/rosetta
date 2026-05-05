"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateDangerous = evaluateDangerous;
const result_helpers_1 = require("../../runtime/result-helpers");
const patterns_1 = require("./patterns");
/** Regex that matches `# reviewed` as a standalone shell comment token. */
const REVIEWED_RE = /(?:^|\s)#\s*reviewed(?:\s|:|$)/;
/** Max length of the evidence snippet shown in deny messages. */
const EVIDENCE_MAX = 120;
const MCP_SHELL_FIELDS = ['command', 'cmd', 'shell_command'];
const MCP_PATH_FIELDS = ['path', 'file_path', 'filePath', 'target', 'target_path'];
const MCP_CONTENT_FIELDS = ['content', 'text', 'new_string', 'query', 'sql'];
function buildDenyMessage(pattern, toolKind, evidence, redact = false) {
    const evidenceLine = redact
        ? `<redacted: ${pattern.id}>`
        : (evidence.length > EVIDENCE_MAX ? evidence.slice(0, EVIDENCE_MAX) + '…' : evidence);
    return [
        'Blocked by rosetta dangerous-actions hook.',
        '',
        `Rule:     ${pattern.id} — ${pattern.label}`,
        `Tool:     ${toolKind}`,
        `Evidence: ${evidenceLine}`,
        '',
        'Did you consider this a dangerous activity?',
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
function matchPatterns(patterns, value) {
    for (const p of patterns) {
        if (p.re.test(value))
            return p;
    }
    return null;
}
/**
 * Test a file path against DANGEROUS_PATHS patterns.
 * Patterns anchored with ^ (basename-only) are tested against the basename.
 * All patterns are also tested against the full path.
 */
function matchDangerousPath(filePath) {
    const normalizedPath = filePath.replace(/\/+$/, '');
    const basename = normalizedPath.split('/').pop() ?? normalizedPath;
    for (const p of patterns_1.DANGEROUS_PATHS) {
        // Test full path first (covers patterns with / in them like aws-credentials)
        if (p.re.test(normalizedPath))
            return p;
        // Test basename for patterns anchored at start (e.g. ^\.env)
        if (p.re.test(basename))
            return p;
    }
    return null;
}
function evalBash(ctx) {
    const command = ctx.toolInput.command;
    if (typeof command !== 'string')
        return null;
    const matched = matchPatterns(patterns_1.DANGEROUS_BASH, command);
    if (!matched)
        return null;
    // Allow inline override: `# reviewed` as a shell comment token
    if (REVIEWED_RE.test(command))
        return null;
    return (0, result_helpers_1.deny)(buildDenyMessage(matched, 'bash', command));
}
function evalWrite(ctx) {
    const filePath = ctx.toolInput.file_path;
    const content = ctx.toolInput.content;
    if (typeof filePath !== 'string' || typeof content !== 'string')
        return null;
    const pathMatch = matchDangerousPath(filePath);
    if (pathMatch)
        return (0, result_helpers_1.deny)(buildDenyMessage(pathMatch, 'write', filePath));
    const contentMatch = matchPatterns(patterns_1.DANGEROUS_CONTENT, content);
    if (contentMatch)
        return (0, result_helpers_1.deny)(buildDenyMessage(contentMatch, 'write', content, true));
    return null;
}
function evalEdit(ctx) {
    const filePath = ctx.toolInput.file_path;
    const newString = ctx.toolInput.new_string;
    if (typeof filePath !== 'string' || typeof newString !== 'string')
        return null;
    const pathMatch = matchDangerousPath(filePath);
    if (pathMatch)
        return (0, result_helpers_1.deny)(buildDenyMessage(pathMatch, 'edit', filePath));
    const contentMatch = matchPatterns(patterns_1.DANGEROUS_CONTENT, newString);
    if (contentMatch)
        return (0, result_helpers_1.deny)(buildDenyMessage(contentMatch, 'edit', newString, true));
    return null;
}
function evalMultiEdit(ctx) {
    const filePath = ctx.toolInput.file_path;
    const edits = ctx.toolInput.edits;
    if (typeof filePath !== 'string' || !Array.isArray(edits))
        return null;
    const pathMatch = matchDangerousPath(filePath);
    if (pathMatch)
        return (0, result_helpers_1.deny)(buildDenyMessage(pathMatch, 'multi-edit', filePath));
    for (const edit of edits) {
        const contentMatch = matchPatterns(patterns_1.DANGEROUS_CONTENT, edit.new_string);
        if (contentMatch)
            return (0, result_helpers_1.deny)(buildDenyMessage(contentMatch, 'multi-edit', edit.new_string, true));
    }
    return null;
}
function evalMcpCall(ctx) {
    const input = ctx.toolInput;
    for (const f of MCP_SHELL_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
            const m = matchPatterns(patterns_1.DANGEROUS_BASH, v);
            if (m) {
                return (0, result_helpers_1.deny)(buildDenyMessage(m, ctx.toolName, v));
            }
        }
    }
    for (const f of MCP_PATH_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
            const m = matchDangerousPath(v);
            if (m)
                return (0, result_helpers_1.deny)(buildDenyMessage(m, ctx.toolName, v));
        }
    }
    for (const f of MCP_CONTENT_FIELDS) {
        const v = input[f];
        if (typeof v === 'string') {
            const m = matchPatterns(patterns_1.DANGEROUS_CONTENT, v);
            if (m)
                return (0, result_helpers_1.deny)(buildDenyMessage(m, ctx.toolName, v, true));
        }
    }
    return null;
}
/**
 * Pure evaluation function for the dangerous-actions hook.
 * Returns a HookResult (deny) if the context is dangerous, or null if safe.
 * No IO or side effects.
 */
function evaluateDangerous(ctx) {
    switch (ctx.toolKind) {
        case 'bash': return evalBash(ctx);
        case 'write': return evalWrite(ctx);
        case 'edit': return evalEdit(ctx);
        case 'multi-edit': return evalMultiEdit(ctx);
        case 'mcp-call': return evalMcpCall(ctx);
        default: return null;
    }
}
