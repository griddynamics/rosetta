import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // Integration tests drive real PTYs + forked children; give them room and do
    // not run test files in parallel so the PTY / child-process count stays
    // predictable and the runs stay deterministic.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
