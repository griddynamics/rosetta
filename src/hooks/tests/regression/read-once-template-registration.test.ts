import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

// Hook registration used to be literal JSON inside each per-IDE `hooks.json.tmpl`, so this
// regression grepped those templates. Since the plugin-set change (#315) the templates are a
// single `{{{hooks_json}}}` placeholder and registration is DATA in the generator's hook
// layouts. The regression being guarded is unchanged: read-once must stay registered for every
// IDE that can deliver it, and read-once-reset must be bound to that IDE's compaction event.
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const LAYOUTS = path.join(ROOT, 'src', 'rosettify-plugins', 'src', 'spec', 'hook-layouts.ts');

const source = readFileSync(LAYOUTS, 'utf-8');

/** Text of one bindings declaration, from its name up to the closing `];`. */
function bindingsBlock(declaration: string): string {
  const start = source.indexOf(declaration);
  expect(start, `${declaration} not found in hook-layouts.ts`).toBeGreaterThan(-1);
  const end = source.indexOf('];', start);
  expect(end, `${declaration} is not terminated`).toBeGreaterThan(start);
  return source.slice(start, end);
}

// Antigravity is deliberately absent: it has no non-blocking delivery channel, so advisory
// hooks can never reach the model there and no bundle is built for it.
const CASES = [
  { name: 'claude', declaration: 'const CLAUDE_BINDINGS' },
  { name: 'codex', declaration: 'const CODEX_BINDINGS' },
  { name: 'copilot (and copilot-standalone)', declaration: 'const COPILOT_BINDINGS' },
  { name: 'cursor (and cursor-standalone)', declaration: 'const cursorBindings' },
];

describe('read-once hook registration', () => {
  for (const { name, declaration } of CASES) {
    test(`${name} binds read-once and read-once-reset`, () => {
      const block = bindingsBlock(declaration);
      expect(block).toContain("'read-once'");
      expect(block).toContain("'read-once-reset'");
    });
  }

  test('every hook-bearing target has a layout', () => {
    for (const target of [
      'claude',
      'codex',
      'copilot',
      'copilot-standalone',
      'cursor',
      'cursor-standalone',
      'antigravity',
    ]) {
      expect(source).toMatch(new RegExp(`['"]?${target}['"]?:\\s*\\{`));
    }
  });

  test('read-once support modules are declared in the plugin-set catalog', () => {
    const catalog = JSON.parse(
      readFileSync(path.join(ROOT, 'src', 'rosettify-plugins', 'plugins.json'), 'utf-8'),
    );
    // A set declaring `read-once` must ship its two support modules, or read-once loads nothing.
    expect(catalog.hookSupportModules['read-once']).toEqual(['read-once-reset', 'read-once-shared']);
  });
});
