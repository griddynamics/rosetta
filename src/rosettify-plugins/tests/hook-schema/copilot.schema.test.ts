// Hook schema — Copilot (docs/hooks/copilot.md), the plugin's ONE document serving ALL Copilot
// variants (VS Code, JetBrains, and the CLI) from a single file (docs/hooks/copilot.md:66-87 and
// its "merged emit" rule; FR-HOOK-0005). Unit-test level: no generator run, no hooks.json written
// to disk. The real template is read from disk and rendered IN-MEMORY with Handlebars, never
// written anywhere.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import {
  validateCopilotDocument,
  validateCopilotMergedContext,
} from './validator.js';
import { buildCopilotHookPayloadJson } from '../../src/escaping/json-string.js';

const ROOT = path.resolve(__dirname, '../..');
const TMPL_PATH = 'plugins/template-copilot/.github/plugin/hooks.json.tmpl';

function renderPlugin(ctx: Record<string, unknown>): unknown {
  const src = fs.readFileSync(path.join(ROOT, TMPL_PATH), 'utf-8');
  const compiled = Handlebars.compile(src, { noEscape: false, strict: true });
  return JSON.parse(compiled(ctx));
}

describe('copilot plugin-form hooks.json.tmpl — currently ENABLED shapes', () => {
  it('at deterministic_hooks=true, matches the mixed-casing schema (version:1, camel bootstrap + PascalCase guardrails)', () => {
    const doc = renderPlugin({
      deterministic_hooks: true,
      bootstrap_hooks: buildCopilotHookPayloadJson('hello'),
      destination: 'core-copilot',
    });
    expect(validateCopilotDocument(doc)).toEqual([]);
  });

  it('registers camelCase "sessionStart", never PascalCase "SessionStart" — bootstrap delivered via rules (FR-VAR-0070 Approved)', () => {
    const doc = renderPlugin({
      deterministic_hooks: true,
      bootstrap_hooks: buildCopilotHookPayloadJson('hello'),
      destination: 'core-copilot',
    }) as { hooks: Record<string, unknown> };
    expect('sessionStart' in doc.hooks).toBe(true);
    expect('SessionStart' in doc.hooks).toBe(false);
  });

  it('registers camelCase "preCompact", never PascalCase "PreCompact"', () => {
    const doc = renderPlugin({
      deterministic_hooks: true,
      bootstrap_hooks: '',
      destination: 'core-copilot',
    }) as { hooks: Record<string, unknown> };
    expect('preCompact' in doc.hooks).toBe(true);
    expect('PreCompact' in doc.hooks).toBe(false);
  });

  it('registers PascalCase PreToolUse/PostToolUse — the shape that fires in BOTH VS Code and the CLI (copilot.md:16)', () => {
    const doc = renderPlugin({
      deterministic_hooks: true,
      bootstrap_hooks: '',
      destination: 'core-copilot',
    }) as { hooks: Record<string, unknown> };
    expect('PreToolUse' in doc.hooks).toBe(true);
    expect('PostToolUse' in doc.hooks).toBe(true);
    // Not double-registered under the camelCase spelling too — that would double-fire in the CLI
    // (copilot.md:16: "Copilot CLI fires BOTH conventions if both are registered => double-fire").
    expect('preToolUse' in doc.hooks).toBe(false);
    expect('postToolUse' in doc.hooks).toBe(false);
  });

  it('every guardrail command entry carries BOTH bash and powershell (FR-HOOK-0005.AC, FR-HOOK.md:111)', () => {
    const doc = renderPlugin({
      deterministic_hooks: true,
      bootstrap_hooks: '',
      destination: 'core-copilot',
    }) as { hooks: { PreToolUse: Array<{ hooks: Array<Record<string, unknown>> }> } };
    for (const group of doc.hooks.PreToolUse) {
      for (const entry of group.hooks) {
        expect(typeof entry.bash).toBe('string');
        expect(typeof entry.powershell).toBe('string');
      }
    }
  });
});

