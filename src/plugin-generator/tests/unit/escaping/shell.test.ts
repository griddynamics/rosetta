// PARITY-1/4 — bash single-quote escaping '\''
import { describe, it, expect } from 'vitest';
import { bashSingleQuoteEscape, wrapInPrintf, wrapInPrintfDoubleQuoted } from '../../../src/escaping/shell.js';

describe('bashSingleQuoteEscape', () => {
  it("escapes single quotes as '\\'\\''", () => {
    expect(bashSingleQuoteEscape("it's")).toBe("it'\\''s");
  });

  it('handles string with no quotes unchanged', () => {
    expect(bashSingleQuoteEscape('hello world')).toBe('hello world');
  });

  it('handles multiple quotes', () => {
    expect(bashSingleQuoteEscape("a'b'c")).toBe("a'\\''b'\\''c");
  });

  it('handles empty string', () => {
    expect(bashSingleQuoteEscape('')).toBe('');
  });
});

describe('wrapInPrintf', () => {
  it('wraps JSON payload in printf single-quoted form', () => {
    const result = wrapInPrintf('{"key":"value"}');
    expect(result).toBe(`printf '%s' '{"key":"value"}'`);
  });

  it('escapes internal single quotes in payload', () => {
    const result = wrapInPrintf("it's");
    expect(result).toBe(`printf '%s' 'it'\\''s'`);
  });
});

describe('wrapInPrintfDoubleQuoted', () => {
  it('wraps payload in double-quoted printf for env expansion', () => {
    const result = wrapInPrintfDoubleQuoted('{\\\"key\\\":\\\"val\\\"}');
    expect(result).toContain('printf');
    expect(result).toContain('"');
  });
});
