import { defineConfig } from 'vitest/config';

/**
 * Live adapter-contract tests (§15) — EXCLUDED from the default vitest/smoke runs.
 * These drive the REAL, locally installed agent CLI (authenticated by the user) in a
 * throwaway workspace, so they are opt-in via `npm run contract:*` only. They never
 * spend harness LLM tokens (FakeModelRouter + no evaluation).
 */
export default defineConfig({
  test: {
    include: ['test/contract/**/*.contract.test.ts'],
    environment: 'node',
    globals: false,
    // A real CLI turn + PTY drain: generous but bounded (the live prompt is trivial).
    testTimeout: 240_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
