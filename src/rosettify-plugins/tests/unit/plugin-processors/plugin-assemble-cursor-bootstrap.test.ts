// FR-ARCH-0055, FR-VAR-0070, Owner Rule 1 — pluginAssembleCursorBootstrap: full bootstrap always generated
// Cursor uses additional_context payload (NOT hookSpecificOutput); template has no placeholder.
import { describe, it, expect } from 'vitest';
import { pluginAssembleCursorBootstrap } from '../../../src/plugin-processors/plugin-assemble-cursor-bootstrap.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';
import { BOOTSTRAP_MANIFEST_ORDER } from '../../../src/spec/bootstrap-manifest.js';

function makeDocFrame(basename: string, body: string): FileProcessingFrame {
  return {
    sourcePath: `rules/${basename}.md`,
    target: `rules/${basename}.md`,
    isBinary: false,
    target_contents: `---\nname: ${basename}\n---\n${body}`,
    source: [],
  };
}

function makePluginFrame(
  frames: FileProcessingFrame[],
  extra?: { includeIndexEntries?: boolean },
): PluginProcessingFrame {
  return {
    spec: {
      name: 'core-cursor',
      includeBootstrapRules: true,
      includeIndexEntries: extra?.includeIndexEntries ?? false,
      bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
      specEntries: [],
      baseSubfolder: '',
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

// ─── Key assignment + Owner Rule 1 ───────────────────────────────────────────

describe('pluginAssembleCursorBootstrap — key assignment + Owner Rule 1', () => {
  it('sets templateContext[bootstrap_hooks] — ONE shared key', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    expect(result.templateContext['bootstrap_hooks']).toBeDefined();
  });

  it('bootstrap_hooks is NON-EMPTY (Owner Rule 1: cursor always generates full bootstrap)', () => {
    // Even with no frames, plugin-root entry is always generated → payload non-empty
    const p = makePluginFrame([]);
    const result = pluginAssembleCursorBootstrap(p);
    // At minimum the plugin-root entry is present
    expect(result.templateContext['bootstrap_hooks']).not.toBe('');
  });

  it('with doc frames: bootstrap_hooks is non-empty and contains entries', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload.length).toBeGreaterThan(0);
  });

  it('bootstrap_hooks_cursor is UNDEFINED (no per-IDE suffix)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    expect(result.templateContext['bootstrap_hooks_cursor']).toBeUndefined();
  });
});

// ─── Entry shape (cursor: additional_context, NOT hookSpecificOutput) ────────

describe('pluginAssembleCursorBootstrap — entry shape', () => {
  it('entries contain "additional_context" key (cursor payload format)', () => {
    // Cursor uses buildCursorHookPayloadJson → {"additional_context":"..."}
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('additional_context');
  });

  it('entries do NOT contain "hookSpecificOutput" (not claude/codex/copilot format)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('hookSpecificOutput');
  });

  it('entries do NOT contain "once" (not claude shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"once"');
  });

  it('entries do NOT contain "statusMessage" (not codex shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"statusMessage"');
  });

  it('entries do NOT contain "bash" or "powershell" (not copilot shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"bash"');
    expect(payload).not.toContain('"powershell"');
  });

  it('entries contain "type": "command"', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"type": "command"');
  });

  it('entries contain "command" key', () => {
    // Cursor entry: only type + command (no once, statusMessage, bash, powershell)
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    // Verify presence of command key
    expect(payload).toContain('"command"');
  });
});

// ─── Plugin-root entry ────────────────────────────────────────────────────────

describe('pluginAssembleCursorBootstrap — plugin-root entry', () => {
  it('plugin-root contains CURSOR_PROJECT_DIR env var', () => {
    // CURSOR_PLUGIN_ROOT_ENTRY.command = printf '{"additional_context":"Rosetta Plugin Path: %s"}' "${CURSOR_PROJECT_DIR}"
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('CURSOR_PROJECT_DIR');
  });

  it('plugin-root entry also uses additional_context format (not hookSpecificOutput)', () => {
    // Even the plugin-root command uses {"additional_context":"..."}
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('additional_context');
    expect(payload).not.toContain('hookSpecificOutput');
  });

  it('entries are joined by ", " separator with 2+ entries', () => {
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('}, {');
  });
});

// ─── NFR-0004: size > 10000 → soft error ─────────────────────────────────────

describe('pluginAssembleCursorBootstrap — NFR-0004 soft error', () => {
  it('entry > 10000 chars → soft error pushed to frame.errors', () => {
    const largeBody = '\n' + 'A'.repeat(11000);
    const frames = [makeDocFrame('plugin-files-mode', largeBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].kind).toBe('soft');
  });

  it('no soft error for normal-sized bodies', () => {
    const normalBody = '\n' + 'A'.repeat(8000);
    const frames = [makeDocFrame('plugin-files-mode', normalBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCursorBootstrap(p);
    const softErrors = result.errors.filter((e) => e.kind === 'soft');
    expect(softErrors.length).toBe(0);
  });
});
