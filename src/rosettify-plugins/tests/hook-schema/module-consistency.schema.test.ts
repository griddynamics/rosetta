// T5 (hooks-architecture.md §1.9, §4): TARGET_HOOK_MODULES <-> template consistency.
// Raw-TEXT scan of every hooks.json.tmpl for `<module>.js` tokens, set-equality against
// spec/targets.ts's TARGET_HOOK_MODULES. Deliberately a text scan, not a render: at
// deterministic_hooks=false the rendered document names no modules at all (the advisory bindings
// are gated off), yet pluginSyncBundles must still ship the bundles those modules come from —
// scanning raw template text is the only way to see the full module set regardless of posture.
// Unit-test level: reads template files from disk, never renders or writes anything.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { TARGET_HOOK_MODULES } from '../../src/spec/targets.js';
import { scanModuleTokens } from './validator.js';

const ROOT = path.resolve(__dirname, '../..');

function readAllTmplText(dir: string): string {
  let combined = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      combined += readAllTmplText(full);
    } else if (entry.name.endsWith('.tmpl')) {
      combined += fs.readFileSync(full, 'utf-8') + '\n';
    }
  }
  return combined;
}

describe('TARGET_HOOK_MODULES <-> hooks.json.tmpl raw-text consistency (T5)', () => {
  const families = ['claude', 'codex', 'copilot', 'cursor', 'antigravity'] as const;

  it.each(families)('%s: every module TARGET_HOOK_MODULES declares is named in that family\'s templates', (family) => {
    const templateDir = path.join(ROOT, 'plugins', `template-${family}`);
    const text = readAllTmplText(templateDir);
    const tokensInTemplates = scanModuleTokens(text);
    const declared = new Set(TARGET_HOOK_MODULES[family] ?? []);

    expect([...declared].sort()).toEqual([...tokensInTemplates].sort());
  });

  it('antigravity declares strictly fewer modules than the other four families (2 vs 7 — its guardrail-only set)', () => {
    expect(TARGET_HOOK_MODULES.antigravity.length).toBe(2);
    for (const family of ['claude', 'codex', 'copilot', 'cursor'] as const) {
      expect(TARGET_HOOK_MODULES[family].length).toBe(7);
    }
  });

  it('"read-once-shared" never appears literally in any template — it reaches every target only via plugins.json\'s hookSupportModules expansion', () => {
    for (const family of families) {
      const templateDir = path.join(ROOT, 'plugins', `template-${family}`);
      const text = readAllTmplText(templateDir);
      expect(text.includes('read-once-shared.js')).toBe(false);
    }
  });
});
