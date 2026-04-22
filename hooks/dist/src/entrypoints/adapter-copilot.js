"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatOutput = exports.normalize = exports.readStdin = void 0;
// Slim adapter for core-copilot bundle — copilot detection with claude-code fallback.
// VS Code may send either Copilot-specific format (toolName) or Claude-compatible format
// (hook_event_name). The fallback handles both without including codex/cursor/windsurf.
const copilot_1 = require("../adapters/copilot");
const claude_code_1 = require("../adapters/claude-code");
const readStdin = (stream = process.stdin) => new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(String(chunk)));
    stream.on('end', () => {
        const raw = chunks.join('').trim();
        if (!raw)
            return reject(new Error('Invalid input: empty stdin'));
        try {
            resolve(JSON.parse(raw));
        }
        catch (err) {
            reject(new Error(`JSON parse error: ${err.message}`));
        }
    });
    stream.on('error', reject);
});
exports.readStdin = readStdin;
const normalize = (rawInput) => {
    const raw = rawInput;
    return copilot_1.copilot.detect(raw) ? copilot_1.copilot.normalize(raw) : claude_code_1.claudeCode.normalize(raw);
};
exports.normalize = normalize;
const formatOutput = (canonical, _ide) => copilot_1.copilot.formatOutput(canonical);
exports.formatOutput = formatOutput;
