import { test, describe, expect } from 'vitest';
import { acquireOnce, makeDebounceStamp, isStampFresh } from '../../src/runtime/throttle';
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

describe('debounce stamp', () => {
  test('makeDebounceStamp writes file, isStampFresh returns true immediately', () => {
    const stampFile = makeDebounceStamp('test-repo', TMP);
    expect(fs.existsSync(stampFile)).toBe(true);
    expect(isStampFresh(stampFile, 5000)).toBe(true);
  });
  test('isStampFresh returns false after debounce window', () => {
    const stampFile = makeDebounceStamp('test-repo-2', TMP);
    fs.writeFileSync(stampFile, String(Date.now() - 6000));
    expect(isStampFresh(stampFile, 5000)).toBe(false);
  });
});
