import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.e2e.test.ts"],
    globals: false,
    passWithNoTests: true,
    slowTestThreshold: 1000,
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 90,
        branches: 90,
      },
      include: ["src/**/*.ts"],
      // bin/frontends are process entrypoints exercised only via tests/e2e/*.e2e.test.ts,
      // which spawn the built binary as a subprocess — v8 coverage can't see code running
      // in a child process, so these show as 0% despite being fully e2e-tested.
      exclude: ["src/bin/**", "src/frontends/**"],
    },
  },
});
