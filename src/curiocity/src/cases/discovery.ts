import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ConfigError } from '../shared/errors';
import type { CaseDefinition, DiscoveryResult, SkippedCase } from './types';
import { validateCase } from './validation';

/**
 * Case discovery (§8): each IMMEDIATE subfolder of `--source` is one case. Valid
 * cases and skip-with-reason entries are both returned (`curiocity validate`
 * prints both). Subfolders are processed in sorted order for stable output.
 */
export function discoverCases(source: string): DiscoveryResult {
  const abs = resolve(source);
  if (!existsSync(abs)) {
    throw new ConfigError(`Case source folder not found: ${abs}`);
  }
  if (!statSync(abs).isDirectory()) {
    throw new ConfigError(`Case source is not a directory: ${abs}`);
  }

  const valid: CaseDefinition[] = [];
  const skipped: SkippedCase[] = [];

  const entries = readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));

  for (const name of entries) {
    const dir = join(abs, name);
    const result = validateCase(dir, name);
    if (result.ok) {
      valid.push(result.case);
    } else {
      skipped.push({ name, dir, reason: result.reason });
    }
  }

  return { source: abs, valid, skipped };
}
