import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync, utimesSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';

import type { NormalizedInput } from '../src/types';
import { acquireOnce } from '../src/lock';

// Mirrors the fingerprint logic in lock.ts to compute the lock file path for test cleanup.
function lockPathFor(input: NormalizedInput): string {
  const fingerprint = createHash('sha256')
    .update(`${input.session_id ?? 'no-session'}:${input.hook_event_name}:${input.tool_name ?? ''}:${JSON.stringify(input.tool_input ?? {})}`)
    .digest('hex')
    .slice(0, 16);
  return path.join(os.tmpdir(), `rosetta-hooks-${fingerprint}.lock`);
}

// Unique session_id per test ensures each test gets an isolated lock file.
function makeInput(overrides: Partial<NormalizedInput> = {}): NormalizedInput {
  return {
    hook_event_name: 'PostToolUse',
    session_id: `test-${Math.random().toString(36).slice(2, 10)}`,
    tool_name: 'Write',
    tool_input: { file_path: '/proj/foo.py' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
describe('acquireOnce — basic lock lifecycle', () => {

  test('first call returns true and creates lock file', () => {
    const input = makeInput();
    const lp = lockPathFor(input);
    try {
      assert.equal(acquireOnce(input), true);
      assert.ok(existsSync(lp));
    } finally {
      if (existsSync(lp)) unlinkSync(lp);
    }
  });

  test('same input twice within TTL → second call returns false', () => {
    const input = makeInput();
    const lp = lockPathFor(input);
    try {
      assert.equal(acquireOnce(input), true);
      assert.equal(acquireOnce(input), false);
    } finally {
      if (existsSync(lp)) unlinkSync(lp);
    }
  });

});

// ---------------------------------------------------------------------------
describe('acquireOnce — parallel legitimacy', () => {

  test('different file_path in tool_input → both return true (parallel edits are not duplicates)', () => {
    const base = makeInput();
    const inputA = { ...base, tool_input: { file_path: '/proj/a.py' } };
    const inputB = { ...base, tool_input: { file_path: '/proj/b.py' } };
    const lpA = lockPathFor(inputA);
    const lpB = lockPathFor(inputB);
    try {
      assert.equal(acquireOnce(inputA), true);
      assert.equal(acquireOnce(inputB), true);
    } finally {
      if (existsSync(lpA)) unlinkSync(lpA);
      if (existsSync(lpB)) unlinkSync(lpB);
    }
  });

});

// ---------------------------------------------------------------------------
describe('acquireOnce — stale lock takeover', () => {

  test('lock older than TTL is taken over — call returns true', () => {
    const input = makeInput();
    const lp = lockPathFor(input);
    // Simulate a lock left by a crashed process: create the file, set mtime to 10s ago
    writeFileSync(lp, '0');
    const staleMtime = new Date(Date.now() - 10_000);
    utimesSync(lp, staleMtime, staleMtime);
    try {
      assert.equal(acquireOnce(input), true);
    } finally {
      if (existsSync(lp)) unlinkSync(lp);
    }
  });

});

// ---------------------------------------------------------------------------
describe('acquireOnce — race simulation', () => {

  test('10 sequential calls with the same input → exactly 1 returns true', () => {
    const input = makeInput();
    const lp = lockPathFor(input);
    try {
      const results = Array.from({ length: 10 }, () => acquireOnce(input));
      assert.equal(results.filter(Boolean).length, 1);
    } finally {
      if (existsSync(lp)) unlinkSync(lp);
    }
  });

});
