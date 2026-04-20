'use strict';
// adapter.copilot.test.js — Tests for GitHub Copilot CLI adapter
// Run: node --test hooks/tests/adapter.copilot.test.js
//
// Fixture: constructed from docs at:
//   https://docs.github.com/en/copilot/tutorials/copilot-cli-hooks
//   https://docs.github.com/en/copilot/reference/hooks-configuration

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const FIXTURES = path.join(__dirname, 'fixtures');
const fx = (name) => require(path.join(FIXTURES, name));

const fxCopilot = fx('copilot-post-tool-use-write.json');

const { detectIDE, normalize, formatOutput } = require('../adapter');

// ---------------------------------------------------------------------------
describe('detectIDE — Copilot', () => {

  test('returns "copilot" for Copilot postToolUse Write input', () => {
    assert.equal(detectIDE(fxCopilot), 'copilot');
  });

  test('does NOT match claude-code (no hook_event_name)', () => {
    assert.notEqual(detectIDE(fxCopilot), 'claude-code');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Copilot', () => {

  test('infers hook_event_name PostToolUse when toolResult present', () => {
    const result = normalize(fxCopilot);
    assert.equal(result.hook_event_name, 'PostToolUse');
  });

  test('infers hook_event_name PreToolUse when toolResult absent', () => {
    const preInput = {
      timestamp: 1704614400000,
      cwd: '/proj',
      toolName: 'bash',
      toolArgs: '{"command":"ls"}',
    };
    const result = normalize(preInput);
    assert.equal(result.hook_event_name, 'PreToolUse');
  });

  test('maps toolName (camelCase) to tool_name', () => {
    const result = normalize(fxCopilot);
    assert.equal(result.tool_name, fxCopilot.toolName);
  });

  test('parses toolArgs JSON string into tool_input object', () => {
    const result = normalize(fxCopilot);
    assert.equal(typeof result.tool_input, 'object');
    assert.ok('file_path' in result.tool_input, 'file_path not parsed from toolArgs');
  });

  test('preserves toolResult as tool_response', () => {
    const result = normalize(fxCopilot);
    assert.equal(result.tool_response.resultType, 'success');
    assert.ok(result.tool_response.textResultForLlm);
  });

  test('cwd preserved', () => {
    const result = normalize(fxCopilot);
    assert.equal(result.cwd, fxCopilot.cwd);
  });

  test('session_id is undefined (Copilot has none)', () => {
    const result = normalize(fxCopilot);
    assert.equal(result.session_id, undefined);
  });

  test('handles invalid toolArgs gracefully — returns { _raw }', () => {
    const input = {
      timestamp: 1704614400000,
      cwd: '/proj',
      toolName: 'bash',
      toolArgs: 'not { valid json',
    };
    const result = normalize(input);
    assert.ok(result.tool_input._raw === 'not { valid json');
  });

  test('preserves copilot extras in _copilot', () => {
    const result = normalize(fxCopilot);
    assert.equal(result._copilot.toolName, fxCopilot.toolName);
    assert.equal(result._copilot.timestamp, fxCopilot.timestamp);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Copilot', () => {

  test('maps permissionDecision deny → output.permissionDecision', () => {
    const canonical = {
      hookSpecificOutput: {
        permissionDecision: 'deny',
        permissionDecisionReason: 'Blocked by policy'
      }
    };
    const result = formatOutput(canonical, 'copilot');
    assert.equal(result.permissionDecision, 'deny');
    assert.equal(result.permissionDecisionReason, 'Blocked by policy');
  });

  test('continue: false without explicit decision → permissionDecision deny', () => {
    const canonical = {
      hookSpecificOutput: {},
      continue: false
    };
    const result = formatOutput(canonical, 'copilot');
    assert.equal(result.permissionDecision, 'deny');
  });

  test('empty canonical → empty output (postToolUse output is ignored)', () => {
    const result = formatOutput({ hookSpecificOutput: {} }, 'copilot');
    assert.deepEqual(result, {});
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Copilot', () => {

  test('normalize → formatOutput, toolName and toolResult preserved', () => {
    const normalized = normalize(fxCopilot);
    assert.equal(normalized.tool_name, fxCopilot.toolName);
    assert.ok(normalized.tool_response);

    const output = formatOutput({ hookSpecificOutput: {} }, 'copilot');
    assert.deepEqual(output, {}); // postToolUse output is ignored by Copilot
  });

});
