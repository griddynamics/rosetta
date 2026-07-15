import { afterAll, describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { runTrial } from '../../src/curion/lifecycle';
import { buildChildEnv } from '../../src/orchestrator/env';
import { listTmpAgentDirs, mockSpec, sweepNewTmpAgentDirs } from './helpers';

/**
 * Temp-dir hygiene (Part 3.3). Trials that end in a retained status keep their
 * workspace + ctrl dir (§7 — the production retention rule, UNCHANGED). This test
 * verifies (a) retention is intact and (b) the test's own sweep returns the OS temp
 * dir to its baseline, so a full vitest run shows no `curiocity-ws-*`/`curiocity-ctrl-*`
 * growth.
 */

const baseEnv = buildChildEnv();
const baseline = new Set(listTmpAgentDirs());
afterAll(() => sweepNewTmpAgentDirs(baseline));

describe('temp-dir hygiene (§7 retention + Part 3.3 sweep)', () => {
  it('retains failed-trial workspaces, then the sweep leaves NO growth vs baseline', async () => {
    const before = new Set(listTmpAgentDirs());

    // Produce retained trials: agent-crash and launch-error (unresolvable binary).
    const crash = await runTrial(mockSpec({ scene: 'crash.json' }), { baseEnv });
    const launchErr = await runTrial(
      mockSpec({ scene: 'clean.json', profileOverrides: { command: 'curiocity-nonexistent-binary-zzz' } }),
      { baseEnv },
    );

    // Retention rule intact (§7): the failed trials kept their workspace on disk.
    expect(crash.result.status).toBe('agent-crash');
    expect(crash.result.workspacePath).toBeDefined();
    expect(existsSync(crash.result.workspacePath!)).toBe(true);
    expect(launchErr.result.status).toBe('launch-error');

    // New retained dirs actually appeared (workspace and/or ctrl) — otherwise the
    // "no growth" assertion below would be vacuous.
    const during = listTmpAgentDirs();
    expect(during.length).toBeGreaterThan(before.size);

    // Sweep what this test created; the temp set returns to the pre-test baseline.
    sweepNewTmpAgentDirs(before);
    expect(new Set(listTmpAgentDirs())).toEqual(before);
    expect(existsSync(crash.result.workspacePath!)).toBe(false);
  });
});
