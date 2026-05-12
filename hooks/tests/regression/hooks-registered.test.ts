// hooks-registered.test.ts — Regression guard: every hook in src/ must be referenced
// in every plugin's hooks.json. If a hook is bundled but not registered, it is silently
// never invoked by the IDE.

import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOKS_DIR = path.resolve(ROOT, 'hooks', 'src', 'hooks');
const PLUGINS_DIR = path.resolve(ROOT, 'plugins');

const CANONICAL_HOOKS_JSONS: { plugin: string; jsonPath: string }[] = [
  { plugin: 'core-claude',  jsonPath: path.join(PLUGINS_DIR, 'core-claude',  'hooks', 'hooks.json') },
  { plugin: 'core-copilot', jsonPath: path.join(PLUGINS_DIR, 'core-copilot', 'hooks', 'hooks.json') },
  { plugin: 'core-cursor',  jsonPath: path.join(PLUGINS_DIR, 'core-cursor',  'hooks', 'hooks.json') },
  { plugin: 'core-codex',   jsonPath: path.join(PLUGINS_DIR, 'core-codex',   '.codex', 'hooks.json') },
];

// Hooks registered only on a subset of IDEs. Add entries here only for hooks using
// a platform-exclusive event unavailable on certain IDEs.
// Note: Cursor uses `preToolUse` (lowercase), Codex `PreToolUse` — both mapped in
// ide-registry.ts. Copilot infers PreToolUse from payload shape (registry entry is null
// but the event is processed). All current hooks are registered across every IDE.
const CLAUDE_CODE_ONLY_HOOKS: ReadonlySet<string> = new Set<string>();

const discoverHooks = (): string[] =>
  readdirSync(HOOKS_DIR)
    .filter(f => f.endsWith('.ts'))
    .map(f => f.replace('.ts', ''));

describe('hooks-registered — all src hooks appear in every plugin hooks.json', () => {
  const hookNames = discoverHooks();

  test('at least one hook is discovered in src/', () => {
    expect(hookNames.length).toBeGreaterThan(0);
  });

  for (const { plugin, jsonPath } of CANONICAL_HOOKS_JSONS) {
    describe(`plugin: ${plugin}`, () => {
      let rawJson: string | null = null;
      try { rawJson = readFileSync(jsonPath, 'utf-8'); } catch { /* missing file */ }

      test(`hooks.json exists at expected path`, () => {
        expect(rawJson, `Missing: ${jsonPath}`).not.toBeNull();
      });

      for (const hookName of hookNames) {
        // Skip claude-code-only hooks for non-claude plugins
        if (CLAUDE_CODE_ONLY_HOOKS.has(hookName) && plugin !== 'core-claude') continue;

        test(`${hookName}.js is referenced`, () => {
          if (!rawJson) return; // file-missing case handled above
          expect(rawJson).toContain(`${hookName}.js`);
        });
      }
    });
  }
});
