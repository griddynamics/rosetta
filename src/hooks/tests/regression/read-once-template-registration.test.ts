import { readdirSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { describe, expect, test } from 'vitest';

// Regression guard for read-once registration at SOURCE level: the seven `hooks.json.tmpl`
// templates are the only place the generator's hook documents are authored. Each template is a
// document FORM (not an IDE): Copilot and Cursor have a plugin form and a standalone form.
// Per form we assert the read-once command, the compaction reset event and its command, the
// cross-form markers (the guard that catches a plugin/standalone collapse), and that the
// template still parses as JSON once the three Handlebars token kinds are stripped.
//
// ROSETTA_TEMPLATES_DIR points the test at a scratch copy of `src/rosettify-plugins/plugins`
// (used by the mutation proofs); default is the repo templates.
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const TEMPLATES_DIR =
  process.env.ROSETTA_TEMPLATES_DIR ?? path.join(ROOT, 'src', 'rosettify-plugins', 'plugins');
const CATALOG = path.join(ROOT, 'src', 'rosettify-plugins', 'plugins.json');

const PLUGIN_FORM_MARKER = 'agent-plugins'; // Copilot plugin form probes the marketplace install root
const STANDALONE_FORM_MARKER = '.github/hooks/'; // Copilot standalone form uses the in-repo path

interface FormCase {
  name: string;
  file: string;
  /** Top-level object holding the events: `hooks` for most IDEs, `rosetta` for antigravity. */
  container: 'hooks' | 'rosetta';
  events: string[];
  readOnce: string;
  /** null = this IDE has no reset binding (antigravity). */
  reset: { event: string; command: string } | null;
  /** Copilot only: which cross-form marker pair applies. */
  form?: 'plugin' | 'standalone';
}

const CASES: FormCase[] = [
  {
    name: 'claude (plugin)',
    file: 'template-claude/hooks/hooks.json.tmpl',
    container: 'hooks',
    events: ['SessionStart', 'PostCompact', 'PreToolUse', 'PostToolUse'],
    readOnce: '${CLAUDE_PLUGIN_ROOT}/hooks/read-once.js',
    reset: { event: 'PostCompact', command: '${CLAUDE_PLUGIN_ROOT}/hooks/read-once-reset.js' },
  },
  {
    name: 'codex (plugin)',
    file: 'template-codex/.codex-plugin/hooks.json.tmpl',
    container: 'hooks',
    events: ['SessionStart', 'PostCompact', 'PreToolUse', 'PostToolUse'],
    readOnce: 'node .codex/hooks/read-once.js',
    reset: { event: 'PostCompact', command: 'node .codex/hooks/read-once-reset.js' },
  },
  {
    name: 'copilot plugin form',
    file: 'template-copilot/.github/plugin/hooks.json.tmpl',
    container: 'hooks',
    events: ['sessionStart', 'preCompact', 'PreToolUse', 'PostToolUse'],
    readOnce: '$root/hooks/read-once.js',
    reset: { event: 'preCompact', command: '$root/hooks/read-once-reset.js' },
    form: 'plugin',
  },
  {
    name: 'copilot standalone form',
    file: 'template-copilot/hooks/hooks.json.tmpl',
    container: 'hooks',
    events: ['sessionStart', 'preCompact', 'PreToolUse', 'PostToolUse'],
    readOnce: 'node ".github/hooks/read-once.js"',
    reset: { event: 'preCompact', command: 'node ".github/hooks/read-once-reset.js"' },
    form: 'standalone',
  },
  {
    name: 'cursor plugin form',
    file: 'template-cursor/hooks/hooks.json.tmpl',
    container: 'hooks',
    events: ['beforeReadFile', 'beforeTabFileRead', 'preCompact', 'preToolUse', 'postToolUse'],
    readOnce: 'node hooks/read-once.js',
    reset: { event: 'preCompact', command: 'node hooks/read-once-reset.js' },
  },
  {
    name: 'cursor standalone form',
    file: 'template-cursor/hooks.json.tmpl',
    container: 'hooks',
    events: ['beforeReadFile', 'beforeTabFileRead', 'preCompact', 'preToolUse', 'postToolUse'],
    readOnce: 'node .cursor/hooks/read-once.js',
    reset: { event: 'preCompact', command: 'node .cursor/hooks/read-once-reset.js' },
  },
  {
    name: 'antigravity',
    file: 'template-antigravity/hooks.json.tmpl',
    container: 'rosetta',
    events: ['enabled', 'PreInvocation', 'PreToolUse'],
    readOnce: 'node hooks/read-once.js',
    reset: null,
  },
];

/**
 * Strip the three Handlebars token kinds so the template parses as JSON. Tokens, not lines:
 * the guard also appears inline (`[]{{#if deterministic_hooks}},{{/if}}`), where deleting the
 * line would delete the event key.
 */
function stripTokens(raw: string): string {
  return raw
    .replace(/\{\{#if deterministic_hooks\}\},\{\{\/if\}\}/g, ',')
    .split('\n')
    .filter((line) => !/^\s*\{\{[#/]if[^}]*\}\}\s*$/.test(line))
    .join('\n')
    .replace(/\{\{\{bootstrap_hooks\}\}\}/g, '')
    // Handlebars consumes the backslash of `\{{destination}}`; replicate it, or `\X` is an invalid JSON escape.
    .replace(/\\\{\{destination\}\}/g, 'X')
    .replace(/\{\{destination\}\}/g, 'X');
}

/** Every string leaf of a parsed JSON value. */
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

function listTemplates(dir: string): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'hooks.json.tmpl') found.push(path.relative(dir, full).split(path.sep).join('/'));
    }
  };
  walk(dir);
  return found.sort();
}

function readTemplate(file: string): string {
  const full = path.join(TEMPLATES_DIR, file);
  expect(existsSync(full), `Missing template: ${full}`).toBe(true);
  return readFileSync(full, 'utf-8');
}

describe('read-once hook registration — templates', () => {
  test('census: exactly the seven known hooks.json.tmpl templates exist', () => {
    expect(listTemplates(TEMPLATES_DIR)).toEqual(CASES.map((c) => c.file).sort());
  });

  for (const c of CASES) {
    describe(c.name, () => {
      test('registers the read-once command and parses with the expected event keys', () => {
        const raw = readTemplate(c.file);
        const parsed = JSON.parse(stripTokens(raw));
        const events = parsed[c.container] as Record<string, unknown>;
        expect(Object.keys(events).sort()).toEqual([...c.events].sort());
        // read-once is registered on some event other than the reset event
        const readOnceEvents = Object.entries(events)
          .filter(([event]) => event !== c.reset?.event)
          .filter(([, v]) => strings(v).some((s) => s.includes(c.readOnce)))
          .map(([event]) => event);
        expect(readOnceEvents, `no non-reset event carries ${c.readOnce}`).not.toEqual([]);
      });

      if (c.reset) {
        const reset = c.reset;
        test(`binds read-once-reset to ${reset.event}`, () => {
          const parsed = JSON.parse(stripTokens(readTemplate(c.file)));
          const bound = strings(parsed[c.container][reset.event]);
          expect(bound.some((s) => s.includes(reset.command)), `${reset.event} lacks ${reset.command}`).toBe(true);
        });
      } else {
        test('has no read-once-reset binding (no compaction event on this IDE)', () => {
          // docs/hooks/antigravity.md:44 — antigravity has no compaction event (zero-hit `compact` grep).
          expect(readTemplate(c.file)).not.toContain('read-once-reset');
        });
      }

      if (c.form === 'plugin') {
        test('carries the plugin-form marker and not the standalone marker', () => {
          const raw = readTemplate(c.file);
          expect(raw).toContain(PLUGIN_FORM_MARKER);
          expect(raw).not.toContain(STANDALONE_FORM_MARKER);
        });
      }
      if (c.form === 'standalone') {
        test('carries the standalone-form marker and not the plugin marker', () => {
          const raw = readTemplate(c.file);
          expect(raw).toContain(STANDALONE_FORM_MARKER);
          expect(raw).not.toContain(PLUGIN_FORM_MARKER);
        });
      }
    });
  }
});

describe('read-once hook registration — plugin-set catalog', () => {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf-8'));
  const set = (name: string) => catalog.sets.find((s: { name: string }) => s.name === name);

  test('read-once support modules are declared', () => {
    // A set declaring `read-once` must ship its two support modules, or read-once loads nothing.
    expect(catalog.hookSupportModules['read-once']).toEqual(['read-once-reset', 'read-once-shared']);
  });

  for (const name of ['rosetta', 'core']) {
    test(`${name} declares the 6 hook modules and bootstraps`, () => {
      expect(set(name).hooks).toEqual([
        'dangerous-actions',
        'read-once',
        'loose-files',
        'md-file-advisory',
        'codemap-refresh',
        'lint-format-advisory',
      ]);
      expect(set(name).bootstrap).toBe(true);
    });
  }

  for (const name of ['workflows', 'qe', 'search', 'modernization']) {
    test(`${name} declares no hooks and no bootstrap`, () => {
      expect(set(name).hooks).toEqual([]);
      expect(set(name).bootstrap).toBe(false);
    });
  }
});
