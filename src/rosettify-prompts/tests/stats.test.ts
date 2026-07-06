import { describe, expect, it } from 'vitest';
import { computeFieldStats } from '../src/stats.js';

describe('computeFieldStats', () => {
  it('returns null for an empty array', () => {
    expect(computeFieldStats([])).toBeNull();
  });

  it('computes mean, median, stdev, min, max for an odd-length array', () => {
    const stats = computeFieldStats([10, 20, 30]);
    expect(stats).not.toBeNull();
    expect(stats!.n).toBe(3);
    expect(stats!.mean).toBe(20);
    expect(stats!.median).toBe(20);
    expect(stats!.min).toBe(10);
    expect(stats!.max).toBe(30);
    expect(stats!.stdev).toBeCloseTo(8.16496580927726, 6);
  });

  it('computes median as average of two middle values for even-length array', () => {
    const stats = computeFieldStats([1, 2, 3, 4]);
    expect(stats!.median).toBe(2.5);
  });

  it('is order-independent', () => {
    const a = computeFieldStats([5, 1, 3]);
    const b = computeFieldStats([3, 5, 1]);
    expect(a).toEqual(b);
  });

  it('handles a single value with zero stdev', () => {
    const stats = computeFieldStats([42]);
    expect(stats).toEqual({ n: 1, mean: 42, median: 42, stdev: 0, min: 42, max: 42 });
  });
});
