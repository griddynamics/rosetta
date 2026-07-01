import { describe, expect, test } from 'vitest';
import { serializeForLog } from '../../src/runtime/debug-log';

describe('serializeForLog', () => {
  test('preserves repeated sibling references as $ref instead of Circular text', () => {
    const output = {
      hookSpecificOutput: {
        additionalContext: 'full advisory context',
      },
    };
    const serialized = serializeForLog({
      canonicalOutputFull: output,
      finalOutputFull: output,
    }) as Record<string, unknown>;

    expect(serialized.canonicalOutputFull).toMatchObject({
      hookSpecificOutput: {
        additionalContext: 'full advisory context',
      },
    });
    expect(serialized.finalOutputFull).toEqual({ $ref: '$["canonicalOutputFull"]' });
    expect(JSON.stringify(serialized)).not.toContain('[Circular]');
  });

  test('preserves real circular references as $ref objects', () => {
    const value: Record<string, unknown> = { name: 'root' };
    value.self = value;

    const serialized = serializeForLog(value) as Record<string, unknown>;

    expect(serialized).toEqual({
      name: 'root',
      self: { $ref: '$' },
    });
  });

  test('normalizes non-JSON runtime values before decycling', () => {
    const serialized = serializeForLog({
      error: new Error('boom'),
      count: 10n,
      data: Buffer.from('hello'),
      fn: function namedFn() {},
      marker: Symbol('marker'),
    }) as Record<string, unknown>;

    expect(serialized.error).toMatchObject({ name: 'Error', message: 'boom' });
    expect(serialized.count).toBe('10');
    expect(serialized.data).toEqual({ type: 'Buffer', byteLength: 5, utf8: 'hello' });
    expect(serialized.fn).toBe('[Function:namedFn]');
    expect(serialized.marker).toBe('Symbol(marker)');
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });
});
