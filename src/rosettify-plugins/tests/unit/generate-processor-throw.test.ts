// FR-CLI-0002, FR-CLI-0041 — generate() catch block when a processor throws synchronously
//
// Separate file because vi.mock is hoisted at the module level and would interfere
// with the real buildAllSpecs used by other generate.test.ts scenarios.
//
// Sequence diagram:
//   test → generate() → buildAllSpecs [mocked: injects throwingProcessor as first step]
//                     → for (spec of specs)
//                         → for (processor of pipeline)
//                             throwingProcessor() throws Error
//                         → catch(err): push hard GenError, anyError=true, continue
//   → generate() returns 1
//
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ResolvedSources, PluginSpec } from '../../src/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');
const SAMPLE_INSTRUCTIONS_DIR = path.join(FIXTURES_DIR, 'sample-instructions');
const SAMPLE_PLUGINS_DIR = path.join(FIXTURES_DIR, 'sample-plugins');

function copyDirSync(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirSync(srcPath, destPath);
    } else {
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildFakeRepo(): string {
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-throw-'));

  const instrR2Core = path.join(tmpRepo, 'instructions', 'r2', 'core');
  fs.mkdirSync(instrR2Core, { recursive: true });
  copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r2', 'core'), instrR2Core);

  const pluginsRoot = path.join(tmpRepo, 'src', 'rosettify-plugins', 'plugins');
  fs.mkdirSync(pluginsRoot, { recursive: true });
  for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex']) {
    const src = path.join(SAMPLE_PLUGINS_DIR, target);
    if (fs.existsSync(src)) {
      const dest = path.join(pluginsRoot, target);
      fs.mkdirSync(dest, { recursive: true });
      copyDirSync(src, dest);
    }
  }

  for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex']) {
    fs.mkdirSync(path.join(tmpRepo, 'src', 'hooks', 'dist', 'bundles', target), { recursive: true });
  }

  fs.mkdirSync(path.join(tmpRepo, '.git'), { recursive: true });
  return tmpRepo;
}

function buildSources(repoRoot: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(repoRoot, 'instructions'),
    pluginsSource: path.join(repoRoot, 'src', 'rosettify-plugins', 'plugins'),
    hooksSource: path.join(repoRoot, 'src', 'hooks'),
    outputDir,
  };
}

// vi.mock is hoisted — inject a mock for targets.js that wraps the real buildAllSpecs
// and inserts a throwing processor as the first step of the first spec.
vi.mock('../../src/spec/targets.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/spec/targets.js')>();
  return {
    ...original,
    buildAllSpecs: (...args: Parameters<typeof original.buildAllSpecs>) => {
      const specs = original.buildAllSpecs(...args);
      if (specs.length === 0) return specs;

      // Replace the first spec's pipeline with a throwing processor as step 1
      const firstSpec = specs[0];
      function throwsAlways() {
        throw new Error('Injected processor failure for test');
      }
      const patchedSpec: PluginSpec = {
        ...firstSpec,
        // Keep remaining processors so other specs (specs[1..]) run normally
        pluginProcessors: [throwsAlways],
      };
      return [patchedSpec, ...specs.slice(1)];
    },
  };
});

describe('generate() — processor throws synchronously (lines 91-99 catch block)', () => {
  let tmpRepo: string;
  let outputDir: string;

  beforeEach(() => {
    tmpRepo = buildFakeRepo();
    outputDir = path.join(tmpRepo, 'out-proc-throw');
  });

  afterEach(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('processor throw → hard GenError added, exit code 1 returned (FR-CLI-0041)', async () => {
    // Step 1: generate() runs the mocked buildAllSpecs which returns a spec
    //         where the first processor always throws.
    // Step 2: The try/catch in generate.ts catches the throw for that target.
    // Step 3: A hard error is appended to allErrors, anyError = true, and the loop continues.
    // Step 4: generate() returns 1 (exit failure).
    const { generate } = await import('../../src/generate.js');

    const code = await generate({
      sources: buildSources(tmpRepo, outputDir),
      release: 'r2',
      domain: 'core',
      dryRun: true,
      verbose: false,
    });

    // Hard error from the thrown processor → exit code must be 1
    expect(code).toBe(1);
  });
});
