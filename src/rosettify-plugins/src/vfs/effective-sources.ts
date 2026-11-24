// FR-ARCH-0024, FR-ARCH-0041, FR-ARCH-0014 — effective SourceFiles of one VirtualFile in one build

import { matchesTarget, matchesProfile, type TargetMatchContext } from './directives.js';
import type { SourceFile, Vfs } from '../types.js';

export interface EffectiveSources {
  /** Sources that remain after -only filtering and overwrite truncation (order preserved). */
  kept: readonly SourceFile[];
  /** Surviving overwrite with no surviving predecessor (hard error, FR-ARCH-0024), else null. */
  orphanOverwrite: SourceFile | null;
}

/**
 * Resolve the effective sources of one VirtualFile for one build.
 * 1. Filter by target/set/profile -only directives first; a filtered-out SourceFile neither
 *    overwrites nor counts as a predecessor (FR-ARCH-0041, FR-PROF-0030).
 * 2. If the first survivor is an overwrite it has nothing to replace: reported as orphan
 *    (FR-ARCH-0024.AC4/AC6), even when later overwrites exist; `kept` is the filtered list.
 * 3. Otherwise keep from the LAST surviving overwrite (FR-ARCH-0024.AC1/AC3); no overwrite ⇒ all.
 * Pure; `sources` order is the FR-ARCH-0026 order.
 */
export function resolveEffectiveSources(
  sources: readonly SourceFile[],
  ctx: TargetMatchContext,
  activeProfile: string | null,
): EffectiveSources {
  const filtered = sources.filter(
    (sf) => matchesTarget(sf.conditions, ctx) && matchesProfile(sf.conditions, activeProfile),
  );
  if (filtered.length > 0 && filtered[0].conditions.has('overwrite')) {
    return { kept: filtered, orphanOverwrite: filtered[0] };
  }
  let last = -1;
  for (let i = filtered.length - 1; i >= 0; i--) {
    if (filtered[i].conditions.has('overwrite')) { last = i; break; }
  }
  return { kept: last > 0 ? filtered.slice(last) : filtered, orphanOverwrite: null };
}

/**
 * Orphan overwrites across the whole VFS of one build (SPECS assumption A3).
 * `origin` is the offending file's absolute path (SourceFile.origin). FR-ARCH-0024.AC4/AC6
 */
export function findOrphanOverwrites(
  vfs: Vfs,
  ctx: TargetMatchContext,
  activeProfile: string | null,
): { path: string; origin: string }[] {
  const found: { path: string; origin: string }[] = [];
  for (const vf of vfs) {
    const { orphanOverwrite } = resolveEffectiveSources(vf.sourceFiles, ctx, activeProfile);
    if (orphanOverwrite) found.push({ path: vf.path, origin: orphanOverwrite.origin });
  }
  return found;
}
