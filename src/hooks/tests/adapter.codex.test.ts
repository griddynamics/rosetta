// adapter.codex.test.ts — Tests for Codex IDE adapter

import { test, describe, expect } from 'vitest';

import fxCodexBash  from './fixtures/codex-post-tool-use-bash.json';
import fxCodexWrite from './fixtures/codex-post-tool-use-write.json';
import fxCodexSessionStart from './fixtures/codex-session-start.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — Codex', () => {

  test('returns "codex" for Codex PostToolUse Bash input', () => {
    expect(detectIDE(fxCodexBash)).toBe('codex');
  });

  test('returns "codex" for Codex PostToolUse Write input', () => {
    expect(detectIDE(fxCodexWrite)).toBe('codex');
  });

  test('returns "codex" for Codex SessionStart input', () => {
    expect(detectIDE(fxCodexSessionStart)).toBe('codex');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — Codex', () => {

  test('Bash: identity pass-through, preserves model + turn_id', () => {
    const result = normalize(fxCodexBash);
    expect(result.hook_event_name, 'hook_event_name missing').toBeTruthy();
    expect(result.tool_name, 'tool_name missing').toBeTruthy();
    expect(result.tool_input, 'tool_input missing').toBeTruthy();
    expect(result.model).toBe(fxCodexBash.model);
    expect(result.turn_id).toBe(fxCodexBash.turn_id);
  });

  test('Write: tool_name is Write', () => {
    const result = normalize(fxCodexWrite);
    expect(result.tool_name).toBe('Write');
  });

  test('Write: tool_input preserves file_path', () => {
    const result = normalize(fxCodexWrite);
    expect(result.tool_input.file_path).toBe(
      (fxCodexWrite.tool_input as Record<string, unknown>).file_path,
    );
  });

  test('Write: tool_response preserved', () => {
    const result = normalize(fxCodexWrite);
    expect(result.tool_response, 'tool_response missing').toBeTruthy();
    expect(
      (result.tool_response as Record<string, unknown>).filePath,
    ).toBe(
      (fxCodexWrite.tool_response as Record<string, unknown>).filePath,
    );
  });

  test('Write: model + turn_id preserved', () => {
    const result = normalize(fxCodexWrite);
    expect(result.model).toBe(fxCodexWrite.model);
    expect(result.turn_id).toBe(fxCodexWrite.turn_id);
  });

  test('SessionStart: no turn_id required and source preserved', () => {
    const result = normalize(fxCodexSessionStart);
    expect(result.hook_event_name).toBe('SessionStart');
    expect(result.source).toBe('compact');
    expect(result.session_id).toBe('codex-session-001');
  });

  // Codex has no dedicated read tool and no MCP read path — an MCP call must
  // NEVER be reclassified as a read (it would let read-once dedupe/deny a real
  // side-effecting MCP action). MCP stays 'mcp-call'; a bare 'Read' stays null.
  test('MCP tool is NOT promoted to a read (stays mcp-call, event unchanged)', () => {
    const result = normalize({
      hook_event_name: 'PreToolUse',
      session_id: 'codex-session-001',
      model: 'gpt-5.5',
      tool_name: 'mcp__filesystem__read_file',
      tool_input: { file_path: '/proj/src/app.ts' },
    });
    expect(result.event).toBe('PreToolUse');
    expect(result.toolKind).toBe('mcp-call');
  });

  test('generic built-in Read is not classified as Codex read-once input', () => {
    const result = normalize({
      hook_event_name: 'PreToolUse',
      session_id: 'codex-session-001',
      model: 'gpt-5.5',
      tool_name: 'Read',
      tool_input: { file_path: '/proj/src/app.ts' },
    });
    expect(result.hook_event_name).toBe('PreToolUse');
    expect(result.toolKind).toBe(null);
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — Codex', () => {

  test('identity pass-through (same schema as Claude Code)', () => {
    const canonical = {
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'x' },
    };
    const result = formatOutput(canonical, 'codex');
    expect(result).toEqual(canonical);
  });

});

// ---------------------------------------------------------------------------
describe('round-trip — Codex', () => {

  test('Bash: detect → normalize → formatOutput produces valid codex output', () => {
    const ide = detectIDE(fxCodexBash);
    expect(ide).toBe('codex');
    const normalized = normalize(fxCodexBash);
    expect(normalized.model).toBe(fxCodexBash.model);
    expect(normalized.turn_id).toBe(fxCodexBash.turn_id);
    const canonical = { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'x' } };
    const output = formatOutput(canonical, ide);
    // codex formatOutput is identity
    expect(output).toEqual(canonical);
  });

  test('Write: detect → normalize → formatOutput produces valid codex output', () => {
    const ide = detectIDE(fxCodexWrite);
    expect(ide).toBe('codex');
    const normalized = normalize(fxCodexWrite);
    expect(normalized.tool_name).toBe('Write');
    expect(normalized.model).toBe(fxCodexWrite.model);
    const canonical = { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: 'y' } };
    const output = formatOutput(canonical, ide);
    // codex formatOutput is identity
    expect(output).toEqual(canonical);
  });

  test('SessionStart: detect → normalize preserves lifecycle fields', () => {
    const ide = detectIDE(fxCodexSessionStart);
    expect(ide).toBe('codex');
    const normalized = normalize(fxCodexSessionStart);
    expect(normalized.hook_event_name).toBe('SessionStart');
    expect(normalized.source).toBe('compact');
  });

});
