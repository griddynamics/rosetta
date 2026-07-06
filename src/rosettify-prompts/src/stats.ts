import type { FieldStats } from './types.js';

export function computeFieldStats(values: number[]): FieldStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stdev = Math.sqrt(variance);
  return {
    n,
    mean,
    median,
    stdev,
    min: sorted[0],
    max: sorted[n - 1],
  };
}
