#!/usr/bin/env node
// build-bundles.mjs — Per-IDE esbuild bundler.
// Produces dist/bundles/<plugin-name>/<hook>.js for each plugin that has hooks.
// Each bundle includes only the IDE-specific adapter code; other adapters are excluded.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');
const outDir = path.resolve(__dirname, '..', 'dist', 'bundles');

const PLUGINS = [
  { plugin: 'core-claude',   adapter: 'adapter-claude-code' },
  { plugin: 'core-codex',    adapter: 'adapter-codex' },
  { plugin: 'core-copilot',  adapter: 'adapter-copilot' },
  { plugin: 'core-cursor',   adapter: 'adapter-cursor' },
  { plugin: 'core-windsurf', adapter: 'adapter-windsurf' },
];

// Hooks that are bundled per plugin (adapter inlined, no external deps).
const HOOKS = ['loose-files', 'gitnexus-refresh'];

let count = 0;
for (const { plugin, adapter } of PLUGINS) {
  const adapterPath = path.join(srcDir, 'entrypoints', `${adapter}.ts`);

  for (const hook of HOOKS) {
    await esbuild.build({
      entryPoints: [path.join(srcDir, `${hook}.ts`)],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: path.join(outDir, plugin, `${hook}.js`),
      plugins: [
        {
          name: 'adapter-alias',
          setup(build) {
            // Intercept `./adapter` import and redirect to slim IDE-specific adapter.
            build.onResolve({ filter: /^\.\/adapter$/ }, () => ({ path: adapterPath }));
          },
        },
      ],
    });
    count++;
  }
}

console.log(`  built ${count} bundles → dist/bundles/`);
