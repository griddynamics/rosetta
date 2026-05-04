"use strict";
// gitnexus-refresh.ts — PostToolUse hook that silently re-indexes GitNexus after file edits.
//
// Fires after every Edit / Write / MultiEdit tool call.
// Uses trailing-edge debounce: spawns a deferred process that sleeps for
// DEBOUNCE_MS, then only runs `gitnexus analyze` if no newer invocation
// has occurred. This ensures multi-file edit bursts coalesce into a single
// re-index that fires after the burst ends.
//
// Rules:
//  - No stdout output — the agent must never see this hook.
//  - Logs go to ~/.cache/gitnexus/refresh.log only.
//  - No-ops immediately if .gitnexus/ is not found in the repo tree.
//  - Opt-in: only active when installed by the user (not auto-loaded).
//
// Exports (for testability): gitnexusRefreshHook, DEBOUNCE_MS
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gitnexusRefreshHook = exports.DEBOUNCE_MS = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const define_hook_1 = require("../runtime/define-hook");
const run_hook_1 = require("../runtime/run-hook");
const result_helpers_1 = require("../runtime/result-helpers");
const debug_log_1 = require("../runtime/debug-log");
exports.DEBOUNCE_MS = 5000;
const ensureCacheDir = () => {
    const dir = path_1.default.join(os_1.default.homedir(), '.cache', 'gitnexus');
    fs_1.default.mkdirSync(dir, { recursive: true });
    return dir;
};
const log = (cacheDir, message) => {
    try {
        const ts = new Date().toISOString();
        fs_1.default.appendFileSync(path_1.default.join(cacheDir, 'refresh.log'), `${ts}  ${message}\n`);
    }
    catch {
        // logging must never crash the hook
    }
};
const stampKeyForRepo = (repoRoot) => Buffer.from(repoRoot).toString('base64').replace(/[/+=]/g, '_');
const writePendingStamp = (cacheDir, repoRoot) => {
    const key = stampKeyForRepo(repoRoot);
    const stampFile = path_1.default.join(cacheDir, `${key}.pending`);
    const token = String(Date.now());
    fs_1.default.writeFileSync(stampFile, token);
    return { stampFile, token };
};
const getEmbeddingsFlag = (repoRoot) => {
    try {
        const meta = JSON.parse(fs_1.default.readFileSync(path_1.default.join(repoRoot, '.gitnexus', 'meta.json'), 'utf-8'));
        return !!(meta.stats && meta.stats.embeddings > 0);
    }
    catch {
        return false;
    }
};
const spawnDeferredAnalyze = (repoRoot, cacheDir, stampFile, token) => {
    const hadEmbeddings = getEmbeddingsFlag(repoRoot);
    const extraFlags = hadEmbeddings ? ' --embeddings' : '';
    const debounceSeconds = Math.ceil(exports.DEBOUNCE_MS / 1000);
    // The deferred script sleeps, then checks if the stamp file still holds the
    // token written at spawn time. A newer invocation overwrites the file with a
    // different token, so all but the last deferred process exit early.
    const nodeScript = [
        `const fs = require('fs');`,
        `try {`,
        `  const current = fs.readFileSync('${stampFile}', 'utf-8').trim();`,
        `  if (current !== '${token}') process.exit(0);`,
        `  require('child_process').execSync(`,
        `    'npx gitnexus analyze --force${extraFlags}',`,
        `    { cwd: '${repoRoot.replace(/'/g, "'\\''")}', stdio: 'inherit' }`,
        `  );`,
        `} catch(e) {`,
        `  fs.appendFileSync('${path_1.default.join(cacheDir, 'refresh.log').replace(/'/g, "'\\''")}',`,
        `    new Date().toISOString() + '  [gitnexus-refresh] deferred error: ' + (e.message||e) + '\\n');`,
        `}`,
    ].join(' ');
    const script = `sleep ${debounceSeconds} && node -e "${nodeScript}"`;
    const logFile = path_1.default.join(cacheDir, 'refresh.log');
    let out;
    try {
        out = fs_1.default.openSync(logFile, 'a');
    }
    catch {
        return;
    }
    try {
        const child = (0, child_process_1.spawn)('sh', ['-c', script], {
            cwd: repoRoot,
            detached: true,
            stdio: ['ignore', out, out],
        });
        child.unref();
    }
    catch (err) {
        log(cacheDir, `[gitnexus-refresh] spawn failed: ${err.message}`);
    }
    finally {
        fs_1.default.closeSync(out);
    }
};
exports.gitnexusRefreshHook = (0, define_hook_1.defineHook)({
    name: 'gitnexus-refresh',
    on: {
        event: 'PostToolUse',
        toolKinds: ['write', 'edit', 'multi-edit'],
        fs: { nearestMarker: '.gitnexus' },
    },
    run: (ctx) => {
        const repoRoot = ctx.markerRoot;
        const cacheDir = ensureCacheDir();
        const { stampFile, token } = writePendingStamp(cacheDir, repoRoot);
        (0, debug_log_1.debugLog)('[gitnexus-refresh] pending analyze', { tool: ctx.toolName, cwd: ctx.cwd });
        log(cacheDir, `[gitnexus-refresh] pending analyze (tool=${ctx.toolName}, cwd=${ctx.cwd})`);
        spawnDeferredAnalyze(repoRoot, cacheDir, stampFile, token);
        return (0, result_helpers_1.sideEffect)();
    },
});
(0, run_hook_1.runAsCli)(exports.gitnexusRefreshHook, module);
