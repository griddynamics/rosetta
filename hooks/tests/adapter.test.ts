// adapter.test.ts — Tests for the abstract adapter orchestrator

import { test, describe, expect } from 'vitest';

import ccWrite    from './fixtures/claude-code-post-tool-use-write.json';
import ccBash     from './fixtures/claude-code-pre-tool-use-bash.json';
import fxCodex    from './fixtures/codex-post-tool-use-bash.json';
import fxCursor   from './fixtures/cursor-post-tool-use-write.json';
import fxWindsurf from './fixtures/windsurf-post-tool-use-write.json';
import fxCopilot  from './fixtures/copilot-post-tool-use-write.json';
import fxUnknown  from './fixtures/unknown-ide-input.json';

import { detectIDE, normalize, formatOutput } from '../src/adapter';

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
