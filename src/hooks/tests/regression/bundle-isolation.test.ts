import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const BUNDLES_DIR = path.resolve(__dirname, '..', '..', 'dist', 'bundles');
const HOOK_FILES  = [
  'loose-files.js',
  'md-file-advisory.js',
  'codemap-refresh.js',
  'read-once.js',
  'read-once-reset.js',
  'dangerous-actions.js',
  'lint-format-advisory.js',
  'read-once-shared.js',
];

// For each plugin, list IDE names that must NOT appear as string literals in its bundles.
const FOREIGN: Record<string, string[]> = {
  'copilot':     ['cursor', 'windsurf', 'codex', 'claude-code', 'antigravity'],
  'cursor':      ['copilot', 'windsurf', 'codex', 'antigravity'],
  'claude':      ['copilot', 'cursor', 'windsurf', 'codex', 'antigravity'],
  'codex':       ['copilot', 'cursor', 'windsurf', 'antigravity'],
  'antigravity': ['copilot', 'cursor', 'windsurf', 'codex', 'claude-code'],
};

// Allowed occurrences: plugin → hookFile → IDE name → max allowed count.
// loose-files.js legitimately contains "copilot" in `whenIde: ["copilot"]` throttle config —
// that's a runtime check, not a bundled adapter.
const ALLOWED_COUNT: Record<string, Record<string, Record<string, number>>> = {
  'cursor':  { 'loose-files.js': { copilot: 1 } },
  'claude':  { 'loose-files.js': { copilot: 1 } },
  'codex':   { 'loose-files.js': { copilot: 1 } },
};

describe('bundle isolation', () => {
  test('dist/bundles/ exists — run `npm run build` first if this fails', () => {
    expect(existsSync(BUNDLES_DIR)).toBe(true);
  });

  for (const [plugin, foreignIdes] of Object.entries(FOREIGN)) {
    describe(plugin, () => {
      for (const hookFile of HOOK_FILES) {
        const bundlePath = path.join(BUNDLES_DIR, plugin, hookFile);
        for (const foreignIde of foreignIdes) {
          test(`${hookFile} does not contain "${foreignIde}"`, () => {
            if (!existsSync(bundlePath)) return;
            const content = readFileSync(bundlePath, 'utf-8');
            const hits = content.match(new RegExp(`["']${foreignIde}["']`, 'g'));
            const count = hits?.length ?? 0;
            const allowed = ALLOWED_COUNT[plugin]?.[hookFile]?.[foreignIde] ?? 0;
            expect(count, `Found "${foreignIde}" in ${plugin}/${hookFile}`).toBeLessThanOrEqual(allowed);
          });
        }
      }
    });
  }

  // Antigravity has no non-blocking delivery channel — the advise-only hooks MUST NOT be bundled
  // for it (docs/hooks/antigravity.md; build-bundles.mjs excludeHooks). The supported hooks MUST be.
  describe('antigravity — unsupported advise hooks excluded', () => {
    const UNSUPPORTED = ['lint-format-advisory.js', 'md-file-advisory.js', 'loose-files.js'];
    const SUPPORTED   = ['dangerous-actions.js', 'read-once.js', 'read-once-shared.js', 'read-once-reset.js', 'codemap-refresh.js'];
    for (const f of UNSUPPORTED) {
      test(`does NOT bundle ${f} (no advise channel on Antigravity)`, () => {
        expect(existsSync(path.join(BUNDLES_DIR, 'antigravity', f))).toBe(false);
      });
    }
    for (const f of SUPPORTED) {
      test(`DOES bundle ${f}`, () => {
        expect(existsSync(path.join(BUNDLES_DIR, 'antigravity', f))).toBe(true);
      });
    }
  });
});
