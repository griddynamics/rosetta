import { describe, it, expect, afterAll } from 'vitest';
import { chmodSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preflightAgentHomes, probeWriteable } from '../../src/orchestrator/preflight';
import { topLevelConfigSchema } from '../../src/config/schema';

/**
 * P10 preflight (§13, Part 3.1): agent-home writeability. Mock-only matrices are
 * skipped; real agents are checked; a non-writeable home fails fast.
 */

const created: string[] = [];
afterAll(() => {
  for (const d of created) {
    try {
      chmodSync(d, 0o755);
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

const MOCK_PROFILE = {
  adapter: 'mock',
  command: 'node',
  args: ['{prompt}'],
  strategy: 'json-only',
  readiness: { quietMs: 10 },
  submit: 'enter',
  stall: { quietMs: 10 },
};

describe('P10 preflight — agent-home writeability', () => {
  it('skips a mock-only matrix (no real agent home to check)', () => {
    const topLevel = topLevelConfigSchema.parse({ codingagents: { mock: MOCK_PROFILE } });
    const res = preflightAgentHomes(['mock'], topLevel);
    expect(res.skipped).toBe(true);
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it('checks a real agent (claude-code) — home is writeable in an unsandboxed run', () => {
    // Uses the adapter's built-in default profile (no config entry needed).
    const res = preflightAgentHomes(['claude-code'], topLevelConfigSchema.parse({}));
    expect(res.skipped).toBe(false);
    // In this (unsandboxed) dev/CI environment ~/.claude (or $HOME) is writeable.
    expect(res.ok).toBe(true);
  });

  it('probeWriteable reports an error for a non-writeable directory (the sandboxed-home failure mode)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'curio-ro-'));
    created.push(dir);
    chmodSync(dir, 0o500); // read+execute, no write
    const err = probeWriteable(dir, false);
    // Root bypasses unix perms; only assert when the perm actually bit.
    if (process.getuid && process.getuid() !== 0) {
      expect(err).not.toBeNull();
      expect(String(err)).toContain('not writeable');
    }
  });
});
