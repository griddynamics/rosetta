import { afterEach, describe, expect, it } from 'vitest';
import { colorsEnabled, createPalette } from '../src/colors.js';

describe('createPalette', () => {
  it('wraps text in ANSI escapes when enabled', () => {
    const c = createPalette(true);
    expect(c.cyan('hi')).toBe('\x1b[36mhi\x1b[0m');
    expect(c.boldCyan('hi')).toBe('\x1b[1;36mhi\x1b[0m');
    expect(c.green('x')).toContain('\x1b[');
  });

  it('returns text unchanged when disabled', () => {
    const c = createPalette(false);
    expect(c.cyan('hi')).toBe('hi');
    expect(c.bold('hi')).toBe('hi');
    expect(c.boldMagenta('hi')).toBe('hi');
  });
});

describe('colorsEnabled', () => {
  const original = process.env.NO_COLOR;
  afterEach(() => {
    if (original === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = original;
  });

  it('is enabled only for a TTY stream with NO_COLOR unset', () => {
    delete process.env.NO_COLOR;
    expect(colorsEnabled({ isTTY: true })).toBe(true);
    expect(colorsEnabled({ isTTY: false })).toBe(false);
    expect(colorsEnabled({})).toBe(false);
  });

  it('is disabled when NO_COLOR is set even on a TTY', () => {
    process.env.NO_COLOR = '1';
    expect(colorsEnabled({ isTTY: true })).toBe(false);
  });
});
