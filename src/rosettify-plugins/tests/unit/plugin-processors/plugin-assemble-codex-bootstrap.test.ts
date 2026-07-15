// FR-ARCH-0055, FR-VAR-0070 — pluginAssembleCodexBootstrap: statusMessage+timeout entries, workspace-root probe
import { describe, it, expect } from 'vitest';
import { pluginAssembleCodexBootstrap } from '../../../src/plugin-processors/plugin-assemble-codex-bootstrap.js';
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
      name: 'core-codex',
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

// ─── Key assignment ───────────────────────────────────────────────────────────

describe('pluginAssembleCodexBootstrap — key assignment (FR-VAR-0070)', () => {
  it('sets templateContext[bootstrap_hooks] — ONE shared key', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    expect(result.templateContext['bootstrap_hooks']).toBeDefined();
    expect(result.templateContext['bootstrap_hooks']).not.toBe('');
  });

  it('bootstrap_hooks_codex is UNDEFINED (no per-IDE suffix)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    expect(result.templateContext['bootstrap_hooks_codex']).toBeUndefined();
  });
});

// ─── Entry shape (GT-3.2) ─────────────────────────────────────────────────────

describe('pluginAssembleCodexBootstrap — entry shape', () => {
  it('entries contain "statusMessage": "Loading Rosetta bootstrap"', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"statusMessage": "Loading Rosetta bootstrap"');
  });

  it('entries contain "timeout": 30', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"timeout": 30');
  });

  it('entries do NOT contain "once" (not claude shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"once"');
  });

  it('entries contain "type": "command"', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"type": "command"');
  });

  it('entries do NOT contain "bash" or "powershell" (not copilot shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"bash"');
    expect(payload).not.toContain('"powershell"');
  });

  it('entries contain hookSpecificOutput (not additional_context)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('hookSpecificOutput');
  });
});

// ─── Plugin-root entry ────────────────────────────────────────────────────────

describe('pluginAssembleCodexBootstrap — plugin-root entry (workspace-root traversal)', () => {
  it('plugin-root contains workspace-root traversal path (.agents/rules/plugin-files-mode.md)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('.agents/rules/plugin-files-mode.md');
  });

  it('plugin-root contains $workspace_root/.agents path', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('$workspace_root/.agents');
  });

  it('plugin-root entry uses buildCodexBootstrapEntry shape (statusMessage + timeout) and contains CODEX_PLUGIN_ROOT_COMMAND distinctive substring', () => {
    // Even the plugin-root entry uses buildCodexBootstrapEntry — must have statusMessage + timeout
    // The command also contains a recognizable part of CODEX_PLUGIN_ROOT_COMMAND (workspace_root traversal)
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    // Both doc entry and root entry use the same shape
    const occurrences = (payload.match(/"statusMessage"/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2); // at least one doc entry + the plugin-root entry
    // Precise shape: plugin-root entry contains the codex shape fields
    expect(payload).toContain('"statusMessage": "Loading Rosetta bootstrap"');
    expect(payload).toContain('"timeout": 30');
    // Distinctive part of CODEX_PLUGIN_ROOT_COMMAND: workspace_root traversal
    expect(payload).toContain('workspace_root');
  });

  it('entries are joined by ", " separator with 2+ docs present', () => {
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('}, {');
  });
});

// ─── NFR-0004: size > 10000 → soft error ─────────────────────────────────────

describe('pluginAssembleCodexBootstrap — NFR-0004 soft error', () => {
  it('entry > 10000 chars → soft error pushed to frame.errors', () => {
    const largeBody = '\n' + 'A'.repeat(11000);
    const frames = [makeDocFrame('plugin-files-mode', largeBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].kind).toBe('soft');
  });

  it('no soft error for normal-sized bodies', () => {
    const normalBody = '\n' + 'A'.repeat(8000);
    const frames = [makeDocFrame('plugin-files-mode', normalBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCodexBootstrap(p);
    const softErrors = result.errors.filter((e) => e.kind === 'soft');
    expect(softErrors.length).toBe(0);
  });
});
