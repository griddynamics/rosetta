"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exitCodeFor = exports.dedupKey = exports.detectIDE = exports.formatOutput = exports.normalize = exports.readStdin = void 0;
// Slim adapter for core-codex bundle — only codex detection, zero other IDE code.
const codex_1 = require("../adapters/codex");
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
const normalize = (rawInput) => codex_1.codex.normalize(rawInput);
exports.normalize = normalize;
const formatOutput = (canonical, _ide) => codex_1.codex.formatOutput(canonical);
exports.formatOutput = formatOutput;
const detectIDE = (_raw) => 'codex';
exports.detectIDE = detectIDE;
const dedupKey = (_raw, _hookName) => null;
exports.dedupKey = dedupKey;
// Codex deny is carried entirely in the JSON body at exit 0 — no adapter override needed.
const exitCodeFor = (_canonical, _ide) => 0;
exports.exitCodeFor = exitCodeFor;
