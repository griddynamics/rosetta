// FR-ARCH-0041 — fileApplyOverrides: overwrite drops earlier; target-only mismatch drops
import { describe, it, expect } from 'vitest';
import { fileApplyOverrides } from '../../../src/file-processors/file-apply-overrides.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(specName = 'core-claude'): TargetContext {
  return {
    spec: { name: specName } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
  };
}

function makeSource(conditions: string[]) {
  return { origin: 'test', order: '0', conditions: new Set(conditions), _readContent: 'content' };
}

function makeFrame(sources: Array<{ conditions: string[] }>): FileProcessingFrame {
  return {
    sourcePath: 'rules/policy.md',
    target: 'rules/policy.md',
    isBinary: false,
    target_contents: '# Content',
    source: sources.map((s, i) => ({
      origin: 'test' + i,
      order: `${i}`,
      conditions: new Set(s.conditions),
    })),
  };
}

describe('fileApplyOverrides', () => {
  it('returns frame unchanged when no conditions', () => {
    const frame = makeFrame([{ conditions: [] }]);
    const result = fileApplyOverrides(frame, makeCtx());
    expect(result).toBe(frame);
  });

  it('keeps only the overwrite source and later ones', () => {
    // Two sources: source[0] = no condition; source[1] = overwrite
    const frame = makeFrame([{ conditions: [] }, { conditions: ['overwrite'] }]);
    const result = fileApplyOverrides(frame, makeCtx());
    expect(result.source.length).toBe(1);
    expect(result.source[0].conditions.has('overwrite')).toBe(true);
  });

  it('drops earlier sources when overwrite is at index 1', () => {
    const frame = makeFrame([
      { conditions: [] },
      { conditions: ['overwrite'] },
      { conditions: [] },
    ]);
    const result = fileApplyOverrides(frame, makeCtx());
    expect(result.source.length).toBe(2); // index 1 and 2 kept
  });

  it('target-only match keeps source', () => {
    const frame = makeFrame([{ conditions: ['core-claude-only'] }]);
    const result = fileApplyOverrides(frame, makeCtx('core-claude'));
    expect(result.source.length).toBe(1);
  });

  it('target-only mismatch drops source', () => {
    const frame = makeFrame([{ conditions: ['core-cursor-only'] }]);
    const result = fileApplyOverrides(frame, makeCtx('core-claude'));
    expect(result.source.length).toBe(0);
    expect(result.target_contents).toBeNull();
  });

  it('null target_contents when all sources dropped', () => {
    const frame = makeFrame([{ conditions: ['core-cursor-only'] }]);
    const result = fileApplyOverrides(frame, makeCtx('core-claude'));
    expect(result.target_contents).toBeNull();
  });

  it('overwrite at index 0 keeps all sources (nothing to drop)', () => {
    const frame = makeFrame([{ conditions: ['overwrite'] }, { conditions: [] }]);
    const result = fileApplyOverrides(frame, makeCtx());
    // firstOverwriteIdx = 0, which is NOT > 0, so targetFiltered unchanged
    expect(result.source.length).toBe(2);
  });
});
