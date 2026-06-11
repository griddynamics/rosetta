// PARITY-1 — JSON string escaping for additionalContext payload
import { describe, it, expect } from 'vitest';
import { jsonStringEscape, buildHookPayloadJson } from '../../../src/escaping/json-string.js';

describe('jsonStringEscape', () => {
  it('escapes backslash as \\\\', () => {
    expect(jsonStringEscape('\\')).toBe('\\\\');
  });

  it('escapes double-quote as \\"', () => {
    expect(jsonStringEscape('"')).toBe('\\"');
  });

  it('escapes newline as \\n', () => {
    expect(jsonStringEscape('\n')).toBe('\\n');
  });

  it('escapes tab as \\t', () => {
    expect(jsonStringEscape('\t')).toBe('\\t');
  });

  it('escapes carriage return as \\r', () => {
    expect(jsonStringEscape('\r')).toBe('\\r');
  });

  it('passes through regular characters unchanged', () => {
    expect(jsonStringEscape('Hello, World!')).toBe('Hello, World!');
  });

  it('handles empty string', () => {
    expect(jsonStringEscape('')).toBe('');
  });

  it('handles Unicode characters above control range', () => {
    expect(jsonStringEscape('café')).toBe('café');
  });

  it('escapes control characters as \\uXXXX', () => {
    // 0x01 is a control char
    const result = jsonStringEscape('\x01');
    expect(result).toBe('\\u0001');
  });
});

describe('buildHookPayloadJson', () => {
  it('produces compact JSON payload object', () => {
    const result = buildHookPayloadJson('Hello World');
    expect(result).toBe(
      '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Hello World"}}'
    );
  });

  it('escapes newlines in additionalContext', () => {
    const result = buildHookPayloadJson('Line1\nLine2');
    expect(result).toContain('"additionalContext":"Line1\\nLine2"');
  });

  it('escapes double quotes in additionalContext', () => {
    const result = buildHookPayloadJson('Say "hello"');
    expect(result).toContain('\\"hello\\"');
  });

  it('escapes backslashes in additionalContext', () => {
    const result = buildHookPayloadJson('path\\to\\file');
    expect(result).toContain('path\\\\to\\\\file');
  });
});
