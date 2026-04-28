"use strict";
// gitnexus-refresh.ts — PostToolUse hook that silently re-indexes GitNexus after file edits.
//
// Fires after every Edit / Write / MultiEdit tool call.
// Spawns `gitnexus analyze` detached in the background with a 5-second
// debounce so multi-file edit waves coalesce into one re-index.
//
// Rules:
//  - No stdout output — the agent must never see this hook.
//  - Logs go to ~/.cache/gitnexus/refresh.log only.
//  - No-ops immediately if .gitnexus/ is not found in the repo tree.
//  - Opt-in: only active when installed by the user (not auto-loaded).
//
// Exports (for testability): main
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const adapter_1 = require("./adapter");
const DEBOUNCE_MS = 5000;
const findRepoRoot = (startDir) => {
    let dir = startDir;
    for (let i = 0; i < 10; i++) {
        if (fs_1.default.existsSync(path_1.default.join(dir, '.gitnexus')))
            return dir;
        const parent = path_1.default.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return null;
};
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
const shouldTrigger = (cacheDir, repoRoot) => {
    const key = Buffer.from(repoRoot).toString('base64').replace(/[/+=]/g, '_');
    const stampFile = path_1.default.join(cacheDir, `${key}.lastrun`);
    try {
        const stat = fs_1.default.statSync(stampFile);
        if (Date.now() - stat.mtimeMs < DEBOUNCE_MS)
            return false;
    }
    catch {
        // stamp doesn't exist yet — first run
    }
    fs_1.default.writeFileSync(stampFile, String(Date.now()));
    return true;
};
const spawnAnalyze = (repoRoot, cacheDir) => {
    let hadEmbeddings = false;
    try {
        const meta = JSON.parse(fs_1.default.readFileSync(path_1.default.join(repoRoot, '.gitnexus', 'meta.json'), 'utf-8'));
        hadEmbeddings = !!(meta.stats && meta.stats.embeddings > 0);
    }
    catch {
        // no meta — proceed without embeddings flag
    }
    const args = hadEmbeddings
        ? ['gitnexus', 'analyze', '--force', '--embeddings']
        : ['gitnexus', 'analyze', '--force'];
    const logFile = path_1.default.join(cacheDir, 'refresh.log');
    let out;
    try {
        out = fs_1.default.openSync(logFile, 'a');
    }
    catch {
        return;
    }
    try {
        const child = (0, child_process_1.spawn)('npx', args, {
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
const main = async () => {
    let input;
    try {
        const raw = await (0, adapter_1.readStdin)();
        input = (0, adapter_1.normalize)(raw);
    }
    catch {
        // Unknown IDE, empty stdin, or parse failure — exit silently
        return;
    }
    if (input.hook_event_name !== 'PostToolUse')
        return;
    const tool = input.tool_name ?? '';
    if (!/^(Edit|Write|MultiEdit)$/.test(tool))
        return;
    const cwd = input.cwd ?? process.cwd();
    const repoRoot = findRepoRoot(cwd);
    if (!repoRoot)
        return;
    const cacheDir = ensureCacheDir();
    if (!shouldTrigger(cacheDir, repoRoot))
        return;
    log(cacheDir, `[gitnexus-refresh] triggering analyze (tool=${tool}, cwd=${cwd})`);
    spawnAnalyze(repoRoot, cacheDir);
};
exports.main = main;
if (require.main === module) {
    (0, exports.main)().then(() => process.exit(0), (err) => {
        process.stderr.write(`gitnexus-refresh hook error: ${err.message}\n`);
        process.exit(1);
    });
}
