// FR-ARCH-0024 (AC1, AC3, AC5), FR-ARCH-0041 — resolveEffectiveSources / findOrphanOverwrites
import { describe, it, expect } from 'vitest';
import { resolveEffectiveSources, findOrphanOverwrites } from '../../../src/vfs/effective-sources.js';
import type { SourceFile, Vfs } from '../../../src/types.js';
import type { DirectiveToken } from '../../../src/vfs/directives.js';

const src = (name: string, ...conds: string[]): SourceFile => ({
  origin: name, order: name, conditions: new Set(conds as DirectiveToken[]),
});
const names = (r: { kept: readonly SourceFile[] }) => r.kept.map((s) => s.origin);
const claude = { target: 'claude', set: 'rosetta' };

describe('resolveEffectiveSources', () => {
  it('no overwrite: all kept, no orphan, same elements', () => {
    const r = resolveEffectiveSources([src('1'), src('2')], claude, null);
    expect(names(r)).toEqual(['1', '2']);
    expect(r.orphanOverwrite).toBeNull();
  });

  it('AC1: five contributions, overwrite at 2 and 4 → 4,5', () => {
    const r = resolveEffectiveSources(
      [src('1'), src('2', 'overwrite'), src('3'), src('4', 'overwrite'), src('5')], claude, null);
    expect(names(r)).toEqual(['4', '5']);
    expect(r.orphanOverwrite).toBeNull();
  });

  it('AC3: normal, overwrite, normal → 2,3', () => {
    expect(names(resolveEffectiveSources([src('1'), src('2', 'overwrite'), src('3')], claude, null)))
      .toEqual(['2', '3']);
  });

  it('AC5: base + profile-lightweight-only overwrite: base (standard), overwrite (light), no orphan', () => {
    const s = [src('base'), src('light', 'profile-lightweight-only', 'overwrite')];
    const std = resolveEffectiveSources(s, claude, null);
    const light = resolveEffectiveSources(s, claude, 'lightweight');
    expect(names(std)).toEqual(['base']);
    expect(names(light)).toEqual(['light']);
    expect(std.orphanOverwrite).toBeNull();
    expect(light.orphanOverwrite).toBeNull();
  });

  it('filtered-out source neither overwrites nor is a predecessor (FR-ARCH-0041)', () => {
    const s = [src('1'), src('2', 'target-cursor-only', 'overwrite'), src('3')];
    expect(names(resolveEffectiveSources(s, claude, null))).toEqual(['1', '3']);
  });

  it('AC6 shape: only [cursor-only, claude-only overwrite] → orphan in claude, none in cursor', () => {
    const s = [src('c', 'target-cursor-only'), src('o', 'target-claude-only', 'overwrite')];
    expect(resolveEffectiveSources(s, claude, null).orphanOverwrite?.origin).toBe('o');
    const cursor = resolveEffectiveSources(s, { target: 'cursor', set: null }, null);
    expect(cursor.orphanOverwrite).toBeNull();
    expect(names(cursor)).toEqual(['c']);
  });

  it('orphan = first survivor even if later overwrites exist', () => {
    const r = resolveEffectiveSources([src('o1', 'overwrite'), src('x'), src('o2', 'overwrite')], claude, null);
    expect(r.orphanOverwrite?.origin).toBe('o1');
  });

  it('empty and fully filtered inputs: no orphan, nothing kept', () => {
    expect(resolveEffectiveSources([], claude, null)).toEqual({ kept: [], orphanOverwrite: null });
    const r = resolveEffectiveSources([src('x', 'target-cursor-only')], claude, null);
    expect(r).toEqual({ kept: [], orphanOverwrite: null });
  });

  it('inactive profile overwrite is excluded before truncation (FR-PROF-0030)', () => {
    const s = [src('base'), src('p', 'profile-lightweight-only', 'overwrite')];
    expect(names(resolveEffectiveSources(s, claude, 'other'))).toEqual(['base']);
  });
});

describe('findOrphanOverwrites (FR-ARCH-0024.AC4/AC6)', () => {
  const vfs = [
    { path: 'a.md', sourceFiles: [src('/r/a.md'), src('/r/a~overwrite~.md', 'overwrite')] },
    { path: 'workflows/codin-flow.md', sourceFiles: [src('/c/codin-flow~overwrite~.md', 'overwrite')] },
    { path: 'x.md', sourceFiles: [src('/r/x~cursor', 'target-cursor-only'), src('/r/x~claude', 'target-claude-only', 'overwrite')] },
  ] as unknown as Vfs;

  it('reports orphan origins per path for the build', () => {
    expect(findOrphanOverwrites(vfs, claude, null)).toEqual([
      { path: 'workflows/codin-flow.md', origin: '/c/codin-flow~overwrite~.md' },
      { path: 'x.md', origin: '/r/x~claude' },
    ]);
  });

  it('differs per build: cursor build has no orphan for x.md', () => {
    expect(findOrphanOverwrites(vfs, { target: 'cursor', set: null }, null).map((o) => o.path))
      .toEqual(['workflows/codin-flow.md']);
  });

  it('returns [] when nothing is orphaned', () => {
    expect(findOrphanOverwrites([vfs[0]] as unknown as Vfs, claude, null)).toEqual([]);
  });
});
