// FR-CLI-0060 — comprehensive help. cli.ts runs main() at import (top-level
// `main().catch(...)`), so this must spawn it as a subprocess rather than importing it.
import { describe, it, expect } from 'vitest';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { SET_FIELDS, VARIANT_FIELDS, MANIFEST_FIELDS } from '../../src/spec/plugin-sets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.join(__dirname, '..', '..');
const CLI_ENTRY = path.join(PACKAGE_ROOT, 'src', 'cli.ts');
const TSX_BIN = path.join(PACKAGE_ROOT, 'node_modules', '.bin', 'tsx');

describe('cli.ts --help (FR-CLI-0060)', () => {
  it('enumerates the plugin-set descriptor fields — interpolated from SET_FIELDS/VARIANT_FIELDS/MANIFEST_FIELDS, never a hand-typed second list', { timeout: 30_000 }, () => {
    const result = spawnSync(TSX_BIN, [CLI_ENTRY, '--help'], {
      cwd: PACKAGE_ROOT,
      encoding: 'utf-8',
    });
    expect(result.status).toBe(0);
    for (const field of [...SET_FIELDS, ...VARIANT_FIELDS, ...MANIFEST_FIELDS]) {
      expect(result.stdout).toContain(field);
    }
  });
});
