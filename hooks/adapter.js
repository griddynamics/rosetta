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
// Public API:
//   - readStdin, normalize, formatOutput — used by hook entrypoints (prod)
//   - detectIDE — exposed for tests; prod callers should prefer normalize()

const ADAPTERS = {
  codex: require('./adapters/codex'),
  cursor: require('./adapters/cursor'),
  'claude-code': require('./adapters/claude-code'),
  windsurf: require('./adapters/windsurf'),
  copilot: require('./adapters/copilot'),
};

// Detection is an ordered chain — a superset like codex must match before
// claude-code, so this order is load-bearing and not derived from Object.keys.
const DETECTION_ORDER = ['codex', 'cursor', 'claude-code', 'windsurf', 'copilot'];

const detectIDE = (rawInput) => {
  if (rawInput === null || rawInput === undefined) {
    throw new Error('Invalid input: null or undefined');
  }
  if (typeof rawInput !== 'object' || Array.isArray(rawInput)) {
    throw new Error('Invalid input: expected a plain object');
  }
  const ide = DETECTION_ORDER.find((name) => ADAPTERS[name].detect(rawInput));
  if (!ide) {
    throw new Error(`Unsupported IDE: ${JSON.stringify(Object.keys(rawInput))}`);
  }
  return ide;
};

const normalize = (rawInput) => ADAPTERS[detectIDE(rawInput)].normalize(rawInput);

const formatOutput = (canonicalOutput, ide) => {
  const adapter = ADAPTERS[ide];
  return adapter ? adapter.formatOutput(canonicalOutput) : canonicalOutput;
};

const readStdin = (stream = process.stdin) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(String(chunk)));
    stream.on('end', () => {
      const raw = chunks.join('').trim();
      if (!raw) return reject(new Error('Invalid input: empty stdin'));
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error(`JSON parse error: ${err.message}`));
      }
    });
    stream.on('error', reject);
  });

module.exports = { readStdin, normalize, formatOutput, detectIDE };
