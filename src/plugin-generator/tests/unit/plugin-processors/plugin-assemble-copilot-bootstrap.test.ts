// FR-ARCH-0055, FR-VAR-0070 — pluginAssembleCopilotBootstrap: bash+powershell entries, per-entry session locks
import { describe, it, expect } from 'vitest';
import { pluginAssembleCopilotBootstrap } from '../../../src/plugin-processors/plugin-assemble-copilot-bootstrap.js';
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
      name: 'core-copilot',
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

describe('pluginAssembleCopilotBootstrap — key assignment (FR-VAR-0070)', () => {
  it('sets templateContext[bootstrap_hooks] — ONE shared key', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    expect(result.templateContext['bootstrap_hooks']).toBeDefined();
    expect(result.templateContext['bootstrap_hooks']).not.toBe('');
  });

  it('bootstrap_hooks_copilot is UNDEFINED (no per-IDE suffix)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    expect(result.templateContext['bootstrap_hooks_copilot']).toBeUndefined();
  });
});

// ─── Entry shape (GT-3.3) ─────────────────────────────────────────────────────

describe('pluginAssembleCopilotBootstrap — entry shape', () => {
  it('entries contain "bash" key', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"bash"');
  });

  it('entries contain "powershell" key', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"powershell"');
  });

  it('entries do NOT contain "once" (not claude shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"once"');
  });

  it('entries contain "type": "command"', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('"type": "command"');
  });

  it('entries do NOT contain "statusMessage" (not codex shape)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('"statusMessage"');
  });
});

// ─── Session lock indices ─────────────────────────────────────────────────────

describe('pluginAssembleCopilotBootstrap — session lock indices', () => {
  it('entry 0 bash contains -0.lock (lock index 0)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('-0.lock');
  });

  it('entry 0 bash contains rosetta-bs-*.lock (stale-lock cleanup)', () => {
    // Entry 0 includes stale-lock find/delete: find /tmp -maxdepth 1 -name "rosetta-bs-*.lock"
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    // stale-lock cleanup uses -mmin +1 -delete pattern
    expect(payload).toContain('rosetta-bs-*.lock');
  });

  it('with 2 doc frames: entry 1 bash contains -1.lock', () => {
    // plugin-files-mode (lockIndex=0) + bootstrap-core-policy (lockIndex=1)
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('-1.lock');
  });

  it('with 2 doc frames: entry 1 does NOT contain rosetta-bs-*.lock (no stale cleanup)', () => {
    // Only entry 0 has stale-lock cleanup; entry 1+ skip it
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    // Entry 0 bash has the stale-lock (rosetta-bs-*.lock), entry 1 does not
    // Count occurrences: only 1 stale cleanup (from entry 0)
    const staleCleanupCount = (payload.match(/rosetta-bs-\*\.lock/g) || []).length;
    expect(staleCleanupCount).toBe(1);
  });
});

// ─── Plugin-root entry ────────────────────────────────────────────────────────

describe('pluginAssembleCopilotBootstrap — plugin-root entry', () => {
  it('plugin-root contains agentPlugins path (copilot plugin root)', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('agentPlugins');
  });

  it('plugin-root entry uses COPILOT_PLUGIN_ROOT_BASH (no session lock)', () => {
    // The copilot plugin-root entry is built from COPILOT_PLUGIN_ROOT_BASH/POWERSHELL directly
    // It does NOT use a session lock (no -N.lock pattern in the root entry)
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    // Plugin-root entry has no -N.lock pattern (locks are only for doc entries)
    expect(payload).not.toMatch(/agentPlugins.*-\d+\.lock/s);
  });

  it('entries joined by ", " separator', () => {
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('}, {');
  });
});

// ─── NFR-0004: size > 10000 → soft error ─────────────────────────────────────

describe('pluginAssembleCopilotBootstrap — NFR-0004 soft error', () => {
  it('entry > 10000 chars → soft error pushed to frame.errors', () => {
    const largeBody = '\n' + 'A'.repeat(11000);
    const frames = [makeDocFrame('plugin-files-mode', largeBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].kind).toBe('soft');
  });

  it('no soft error for normal-sized bodies', () => {
    // Real bodies are ~8000 chars; copilot's bash+powershell don't inflate the size check
    const normalBody = '\n' + 'A'.repeat(8000);
    const frames = [makeDocFrame('plugin-files-mode', normalBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const softErrors = result.errors.filter((e) => e.kind === 'soft');
    expect(softErrors.length).toBe(0);
  });
});
