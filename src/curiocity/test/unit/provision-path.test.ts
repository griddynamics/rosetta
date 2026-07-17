import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { resolveProvisionPluginPaths } from '../../src/orchestrator/spec';
import type { ProvisionSpec } from '../../src/config/schema';

describe('resolveProvisionPluginPaths (plugin `path` resolves relative to the case dir)', () => {
  it('resolves a relative plugin path against baseDir', () => {
    const provision: ProvisionSpec = {
      mcps: [],
      plugins: [{ name: 'rosetta', path: '../.runtime/rosetta/core-claude' }],
    };
    const baseDir = '/repo/tests/e2e-tests/coding-rosetta';
    const resolved = resolveProvisionPluginPaths(provision, baseDir);
    expect(resolved.plugins[0]!.path).toBe(resolve(baseDir, '../.runtime/rosetta/core-claude'));
    expect(resolved.plugins[0]!.path).toBe('/repo/tests/e2e-tests/.runtime/rosetta/core-claude');
  });

  it('passes an absolute plugin path through unchanged', () => {
    const provision: ProvisionSpec = {
      mcps: [],
      plugins: [{ name: 'rosetta', path: '/abs/plugin/core-claude' }],
    };
    const resolved = resolveProvisionPluginPaths(provision, '/repo/tests/e2e-tests/coding-rosetta');
    expect(resolved.plugins[0]!.path).toBe('/abs/plugin/core-claude');
  });

  it('leaves a plugin without a path unchanged (no crash)', () => {
    const provision: ProvisionSpec = {
      mcps: [],
      plugins: [{ name: 'rosetta' }],
    };
    const resolved = resolveProvisionPluginPaths(provision, '/repo/tests/e2e-tests/coding-rosetta');
    expect(resolved.plugins[0]!.path).toBeUndefined();
    expect(resolved.plugins[0]!.name).toBe('rosetta');
  });

  it('leaves an EMPTY-STRING path as "" (does NOT resolve it to baseDir)', () => {
    // An empty string is a non-absolute string; resolving it would silently produce
    // baseDir (the case root) as a bogus plugin-dir. It must pass through unchanged so
    // the adapter rejects it as a missing path.
    const provision: ProvisionSpec = {
      mcps: [],
      plugins: [{ name: 'rosetta', path: '' }],
    };
    const resolved = resolveProvisionPluginPaths(provision, '/repo/tests/e2e-tests/coding-rosetta');
    expect(resolved.plugins[0]!.path).toBe('');
  });

  it('preserves mcps unchanged', () => {
    const provision: ProvisionSpec = {
      mcps: [{ name: 'm', command: 'node' }],
      plugins: [],
    };
    const resolved = resolveProvisionPluginPaths(provision, '/base');
    expect(resolved.mcps).toEqual(provision.mcps);
  });
});
