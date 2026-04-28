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

import { detectIDE, normalize, formatOutput, extractFilePath } from '../src/adapter';

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
describe('normalize — returns canonical shape for all IDEs', () => {

  const IDES = [
    { name: 'claude-code', input: ccWrite },
    { name: 'codex',       input: fxCodex },
    { name: 'cursor',      input: fxCursor },
    { name: 'windsurf',    input: fxWindsurf },
    { name: 'copilot',     input: fxCopilot },
  ];

  for (const { name, input } of IDES) {
    test(`${name}: normalized output has hook_event_name`, () => {
      const result = normalize(input);
      expect(result.hook_event_name, `${name}: hook_event_name missing`).toBeTruthy();
    });

    test(`${name}: normalized output has tool_input`, () => {
      const result = normalize(input);
      expect(result.tool_input !== undefined, `${name}: tool_input missing`).toBeTruthy();
    });
  }

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
describe('extractFilePath — centralized file path extraction', () => {

  test('extracts file_path (snake_case)', () => {
    expect(extractFilePath('Write', { file_path: '/proj/notes.md' })).toBe('/proj/notes.md');
  });

  test('extracts filePath (camelCase, Copilot standard)', () => {
    expect(extractFilePath('Write', { filePath: '/proj/notes.md' })).toBe('/proj/notes.md');
  });

  test('extracts path fallback', () => {
    expect(extractFilePath('Write', { path: '/proj/notes.md' })).toBe('/proj/notes.md');
  });

  test('file_path takes priority over filePath', () => {
    expect(extractFilePath('Write', { file_path: '/a.md', filePath: '/b.md' })).toBe('/a.md');
  });

  test('filePath takes priority over path', () => {
    expect(extractFilePath('Write', { filePath: '/a.md', path: '/b.md' })).toBe('/a.md');
  });

  test('returns empty string for empty tool_input', () => {
    expect(extractFilePath('Write', {})).toBe('');
  });

  test('extracts path from apply_patch command', () => {
    const command = 'apply_patch\n*** Begin Patch\n*** Update File: src/notes.md\n*** End Patch';
    expect(extractFilePath('apply_patch', { command })).toBe('src/notes.md');
  });

  test('extracts path from functions.apply_patch command', () => {
    const command = 'apply_patch\n*** Begin Patch\n*** Add File: docs/new.md\n*** End Patch';
    expect(extractFilePath('functions.apply_patch', { command })).toBe('docs/new.md');
  });

  test('returns empty for apply_patch with no file header', () => {
    expect(extractFilePath('apply_patch', { command: 'no file here' })).toBe('');
  });

  test('null tool_name with file_path still works', () => {
    expect(extractFilePath(null, { file_path: '/proj/file.ts' })).toBe('/proj/file.ts');
  });

  test('undefined tool_name with filePath still works', () => {
    expect(extractFilePath(undefined, { filePath: '/proj/file.ts' })).toBe('/proj/file.ts');
  });

});

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
