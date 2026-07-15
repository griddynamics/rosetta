import { describe, it, expect } from 'vitest';
import { resolveCurionEntry } from '../../src/orchestrator/child';

/**
 * Regression guard for the build-layout path bug (m8): the built harness forks
 * `curion/main` and reads `.env` via paths relative to the running module's URL. tsup
 * collapses the src tree into a flat dist (`dist/cli.js` + `dist/curion/main.js`), so the
 * dist-mode relative paths differ from the source-mode ones. Getting either wrong made
 * EVERY trial fail to load the forked child → `agent-crash`, invisible to tests that run
 * from source. These pin both layouts.
 */

describe('resolveCurionEntry — Curion child entry across source vs built-dist layout', () => {
  it('source/tsx: sibling ../curion/main.ts + tsx execArgv', () => {
    const { path, execArgv } = resolveCurionEntry('file:///pkg/src/orchestrator/child.ts');
    expect(path).toBe('/pkg/src/curion/main.ts');
    expect(execArgv).toEqual(['--import', 'tsx']);
  });

  it('built dist (flat, dist-root cli.js): sibling ./curion/main.js, no execArgv', () => {
    const { path, execArgv } = resolveCurionEntry('file:///pkg/dist/cli.js');
    // MUST stay inside dist/ — `../curion/main.js` (the old bug) escaped to /pkg/curion.
    expect(path).toBe('/pkg/dist/curion/main.js');
    expect(execArgv).toEqual([]);
  });

  it('built dist (shared chunk, also dist-root): still resolves into dist/curion', () => {
    const { path } = resolveCurionEntry('file:///pkg/dist/chunk-ABCD.js');
    expect(path).toBe('/pkg/dist/curion/main.js');
  });
});
