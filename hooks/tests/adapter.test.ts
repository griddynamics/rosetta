// adapter.test.ts — Tests for the abstract adapter orchestrator

import { test, describe, expect } from 'vitest';

import ccWrite    from './fixtures/claude-code-post-tool-use-write.json';
import ccBash     from './fixtures/claude-code-pre-tool-use-bash.json';
import fxCodex    from './fixtures/codex-post-tool-use-bash.json';
import fxCodexPatch from './fixtures/codex-post-tool-use-apply_patch.json';
import fxCursor   from './fixtures/cursor-post-tool-use-write.json';
import fxWindsurf from './fixtures/windsurf-post-tool-use-write.json';
import fxCopilot  from './fixtures/copilot-post-tool-use-write.json';
import fxUnknown  from './fixtures/unknown-ide-input.json';
import ccMultiEdit from './fixtures/claude-code-pre-tool-use-multi-edit.json';

import { detectIDE, normalize, formatOutput, dedupKey } from '../src/adapter';

// ---------------------------------------------------------------------------
describe('detectIDE — all IDEs', () => {

  test('claude-code detected', () => {
    expect(detectIDE(ccWrite)).toBe('claude-code');
  });

  test('codex detected', () => {
    expect(detectIDE(fxCodex)).toBe('codex');
  });

  test('cursor detected', () => {
    expect(detectIDE(fxCursor)).toBe('cursor');
  });

  test('windsurf detected', () => {
    expect(detectIDE(fxWindsurf)).toBe('windsurf');
  });

  test('copilot detected', () => {
    expect(detectIDE(fxCopilot)).toBe('copilot');
  });

  test('unknown IDE throws', () => {
    expect(() => detectIDE(fxUnknown)).toThrow(/Unsupported IDE/);
  });

  test('null throws', () => {
    expect(() => detectIDE(null)).toThrow(/invalid|null/i);
  });

  test('empty object throws', () => {
    expect(() => detectIDE({})).toThrow(/Unsupported IDE/);
  });

  test('array throws', () => {
    expect(() => detectIDE([])).toThrow(/invalid|expected/i);
  });

});

// ---------------------------------------------------------------------------
describe('normalize — per-IDE shape assertions (B4 fix: toMatchObject replaces tautological loop)', () => {

  test('claude-code: PostToolUse Write → canonical shape', () => {
    expect(normalize(ccWrite)).toMatchObject({
      ide:             'claude-code',
      event:           'PostToolUse',
      toolKind:        'write',
      hook_event_name: expect.any(String),
      tool_input:      expect.objectContaining({ file_path: expect.any(String) }),
    });
  });

  test('codex: PostToolUse Bash → canonical shape', () => {
    expect(normalize(fxCodex)).toMatchObject({
      ide:        'codex',
      event:      'PostToolUse',
      toolKind:   'bash',
      tool_input: expect.objectContaining({ command: expect.any(String) }),
    });
  });

  test('cursor: postToolUse Write → event normalized to PostToolUse', () => {
    expect(normalize(fxCursor)).toMatchObject({
      ide:        'cursor',
      event:      'PostToolUse',
      toolKind:   'write',
      tool_input: expect.objectContaining({ file_path: expect.any(String) }),
    });
  });

  test('cursor fixture: ide is exactly cursor, not claude-code', () => {
    expect(normalize(fxCursor).ide).toBe('cursor');
  });

  test('windsurf: PostToolUse Write → canonical shape', () => {
    const r = normalize(fxWindsurf);
    expect(r.ide).toBe('windsurf');
    expect(r.event).toBe('PostToolUse');
    expect(r.toolKind).toBe('write');
  });

  test('copilot: PostToolUse inferred from toolResult (no explicit hook_event_name)', () => {
    expect(normalize(fxCopilot)).toMatchObject({
      ide:        'copilot',
      event:      'PostToolUse',
      tool_input: expect.objectContaining({ file_path: expect.any(String) }),
    });
  });

  test('copilot fixture: ide is exactly copilot', () => {
    expect(normalize(fxCopilot).ide).toBe('copilot');
  });

});

// ---------------------------------------------------------------------------
describe('normalize — MultiEdit fixture (M5 fix: INTERPRET-PASS → machine-checked)', () => {

  test('claude-code MultiEdit → toolKind multi-edit', () => {
    expect(normalize(ccMultiEdit)).toMatchObject({
      ide:        'claude-code',
      event:      'PreToolUse',
      toolKind:   'multi-edit',
      tool_input: expect.objectContaining({ edits: expect.any(Array) }),
    });
  });

});

// ---------------------------------------------------------------------------
describe('formatOutput — delegates to correct adapter', () => {

  test('unknown ide → identity pass-through', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'x' } };
    const result = formatOutput(canonical, 'unknown-ide');
    expect(result).toEqual(canonical);
  });

  test('claude-code → identity pass-through', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'x' } };
    expect(formatOutput(canonical, 'claude-code')).toEqual(canonical);
  });

  test('cursor → maps to additional_context', () => {
    const canonical = { hookSpecificOutput: { additionalContext: 'test' } };
    const result = formatOutput(canonical, 'cursor');
    expect(result.additional_context).toBe('test');
  });

  test('copilot → maps to permissionDecision', () => {
    const canonical = {
      hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'no' },
    };
    const result = formatOutput(canonical, 'copilot');
    expect(result.permissionDecision).toBe('deny');
  });

});

// ---------------------------------------------------------------------------
describe('dedupKey — idempotent for same input (B5 fix)', () => {

  test('copilot: same input/hookName produces identical key twice', () => {
    const k1 = dedupKey(fxCopilot, 'PostToolUse');
    const k2 = dedupKey(fxCopilot, 'PostToolUse');
    expect(k1).not.toBeNull();
    expect(k1).toBe(k2);
  });

  test('codex: does not throw for any input', () => {
    expect(() => dedupKey(fxCodex, 'PostToolUse')).not.toThrow();
  });

  test('claude-code: different hookName → different key (if non-null)', () => {
    const k1 = dedupKey(ccWrite, 'PostToolUse');
    const k2 = dedupKey(ccWrite, 'PreToolUse');
    if (k1 !== null && k2 !== null) {
      expect(k1).not.toBe(k2);
    }
  });

});

// extractFilePath removed — file path extraction now lives in PROPERTIES.filePath (ide-registry.ts)

// ---------------------------------------------------------------------------
describe('normalize — enriches file_path from tool_input', () => {

  test('claude-code: file_path populated from tool_input.file_path', () => {
    const result = normalize(ccWrite);
    expect(result.file_path).toBe('/Users/dev/my-project/utils/helper.py');
  });

  test('codex apply_patch: file_path extracted from command string', () => {
    const result = normalize(fxCodexPatch);
    expect(result.file_path).toBe('src/app.js');
  });

  test('cursor: file_path populated from tool_input', () => {
    const result = normalize(fxCursor);
    expect(result.file_path).toBeTruthy();
  });

  test('copilot: file_path populated from parsed toolArgs', () => {
    const result = normalize(fxCopilot);
    expect(result.file_path).toBe('/proj/src/app.js');
  });

  test('bash tool: file_path is empty string (no file in tool_input)', () => {
    const result = normalize(ccBash);
    expect(result.file_path).toBe('');
  });

});
