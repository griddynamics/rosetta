// adapter.claude-code.test.ts — Tests for Claude Code IDE adapter

import { test, describe, expect } from 'vitest';
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
    expect(detectIDE(ccWrite)).toBe('claude-code');
  });

  test('returns "claude-code" for PreToolUse Bash input', () => {
    expect(detectIDE(ccBash)).toBe('claude-code');
  });

  test('returns "claude-code" for subagent input (has agent_id)', () => {
    expect(detectIDE(ccSubagent)).toBe('claude-code');
  });

  test('throws for unknown IDE input shape', () => {
    expect(() => detectIDE(fxUnknown)).toThrow(/Unsupported IDE/);
  });

  test('throws for null input', () => {
    expect(() => detectIDE(null)).toThrow(/invalid|unsupported|null/i);
  });

  test('throws for empty object', () => {
    expect(() => detectIDE({})).toThrow(/Unsupported IDE/);
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Claude Code', () => {

  test('PostToolUse Write — enriched with registry fields', () => {
    const result = normalize(ccWrite);
    expect(result).toMatchObject(ccWrite);
    expect(result.ide).toBe('claude-code');
    expect(result.event).toBe('PostToolUse');
    expect(result.toolKind).toBe('write');
  });

  test('PostToolUse Edit — enriched with registry fields', () => {
    const result = normalize(ccEdit);
    expect(result).toMatchObject(ccEdit);
    expect(result.ide).toBe('claude-code');
    expect(result.event).toBe('PostToolUse');
    expect(result.toolKind).toBe('edit');
  });

  test('PreToolUse Bash — enriched, no tool_response', () => {
    const result = normalize(ccBash);
    expect(result.tool_response).toBe(undefined);
    expect(result).toMatchObject(ccBash);
    expect(result.ide).toBe('claude-code');
    expect(result.event).toBe('PreToolUse');
    expect(result.toolKind).toBe('bash');
  });

  test('subagent — preserves agent_id and agent_type', () => {
    const result = normalize(ccSubagent);
    expect(result.agent_id).toBe('agent-456');
    expect(result.agent_type).toBe('code-reviewer');
  });

  test('canonical fields all present', () => {
    const result = normalize(ccWrite);
    expect(result.session_id, 'session_id missing').toBeTruthy();
    expect(result.hook_event_name, 'hook_event_name missing').toBeTruthy();
    expect(result.tool_name, 'tool_name missing').toBeTruthy();
    expect(result.tool_use_id, 'tool_use_id missing').toBeTruthy();
    expect(result.tool_input, 'tool_input missing').toBeTruthy();
    expect(result.cwd, 'cwd missing').toBeTruthy();
    expect(result.permission_mode, 'permission_mode missing').toBeTruthy();
  });

  test('unknown IDE — throws', () => {
    expect(() => normalize(fxUnknown)).toThrow(/Unsupported IDE/);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Claude Code', () => {

  test('PostToolUse additionalContext only — correct hookSpecificOutput shape', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'Test message' },
    };
    const result = formatOutput(canonical, 'claude-code');
    expect(result).toEqual(canonical);
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
    expect(result).toEqual(canonical);
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
    expect(
      (result.hookSpecificOutput as Record<string, unknown>).permissionDecision,
    ).toBe('deny');
  });

});

// ---------------------------------------------------------------------------
describe('readStdin', () => {

  test('reads valid JSON from stdin stream — returns parsed object', async () => {
    const input = JSON.stringify(ccWrite);
    const stream = Readable.from([input]);
    const result = await readStdin(stream);
    expect(result).toEqual(ccWrite);
  });

  test('reads empty stdin — throws with clear message', async () => {
    const stream = Readable.from(['']);
    await expect(readStdin(stream)).rejects.toThrow(/empty|no input|invalid/i);
  });

  test('reads invalid JSON — throws with clear message', async () => {
    const stream = Readable.from(['{ not valid json ']);
    await expect(readStdin(stream)).rejects.toThrow(/JSON|parse|invalid/i);
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Claude Code', () => {

  test('Write: detect → normalize → formatOutput produces valid claude-code output', () => {
    const ide = detectIDE(ccWrite);
    expect(ide).toBe('claude-code');
    const normalized = normalize(ccWrite);
    expect(normalized.hook_event_name).toBe('PostToolUse');
    const canonical = { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'nudge context' } };
    const output = formatOutput(canonical, ide);
    // claude-code formatOutput is identity
    expect(output).toEqual(canonical);
  });

});
