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
exports.buildAdvisoryOutput = exports.shouldAdvisory = exports.matchesAllowedPattern = exports.isInTempDir = exports.isMarkdown = exports.shouldCheck = exports.advisoryMessage = void 0;
const path_1 = __importDefault(require("path"));
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const result_helpers_1 = require("../runtime/result-helpers");
const debug_log_1 = require("../runtime/debug-log");
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
const mdFileAdvisoryHook = (0, define_hook_1.defineHook)({
    name: 'md-file-advisory',
    on: { event: 'PostToolUse', toolKinds: ['write', 'edit', 'multi-edit', 'patch', 'create', 'replace'] },
    run: (ctx) => {
        if (!(0, exports.shouldAdvisory)(ctx.filePath))
            return null;
        (0, debug_log_1.debugLog)('md-file-advisory advisory', { filePath: ctx.filePath });
        return (0, result_helpers_1.advise)((0, exports.advisoryMessage)(ctx.filePath));
    },
});
exports.default = mdFileAdvisoryHook;
if (require.main === module) {
    (0, run_hook_1.runHook)(mdFileAdvisoryHook).then(() => process.exit(0), (err) => {
        process.stderr.write(`md-file-advisory hook error: ${err.message}\n`);
        process.exit(1);
    });
}
