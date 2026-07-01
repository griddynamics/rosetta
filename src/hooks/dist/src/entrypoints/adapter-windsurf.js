"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exitCodeFor = exports.dedupKey = exports.detectIDE = exports.formatOutput = exports.normalize = exports.readStdin = void 0;
// Slim adapter for core-windsurf bundle — only windsurf detection, zero other IDE code.
const windsurf_1 = require("../adapters/windsurf");
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
const normalize = (rawInput) => windsurf_1.windsurf.normalize(rawInput);
exports.normalize = normalize;
const formatOutput = (canonical, _ide) => windsurf_1.windsurf.formatOutput(canonical);
exports.formatOutput = formatOutput;
const detectIDE = (_raw) => 'windsurf';
exports.detectIDE = detectIDE;
const dedupKey = (_raw, _hookName) => null;
exports.dedupKey = dedupKey;
// Windsurf never parses stdout (docs/hooks/windsurf.md, verified) — blocking is exit-code-only.
const exitCodeFor = (canonical, _ide) => windsurf_1.windsurf.exitCode(canonical);
exports.exitCodeFor = exitCodeFor;
