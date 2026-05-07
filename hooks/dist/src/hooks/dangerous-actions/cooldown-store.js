"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashCall = hashCall;
exports.recordDeny = recordDeny;
exports.isWithinCooldown = isWithinCooldown;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const COOLDOWN_MS = 5_000;
function storePath(cwd) {
    return path_1.default.join(cwd, '.claude', 'state', 'dangerous-actions-cooldown.json');
}
function loadStore(cwd) {
    try {
        return JSON.parse(fs_1.default.readFileSync(storePath(cwd), 'utf8'));
    }
    catch {
        return {};
    }
}
function saveStore(cwd, store, now) {
    const p = storePath(cwd);
    try {
        fs_1.default.mkdirSync(path_1.default.dirname(p), { recursive: true });
        const pruned = Object.fromEntries(Object.entries(store).filter(([, v]) => now - v.ts < COOLDOWN_MS * 4));
        fs_1.default.writeFileSync(p, JSON.stringify(pruned));
    }
    catch {
        // Silently fail — if cwd is not writable, cooldown is skipped but execution proceeds.
    }
}
/**
 * Hash a tool call, stripping `reviewed` from all string values so that
 * "rm -rf /tmp" and "rm -rf /tmp # reviewed" produce the same hash.
 * This allows detecting the self-bypass pattern where the same dangerous
 * command is retried with the override added.
 */
function hashCall(toolName, toolInput) {
    const normalized = JSON.stringify(toolInput, (_, v) => typeof v === 'string' && /\breviewed\b/i.test(v)
        ? v.replace(/\s*#\s*\breviewed\b\s*/gi, '').replace(/\breviewed\b/gi, '').trim()
        : v);
    return crypto_1.default.createHash('sha1').update(`${toolName}:${normalized}`).digest('hex');
}
/** Record a deny event for the given hash at `now` (defaults to Date.now()). */
function recordDeny(cwd, hash, now = Date.now()) {
    const store = loadStore(cwd);
    store[hash] = { ts: now };
    saveStore(cwd, store, now);
}
/**
 * Returns true if the given hash was denied within the last COOLDOWN_MS (5 seconds).
 * `now` parameter can be overridden for testing.
 */
function isWithinCooldown(cwd, hash, now = Date.now()) {
    const store = loadStore(cwd);
    const rec = store[hash];
    return !!rec && now - rec.ts < COOLDOWN_MS;
}
