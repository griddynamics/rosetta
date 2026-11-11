// Hook schema — Cursor (docs/hooks/cursor.md:105-122, "hooks.json registration format").
// Unit-test level: no generator run, no hooks.json written to disk. Real templates are read from
// disk and rendered IN-MEMORY with Handlebars, never written anywhere.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { validateCursorDocument } from './validator.js';

const ROOT = path.resolve(__dirname, '../..');

function renderTemplate(relPath: string, ctx: Record<string, unknown>): unknown {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  const compiled = Handlebars.compile(src, { noEscape: false, strict: true });
  return JSON.parse(compiled(ctx));
}

describe.each([
  ['plugin form (hooks/hooks.json.tmpl)', 'plugins/template-cursor/hooks/hooks.json.tmpl'],
  ['standalone form (hooks.json.tmpl)', 'plugins/template-cursor/hooks.json.tmpl'],
])('cursor %s — registration schema', (_label, tmplPath) => {
  it('at deterministic_hooks=true, matches the {version:1, hooks:{camelEvent:[flat entries]}} shape', () => {
    const doc = renderTemplate(tmplPath, { deterministic_hooks: true, destination: 'core-cursor' });
    expect(validateCursorDocument(doc)).toEqual([]);
  });

  it('at deterministic_hooks=false, reduces to {version:1, hooks:{}} — still valid', () => {
    const doc = renderTemplate(tmplPath, { deterministic_hooks: false, destination: 'core-cursor' });
    expect(validateCursorDocument(doc)).toEqual([]);
    expect(doc).toEqual({ version: 1, hooks: {} });
  });

  it('registers no "sessionStart" key — Cursor delivers bootstrap through auto-loaded rules instead (FR-VAR-0070 Approved)', () => {
    const doc = renderTemplate(tmplPath, { deterministic_hooks: true, destination: 'core-cursor' }) as {
      hooks: Record<string, unknown>;
    };
    expect('sessionStart' in doc.hooks).toBe(false);
  });
});

// Currently-OFF (reserved) shape — owner constraint 1: do NOT wire Cursor's sessionStart. This
// coverage exists so that IF it is ever enabled, the shape is already known correct. cursor.md's
// Capability Matrix confirms `sessionStart` — inject additional_context (reaches model) is ✅
// verified working (Run 2); Rosetta deliberately never registers it. Hand-built, since no
// template emits this key today.
describe('Cursor RESERVED (currently disabled) shape — sessionStart', () => {
  it('a well-formed sessionStart entry (flat, no hookSpecificOutput wrapper) validates', () => {
    const doc = {
      version: 1,
      hooks: {
        sessionStart: [{ command: 'node .cursor/hooks/bootstrap.js', type: 'command' }],
      },
    };
    expect(validateCursorDocument(doc)).toEqual([]);
  });

  it('rejects a sessionStart entry shaped with a hookSpecificOutput wrapper (that is Claude/Codex/VS-Code-Copilot shape, not Cursor)', () => {
    const v = validateCursorDocument({
      version: 1,
      hooks: {
        sessionStart: [{ command: 'x', type: 'command', hookSpecificOutput: { hookEventName: 'SessionStart' } }],
      },
    });
    expect(v.some((m) => m.includes('hookSpecificOutput'))).toBe(true);
  });
});

describe('validateCursorDocument — negative cases', () => {
  it('rejects a missing "version": 1', () => {
    const v = validateCursorDocument({ hooks: {} });
    expect(v.some((m) => m.includes('version'))).toBe(true);
  });

  it('rejects a PascalCase event key', () => {
    const v = validateCursorDocument({ version: 1, hooks: { PreToolUse: [] } });
    expect(v.some((m) => m.includes('camelCase'))).toBe(true);
  });

  it('rejects a {matcher, hooks:[...]} GROUPED entry — Cursor is flat, matcher is inline per-entry', () => {
    const v = validateCursorDocument({
      version: 1,
      hooks: { preToolUse: [{ matcher: 'Shell', hooks: [{ type: 'command', command: 'x' }] }] },
    });
    expect(v.some((m) => m.includes('FLAT'))).toBe(true);
  });

  it('accepts the documented example shape verbatim (cursor.md:107-121)', () => {
    const v = validateCursorDocument({
      version: 1,
      hooks: {
        preToolUse: [
          {
            command: 'path/to/script',
            type: 'command',
            timeout: 60,
            loop_limit: null,
            failClosed: false,
            matcher: 'Shell',
          },
        ],
      },
    });
    expect(v).toEqual([]);
  });
});
