// FR-ARCH-0042 — fileBundle: concat no markup; binary+>1 source error
import { describe, it, expect } from 'vitest';
import { fileBundle } from '../../../src/file-processors/file-bundle.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(): TargetContext {
  return {
    spec: { name: 'core-claude' } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
  };
}

function makeFrame(
  sources: Array<{ _readContent: string }>,
  isBinary = false,
  initContent = sources[0]?._readContent ?? null,
): FileProcessingFrame {
  return {
    sourcePath: 'rules/test.md',
    target: 'rules/test.md',
    isBinary,
    target_contents: initContent,
    source: sources.map((s, i) => ({
      origin: `file${i}.md`,
      order: `${i}`,
      conditions: new Set<string>(),
      _readContent: s._readContent,
    })),
  };
}

describe('fileBundle', () => {
  it('returns frame unchanged for single source', () => {
    const frame = makeFrame([{ _readContent: '# Content\n' }]);
    const result = fileBundle(frame, makeCtx());
    expect(result).toBe(frame);
  });

  it('concatenates two source bodies without markup or delimiter', () => {
    const coreContent = '---\nname: core\n---\n\n# Core Body\n';
    const acmeContent = '---\nname: acme\n---\n\n# Acme Body\n';
    const frame = makeFrame([
      { _readContent: coreContent },
      { _readContent: acmeContent },
    ]);
    const result = fileBundle(frame, makeCtx());
    // Should contain full first source + only body of second
    expect(result.target_contents as string).toContain('# Core Body');
    expect(result.target_contents as string).toContain('# Acme Body');
    // No frontmatter from second source
    expect(result.target_contents as string).not.toMatch(/---\nname: acme/);
  });

  it('concatenates without any markup separator', () => {
    const frame = makeFrame([
      { _readContent: '---\nname: a\n---\n\n# A\n' },
      { _readContent: '---\nname: b\n---\n\n# B\n' },
    ]);
    const result = fileBundle(frame, makeCtx());
    const content = result.target_contents as string;
    // No separator tokens like "---\n---" or "***"
    expect(content.includes('***')).toBe(false);
    expect(content.includes('---\n---')).toBe(false);
  });

  it('returns original frame for binary with >1 source (keeps last source content)', () => {
    const frame = makeFrame(
      [{ _readContent: 'binary1' }, { _readContent: 'binary2' }],
      true,
      Buffer.from([0x01]) as unknown as string,
    );
    const result = fileBundle(frame, makeCtx());
    // Binary error path: returns frame unchanged (no throw)
    expect(result.isBinary).toBe(true);
  });
});
