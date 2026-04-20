'use strict';
// adapter.js — Abstract IDE adapter orchestrator for Rosetta hooks
//
// Loads IDE-specific adapters from ./adapters/ and delegates detection,
// normalization, and output formatting to the matching adapter.
//
// Detection order (most specific → least specific):
//   1. codex        — CC fields + model + turn_id
//   2. cursor       — CC fields + conversation_id + cursor_version
//   3. claude-code  — CC fields (hook_event_name + tool_input + session_id)
//   4. windsurf     — agent_action_name + trajectory_id + tool_info
//   5. copilot      — toolName + timestamp + cwd (no hook_event_name)
//
// Exports (for testability): detectIDE, normalize, formatOutput, readStdin

const ADAPTERS = [
  require('./adapters/codex'),
  require('./adapters/cursor'),
  require('./adapters/claude-code'),
  require('./adapters/windsurf'),
  require('./adapters/copilot'),
];

/**
 * Detect which IDE sent the input.
 * @param {object} rawInput
 * @returns {string} IDE name
 * @throws {Error} for null/non-object input or unrecognized IDE shape
 */
function detectIDE(rawInput) {
  if (rawInput === null || rawInput === undefined) {
    throw new Error('Invalid input: null or undefined');
  }
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    throw new Error('Invalid input: expected a plain object');
  }
  const adapter = ADAPTERS.find((a) => a.detect(rawInput));
  if (!adapter) {
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(rawInput))}`);
  }
  return adapter.name;
}

/**
 * Normalize any IDE input to Claude Code canonical format.
 * @param {object} rawInput
 * @returns {object} canonical input
 * @throws {Error} for unsupported IDE shapes
 */
function normalize(rawInput) {
  const ide = detectIDE(rawInput); // throws for unsupported
  const adapter = ADAPTERS.find((a) => a.name === ide);
  return adapter.normalize(rawInput);
}

/**
 * Convert canonical output to IDE-specific output format.
 * @param {object} canonicalOutput
 * @param {string} ide
 * @returns {object}
 */
function formatOutput(canonicalOutput, ide) {
  const adapter = ADAPTERS.find((a) => a.name === ide);
  if (!adapter) return canonicalOutput; // unknown IDE: identity pass-through
  return adapter.formatOutput(canonicalOutput);
}

/**
 * Read and parse JSON from stdin (or injected stream for testing).
 * @param {import('stream').Readable} [stream]
 * @returns {Promise<object>}
 * @throws {Error} on empty or invalid JSON
 */
async function readStdin(stream = process.stdin) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(String(chunk)));
    stream.on('end', () => {
      const raw = chunks.join('').trim();
      if (!raw) {
        return reject(new Error('Invalid input: empty stdin'));
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`JSON parse error: ${err.message}`));
      }
    });
    stream.on('error', reject);
  });
}

module.exports = { readStdin, normalize, formatOutput, detectIDE };
