'use strict';
// adapter.test.js — Tests for the abstract adapter orchestrator (adapter.js)
// Tests the registry, delegation, and error handling of the core adapter.
// Run: node --test hooks/tests/adapter.test.js

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures');
const fx = (name) => require(path.join(FIXTURES, name));

const ccWrite    = fx('claude-code-post-tool-use-write.json');
const ccBash     = fx('claude-code-pre-tool-use-bash.json');
const fxCodex    = fx('codex-post-tool-use-bash.json');
const fxCursor   = fx('cursor-post-tool-use-write.json');
const fxWindsurf = fx('windsurf-post-tool-use-write.json');
const fxCopilot  = fx('copilot-post-tool-use-write.json');
const fxUnknown  = fx('unknown-ide-input.json');

const { detectIDE, normalize, formatOutput } = require('../adapter');

// ---------------------------------------------------------------------------
describe('detectIDE — all IDEs', () => {

  test('claude-code detected', () => {
    assert.equal(detectIDE(ccWrite), 'claude-code');
  });

  test('codex detected', () => {
    assert.equal(detectIDE(fxCodex), 'codex');
  });

  test('cursor detected', () => {
    assert.equal(detectIDE(fxCursor), 'cursor');
  });

  test('windsurf detected', () => {
    assert.equal(detectIDE(fxWindsurf), 'windsurf');
  });

  test('copilot detected', () => {
    assert.equal(detectIDE(fxCopilot), 'copilot');
  });

  test('unknown IDE throws', () => {
    assert.throws(() => detectIDE(fxUnknown), /Unsupported IDE/);
  });

  test('null throws', () => {
    assert.throws(() => detectIDE(null), /invalid|null/i);
  });

  test('empty object throws', () => {
    assert.throws(() => detectIDE({}), /Unsupported IDE/);
  });

  test('array throws', () => {
    assert.throws(() => detectIDE([]), /invalid|expected/i);
  });

});

// ---------------------------------------------------------------------------
describe('normalize — returns canonical shape for all IDEs', () => {

  const IDES = [
    { name: 'claude-code', input: ccWrite },
    { name: 'codex',       input: fxCodex },
    { name: 'cursor',      input: fxCursor },
    { name: 'windsurf',    input: fxWindsurf },
    { name: 'copilot',     input: fxCopilot },
  ];

  for (const { name, input } of IDES) {
    test(`${name}: normalized output has hook_event_name`, () => {
      const result = normalize(input);
      assert.ok(result.hook_event_name, `${name}: hook_event_name missing`);
    });

    test(`${name}: normalized output has tool_input`, () => {
      const result = normalize(input);
      assert.ok(result.tool_input !== undefined, `${name}: tool_input missing`);
    });
  }

});

// ---------------------------------------------------------------------------
describe('formatOutput — delegates to correct adapter', () => {

  test('unknown ide → identity pass-through', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'x' } };
    const result = formatOutput(canonical, 'unknown-ide');
    assert.deepEqual(result, canonical);
  });

  test('claude-code → identity pass-through', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'x' } };
    assert.deepEqual(formatOutput(canonical, 'claude-code'), canonical);
  });

  test('cursor → maps to additional_context', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'test' } };
    const result = formatOutput(canonical, 'cursor');
    assert.equal(result.additional_context, 'test');
  });

  test('copilot → maps to permissionDecision', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'no' }
    };
    const result = formatOutput(canonical, 'copilot');
    assert.equal(result.permissionDecision, 'deny');
  });

});
