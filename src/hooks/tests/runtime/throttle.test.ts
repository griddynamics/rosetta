import { test, describe, expect } from 'vitest';
import { acquireOnce } from '../../src/runtime/throttle';
import os from 'os';
import path from 'path';
import fs from 'fs';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'throttle-test-'));

describe('acquireOnce', () => {
  test('first call returns true', () =>
    expect(acquireOnce('test-key-A', TMP)).toBe(true));
  test('second call same key returns false (within TTL)', () => {
    expect(acquireOnce('test-key-B', TMP)).toBe(true);
    expect(acquireOnce('test-key-B', TMP)).toBe(false);
  });
  test('different keys are independent', () => {
    expect(acquireOnce('test-key-C', TMP)).toBe(true);
    expect(acquireOnce('test-key-D', TMP)).toBe(true);
  });
});
