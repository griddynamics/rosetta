import { defineConfig } from 'tsup';

// Two bundled entries, BOTH required at runtime and BOTH emitted at the dist root:
//   dist/cli.js         — the bin (see package.json).
//   dist/curion/main.js — the forked Curion child (orchestrator/child.ts forks it;
//                         the file MUST exist or every trial fails to load the child
//                         and is reported `agent-crash`).
// `splitting` shares common code into a dist-root chunk instead of duplicating the
// whole graph. Runtime deps (pino/commander/zod/node-pty) stay external, resolved
// from node_modules — no native/worker machinery is bundled.
//
// NOTE: the bundle collapses the src tree, so files that resolve siblings via
// `import.meta.url` (orchestrator/child.ts → curion/main.js, llm/keys.ts → .env)
// branch on `.ts` vs `.js` to use the flat-dist relative path. Keep that in sync
// with this layout if entry paths change.
export default defineConfig({
  entry: { cli: 'src/cli/index.ts', 'curion/main': 'src/curion/main.ts' },
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  splitting: true,
});
