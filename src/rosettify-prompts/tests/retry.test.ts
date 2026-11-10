import { describe, expect, it, vi } from 'vitest';
import { MAX_RETRIES, RETRYABLE_STATUS, withRetry } from '../src/retry.js';

const statusError = (status: number) => Object.assign(new Error(`status ${status}`), { status });

describe('withRetry', () => {
  it('retries on a retryable status and then succeeds', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValueOnce(statusError(429)).mockResolvedValueOnce('ok');
    await expect(withRetry(fn, MAX_RETRIES, sleep)).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('stops immediately on a non-retryable status', async () => {
    expect(RETRYABLE_STATUS.has(400)).toBe(false);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(statusError(400));
    await expect(withRetry(fn, MAX_RETRIES, sleep)).rejects.toThrow('status 400');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('gives up after MAX_RETRIES retries', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(statusError(503));
    await expect(withRetry(fn, MAX_RETRIES, sleep)).rejects.toThrow('status 503');
    expect(fn).toHaveBeenCalledTimes(MAX_RETRIES + 1);
    expect(sleep).toHaveBeenCalledTimes(MAX_RETRIES);
  });
});
