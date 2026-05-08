import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import os from 'os';
import { hashCall, recordDeny, isWithinCooldown } from '../src/hooks/dangerous-actions/cooldown-store';

describe('cooldown-store', () => {
  let tmp: string;
  beforeEach(() => { tmp = mkdtempSync(os.tmpdir() + '/da-cooldown-'); });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  test('no prior deny → isWithinCooldown returns false', () => {
    expect(isWithinCooldown(tmp, 'abc123')).toBe(false);
  });

  test('recordDeny then isWithinCooldown 1 second later → true', () => {
    const now = 1_000_000;
    recordDeny(tmp, 'abc123', now);
    expect(isWithinCooldown(tmp, 'abc123', now + 1_000)).toBe(true);
  });

  test('recordDeny then isWithinCooldown 6 seconds later → false (expired)', () => {
    const now = 1_000_000;
    recordDeny(tmp, 'abc123', now);
    expect(isWithinCooldown(tmp, 'abc123', now + 6_000)).toBe(false);
  });

  test('different hash → isWithinCooldown returns false', () => {
    const now = 1_000_000;
    recordDeny(tmp, 'abc123', now);
    expect(isWithinCooldown(tmp, 'xyz789', now + 1_000)).toBe(false);
  });

  test('hashCall strips `# Rosetta-reviewed` — same logical command hashes equally', () => {
    const input1 = { command: 'rm -rf /tmp/test' };
    const input2 = { command: 'rm -rf /tmp/test  # Rosetta-reviewed' };
    expect(hashCall('Bash', input1)).toBe(hashCall('Bash', input2));
  });

  test('hashCall different command → different hash', () => {
    expect(hashCall('Bash', { command: 'rm -rf /tmp/a' }))
      .not.toBe(hashCall('Bash', { command: 'rm -rf /tmp/b' }));
  });

  test('hashCall different toolName → different hash', () => {
    expect(hashCall('Bash', { command: 'x' }))
      .not.toBe(hashCall('Write', { command: 'x' }));
  });

  test('store written to cwd/.claude/state/dangerous-actions-cooldown.json', () => {
    recordDeny(tmp, 'abc', 1_000_000);
    expect(existsSync(`${tmp}/.claude/state/dangerous-actions-cooldown.json`)).toBe(true);
  });
});
