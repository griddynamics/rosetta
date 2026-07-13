/** Zero-dependency ANSI color palette. Each function wraps its text in escape codes when the
 * palette is enabled, or returns the text unchanged when disabled (e.g. non-TTY output or when
 * NO_COLOR is set), so callers never branch on color at the call site. */

export type Colorize = (text: string) => string;

export interface Palette {
  bold: Colorize;
  dim: Colorize;
  cyan: Colorize;
  green: Colorize;
  yellow: Colorize;
  magenta: Colorize;
  boldCyan: Colorize;
  boldMagenta: Colorize;
}

const RESET = '\x1b[0m';

function wrap(code: string, enabled: boolean): Colorize {
  if (!enabled) return (text) => text;
  return (text) => `\x1b[${code}m${text}${RESET}`;
}

export function createPalette(enabled: boolean): Palette {
  return {
    bold: wrap('1', enabled),
    dim: wrap('2', enabled),
    cyan: wrap('36', enabled),
    green: wrap('32', enabled),
    yellow: wrap('33', enabled),
    magenta: wrap('35', enabled),
    boldCyan: wrap('1;36', enabled),
    boldMagenta: wrap('1;35', enabled),
  };
}

/** Colors are enabled only when the target stream is a TTY and NO_COLOR is unset. */
export function colorsEnabled(stream: { isTTY?: boolean }): boolean {
  return Boolean(stream.isTTY) && process.env.NO_COLOR === undefined;
}
