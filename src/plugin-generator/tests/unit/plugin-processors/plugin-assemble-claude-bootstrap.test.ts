// FR-ARCH-0055, FR-VAR-0070 — pluginAssembleClaudeBootstrap: one shared key, once:true entries
import { describe, it, expect } from 'vitest';
import { pluginAssembleClaudeBootstrap } from '../../../src/plugin-processors/plugin-assemble-claude-bootstrap.js';
import type { FileProcessingFrame, PluginProcessingFrame, PluginSpec } from '../../../src/types.js';
import { BOOTSTRAP_MANIFEST_ORDER, BOOTSTRAP_PREFIX } from '../../../src/spec/bootstrap-manifest.js';

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
      name: 'core-claude',
      includeBootstrapRules: true,
      includeIndexEntries: extra?.includeIndexEntries ?? false,
      bootstrapManifest: [...BOOTSTRAP_MANIFEST_ORDER],
      specEntries: [],
      baseSubfolder: '',
      // NOTE: hookEntryShape is DELETED (FR-ARCH-0005 / C4) — not present in new assemblers
    } as unknown as PluginSpec,
    vfs: [] as any,
    frames,
    templateContext: {},
    errors: [],
  };
}

// ─── Key assignment ───────────────────────────────────────────────────────────

describe('pluginAssembleClaudeBootstrap — key assignment (FR-VAR-0070)', () => {
  it('sets templateContext[bootstrap_hooks] — ONE shared key', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    expect(result.templateContext['bootstrap_hooks']).toBeDefined();
    expect(result.templateContext['bootstrap_hooks']).not.toBe('');
  });

  it('bootstrap_hooks_claude is UNDEFINED (no per-IDE suffix)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    expect(result.templateContext['bootstrap_hooks_claude']).toBeUndefined();
  });
});

// ─── Entry shape (GT-3.1) ─────────────────────────────────────────────────────

describe('pluginAssembleClaudeBootstrap — entry shape', () => {
  it('entries contain "once": true', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"once": true');
  });

  it('entries contain "type": "command"', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"type": "command"');
  });

  it('entries contain hookSpecificOutput inside the command payload', () => {
    // Claude entries use buildHookPayloadJson → {"hookSpecificOutput":...}
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('hookSpecificOutput');
  });

  it('entries do NOT contain "additional_context" key', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"additional_context"');
  });

  it('entries do NOT contain "statusMessage" or "timeout" (not codex shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"statusMessage"');
    expect(payload).not.toContain('"timeout"');
  });

  it('entries do NOT contain "bash" or "powershell" (not copilot shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"bash"');
    expect(payload).not.toContain('"powershell"');
  });
});

// ─── Plugin-root entry ────────────────────────────────────────────────────────

describe('pluginAssembleClaudeBootstrap — plugin-root entry', () => {
  it('plugin-root entry is present (contains CLAUDE_PLUGIN_ROOT) and is the LAST entry', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('CLAUDE_PLUGIN_ROOT');
    // Pin ordering guarantee: plugin-root is always the final entry
    // Entries are separated by '}, {' — split on that to isolate each entry
    const entries = payload.split('}, {');
    expect(entries[entries.length - 1]).toContain('CLAUDE_PLUGIN_ROOT');
  });

  it('entries are joined by ", " separator', () => {
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('}, {');
  });

  it('absent manifest entries are skipped (FR-HOOK-0001) — 1 doc + plugin-root = 2 entries', () => {
    // Only plugin-files-mode present
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    const entries = payload.split(', {');
    expect(entries.length).toBe(2); // 1 doc + 1 plugin-root
  });
});

// ─── Lead document gets prefix (FR-HOOK-0003) ────────────────────────────────

describe('pluginAssembleClaudeBootstrap — lead document prefix', () => {
  it('payload contains bootstrap prefix text', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Bootstrap Content\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('ALWAYS MUST FULLY');
  });
});

// ─── NFR-0004: size > 10000 → soft error ─────────────────────────────────────

describe('pluginAssembleClaudeBootstrap — NFR-0004 soft error', () => {
  it('entry > 10000 chars → soft error pushed to frame.errors', () => {
    // A body of ~11000 chars forces jsonPayload > 10000
    const largeBody = '\n' + 'A'.repeat(11000);
    const frames = [makeDocFrame('plugin-files-mode', largeBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].kind).toBe('soft');
  });

  it('error names the file that caused the overflow', () => {
    const largeBody = '\n' + 'A'.repeat(11000);
    const frames = [makeDocFrame('plugin-files-mode', largeBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    expect(result.errors[0].file).toBe('plugin-files-mode');
  });

  it('no soft error for normal-sized bodies (< 10000 chars)', () => {
    const normalBody = '\n' + 'A'.repeat(8000);
    const frames = [makeDocFrame('plugin-files-mode', normalBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleClaudeBootstrap(p);
    const softErrors = result.errors.filter((e) => e.kind === 'soft');
    expect(softErrors.length).toBe(0);
  });
});
