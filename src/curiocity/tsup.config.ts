import { defineConfig } from 'tsup';

// M1: only the CLI entry is built. bin -> dist/cli.js (see package.json).
// Runtime deps stay external (installed from node_modules), so pino/commander/zod
// are not bundled and their worker/thread machinery is untouched.
export default defineConfig({
  entry: { cli: 'src/cli/index.ts' },
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: false,
});
