// FR-ARCH-0055, FR-VAR-0070 — pluginAssembleCopilotBootstrap: bash+powershell entries
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

// Bug 2 (docs/hooks/copilot.md): additionalContext must be emitted at BOTH top-level
// (Copilot CLI) AND nested in hookSpecificOutput (VS Code) — neither alone reaches both.
describe('pluginAssembleCopilotBootstrap — merged additionalContext emit (Bug 2)', () => {
  it('doc entries carry BOTH top-level and nested additionalContext', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('\\"additionalContext\\"');
    expect(payload).toContain('\\"hookSpecificOutput\\"');
    // top-level additionalContext appears before the nested hookSpecificOutput wrapper
    const topLevelIndex = payload.indexOf('\\"additionalContext\\"');
    const nestedWrapperIndex = payload.indexOf('\\"hookSpecificOutput\\"');
    expect(topLevelIndex).toBeGreaterThanOrEqual(0);
    expect(nestedWrapperIndex).toBeGreaterThan(topLevelIndex);
  });

  it('plugin-root entry carries BOTH top-level and nested additionalContext', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    // The plugin-root entry (agentPlugins probe) also uses COPILOT_PLUGIN_ROOT_BASH/POWERSHELL,
    // which must carry both placements too.
    const rootSection = payload.slice(payload.indexOf('agentPlugins'));
    expect(rootSection).toContain('additionalContext');
    expect(rootSection).toContain('hookSpecificOutput');
  });
});

// ─── No session lock (removed) ─────────────────────────────────────────────────
// Session lock removed: it guarded a Copilot-side bug where a single registered hook was
// invoked TWICE per real event — GitHub has since fixed it (see FR-HOOK-0006, hooks-verify.md).
// Entries are now plain printf/Write-Output, identical in shape to every other IDE's entries.

describe('pluginAssembleCopilotBootstrap — no session lock', () => {
  it('entries do NOT contain any lock file reference', () => {
    const frames = [
      makeDocFrame('plugin-files-mode', '\n# Lead\n'),
      makeDocFrame('bootstrap-core-policy', '\n# Policy\n'),
    ];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('.lock');
    expect(payload).not.toContain('rosetta-bs-');
  });

  it('entries do NOT read/extract session_id from stdin', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).not.toContain('SESSION_ID');
    expect(payload).not.toContain('$Sid');
    expect(payload).not.toContain('[Console]::In.ReadToEnd()');
  });

  it("bash entry is a plain printf, matching Claude/Codex/Cursor's pattern", () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain("printf '%s' '");
  });

  it('powershell entry is a plain Write-Output, no lock wrapper', () => {
    const frames = [makeDocFrame('plugin-files-mode', '\n# Body\n')];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const payload = result.templateContext['bootstrap_hooks'] as string;
    expect(payload).toContain('Write-Output');
    expect(payload).not.toContain('New-Item');
    expect(payload).not.toContain('Test-Path $Lk');
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

  // The limit is about the ORIGINAL content, not the JSON wrapping/escaping around it.
  // A newline-heavy body (typical of real markdown bootstrap docs) escapes to nearly 1.5x its
  // raw length (each \n -> \\n). Raw content here is 9180 chars (under budget); the
  // JSON-wrapped/escaped form is 13761 chars (over budget) — before this fix, the check
  // measured the wrapped form and would have wrongly flagged this as oversized.
  it('newline-heavy body under 10000 raw chars → NO soft error, even though its escaped/wrapped form would exceed 10000', () => {
    const newlineHeavyBody = '\n' + 'A\n'.repeat(4500); // raw content (with prefix) = 9180 chars
    const frames = [makeDocFrame('plugin-files-mode', newlineHeavyBody)];
    const p = makePluginFrame(frames);
    const result = pluginAssembleCopilotBootstrap(p);
    const softErrors = result.errors.filter((e) => e.kind === 'soft');
    expect(softErrors.length).toBe(0);
  });
});
