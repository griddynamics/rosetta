"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exitCodeFor = exports.dedupKey = exports.detectIDE = exports.formatOutput = exports.normalize = exports.readStdin = void 0;
// Slim adapter for core-cursor bundle — only cursor detection, zero other IDE code.
const cursor_1 = require("../adapters/cursor");
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
const normalize = (rawInput) => cursor_1.cursor.normalize(rawInput);
exports.normalize = normalize;
const formatOutput = (canonical, _ide) => cursor_1.cursor.formatOutput(canonical);
exports.formatOutput = formatOutput;
const detectIDE = (_raw) => 'cursor';
exports.detectIDE = detectIDE;
const dedupKey = (_raw, _hookName) => null;
exports.dedupKey = dedupKey;
// Cursor's exit-0 + permission:"deny" JSON deny is confirmed working and field-selective
// (docs/hooks/cursor.md Run 1+3); pairing exit-2 with the body dumps it raw/unparsed instead
// (Run 4) — strictly worse. No adapter override; deny stays carried in the JSON body alone.
const exitCodeFor = (_canonical, _ide) => 0;
exports.exitCodeFor = exitCodeFor;
