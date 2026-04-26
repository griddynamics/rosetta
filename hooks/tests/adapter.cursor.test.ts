// adapter.cursor.test.ts — Tests for Cursor IDE adapter
// Fixture: constructed from docs at https://cursor.com/docs/reference/hooks

import { test, describe, expect } from 'vitest';

import fxCursor from './fixtures/cursor-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — Cursor', () => {

  test('returns "cursor" for Cursor PostToolUse Write input', () => {
    expect(detectIDE(fxCursor)).toBe('cursor');
  });

  test('does NOT match claude-code (conversation_id + cursor_version present)', () => {
    expect(detectIDE(fxCursor)).not.toBe('claude-code');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Cursor', () => {

  test('normalizes hook_event_name to PascalCase', () => {
    const result = normalize(fxCursor);
    expect(result.hook_event_name).toBe('PostToolUse');
  });

  test('maps conversation_id to session_id', () => {
    const result = normalize(fxCursor);
    expect(result.session_id).toBe(fxCursor.conversation_id);
  });

  test('canonical fields all present', () => {
    const result = normalize(fxCursor);
    expect(result.hook_event_name, 'hook_event_name missing').toBeTruthy();
    expect(result.tool_name, 'tool_name missing').toBeTruthy();
    expect(result.tool_input, 'tool_input missing').toBeTruthy();
    expect(result.session_id, 'session_id missing').toBeTruthy();
    expect(result.cwd, 'cwd missing').toBeTruthy();
  });

  test('preserves cursor-specific extras', () => {
    const result = normalize(fxCursor);
    expect(result.cursor_version).toBe(fxCursor.cursor_version);
    expect(result.conversation_id).toBe(fxCursor.conversation_id);
    expect(result.generation_id).toBe(fxCursor.generation_id);
    expect(result.duration).toBe(fxCursor.duration);
  });

  test('preserves tool_input with file_path', () => {
    const result = normalize(fxCursor);
    expect(result.tool_input.file_path, 'tool_input.file_path missing').toBeTruthy();
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Cursor', () => {

  test('maps additionalContext to additional_context', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'Test message' } };
    const result = formatOutput(canonical, 'cursor');
    expect(result.additional_context).toBe('Test message');
  });

  test('maps permissionDecision to permission', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'Not allowed' },
    };
    const result = formatOutput(canonical, 'cursor');
    expect(result.permission).toBe('deny');
    expect(result.user_message).toBe('Not allowed');
  });

  test('empty canonical → empty output object', () => {
    const result = formatOutput({ hookSpecificOutput: {} }, 'cursor');
    expect(result).toEqual({});
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Cursor', () => {

  test('detect → normalize → formatOutput produces valid cursor output', () => {
    const ide = detectIDE(fxCursor);
    expect(ide).toBe('cursor');
    const normalized = normalize(fxCursor);
    expect(normalized.hook_event_name).toBe('PostToolUse');
    expect(normalized.session_id).toBeTruthy();
    const canonical = { hookSpecificOutput: { additionalContext: 'nudge context' } };
    const output = formatOutput(canonical, ide);
    // cursor maps additionalContext → additional_context
    expect(output.additional_context).toBe('nudge context');
    expect(output).not.toHaveProperty('hookSpecificOutput');
  });

});
