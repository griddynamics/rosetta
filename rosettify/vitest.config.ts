import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.e2e.test.ts"],
    globals: false,
    passWithNoTests: true,
  },
  coverage: {
    provider: "v8",
    thresholds: {
      lines: 90,
      branches: 90,
    },
    include: ["src/**/*.ts"],
    exclude: ["src/bin/**"],
  },
});
