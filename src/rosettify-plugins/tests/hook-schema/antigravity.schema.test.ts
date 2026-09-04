// Hook schema — Antigravity (docs/hooks/antigravity.md:44, :60-68). Unit-test level: no generator
// run, no hooks.json written to disk. The real template is read from disk and rendered IN-MEMORY
// with Handlebars, never written anywhere.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { validateAntigravityDocument } from './validator.js';

const ROOT = path.resolve(__dirname, '../..');
const TMPL_PATH = 'plugins/template-antigravity/hooks.json.tmpl';

function renderTemplate(ctx: Record<string, unknown>): unknown {
  const src = fs.readFileSync(path.join(ROOT, TMPL_PATH), 'utf-8');
  const compiled = Handlebars.compile(src, { noEscape: false, strict: true });
  return JSON.parse(compiled(ctx));
}

describe('antigravity hooks.json.tmpl — registration schema (antigravity.md:60-68)', () => {
  it('at deterministic_hooks=true, matches the {"<name>":{enabled:true, PreToolUse:[{matcher,hooks}]}} shape', () => {
    const doc = renderTemplate({ deterministic_hooks: true, destination: 'core-antigravity' });
    expect(validateAntigravityDocument(doc)).toEqual([]);
  });

  it('at deterministic_hooks=false, still wraps under one key with enabled:true and an empty PreInvocation', () => {
    const doc = renderTemplate({ deterministic_hooks: false, destination: 'core-antigravity' }) as Record<
      string,
      { enabled: boolean; PreInvocation: unknown[] }
    >;
    expect(validateAntigravityDocument(doc)).toEqual([]);
    const wrapper = doc[Object.keys(doc)[0]];
    expect(wrapper.enabled).toBe(true);
    expect(wrapper.PreInvocation).toEqual([]);
  });

  it('carries no "SessionStart" key at any posture — the CLI rewrites a registered one to null (antigravity.md:44); bootstrap rides the source rules instead (FR-VAR-0082)', () => {
    for (const deterministic_hooks of [true, false]) {
      const doc = renderTemplate({ deterministic_hooks, destination: 'core-antigravity' }) as Record<
        string,
        Record<string, unknown>
      >;
      const wrapper = doc[Object.keys(doc)[0]];
      expect('SessionStart' in wrapper).toBe(false);
    }
  });

  it('PreToolUse groups carry a "matcher" and a nested "hooks" array — the WRAPPED tool-event shape', () => {
    const doc = renderTemplate({ deterministic_hooks: true, destination: 'core-antigravity' }) as Record<
      string,
      { PreToolUse: Array<{ matcher: string; hooks: unknown[] }> }
    >;
    const wrapper = doc[Object.keys(doc)[0]];
    for (const group of wrapper.PreToolUse) {
      expect(typeof group.matcher).toBe('string');
      expect(Array.isArray(group.hooks)).toBe(true);
    }
  });
});

describe('validateAntigravityDocument — negative cases', () => {
  it('rejects more than one top-level key (registration wraps under exactly one arbitrary key)', () => {
    const v = validateAntigravityDocument({ rosetta: { enabled: true }, extra: {} });
    expect(v.some((m) => m.includes('exactly one'))).toBe(true);
  });

  it('rejects a wrapper missing "enabled": true', () => {
    const v = validateAntigravityDocument({ rosetta: { PreToolUse: [] } });
    expect(v.some((m) => m.includes('enabled'))).toBe(true);
  });

  it('rejects a registered "SessionStart" key (antigravity.md:44 — invalid, rewritten to null by the CLI)', () => {
    const v = validateAntigravityDocument({ rosetta: { enabled: true, SessionStart: [] } });
    expect(v.some((m) => m.includes('SessionStart'))).toBe(true);
  });

  it('rejects PreToolUse shaped FLAT (that is the non-tool-event shape, not the tool-event shape)', () => {
    const v = validateAntigravityDocument({
      rosetta: { enabled: true, PreToolUse: [{ type: 'command', command: 'x' }] },
    });
    expect(v.some((m) => m.includes('PreToolUse'))).toBe(true);
  });

  it('rejects PreInvocation shaped GROUPED (that is the tool-event shape, not the flat non-tool shape)', () => {
    const v = validateAntigravityDocument({
      rosetta: { enabled: true, PreInvocation: [{ matcher: '', hooks: [] }] },
    });
    expect(v.some((m) => m.includes('PreInvocation'))).toBe(true);
  });

  it('accepts the documented example shapes verbatim (antigravity.md:62, :67)', () => {
    const v = validateAntigravityDocument({
      rosetta: {
        enabled: true,
        PreToolUse: [{ matcher: 'run_command|view_file', hooks: [{ type: 'command', command: '…', timeout: 30 }] }],
        PreInvocation: [{ type: 'command', command: '…', timeout: 30 }],
      },
    });
    expect(v).toEqual([]);
  });
});
