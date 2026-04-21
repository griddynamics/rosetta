// adapter.copilot.test.ts — Tests for GitHub Copilot CLI adapter
// Fixture: constructed from docs at:
//   https://docs.github.com/en/copilot/tutorials/copilot-cli-hooks
//   https://docs.github.com/en/copilot/reference/hooks-configuration

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import fxCopilot from './fixtures/copilot-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

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
    const preInput = { timestamp: 1704614400000, cwd: '/proj', toolName: 'bash', toolArgs: '{"command":"ls"}' };
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
    const response = result.tool_response as Record<string, unknown>;
    assert.equal(response.resultType, 'success');
    assert.ok(response.textResultForLlm);
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
    const input = { timestamp: 1704614400000, cwd: '/proj', toolName: 'bash', toolArgs: 'not { valid json' };
    const result = normalize(input);
    assert.ok(result.tool_input._raw === 'not { valid json');
  });

  test('preserves copilot extras in _copilot', () => {
    const result = normalize(fxCopilot);
    const copilot = result._copilot as Record<string, unknown>;
    assert.equal(copilot.toolName, fxCopilot.toolName);
    assert.equal(copilot.timestamp, fxCopilot.timestamp);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Copilot', () => {

  test('maps permissionDecision deny → output.permissionDecision', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'Blocked by policy' },
    };
    const result = formatOutput(canonical, 'copilot');
    assert.equal(result.permissionDecision, 'deny');
    assert.equal(result.permissionDecisionReason, 'Blocked by policy');
  });

  test('continue: false without explicit decision → permissionDecision deny', () => {
    const result = formatOutput({ hookSpecificOutput: {}, continue: false }, 'copilot');
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
    assert.deepEqual(output, {});
  });

});
