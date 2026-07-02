"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stderrMessageFor = exports.exitCodeFor = exports.detectIDE = exports.formatOutput = exports.normalize = exports.readStdin = void 0;
// Slim adapter for core-copilot bundle — copilot-only, zero other IDE code.
// The copilot adapter itself handles both Copilot CLI's camelCase fire (toolName/toolArgs)
// and the snake_case fire shared by VS Code + Copilot CLI's PascalCase fire (hook_event_name/
// tool_name/tool_input) — see docs/hooks/copilot.md and adapters/copilot.ts.
const copilot_1 = require("../adapters/copilot");
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
const normalize = (rawInput) => copilot_1.copilot.normalize(rawInput);
exports.normalize = normalize;
const formatOutput = (canonical, _ide) => copilot_1.copilot.formatOutput(canonical);
exports.formatOutput = formatOutput;
const detectIDE = (_raw) => 'copilot';
exports.detectIDE = detectIDE;
// Copilot deny is carried entirely in the JSON body at exit 0 — no adapter override needed.
const exitCodeFor = (_canonical, _ide) => 0;
exports.exitCodeFor = exitCodeFor;
const stderrMessageFor = (_canonical, _ide) => undefined;
exports.stderrMessageFor = stderrMessageFor;
