// adapter.copilot.test.ts — Tests for GitHub Copilot CLI adapter
// Fixture: constructed from docs at:
//   https://docs.github.com/en/copilot/tutorials/copilot-cli-hooks
//   https://docs.github.com/en/copilot/reference/hooks-configuration

import { test, describe, expect } from 'vitest';

import fxCopilot from './fixtures/copilot-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — Copilot', () => {

  test('returns "copilot" for Copilot postToolUse Write input', () => {
    expect(detectIDE(fxCopilot)).toBe('copilot');
  });

  test('does NOT match claude-code (no hook_event_name)', () => {
    expect(detectIDE(fxCopilot)).not.toBe('claude-code');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Copilot', () => {

  test('infers hook_event_name PostToolUse when toolResult present', () => {
    const result = normalize(fxCopilot);
    expect(result.hook_event_name).toBe('PostToolUse');
  });

  test('infers hook_event_name PreToolUse when toolResult absent', () => {
    const preInput = { timestamp: 1704614400000, cwd: '/proj', toolName: 'bash', toolArgs: '{"command":"ls"}' };
    const result = normalize(preInput);
    expect(result.hook_event_name).toBe('PreToolUse');
  });

  test('maps toolName (camelCase) to tool_name', () => {
    const result = normalize(fxCopilot);
    expect(result.tool_name).toBe(fxCopilot.toolName);
  });

  test('parses toolArgs JSON string into tool_input object', () => {
    const result = normalize(fxCopilot);
    expect(typeof result.tool_input).toBe('object');
    expect('file_path' in result.tool_input, 'file_path not parsed from toolArgs').toBeTruthy();
  });

  test('preserves toolResult as tool_response', () => {
    const result = normalize(fxCopilot);
    const response = result.tool_response as Record<string, unknown>;
    expect(response.resultType).toBe('success');
    expect(response.textResultForLlm).toBeTruthy();
  });

  test('cwd preserved', () => {
    const result = normalize(fxCopilot);
    expect(result.cwd).toBe(fxCopilot.cwd);
  });

  test('session_id is undefined (Copilot has none)', () => {
    const result = normalize(fxCopilot);
    expect(result.session_id).toBe(undefined);
  });

  test('handles invalid toolArgs gracefully — returns { _raw }', () => {
    const input = { timestamp: 1704614400000, cwd: '/proj', toolName: 'bash', toolArgs: 'not { valid json' };
    const result = normalize(input);
    expect(result.tool_input._raw).toBe('not { valid json');
  });

  test('preserves copilot extras in _copilot', () => {
    const result = normalize(fxCopilot);
    const copilot = result._copilot as Record<string, unknown>;
    expect(copilot.toolName).toBe(fxCopilot.toolName);
    expect(copilot.timestamp).toBe(fxCopilot.timestamp);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Copilot', () => {

  test('maps permissionDecision deny → output.permissionDecision', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'Blocked by policy' },
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.permissionDecision).toBe('deny');
    expect(result.permissionDecisionReason).toBe('Blocked by policy');
  });

  test('continue: false without explicit decision → permissionDecision deny', () => {
    const result = formatOutput({ hookSpecificOutput: {}, continue: false }, 'copilot');
    expect(result.permissionDecision).toBe('deny');
  });

  test('empty canonical → empty output (no decision, no additionalContext)', () => {
    const result = formatOutput({ hookSpecificOutput: {} }, 'copilot');
    expect(result).toEqual({});
  });

  test('additionalContext → included in hookSpecificOutput', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'File appears to be loose' },
      continue: true,
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.hookSpecificOutput).toEqual({
      hookEventName: 'PostToolUse',
      additionalContext: 'File appears to be loose',
    });
  });

  test('additionalContext + permissionDecision → both in output', () => {
    const canonical = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: 'Loose file detected',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Blocked',
      },
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.permissionDecision).toBe('deny');
    expect(result.permissionDecisionReason).toBe('Blocked');
    expect((result.hookSpecificOutput as Record<string, unknown>)?.additionalContext).toBe('Loose file detected');
  });

  test('no additionalContext → hookSpecificOutput absent from output', () => {
    const result = formatOutput({ hookSpecificOutput: { hookEventName: 'PostToolUse' } }, 'copilot');
    expect(result.hookSpecificOutput).toBeUndefined();
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Copilot', () => {

  test('normalize → formatOutput, toolName and toolResult preserved', () => {
    const normalized = normalize(fxCopilot);
    expect(normalized.tool_name).toBe(fxCopilot.toolName);
    expect(normalized.tool_response).toBeTruthy();

    const output = formatOutput({ hookSpecificOutput: {} }, 'copilot');
    expect(output).toEqual({});
  });

});
