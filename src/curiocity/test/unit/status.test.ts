import { describe, it, expect } from 'vitest';
import { deriveCompletedStatus, shouldKeepWorkspace } from '../../src/curion/status';

describe('deriveCompletedStatus (§7)', () => {
  it('done + no verdict → passed (evaluation skipped, vacuous)', () => {
    expect(deriveCompletedStatus('done')).toBe('passed');
  });

  it('done + passing verdict → passed', () => {
    expect(deriveCompletedStatus('done', { pass: true, score: 80, rationale: '' })).toBe('passed');
  });

  it('done + failing verdict → failed', () => {
    expect(deriveCompletedStatus('done', { pass: false, score: 10, rationale: '' })).toBe('failed');
  });

  it('interaction terminal outcomes map straight through', () => {
    expect(deriveCompletedStatus('agent-hung')).toBe('agent-hung');
    expect(deriveCompletedStatus('agent-crash')).toBe('agent-crash');
    expect(deriveCompletedStatus('timeout')).toBe('timeout');
  });
});

describe('shouldKeepWorkspace (§7 step 8)', () => {
  it('keeps failed / error-status workspaces by default', () => {
    expect(shouldKeepWorkspace('failed', false)).toBe(true);
    expect(shouldKeepWorkspace('setup-error', false)).toBe(true);
    expect(shouldKeepWorkspace('agent-crash', false)).toBe(true);
  });

  it('deletes passed / skipped workspaces unless --keep-workspace', () => {
    expect(shouldKeepWorkspace('passed', false)).toBe(false);
    expect(shouldKeepWorkspace('skipped', false)).toBe(false);
    expect(shouldKeepWorkspace('passed', true)).toBe(true);
  });
});
