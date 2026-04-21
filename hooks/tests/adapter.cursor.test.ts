// adapter.cursor.test.ts — Tests for Cursor IDE adapter
// Fixture: constructed from docs at https://cursor.com/docs/reference/hooks

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import fxCursor from './fixtures/cursor-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — Cursor', () => {

  test('returns "cursor" for Cursor PostToolUse Write input', () => {
    assert.equal(detectIDE(fxCursor), 'cursor');
  });

  test('does NOT match claude-code (conversation_id + cursor_version present)', () => {
    assert.notEqual(detectIDE(fxCursor), 'claude-code');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Cursor', () => {

  test('normalizes hook_event_name to PascalCase', () => {
    const result = normalize(fxCursor);
    assert.equal(result.hook_event_name, 'PostToolUse');
  });

  test('maps conversation_id to session_id', () => {
    const result = normalize(fxCursor);
    assert.equal(result.session_id, fxCursor.conversation_id);
  });

  test('canonical fields all present', () => {
    const result = normalize(fxCursor);
    assert.ok(result.hook_event_name, 'hook_event_name missing');
    assert.ok(result.tool_name, 'tool_name missing');
    assert.ok(result.tool_input, 'tool_input missing');
    assert.ok(result.session_id, 'session_id missing');
    assert.ok(result.cwd, 'cwd missing');
  });

  test('preserves cursor-specific extras', () => {
    const result = normalize(fxCursor);
    assert.equal(result.cursor_version, fxCursor.cursor_version);
    assert.equal(result.conversation_id, fxCursor.conversation_id);
    assert.equal(result.generation_id, fxCursor.generation_id);
    assert.equal(result.duration, fxCursor.duration);
  });

  test('preserves tool_input with file_path', () => {
    const result = normalize(fxCursor);
    assert.ok(result.tool_input.file_path, 'tool_input.file_path missing');
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Cursor', () => {

  test('maps additionalContext to additional_context', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'Test message' } };
    const result = formatOutput(canonical, 'cursor');
    assert.equal(result.additional_context, 'Test message');
  });

  test('maps permissionDecision to permission', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'Not allowed' },
    };
    const result = formatOutput(canonical, 'cursor');
    assert.equal(result.permission, 'deny');
    assert.equal(result.user_message, 'Not allowed');
  });

  test('empty canonical → empty output object', () => {
    const result = formatOutput({ hookSpecificOutput: {} }, 'cursor');
    assert.deepEqual(result, {});
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Cursor', () => {

  test('normalize → formatOutput matches Cursor output shape', () => {
    const normalized = normalize(fxCursor);
    assert.equal(normalized.hook_event_name, 'PostToolUse');
    assert.ok(normalized.session_id);

    const output = formatOutput({ hookSpecificOutput: { additionalContext: 'x' } }, 'cursor');
    assert.ok(output.additional_context);
  });

});
