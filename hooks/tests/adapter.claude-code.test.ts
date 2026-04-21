// adapter.claude-code.test.ts — Tests for Claude Code IDE adapter

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'stream';

import ccWrite    from './fixtures/claude-code-post-tool-use-write.json';
import ccEdit     from './fixtures/claude-code-post-tool-use-edit.json';
import ccBash     from './fixtures/claude-code-pre-tool-use-bash.json';
import ccSubagent from './fixtures/claude-code-post-tool-use-write-subagent.json';
import fxUnknown  from './fixtures/unknown-ide-input.json';

import { detectIDE, normalize, formatOutput, readStdin } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — Claude Code', () => {

  test('returns "claude-code" for PostToolUse Write input', () => {
    assert.equal(detectIDE(ccWrite), 'claude-code');
  });

  test('returns "claude-code" for PreToolUse Bash input', () => {
    assert.equal(detectIDE(ccBash), 'claude-code');
  });

  test('returns "claude-code" for subagent input (has agent_id)', () => {
    assert.equal(detectIDE(ccSubagent), 'claude-code');
  });

  test('throws for unknown IDE input shape', () => {
    assert.throws(() => detectIDE(fxUnknown), /Unsupported IDE/);
  });

  test('throws for null input', () => {
    assert.throws(() => detectIDE(null), /invalid|unsupported|null/i);
  });

  test('throws for empty object', () => {
    assert.throws(() => detectIDE({}), /Unsupported IDE/);
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Claude Code', () => {

  test('PostToolUse Write — identity pass-through', () => {
    assert.deepEqual(normalize(ccWrite), ccWrite);
  });

  test('PostToolUse Edit — identity pass-through', () => {
    assert.deepEqual(normalize(ccEdit), ccEdit);
  });

  test('PreToolUse Bash — identity (no tool_response)', () => {
    const result = normalize(ccBash);
    assert.deepEqual(result, ccBash);
    assert.equal(result.tool_response, undefined);
  });

  test('subagent — preserves agent_id and agent_type', () => {
    const result = normalize(ccSubagent);
    assert.equal(result.agent_id, 'agent-456');
    assert.equal(result.agent_type, 'code-reviewer');
  });

  test('canonical fields all present', () => {
    const result = normalize(ccWrite);
    assert.ok(result.session_id, 'session_id missing');
    assert.ok(result.hook_event_name, 'hook_event_name missing');
    assert.ok(result.tool_name, 'tool_name missing');
    assert.ok(result.tool_use_id, 'tool_use_id missing');
    assert.ok(result.tool_input, 'tool_input missing');
    assert.ok(result.cwd, 'cwd missing');
    assert.ok(result.permission_mode, 'permission_mode missing');
  });

  test('unknown IDE — throws', () => {
    assert.throws(() => normalize(fxUnknown), /Unsupported IDE/);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Claude Code', () => {

  test('PostToolUse additionalContext only — correct hookSpecificOutput shape', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'Test message' },
    };
    const result = formatOutput(canonical, 'claude-code');
    assert.deepEqual(result, canonical);
  });

  test('PostToolUse with all optional top-level fields — preserved', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'Test' },
      continue: true,
      stopReason: null,
      suppressOutput: false,
      systemMessage: 'hello',
    };
    const result = formatOutput(canonical, 'claude-code');
    assert.deepEqual(result, canonical);
  });

  test('PreToolUse deny decision — preserved', () => {
    const canonical = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Not allowed',
      },
    };
    const result = formatOutput(canonical, 'claude-code');
    assert.equal(
      (result.hookSpecificOutput as Record<string, unknown>).permissionDecision,
      'deny',
    );
  });

});

// ---------------------------------------------------------------------------
describe('readStdin', () => {

  test('reads valid JSON from stdin stream — returns parsed object', async () => {
    const input = JSON.stringify(ccWrite);
    const stream = Readable.from([input]);
    const result = await readStdin(stream);
    assert.deepEqual(result, ccWrite);
  });

  test('reads empty stdin — throws with clear message', async () => {
    const stream = Readable.from(['']);
    await assert.rejects(readStdin(stream), /empty|no input|invalid/i);
  });

  test('reads invalid JSON — throws with clear message', async () => {
    const stream = Readable.from(['{ not valid json ']);
    await assert.rejects(readStdin(stream), /JSON|parse|invalid/i);
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Claude Code', () => {

  test('Write: normalize → formatOutput → original shape', () => {
    const normalized = normalize(ccWrite);
    const output = formatOutput(
      { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'x' } },
      'claude-code',
    );
    assert.deepEqual(normalized, ccWrite);
    assert.ok(output.hookSpecificOutput);
  });

});
