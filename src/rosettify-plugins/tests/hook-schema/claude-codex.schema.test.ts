// Hook schema — Claude Code and Codex (docs/hooks/claude-code.md, docs/hooks/codex.md).
// Unit-test level: no generator run, no hooks.json written to disk. Real templates are read from
// disk and rendered IN-MEMORY with Handlebars (the same library and strict-mode settings
// plugin-render-templates.ts uses), never written anywhere — this ties the schema assertions to
// the actual production template text without going through the generator pipeline or the
// output-tree gate (scripts/verify/ac_hooks_content.py covers the built tree;
// this file does not duplicate it).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import { validateClaudeOrCodexDocument } from './validator.js';

const ROOT = path.resolve(__dirname, '../..');

function renderTemplate(relPath: string, ctx: Record<string, unknown>): unknown {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  const compiled = Handlebars.compile(src, { noEscape: false, strict: true });
  return JSON.parse(compiled(ctx));
}

describe.each([
  ['claude', 'plugins/template-claude/hooks/hooks.json.tmpl'],
  ['codex', 'plugins/template-codex/.codex-plugin/hooks.json.tmpl'],
])('%s hooks.json.tmpl — registration schema (claude-code.md:87-107 / codex.md:86-106)', (ide, tmplPath) => {
  it('at deterministic_hooks=true, matches the {hooks:{PascalEvent:[{matcher,hooks:[{type,command}]}]}} shape', () => {
    const doc = renderTemplate(tmplPath, {
      deterministic_hooks: true,
      bootstrap_hooks: '{"type":"command","command":"echo hi"}',
      destination: 'core-' + ide,
    });
    expect(validateClaudeOrCodexDocument(doc)).toEqual([]);
  });

  it('at deterministic_hooks=false, still matches the shape (bootstrap-only document)', () => {
    const doc = renderTemplate(tmplPath, {
      deterministic_hooks: false,
      bootstrap_hooks: '{"type":"command","command":"echo hi"}',
      destination: 'core-' + ide,
    });
    expect(validateClaudeOrCodexDocument(doc)).toEqual([]);
  });

  it('registers SessionStart as the leading key (bootstrap slot renders first — insertion order)', () => {
    const doc = renderTemplate(tmplPath, {
      deterministic_hooks: true,
      bootstrap_hooks: '{"type":"command","command":"echo hi"}',
      destination: 'core-' + ide,
    }) as { hooks: Record<string, unknown> };
    expect(Object.keys(doc.hooks)[0]).toBe('SessionStart');
  });
});

// Claude Code fires SessionStart with source startup | resume | clear | compact and tests the
// group's matcher against that source (claude-code.md:130). The bootstrap reaches the agent through
// this hook only (FR-VAR.md, Claude section: "no always-on rule auto-load for this payload"). /clear
// and compaction rebuild the context without the earlier hook output, so the bootstrap group must
// match both. A resumed session replays the hook output its transcript already holds, so matching
// `resume` would deliver the bootstrap twice.
describe('claude hooks.json.tmpl — SessionStart sources that receive the bootstrap (claude-code.md:130)', () => {
  // Matcher pattern rules, claude-code.md:145-151.
  function matcherAccepts(matcher: string | undefined, value: string): boolean {
    if (matcher === undefined || matcher === '' || matcher === '*') return true;
    if (/^[a-zA-Z0-9_ ,|]+$/.test(matcher)) {
      return matcher.split(/[|,]/).map((s) => s.trim()).includes(value);
    }
    return new RegExp(matcher).test(value);
  }

  function bootstrapGroupAccepts(source: string): boolean {
    const doc = renderTemplate('plugins/template-claude/hooks/hooks.json.tmpl', {
      deterministic_hooks: false,
      bootstrap_hooks: '{"type":"command","command":"echo hi"}',
      destination: 'core-claude',
    }) as { hooks: { SessionStart: { matcher?: string; hooks: unknown[] }[] } };
    return doc.hooks.SessionStart.some((group) => group.hooks.length > 0 && matcherAccepts(group.matcher, source));
  }

  it.each(['startup', 'clear', 'compact'])('delivers the bootstrap on source "%s"', (source) => {
    expect(bootstrapGroupAccepts(source)).toBe(true);
  });

  it('does not deliver the bootstrap again on source "resume"', () => {
    expect(bootstrapGroupAccepts('resume')).toBe(false);
  });
});

describe('validateClaudeOrCodexDocument — negative cases', () => {
  it('rejects a "version" key (claude/codex carry no version envelope field)', () => {
    const v = validateClaudeOrCodexDocument({ version: 1, hooks: {} });
    expect(v.some((m) => m.includes('version'))).toBe(true);
  });

  it('rejects a camelCase event key', () => {
    const v = validateClaudeOrCodexDocument({ hooks: { sessionStart: [] } });
    expect(v.some((m) => m.includes('PascalCase'))).toBe(true);
  });

  it('rejects a FLAT entry (Cursor/Copilot-bootstrap shape) where Claude/Codex require grouping', () => {
    const v = validateClaudeOrCodexDocument({ hooks: { PreToolUse: [{ type: 'command', command: 'x' }] } });
    expect(v.some((m) => m.includes('grouped'))).toBe(true);
  });

  it('accepts the documented example shape verbatim (claude-code.md:89-104)', () => {
    const v = validateClaudeOrCodexDocument({
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/script.sh' }],
          },
        ],
      },
    });
    expect(v).toEqual([]);
  });
});
