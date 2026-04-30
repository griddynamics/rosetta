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

const BUNDLES = [
  { plugin: 'core-claude',   adapter: 'adapter-claude-code' },
  { plugin: 'core-codex',    adapter: 'adapter-codex' },
  { plugin: 'core-copilot',  adapter: 'adapter-copilot' },
  { plugin: 'core-cursor',   adapter: 'adapter-cursor' },
  { plugin: 'core-windsurf', adapter: 'adapter-windsurf' },
];

// Hook source files to bundle per plugin.
const HOOK_SOURCES = ['loose-files.ts', 'md-file-advisory.ts', 'gitnexus-refresh.ts'];

for (const { plugin, adapter } of BUNDLES) {
  const adapterPath = path.join(srcDir, 'entrypoints', `${adapter}.ts`);

  for (const hookSource of HOOK_SOURCES) {
    const outName = hookSource.replace('.ts', '.js');
    await esbuild.build({
      entryPoints: [path.join(srcDir, hookSource)],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: path.join(outDir, plugin, outName),
      plugins: [
        {
          name: 'adapter-alias',
          setup(build) {
            // Intercept `./adapter` import and redirect to the slim per-IDE adapter.
            build.onResolve({ filter: /^\.\/adapter$/ }, () => ({ path: adapterPath }));
          },
        },
      ],
    });

    console.log(`  bundled ${plugin} → dist/bundles/${plugin}/${outName}`);
  }
}
