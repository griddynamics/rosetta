#!/usr/bin/env node
// build-bundles.mjs — Per-IDE esbuild bundler.
// Produces dist/bundles/<plugin-name>/<hook>.js for each plugin that has hooks.
// Each bundle includes only the IDE-specific adapter code; other adapters are excluded.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'url';
import { readdirSync, rmSync } from 'fs';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, '..', 'src');
const hooksDir = path.join(srcDir, 'hooks');
const outDir = path.resolve(__dirname, '..', 'dist', 'bundles');
const quiet = process.argv.includes('--quiet');

const PLUGINS = [
  { plugin: 'core-claude',      adapter: 'adapter-claude-code' },
  { plugin: 'core-codex',       adapter: 'adapter-codex' },
  { plugin: 'core-copilot',     adapter: 'adapter-copilot' },
  { plugin: 'core-cursor',      adapter: 'adapter-cursor' },
  { plugin: 'core-windsurf',    adapter: 'adapter-windsurf' },
  // Antigravity has NO non-blocking delivery channel (docs/hooks/antigravity.md + hooks-verify.md):
  // advise-only hooks can never reach the model there, so they are NOT bundled for it.
  { plugin: 'core-antigravity', adapter: 'adapter-antigravity',
    excludeHooks: ['lint-format-advisory.ts', 'md-file-advisory.ts', 'loose-files.ts'] },
];

// Auto-discover hook entry points: every .ts file in src/hooks/.
const HOOK_SOURCES = readdirSync(hooksDir).filter(f => f.endsWith('.ts'));

// Wipe the output dir first so a renamed or deleted hook leaves no orphaned
// bundle behind (which the plugin generator would otherwise propagate).
rmSync(outDir, { recursive: true, force: true });

let bundleCount = 0;
for (const { plugin, adapter, excludeHooks = [] } of PLUGINS) {
  const adapterPath = path.join(srcDir, 'entrypoints', `${adapter}.ts`);
  const hookSources = HOOK_SOURCES.filter((h) => !excludeHooks.includes(h));

  for (const hookSource of hookSources) {
    const outName = hookSource.replace('.ts', '.js');
    await esbuild.build({
      entryPoints: [path.join(hooksDir, hookSource)],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      outfile: path.join(outDir, plugin, outName),
      plugins: [
        {
          name: 'adapter-alias',
          setup(build) {
            // Intercept `../adapter` (from run-hook.ts) and redirect to the slim per-IDE adapter.
            build.onResolve({ filter: /^\.{1,2}\/adapter$/ }, () => ({ path: adapterPath }));
          },
        },
      ],
    });

    bundleCount++;
    if (!quiet) {
      console.log(`  bundled ${plugin} → dist/bundles/${plugin}/${outName}`);
    }
  }
}

console.log(`  built ${bundleCount} bundle(s) for ${PLUGINS.length} plugin(s)`);
