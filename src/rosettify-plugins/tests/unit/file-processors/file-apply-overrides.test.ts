// FR-ARCH-0041 — fileApplyOverrides: overwrite drops earlier; target-only mismatch drops
// FR-PROF-0030 — profile-<name>-only exclusion applies in the SAME step as target-only, before
// overwrite truncation, so overwrite cannot bypass an inactive profile's exclusion either.
import { describe, it, expect } from 'vitest';
import { fileApplyOverrides } from '../../../src/file-processors/file-apply-overrides.js';
import type { FileProcessingFrame, TargetContext, PluginSpec, Vfs } from '../../../src/types.js';

function makeCtx(specName = 'claude', activeProfile: string | null = null): TargetContext {
  return {
    spec: { name: specName } as unknown as PluginSpec,
    vfs: [] as unknown as Vfs,
    release: { name: 'r2', deterministicHooks: false, displayName: 'R2' },
    repoRoot: '',
    activeProfile,
  } as unknown as TargetContext;
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
    const frame = makeFrame([{ conditions: ['target-claude-only'] }]);
    const result = fileApplyOverrides(frame, makeCtx('claude'));
    expect(result.source.length).toBe(1);
  });

  it('target-only mismatch drops source', () => {
    const frame = makeFrame([{ conditions: ['target-cursor-only'] }]);
    const result = fileApplyOverrides(frame, makeCtx('claude'));
    expect(result.source.length).toBe(0);
    expect(result.target_contents).toBeNull();
  });

  it('null target_contents when all sources dropped', () => {
    const frame = makeFrame([{ conditions: ['target-cursor-only'] }]);
    const result = fileApplyOverrides(frame, makeCtx('claude'));
    expect(result.target_contents).toBeNull();
  });

  it('overwrite at index 0 keeps all sources (nothing to drop)', () => {
    const frame = makeFrame([{ conditions: ['overwrite'] }, { conditions: [] }]);
    const result = fileApplyOverrides(frame, makeCtx());
    // firstOverwriteIdx = 0, which is NOT > 0, so targetFiltered unchanged
    expect(result.source.length).toBe(2);
  });
});

// FR-PROF-0030.AC4: profile filtering and target filtering run in the same step, before overwrite
// truncation — an inactive profile's overwrite source must not supersede the base document, and
// activating the profile must let that same source do exactly that.
describe('fileApplyOverrides — profile-scoped exclusion (FR-PROF-0030.AC4)', () => {
  it('overwrite + INACTIVE profile-<name>-only is excluded before overwrite truncation — base document is not superseded', () => {
    const frame = makeFrame([
      { conditions: [] }, // base document
      { conditions: ['profile-lightweight-only', 'overwrite'] }, // profile override, profile inactive
    ]);
    const result = fileApplyOverrides(frame, makeCtx('claude', null));
    expect(result.source.length).toBe(1);
    expect(result.source[0].conditions.has('overwrite')).toBe(false);
    expect(result.source[0].conditions.has('profile-lightweight-only')).toBe(false);
  });

  it('overwrite + ACTIVE profile-<name>-only DOES supersede the base document', () => {
    const frame = makeFrame([
      { conditions: [] }, // base document
      { conditions: ['profile-lightweight-only', 'overwrite'] }, // profile override, profile active
    ]);
    const result = fileApplyOverrides(frame, makeCtx('claude', 'lightweight'));
    expect(result.source.length).toBe(1);
    expect(result.source[0].conditions.has('overwrite')).toBe(true);
    expect(result.source[0].conditions.has('profile-lightweight-only')).toBe(true);
  });
});
