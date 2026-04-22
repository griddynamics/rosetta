#!/usr/bin/env node
// build-bundles.mjs — Per-IDE esbuild bundler.
// Produces dist/bundles/<plugin-name>/loose-files.js for each plugin that has hooks.
// Each bundle includes only the IDE-specific adapter code; other adapters are excluded.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');
const outDir = path.resolve(__dirname, '..', 'dist', 'bundles');

const BUNDLES = [
  { plugin: 'core-claude',  adapter: 'adapter-claude-code' },
  { plugin: 'core-codex',   adapter: 'adapter-codex' },
  { plugin: 'core-copilot', adapter: 'adapter-copilot' },
  { plugin: 'core-cursor',  adapter: 'adapter-cursor' },
];

for (const { plugin, adapter } of BUNDLES) {
  const adapterPath = path.join(srcDir, 'entrypoints', `${adapter}.ts`);

  await esbuild.build({
    entryPoints: [path.join(srcDir, 'loose-files.ts')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile: path.join(outDir, plugin, 'loose-files.js'),
    plugins: [
      {
        name: 'adapter-alias',
        setup(build) {
          // Intercept `./adapter` import in loose-files.ts and redirect to slim adapter.
          build.onResolve({ filter: /^\.\/adapter$/ }, () => ({ path: adapterPath }));
        },
      },
    ],
  });

  console.log(`  bundled ${plugin} → dist/bundles/${plugin}/loose-files.js`);
}
