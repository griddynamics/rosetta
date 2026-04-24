// adapter.codex.test.ts — Tests for Codex IDE adapter

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import fxCodexBash  from './fixtures/codex-post-tool-use-bash.json';
import fxCodexWrite from './fixtures/codex-post-tool-use-write.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — Codex', () => {

  test('returns "codex" for Codex PostToolUse Bash input', () => {
    assert.equal(detectIDE(fxCodexBash), 'codex');
  });

  test('returns "codex" for Codex PostToolUse Write input', () => {
    assert.equal(detectIDE(fxCodexWrite), 'codex');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Codex', () => {

  test('Bash: identity pass-through, preserves model + turn_id', () => {
    const result = normalize(fxCodexBash);
    assert.ok(result.hook_event_name, 'hook_event_name missing');
    assert.ok(result.tool_name, 'tool_name missing');
    assert.ok(result.tool_input, 'tool_input missing');
    assert.equal(result.model, fxCodexBash.model);
    assert.equal(result.turn_id, fxCodexBash.turn_id);
  });

  test('Write: tool_name is Write', () => {
    const result = normalize(fxCodexWrite);
    assert.equal(result.tool_name, 'Write');
  });

  test('Write: tool_input preserves file_path', () => {
    const result = normalize(fxCodexWrite);
    assert.equal(
      result.tool_input.file_path,
      (fxCodexWrite.tool_input as Record<string, unknown>).file_path,
    );
  });

  test('Write: tool_response preserved', () => {
    const result = normalize(fxCodexWrite);
    assert.ok(result.tool_response, 'tool_response missing');
    assert.equal(
      (result.tool_response as Record<string, unknown>).filePath,
      (fxCodexWrite.tool_response as Record<string, unknown>).filePath,
    );
  });

  test('Write: model + turn_id preserved', () => {
    const result = normalize(fxCodexWrite);
    assert.equal(result.model, fxCodexWrite.model);
    assert.equal(result.turn_id, fxCodexWrite.turn_id);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Codex', () => {

  test('identity pass-through (same schema as Claude Code)', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'x' },
    };
    const result = formatOutput(canonical, 'codex');
    assert.deepEqual(result, canonical);
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Codex', () => {

  test('Bash: normalize → formatOutput, model+turn_id preserved', () => {
    const normalized = normalize(fxCodexBash);
    const output = formatOutput(
      { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'x' } },
      'codex',
    );
    assert.equal(normalized.model, fxCodexBash.model);
    assert.equal(normalized.turn_id, fxCodexBash.turn_id);
    assert.ok(output.hookSpecificOutput);
  });

  test('Write: normalize → formatOutput round-trip', () => {
    const normalized = normalize(fxCodexWrite);
    assert.equal(normalized.tool_name, 'Write');
    assert.equal(normalized.model, fxCodexWrite.model);
    const output = formatOutput(
      { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'y' } },
      'codex',
    );
    assert.ok(output.hookSpecificOutput);
  });

});
