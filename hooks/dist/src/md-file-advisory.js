"use strict";
// md-file-advisory.ts — PostToolUse hook that advises AI when a .md file
// is created outside standard Rosetta documentation locations.
//
// Standard locations: docs/, agents/, plans/, refsrc/, README.md, CHANGELOG.md
// Temp dirs (agent-temp/, agents/TEMP/, .tmp/, tmp/) are silently skipped.
//
// Exports (for testability): shouldCheck, shouldAdvisory, isMarkdown, isInTempDir,
// matchesAllowedPattern, buildAdvisoryOutput, advisoryMessage
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = exports.buildAdvisoryOutput = exports.shouldAdvisory = exports.matchesAllowedPattern = exports.isInTempDir = exports.isMarkdown = exports.shouldCheck = exports.advisoryMessage = void 0;
const path_1 = __importDefault(require("path"));
const adapter_1 = require("./adapter");
const debug_log_1 = require("./debug-log");
const advisoryMessage = (filePath) => {
    const name = path_1.default.basename(filePath);
    return `[Rosetta Advisory] ${name} is created in non-standard location, think if it is truly needed or you should have updated existing file.`;
};
exports.advisoryMessage = advisoryMessage;
const ALLOWED_PREFIXES = ['docs/', 'agents/', 'plans/', 'refsrc/'];
const ALLOWED_BASENAMES = ['README.md', 'CHANGELOG.md'];
const ALLOWED_TOOLS = new Set([
    'Write', 'Edit', 'apply_patch', 'functions.apply_patch',
    'create_file', 'replace_string_in_file', 'multi_replace_string_in_file',
]);
// ---------------------------------------------------------------------------
const shouldCheck = (normalizedInput) => {
    if (normalizedInput.hook_event_name !== 'PostToolUse') {
        (0, debug_log_1.debugLog)('skip: not PostToolUse', { hook_event_name: normalizedInput.hook_event_name });
        return false;
    }
    if (!ALLOWED_TOOLS.has(normalizedInput.tool_name)) {
        (0, debug_log_1.debugLog)('skip: tool not in ALLOWED_TOOLS', { tool_name: normalizedInput.tool_name });
        return false;
    }
    return true;
};
exports.shouldCheck = shouldCheck;
// ---------------------------------------------------------------------------
const isMarkdown = (filePath) => filePath.toLowerCase().endsWith('.md');
exports.isMarkdown = isMarkdown;
const isInTempDir = (normalizedPath) => {
    const segments = normalizedPath.toLowerCase().split('/');
    return segments.some((seg) => {
        const parts = seg.split(/[-_.]/);
        return parts.some((p) => p === 'temp' || p === 'tmp');
    });
};
exports.isInTempDir = isInTempDir;
const matchesAllowedPattern = (normalizedPath) => {
    for (const prefix of ALLOWED_PREFIXES) {
        if (normalizedPath.startsWith(prefix))
            return true;
    }
    const basename = path_1.default.basename(normalizedPath);
    return ALLOWED_BASENAMES.includes(basename);
};
exports.matchesAllowedPattern = matchesAllowedPattern;
// Strips leading slash and ./ to produce a repo-relative path for pattern matching.
const toRelative = (filePath) => {
    let p = filePath.replace(/\\/g, '/');
    if (p.startsWith('/'))
        p = p.slice(1);
    if (p.startsWith('./'))
        p = p.slice(2);
    return p;
};
const shouldAdvisory = (filePath) => {
    if (!filePath)
        return false;
    const rel = toRelative(filePath);
    if (!(0, exports.isMarkdown)(rel))
        return false;
    if ((0, exports.isInTempDir)(rel))
        return false;
    if ((0, exports.matchesAllowedPattern)(rel))
        return false;
    return true;
};
exports.shouldAdvisory = shouldAdvisory;
const buildAdvisoryOutput = (hookEventName, filePath) => ({
    hookSpecificOutput: {
        hookEventName,
        permissionDecision: 'allow',
        additionalContext: (0, exports.advisoryMessage)(filePath),
    },
});
exports.buildAdvisoryOutput = buildAdvisoryOutput;
// ---------------------------------------------------------------------------
const main = async ({ stdin = process.stdin, stdout = process.stdout, } = {}) => {
    try {
        const raw = await (0, adapter_1.readStdin)(stdin);
        const ide = (0, adapter_1.detectIDE)(raw);
        const normalized = (0, adapter_1.normalize)(raw);
        (0, debug_log_1.debugLog)('md-file-advisory input', { ide, tool_name: normalized.tool_name, hook_event_name: normalized.hook_event_name });
        if (!(0, exports.shouldCheck)(normalized)) {
            (0, debug_log_1.debugLog)('skipped (shouldCheck=false)');
            return;
        }
        const filePath = normalized.file_path ?? '';
        if ((0, exports.shouldAdvisory)(filePath)) {
            const canonical = (0, exports.buildAdvisoryOutput)(normalized.hook_event_name, filePath);
            const output = (0, adapter_1.formatOutput)(canonical, ide);
            (0, debug_log_1.debugLog)('md-file-advisory advisory emitted', { filePath });
            stdout.write(JSON.stringify(output));
        }
    }
    catch (_) {
        // Advisory-only — never block agent execution.
    }
};
exports.main = main;
if (require.main === module) {
    (0, exports.main)().then(() => process.exit(0), (err) => {
        process.stderr.write(`md-file-advisory hook error: ${err.message}\n`);
        process.exit(1);
    });
}
