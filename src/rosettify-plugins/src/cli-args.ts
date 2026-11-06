// FR-CLI-0035 / FR-CLI-0036 — pure argument helpers for --customizations and --publish.
// Kept out of cli.ts (which runs main() at import) so they are unit-testable.

import { InvalidArgumentError } from 'commander';
import path from 'path';

// FR-CLI-0035 (repeatable, comma-separated, empty value = usage error), FR-CLI-0036 (same parser, A1).
// Commander variadic accumulator: splits on ',', trims, appends left to right across occurrences.
export function parseListArg(value: string, previous: string[] = []): string[] {
  const tokens = value.split(',').map((t) => t.trim());
  if (tokens.some((t) => t === '')) {
    throw new InvalidArgumentError('Expected a non-empty, comma-separated list with no empty entries.');
  }
  return [...previous, ...tokens];
}

// FR-CLI-0036: --publish names are a set; repeated names collapse, first-seen order kept.
export function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)];
}

// FR-CLI-0035.AC1-3: relative value resolves against <source> (as FR-CLI-0034 does for --config),
// absolute value is used verbatim, order preserved.
export function resolveCustomizationRoots(sourceRoot: string, values: readonly string[]): string[] {
  return values.map((v) => (path.isAbsolute(v) ? v : path.resolve(sourceRoot, v)));
}
