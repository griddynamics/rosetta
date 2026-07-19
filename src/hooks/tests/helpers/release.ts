// release.ts — shared test helper for the deterministic (advisory) hook rollout.
//
// Advisory hooks are released one-by-one starting from the designated hooks release
// (HOOKS_RELEASE). Below that version the advisory hooks are intentionally absent, so
// release-gated hook assertions self-skip. At/above it, callers additionally gate on the
// presence of each hook's generated artifact (presence-based), so a not-yet-released hook
// is silently skipped while a shipped one is fully validated.

import { readFileSync } from 'fs';

// Designated release at which advisory (deterministic) hooks begin shipping.
export const HOOKS_RELEASE: readonly [number, number, number] = [3, 1, 0];

const parseVersion = (raw: string): [number, number, number] => {
  const parts = raw.split('.').map((n) => parseInt(n, 10) || 0);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
};

const gte = (a: readonly number[], b: readonly number[]): boolean => {
  for (let i = 0; i < 3; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return true;
};

// True when the plugin manifest is at/above the designated hooks release (HOOKS_RELEASE).
export const shipsHooks = (manifestPath: string): boolean => {
  try {
    const version = String(JSON.parse(readFileSync(manifestPath, 'utf-8')).version ?? '0');
    return gte(parseVersion(version), HOOKS_RELEASE);
  } catch {
    return false;
  }
};