// FR-HOOK-0005.AC (FR-HOOK.md:112) / copilot.md:66-87's merged-emit rule: additionalContext must
// be present at BOTH the top level (Copilot CLI) and nested under hookSpecificOutput (VS Code) —
// exercised directly against the production builder, not a hand-reimplemented shape.
describe('Copilot session-start payload — merged top-level + nested additionalContext', () => {
  it('buildCopilotHookPayloadJson emits both placements with the identical body', () => {
    const payload = JSON.parse(buildCopilotHookPayloadJson('Rosetta Plugin Path: /some/root'));
    expect(validateCopilotMergedContext(payload)).toEqual([]);
    expect(payload.additionalContext).toBe(payload.hookSpecificOutput.additionalContext);
  });

  it('a top-level-only payload (CLI-only) fails the merged-context check', () => {
    const v = validateCopilotMergedContext({ additionalContext: 'x' });
    expect(v.some((m) => m.includes('hookSpecificOutput'))).toBe(true);
  });

  it('a nested-only payload (VS Code-only) fails the merged-context check', () => {
    const v = validateCopilotMergedContext({
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'x' },
    });
    expect(v.some((m) => m.includes('top-level'))).toBe(true);
  });

  it('mismatched bodies at the two placements fail the merged-context check', () => {
    const v = validateCopilotMergedContext({
      additionalContext: 'a',
      hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: 'b' },
    });
    expect(v.some((m) => m.includes('SAME body'))).toBe(true);
  });
});

// Currently-OFF shapes (owner constraint 1 — do NOT enable these registrations; this coverage
// exists so that IF they are ever turned on, the shapes are already known correct). copilot.md's
// capability matrix (line ~16-27) documents PascalCase SessionStart/PreCompact firing in both
// runtimes exactly like the already-on PreToolUse/PostToolUse; that is the shape these tests
// pin, hand-built rather than read from any template (no template emits them today).
describe('Copilot RESERVED (currently disabled) shapes — PascalCase SessionStart / PreCompact', () => {
  it('a well-formed PascalCase SessionStart shape (flat, mirroring camelCase sessionStart) validates', () => {
    const doc = {
      version: 1,
      hooks: {
        SessionStart: [JSON.parse(buildCopilotHookPayloadJson('hello'))],
      },
    };
    expect(validateCopilotDocument(doc)).toEqual([]);
  });

  it('a well-formed PascalCase PreCompact shape (flat, mirroring camelCase preCompact) validates', () => {
    const doc = {
      version: 1,
      hooks: {
        PreCompact: [{ type: 'command', bash: 'echo a', powershell: 'echo a' }],
      },
    };
    expect(validateCopilotDocument(doc)).toEqual([]);
  });

  it('rejects a PascalCase SessionStart that is not even an array (a {matcher,hooks} group, not a flat list)', () => {
    const v = validateCopilotDocument({ version: 1, hooks: { SessionStart: { matcher: '', hooks: [] } } });
    expect(v.some((m) => m.includes('SessionStart'))).toBe(true);
  });
});

describe('validateCopilotDocument — negative cases', () => {
  it('rejects a missing "version": 1', () => {
    const v = validateCopilotDocument({ hooks: {} });
    expect(v.some((m) => m.includes('version'))).toBe(true);
  });

  it('rejects a PreToolUse command entry with only "command" (no bash/powershell) — the Copilot double-shell requirement', () => {
    const v = validateCopilotDocument({
      version: 1,
      hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo x' }] }] },
    });
    expect(v.some((m) => m.includes('bash') && m.includes('powershell'))).toBe(true);
  });

  it('rejects sessionStart shaped as a {matcher,hooks} group instead of a flat array', () => {
    const v = validateCopilotDocument({
      version: 1,
      hooks: { sessionStart: { matcher: '', hooks: [] } },
    });
    expect(v.some((m) => m.includes('sessionStart'))).toBe(true);
  });
});
