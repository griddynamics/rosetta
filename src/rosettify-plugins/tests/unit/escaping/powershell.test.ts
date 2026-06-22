// NFR-0009 — PowerShell escaping for copilot hooks
import { describe, it, expect } from 'vitest';
import { psEscapeSingleQuoted, wrapInPsWriteOutput } from '../../../src/escaping/powershell.js';

describe('psEscapeSingleQuoted', () => {
  it('doubles single quotes', () => {
    expect(psEscapeSingleQuoted("it's")).toBe("it''s");
  });

  it('handles string with no quotes', () => {
    expect(psEscapeSingleQuoted('hello')).toBe('hello');
  });

  it('doubles multiple single quotes', () => {
    expect(psEscapeSingleQuoted("a'b'c")).toBe("a''b''c");
  });

  it('handles empty string', () => {
    expect(psEscapeSingleQuoted('')).toBe('');
  });
});

describe('wrapInPsWriteOutput', () => {
  it('wraps payload in Write-Output single-quoted form', () => {
    const result = wrapInPsWriteOutput('{"key":"value"}');
    expect(result).toBe(`Write-Output '{"key":"value"}'`);
  });

  it('escapes internal single quotes in payload', () => {
    const result = wrapInPsWriteOutput("it's");
    expect(result).toBe(`Write-Output 'it''s'`);
  });
});
