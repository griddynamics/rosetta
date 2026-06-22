import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const BUNDLES_DIR = path.resolve(__dirname, '..', '..', 'dist', 'bundles');
const HOOK_FILES  = ['loose-files.js', 'md-file-advisory.js', 'codemap-refresh.js'];

// For each plugin, list IDE names that must NOT appear as string literals in its bundles.
// core-copilot allows 'claude-code' because the slim adapter has a CC-fallback for VS Code.
const FOREIGN: Record<string, string[]> = {
  'core-copilot': ['cursor', 'windsurf', 'codex'],
  'core-cursor':  ['copilot', 'windsurf', 'codex'],
  'core-claude':  ['copilot', 'cursor', 'windsurf', 'codex'],
  'core-codex':   ['copilot', 'cursor', 'windsurf'],
};

// Allowed occurrences: plugin → hookFile → IDE name → max allowed count.
// loose-files.js legitimately contains "copilot" in `whenIde: ["copilot"]` throttle config —
// that's a runtime check, not a bundled adapter.
const ALLOWED_COUNT: Record<string, Record<string, Record<string, number>>> = {
  'core-cursor':  { 'loose-files.js': { copilot: 1 } },
  'core-claude':  { 'loose-files.js': { copilot: 1 } },
  'core-codex':   { 'loose-files.js': { copilot: 1 } },
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
});
