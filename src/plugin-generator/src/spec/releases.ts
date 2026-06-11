// DATA-CFG-0001 — release descriptors (r2/r3 template vars)

import type { ReleaseDescriptor } from '../types.js';

export const RELEASES: Record<string, ReleaseDescriptor> = {
  r2: {
    name: 'r2',
    deterministicHooks: false, // {{#if deterministic_hooks}} = false
    displayName: 'R2.0',
  },
  r3: {
    name: 'r3',
    deterministicHooks: true, // {{#if deterministic_hooks}} = true
    displayName: 'R3.0',
  },
};

export function getRelease(name: string): ReleaseDescriptor | null {
  return RELEASES[name] ?? null;
}

export function listReleases(): string[] {
  return Object.keys(RELEASES);
}
