// FR-CLI-0002 — generate() orchestration: error paths, soft errors, processor throw
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { generate, sweepOrphanDestinations } from '../../src/generate.js';
import { loadPluginCatalog } from '../../src/spec/plugin-sets.js';
import type { PluginCatalog } from '../../src/spec/plugin-sets.js';
import type { ResolvedSources } from '../../src/types.js';
import { PassThrough } from 'stream';
import {
  buildCustRepo, buildCustSources, captureStderr, copyDirSync as copyTree, CUSTOMIZATIONS_DIR,
  listFilesRecursive, snapshotTree, write,
} from '../helpers/cust-repo.js';

// generate() writes user-facing error messages (unknown release, unresolved sources)
// directly to process.stderr (generate.ts). Error-path tests only assert the exit code,
// so redirect stderr to a no-op for the duration of the call to keep the run quiet.
async function silencingStderr<T>(fn: () => Promise<T>): Promise<T> {
  const orig = process.stderr.write.bind(process.stderr);
  (process.stderr as NodeJS.WriteStream).write = (() => true) as typeof process.stderr.write;
  try {
    return await fn();
  } finally {
    (process.stderr as NodeJS.WriteStream).write = orig;
  }
}

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
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-unit-'));

  const instrR2Core = path.join(tmpRepo, 'instructions', 'r2', 'core');
  fs.mkdirSync(instrR2Core, { recursive: true });
  copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r2', 'core'), instrR2Core);

  const pluginsRoot = path.join(tmpRepo, 'src', 'rosettify-plugins', 'plugins');
  fs.mkdirSync(pluginsRoot, { recursive: true });
  for (const target of ['template-claude', 'template-cursor', 'template-copilot', 'template-codex', 'template-antigravity']) {
    const src = path.join(SAMPLE_PLUGINS_DIR, target);
    if (fs.existsSync(src)) {
      const dest = path.join(pluginsRoot, target);
      fs.mkdirSync(dest, { recursive: true });
      copyDirSync(src, dest);
    }
  }

  for (const ide of ['claude', 'cursor', 'copilot', 'codex', 'antigravity']) {
    fs.mkdirSync(path.join(tmpRepo, 'src', 'hooks', 'dist', 'bundles', ide), { recursive: true });
  }

  // DATA-CFG-0007: every run loads a plugin-set catalog at pre-flight.
  fs.copyFileSync(
    path.join(FIXTURES_DIR, 'sample-plugins.json'),
    path.join(tmpRepo, 'src', 'rosettify-plugins', 'plugins.json'),
  );

  fs.mkdirSync(path.join(tmpRepo, '.git'), { recursive: true });
  return tmpRepo;
}

// FR-CLI-0020: build ResolvedSources from a fake repo layout
function buildSources(repoRoot: string, outputDir: string): ResolvedSources {
  return {
    instructionsSource: path.join(repoRoot, 'instructions'),
    pluginsSource: path.join(repoRoot, 'src', 'rosettify-plugins', 'plugins'),
    hooksSource: path.join(repoRoot, 'src', 'hooks'),
    outputDir,
    profileSource: path.join(repoRoot, 'src', 'rosettify-plugins', 'profiles'),
    configPath: path.join(repoRoot, 'src', 'rosettify-plugins', 'plugins.json'),
  };
}

describe('generate() — error coverage', () => {
  let tmpRepo: string;

  beforeAll(() => {
    tmpRepo = buildFakeRepo();
  });

  afterAll(() => {
    if (tmpRepo) fs.rmSync(tmpRepo, { recursive: true, force: true });
  });

  it('unknown release → returns exit code 1 (FR-CLI-0010)', async () => {
    const outputDir = path.join(tmpRepo, 'out-bad-release');
    const code = await silencingStderr(() => generate({
      sources: buildSources(tmpRepo, outputDir),
      release: 'r999',
      domain: 'core',
      dryRun: false,
      verbose: false,
    }));
    expect(code).toBe(1);
  });

  it('missing instruction directory → returns exit code 1 (buildVfs throws, not the domain filter)', async () => {
    // instructionsSource with no release/domain dirs → buildVfs throws
    const emptyRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-empty-'));
    fs.mkdirSync(path.join(emptyRepo, '.git'), { recursive: true });
    try {
      const outputDir = path.join(emptyRepo, 'out');
      const code = await silencingStderr(() => generate({
        sources: buildSources(emptyRepo, outputDir),
        release: 'r2',
        domain: 'core',
        dryRun: false,
        verbose: false,
      }));
      expect(code).toBe(1);
    } finally {
      fs.rmSync(emptyRepo, { recursive: true, force: true });
    }
  });

  it('soft errors (bootstrap size violation) → exit code 1 (NFR-0004/QF-2, G-1)', async () => {
    // Write a plugin-files-mode.md with >10000 chars to trigger the soft error path.
    // The generate() must return exit 1 even though all output is still emitted.
    const instrRulesDir = path.join(tmpRepo, 'instructions', 'r2', 'core', 'rules');
    const oversizeFile = path.join(instrRulesDir, 'plugin-files-mode.md');
    const originalContent = fs.existsSync(oversizeFile) ? fs.readFileSync(oversizeFile, 'utf-8') : null;

    const oversizeBody = '# Plugin Files Mode\n\n' + 'X'.repeat(11000);
    fs.writeFileSync(
      oversizeFile,
      `---\nname: plugin-files-mode\ndescription: Oversize lead\nalwaysApply: true\napplyTo: "**"\n---\n${oversizeBody}`,
      'utf-8',
    );

    let stderrCapture = '';
    const origStderr = process.stderr.write.bind(process.stderr);
    (process.stderr as NodeJS.WriteStream).write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      if (typeof chunk === 'string') stderrCapture += chunk;
      else if (Buffer.isBuffer(chunk)) stderrCapture += chunk.toString('utf-8');
      return true;
    }) as typeof process.stderr.write;

    let code: number;
    const oversizeOutputDir = path.join(tmpRepo, 'out-oversize');
    try {
      code = await generate({
        sources: buildSources(tmpRepo, oversizeOutputDir),
        release: 'r2',
        domain: 'core',
        dryRun: false,
        verbose: false,
      });
    } finally {
      (process.stderr as NodeJS.WriteStream).write = origStderr;
      // Restore original file
      if (originalContent !== null) {
        fs.writeFileSync(oversizeFile, originalContent, 'utf-8');
      } else {
        fs.unlinkSync(oversizeFile);
      }
    }

    // NFR-0004: soft error → exit 1
    expect(code!).toBe(1);
    // Violation reported to stderr naming the file
    expect(stderrCapture).toContain('plugin-files-mode');
    expect(stderrCapture).toContain('Bootstrap entry exceeds');
    // Output is still emitted (run-to-completion)
    const outputFiles = fs.readdirSync(oversizeOutputDir).length;
    expect(outputFiles).toBeGreaterThan(0);
  });

  it('r3 with deterministic-hooks override false → exit 0, no bundles, no advisory blocks (FR-CLI-0012, FR-HOOK-0020)', async () => {
    const repo = buildFakeRepo();
    // Provide r3 instructions by copying the r2 sample tree into the r3 slot
    const instrR3Core = path.join(repo, 'instructions', 'r3', 'core');
    fs.mkdirSync(instrR3Core, { recursive: true });
    copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r2', 'core'), instrR3Core);
    try {
      const outputDir = path.join(repo, 'out-r3-nohooks');
      const code = await generate({
        sources: buildSources(repo, outputDir),
        release: 'r3',
        domain: 'core',
        dryRun: false,
        verbose: false,
        deterministicHooks: false,
      });
      expect(code).toBe(0);
      const hookDir = path.join(outputDir, 'core-claude', 'hooks');
      // FR-HOOK-0020: no compiled bundle artifacts placed
      expect(fs.existsSync(path.join(hookDir, 'dangerous-actions.js'))).toBe(false);
      // FR-GEN-0011: rendered config is valid JSON without advisory blocks
      const parsed = JSON.parse(fs.readFileSync(path.join(hookDir, 'hooks.json'), 'utf-8'));
      expect(parsed.hooks.PreToolUse).toBeUndefined();
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  it('r2 with deterministic-hooks override true and missing bundle files → exit 1, advisory blocks rendered (FR-CLI-0012, FR-HOOK-0021)', async () => {
    const repo = buildFakeRepo(); // bundle dirs exist but hold no bundle files
    try {
      const outputDir = path.join(repo, 'out-r2-hooks');
      const code = await silencingStderr(() => generate({
        sources: buildSources(repo, outputDir),
        release: 'r2',
        domain: 'core',
        dryRun: false,
        verbose: false,
        deterministicHooks: true,
      }));
      // Effective value true → bundles required → missing files are a hard error
      expect(code).toBe(1);
      // Run-to-completion: advisory blocks still rendered for the effective value
      const parsed = JSON.parse(fs.readFileSync(path.join(outputDir, 'core-claude', 'hooks', 'hooks.json'), 'utf-8'));
      expect(parsed.hooks.PreToolUse).toBeDefined();
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  it('no deterministic-hooks override → release descriptor default applies (r2 → off) (FR-CLI-0012 fallback)', async () => {
    const repo = buildFakeRepo();
    try {
      const outputDir = path.join(repo, 'out-r2-default');
      const code = await generate({
        sources: buildSources(repo, outputDir),
        release: 'r2',
        domain: 'core',
        dryRun: false,
        verbose: false,
      });
      expect(code).toBe(0);
      const hookDir = path.join(outputDir, 'core-claude', 'hooks');
      expect(fs.existsSync(path.join(hookDir, 'dangerous-actions.js'))).toBe(false);
      const parsed = JSON.parse(fs.readFileSync(path.join(hookDir, 'hooks.json'), 'utf-8'));
      expect(parsed.hooks.PreToolUse).toBeUndefined();
    } finally {
      fs.rmSync(repo, { recursive: true, force: true });
    }
  });

  it('r3 with missing bundles → returns exit code 1 (hard error propagation)', async () => {
    // r3 = deterministicHooks; bundles dir exists but files are missing → pluginSyncBundles → hard error
    const r3Repo = buildFakeRepo();
    // Create bundle dirs for r3 but populate only partial bundles (trigger missing-count error)
    for (const target of ['core-claude', 'core-cursor', 'core-copilot', 'core-codex', 'core-cursor-standalone', 'core-copilot-standalone', 'core-antigravity']) {
      const bundleDir = path.join(r3Repo, 'hooks', 'dist', 'bundles', target);
      fs.mkdirSync(bundleDir, { recursive: true });
      // Only 1 of 5 expected bundles — triggers missingCount > 0 hard error
      fs.writeFileSync(path.join(bundleDir, 'dangerous-actions.js'), '// stub');
    }
    try {
      const outputDir = path.join(r3Repo, 'out-r3');
      const code = await silencingStderr(() => generate({
        sources: buildSources(r3Repo, outputDir),
        release: 'r3',
        domain: 'core',
        dryRun: false,
        verbose: false,
      }));
      // Missing bundles → hard errors → exit 1
      expect(code).toBe(1);
    } finally {
      fs.rmSync(r3Repo, { recursive: true, force: true });
    }
  });
});

// DATA-CFG-0007 — the orphan sweep. pluginCleanup only wipes destinations it is about to write,
// so renaming core-<ide> to rosetta-<ide> would otherwise leave the superseded folders in the
// output tree forever and users would keep installing a plugin the generator stopped producing.
describe('sweepOrphanDestinations', () => {
  const catalog = {
    targets: ['claude'],
    hookSupportModules: {},
    sets: [{
      name: 'rosetta',
      folders: ['core'],
      template: 'template',
      releases: ['r3'],
      requires: [],
      bootstrap: true,
      hooks: [],
      manifest: { name: 'rosetta', description: 'R.' },
      variants: [
        { profile: null, destinationSuffix: '', manifestNameSuffix: '', manifestDescriptionSuffix: '' },
        { profile: 'lightweight', destinationSuffix: '-light', manifestNameSuffix: '', manifestDescriptionSuffix: '' },
      ],
    }],
  };

  function withOutputDir(fn: (outputDir: string, loaded: PluginCatalog) => void): void {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sweep-'));
    try {
      const configPath = path.join(tmp, 'plugins.json');
      fs.writeFileSync(configPath, JSON.stringify(catalog));
      const outputDir = path.join(tmp, 'out');
      fs.mkdirSync(outputDir, { recursive: true });
      fn(outputDir, loadPluginCatalog(configPath));
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  function seed(outputDir: string): void {
    for (const d of ['rosetta-claude', 'rosetta-claude-light', 'core-claude', 'core-claude-light']) {
      fs.mkdirSync(path.join(outputDir, d), { recursive: true });
      fs.writeFileSync(path.join(outputDir, d, 'marker.txt'), 'x');
    }
    fs.writeFileSync(path.join(outputDir, 'README.md'), 'a loose file, not a plugin');
  }

  it('removes only the folders the catalog no longer declares', () => {
    withOutputDir((outputDir, loaded) => {
      seed(outputDir);
      const removed = sweepOrphanDestinations(loaded, outputDir, false);

      expect(removed.sort()).toEqual(['core-claude', 'core-claude-light']);
      expect(fs.existsSync(path.join(outputDir, 'rosetta-claude'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'rosetta-claude-light'))).toBe(true);
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(false);
    });
  });

  it('leaves loose files in the output root alone — only directories are swept', () => {
    withOutputDir((outputDir, loaded) => {
      seed(outputDir);
      sweepOrphanDestinations(loaded, outputDir, false);
      expect(fs.existsSync(path.join(outputDir, 'README.md'))).toBe(true);
    });
  });

  it('removes nothing in dry-run, while still reporting what it would remove', () => {
    withOutputDir((outputDir, loaded) => {
      seed(outputDir);
      const removed = sweepOrphanDestinations(loaded, outputDir, true);

      expect(removed.sort()).toEqual(['core-claude', 'core-claude-light']);
      expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(true);
    });
  });

  it('is a no-op when the output directory does not exist yet', () => {
    withOutputDir((outputDir, loaded) => {
      fs.rmSync(outputDir, { recursive: true, force: true });
      expect(sweepOrphanDestinations(loaded, outputDir, false)).toEqual([]);
    });
  });
});

// DATA-CFG-0007 — set expansion, --domain as a folder filter, and pre-flight abort semantics,
// exercised against the disjoint multi-folder r3 fixture tree.
describe('generate() — plugin sets end to end', () => {
  function buildMultiSetRepo(): string {
    const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-sets-'));

    for (const folder of ['core', 'qe', 'search']) {
      const dest = path.join(tmpRepo, 'instructions', 'r3', folder);
      fs.mkdirSync(dest, { recursive: true });
      copyDirSync(path.join(SAMPLE_INSTRUCTIONS_DIR, 'r3', folder), dest);
    }

    const pluginsRoot = path.join(tmpRepo, 'src', 'rosettify-plugins', 'plugins');
    fs.mkdirSync(pluginsRoot, { recursive: true });
    for (const target of ['template-claude', 'template-codex']) {
      const dest = path.join(pluginsRoot, target);
      fs.mkdirSync(dest, { recursive: true });
      copyDirSync(path.join(SAMPLE_PLUGINS_DIR, target), dest);
    }

    fs.mkdirSync(path.join(tmpRepo, 'src', 'rosettify-plugins', 'profiles'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpRepo, 'src', 'rosettify-plugins', 'profiles', 'lightweight.json'), '{}',
    );
    fs.copyFileSync(
      path.join(FIXTURES_DIR, 'sample-plugins-multiset.json'),
      path.join(tmpRepo, 'src', 'rosettify-plugins', 'plugins.json'),
    );
    return tmpRepo;
  }

  let repo: string;
  beforeAll(() => { repo = buildMultiSetRepo(); });
  afterAll(() => { if (repo) fs.rmSync(repo, { recursive: true, force: true }); });

  const sourcesFor = (outputDir: string, configPath?: string): ResolvedSources => ({
    ...buildSources(repo, outputDir),
    profileSource: path.join(repo, 'src', 'rosettify-plugins', 'profiles'),
    configPath: configPath ?? path.join(repo, 'src', 'rosettify-plugins', 'plugins.json'),
  });

  it('ONE invocation expands sets x variants x targets — 4 set-variants x 2 targets = 8', async () => {
    const outputDir = path.join(repo, 'out-all');
    const code = await generate({
      sources: sourcesFor(outputDir), release: 'r3', dryRun: false, verbose: false,
    });

    expect(code).toBe(0);
    expect(fs.readdirSync(outputDir).sort()).toEqual([
      'qe-claude', 'qe-codex',
      'rosetta-claude', 'rosetta-claude-light',
      'rosetta-codex', 'rosetta-codex-light',
      'search-claude', 'search-codex',
    ]);
  });

  it('--domain is a folder filter over sets: `qe` builds only qe-*', async () => {
    const outputDir = path.join(repo, 'out-qe');
    const code = await generate({
      sources: sourcesFor(outputDir), release: 'r3', domain: 'qe', dryRun: false, verbose: false,
    });

    expect(code).toBe(0);
    // The `rosetta` set layers core+qe+search, so naming only `qe` excludes it.
    expect(fs.readdirSync(outputDir).sort()).toEqual(['qe-claude', 'qe-codex']);
  });

  it('a sparse set ships no hooks folder and no hooks.json', async () => {
    const outputDir = path.join(repo, 'out-sparse');
    await generate({ sources: sourcesFor(outputDir), release: 'r3', dryRun: false, verbose: false });

    // `search` declares no hooks and no bootstrap.
    expect(fs.existsSync(path.join(outputDir, 'search-claude', 'hooks'))).toBe(false);
    // ...while `rosetta` does ship them.
    expect(fs.existsSync(path.join(outputDir, 'rosetta-claude', 'hooks', 'hooks.json'))).toBe(true);
  });

  it('a sparse set does not advertise folders it does not ship', async () => {
    const outputDir = path.join(repo, 'out-manifest');
    await generate({ sources: sourcesFor(outputDir), release: 'r3', dryRun: false, verbose: false });

    const search = JSON.parse(fs.readFileSync(
      path.join(outputDir, 'search-claude', '.claude-plugin', 'plugin.json'), 'utf-8',
    ));
    const rosetta = JSON.parse(fs.readFileSync(
      path.join(outputDir, 'rosetta-claude', '.claude-plugin', 'plugin.json'), 'utf-8',
    ));

    // `search` ships zero workflows, so it declares no commands folder; `rosetta` does.
    expect(search).not.toHaveProperty('commands');
    expect(rosetta.commands).toBe('./workflows/');
    // Manifest identity is set-driven, and the variant suffix is applied once.
    expect(search.name).toBe('rosetta-search');
  });

  it('the variant, not --profile, drives the suffix: only rosetta has a -light twin', async () => {
    const outputDir = path.join(repo, 'out-variant');
    await generate({ sources: sourcesFor(outputDir), release: 'r3', dryRun: false, verbose: false });

    const light = JSON.parse(fs.readFileSync(
      path.join(outputDir, 'rosetta-claude-light', '.claude-plugin', 'plugin.json'), 'utf-8',
    ));
    expect(light.name).toBe('rosetta-light');
    expect(light.description).toContain('(light)');
    expect(fs.existsSync(path.join(outputDir, 'qe-claude-light'))).toBe(false);
  });

  it('sweeps output folders the catalog no longer declares', async () => {
    const outputDir = path.join(repo, 'out-sweep');
    fs.mkdirSync(path.join(outputDir, 'core-claude'), { recursive: true });
    fs.writeFileSync(path.join(outputDir, 'core-claude', 'stale.txt'), 'x');

    await generate({ sources: sourcesFor(outputDir), release: 'r3', dryRun: false, verbose: false });

    expect(fs.existsSync(path.join(outputDir, 'core-claude'))).toBe(false);
    expect(fs.existsSync(path.join(outputDir, 'rosetta-claude'))).toBe(true);
  });

  it('an invalid catalog aborts BEFORE anything is written, naming the file', async () => {
    const outputDir = path.join(repo, 'out-badcatalog');
    const badConfig = path.join(repo, 'bad-plugins.json');
    fs.writeFileSync(badConfig, JSON.stringify({ ...JSON.parse(
      fs.readFileSync(path.join(repo, 'src', 'rosettify-plugins', 'plugins.json'), 'utf-8'),
    ), unknownField: true }));

    let stderr = '';
    const orig = process.stderr.write.bind(process.stderr);
    (process.stderr as NodeJS.WriteStream).write = ((c: string) => { stderr += c; return true; }) as typeof process.stderr.write;
    let code: number;
    try {
      code = await generate({
        sources: sourcesFor(outputDir, badConfig), release: 'r3', dryRun: false, verbose: false,
      });
    } finally {
      (process.stderr as NodeJS.WriteStream).write = orig;
    }

    expect(code).toBe(1);
    expect(stderr).toContain(badConfig);
    expect(stderr).toContain('unknownField');
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('a missing catalog aborts non-zero, naming the path it looked for', async () => {
    const outputDir = path.join(repo, 'out-nocatalog');
    const code = await silencingStderr(() => generate({
      sources: sourcesFor(outputDir, path.join(repo, 'absent.json')),
      release: 'r3', dryRun: false, verbose: false,
    }));

    expect(code).toBe(1);
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('a set naming a template with no folder for a target aborts before any write', async () => {
    const outputDir = path.join(repo, 'out-notemplate');
    const badConfig = path.join(repo, 'bad-template.json');
    const catalog = JSON.parse(
      fs.readFileSync(path.join(repo, 'src', 'rosettify-plugins', 'plugins.json'), 'utf-8'),
    );
    catalog.sets[0].template = 'no-such-template';
    fs.writeFileSync(badConfig, JSON.stringify(catalog));

    let stderr = '';
    const orig = process.stderr.write.bind(process.stderr);
    (process.stderr as NodeJS.WriteStream).write = ((c: string) => { stderr += c; return true; }) as typeof process.stderr.write;
    let code: number;
    try {
      code = await generate({
        sources: sourcesFor(outputDir, badConfig), release: 'r3', dryRun: false, verbose: false,
      });
    } finally {
      (process.stderr as NodeJS.WriteStream).write = orig;
    }

    expect(code).toBe(1);
    expect(stderr).toContain(badConfig);
    expect(stderr).toContain('no-such-template');
    // Pre-flight: not even the sets whose templates DO exist were written.
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('an unknown --domain token names the missing instruction folder (FR-CLI-0030)', async () => {
    const outputDir = path.join(repo, 'out-baddomain');
    let stderr = '';
    const orig = process.stderr.write.bind(process.stderr);
    (process.stderr as NodeJS.WriteStream).write = ((c: string) => { stderr += c; return true; }) as typeof process.stderr.write;
    let code: number;
    try {
      code = await generate({
        sources: sourcesFor(outputDir), release: 'r3', domain: 'zzz', dryRun: false, verbose: false,
      });
    } finally {
      (process.stderr as NodeJS.WriteStream).write = orig;
    }

    expect(code).toBe(1);
    expect(stderr).toContain(path.join(repo, 'instructions', 'r3', 'zzz'));
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('a domain filter matching no declared set exits 0 and writes nothing (FR-CLI-0031)', async () => {
    const outputDir = path.join(repo, 'out-emptydomain');
    const emptyDomainConfig = path.join(repo, 'empty-domain-plugins.json');
    fs.writeFileSync(emptyDomainConfig, JSON.stringify({
      targets: ['claude'],
      hookSupportModules: {},
      sets: [
        {
          name: 'core', folders: ['core'], template: 'template', releases: ['r3'],
          requires: [], bootstrap: false, hooks: [],
          manifest: { name: 'core', description: 'Core.' },
          variants: [{ profile: null, destinationSuffix: '', manifestNameSuffix: '', manifestDescriptionSuffix: '' }],
        },
        {
          name: 'workflows', folders: ['workflows'], template: 'template', releases: ['r3'],
          requires: [], bootstrap: false, hooks: [],
          manifest: { name: 'workflows', description: 'Workflows.' },
          variants: [{ profile: null, destinationSuffix: '', manifestNameSuffix: '', manifestDescriptionSuffix: '' }],
        },
      ],
    }));

    let stderr = '';
    const orig = process.stderr.write.bind(process.stderr);
    (process.stderr as NodeJS.WriteStream).write = ((c: string) => { stderr += c; return true; }) as typeof process.stderr.write;
    let code: number;
    try {
      // `qe` names a real instruction folder in this fixture tree (FR-CLI-0030 passes), but
      // neither declared set (`core`, `workflows`) lists it among its `folders`, so the filter
      // matches nothing — a legitimate empty selection, distinct from FR-CLI-0030's abort.
      code = await generate({
        sources: sourcesFor(outputDir, emptyDomainConfig), release: 'r3', domain: 'qe', dryRun: false, verbose: false,
      });
    } finally {
      (process.stderr as NodeJS.WriteStream).write = orig;
    }

    expect(code).toBe(0);
    expect(stderr).toContain('Domain filter "qe" matched no plugin set');
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('an unconfigured release with no --domain still exits 1 (misconfiguration, not a filter outcome)', async () => {
    const outputDir = path.join(repo, 'out-norelease-domain');
    const noReleaseConfig = path.join(repo, 'no-release-plugins.json');
    fs.writeFileSync(noReleaseConfig, JSON.stringify({
      targets: ['claude'],
      hookSupportModules: {},
      sets: [
        {
          name: 'core', folders: ['core'], template: 'template', releases: ['r2'],
          requires: [], bootstrap: false, hooks: [],
          manifest: { name: 'core', description: 'Core.' },
          variants: [{ profile: null, destinationSuffix: '', manifestNameSuffix: '', manifestDescriptionSuffix: '' }],
        },
      ],
    }));

    const code = await silencingStderr(() => generate({
      sources: sourcesFor(outputDir, noReleaseConfig), release: 'r3', dryRun: false, verbose: false,
    }));

    expect(code).toBe(1);
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it('a set naming an instruction folder that does not exist aborts, never silently skips', async () => {
    const outputDir = path.join(repo, 'out-nofolder');
    const badConfig = path.join(repo, 'bad-folder.json');
    const catalog = JSON.parse(
      fs.readFileSync(path.join(repo, 'src', 'rosettify-plugins', 'plugins.json'), 'utf-8'),
    );
    catalog.sets[1].folders = ['typo-folder'];
    fs.writeFileSync(badConfig, JSON.stringify(catalog));

    const code = await silencingStderr(() => generate({
      sources: sourcesFor(outputDir, badConfig), release: 'r3', dryRun: false, verbose: false,
    }));

    expect(code).toBe(1);
    expect(fs.existsSync(outputDir)).toBe(false);
  });
});

// FR-SET-0050: `requires` is validated against the manifest description, never derived into it.
// This is the output-shape assertion the prior audit lacked — checking the REAL shipped catalog's
// generated manifest actually carries the authored "Requires ..." prose, not just that the
// (unrelated) fixture catalogs load.
describe('generate() — real catalog: requires is reflected in the shipped manifest prose', () => {
  const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

  it('the built rosetta-* manifest and set list reflect the committed catalog', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-real-catalog-'));
    try {
      const code = await generate({
        sources: {
          instructionsSource: path.join(REPO_ROOT, 'instructions'),
          pluginsSource: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins'),
          hooksSource: path.join(REPO_ROOT, 'src', 'hooks'),
          outputDir,
          profileSource: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'profiles'),
          configPath: path.join(REPO_ROOT, 'src', 'rosettify-plugins', 'plugins.json'),
        },
        release: 'r3',
        domain: 'core',
        dryRun: false,
        verbose: false,
        deterministicHooks: false,
      });
      expect(code).toBe(0);
      const manifest = JSON.parse(fs.readFileSync(
        path.join(outputDir, 'rosetta-claude', '.claude-plugin', 'plugin.json'), 'utf-8',
      ));
      expect(manifest.name).toBe('rosetta');
      expect(manifest.description).toContain('Software Engineering Accelerator');
      expect(fs.readdirSync(outputDir).filter((d) => d.startsWith('rosetta-')).length).toBe(14);
      expect(fs.readdirSync(outputDir).some((d) => /^(workflows|qe|search|modernization)-/.test(d))).toBe(false);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  }, 60_000);
});


// ─────────────────────────────────────────────────────────────────────────────
// plugin-customizations: --publish (FR-CLI-0036) and customization roots (FR-CUST-0002/0003,
// FR-ARCH-0024.AC4/AC6, FR-ARCH-0026.AC5). Every violation is a PRE-FLIGHT error: exit 1 and the
// output directory is never created/touched (ASR-2).
// ─────────────────────────────────────────────────────────────────────────────
describe('generate() — --publish filter (FR-CLI-0036)', () => {
  let repo: string;
  beforeAll(() => { repo = buildCustRepo(); });
  afterAll(() => { fs.rmSync(repo, { recursive: true, force: true }); });

  const run = (outName: string, extra: Record<string, unknown> = {}) =>
    captureStderr(() => generate({
      sources: buildCustSources(repo, path.join(repo, outName)),
      release: 'r3', dryRun: false, verbose: false, ...extra,
    }));
  const dirs = (outName: string) => fs.readdirSync(path.join(repo, outName)).sort();

  it('AC1: --publish rosetta,rosetta-light writes rosetta-<ide> and rosetta-<ide>-light, no core-<ide>', async () => {
    const { result } = await run('o-ac1', { publish: ['rosetta', 'rosetta-light'] });
    expect(result).toBe(0);
    expect(dirs('o-ac1')).toEqual([
      'rosetta-claude', 'rosetta-claude-light', 'rosetta-codex', 'rosetta-codex-light',
    ]);
  });

  it('AC2: a pre-existing core-claude/ stays byte-identical (not cleaned, written or swept)', async () => {
    const out = path.join(repo, 'o-ac2');
    write(path.join(out, 'core-claude', 'stale.txt'), 'keep me');
    write(path.join(out, 'core-claude', 'deep', 'x.bin'), 'BIN\u0000\u00ff');
    const before = snapshotTree(path.join(out, 'core-claude'));
    const { result } = await run('o-ac2', { publish: ['rosetta', 'rosetta-light'] });
    expect(result).toBe(0);
    expect(snapshotTree(path.join(out, 'core-claude'))).toEqual(before);
    expect(fs.existsSync(path.join(out, 'core-codex'))).toBe(false);
    expect(fs.existsSync(path.join(out, 'rosetta-claude'))).toBe(true);
  });

  it('AC3: unknown name exits 1 naming it and listing declared names; nothing written', async () => {
    const { result, stderr } = await run('o-ac3', { publish: ['rosseta'] });
    expect(result).toBe(1);
    expect(stderr).toContain('rosseta');
    for (const name of ['core', 'rosetta', 'rosetta-light']) expect(stderr).toContain(name);
    expect(fs.existsSync(path.join(repo, 'o-ac3'))).toBe(false);
  });

  it('AC4: no --publish writes every built plugin', async () => {
    const { result } = await run('o-ac4');
    expect(result).toBe(0);
    expect(dirs('o-ac4')).toEqual([
      'core-claude', 'core-codex',
      'rosetta-claude', 'rosetta-claude-light', 'rosetta-codex', 'rosetta-codex-light',
    ]);
  });

  it('AC5: unpublished core with a missing instruction folder still fails at pre-flight; nothing written', async () => {
    const r = buildCustRepo();
    try {
      const cfgPath = path.join(r, 'src', 'rosettify-plugins', 'plugins.json');
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
      cfg.sets.find((x: { name: string }) => x.name === 'core').folders = ['missing-folder'];
      fs.writeFileSync(cfgPath, JSON.stringify(cfg));
      const out = path.join(r, 'o-ac5');
      const { result, stderr } = await captureStderr(() => generate({
        sources: buildCustSources(r, out), release: 'r3', dryRun: false, verbose: false,
        publish: ['rosetta', 'rosetta-light'],
      }));
      expect(result).toBe(1);
      expect(stderr).toContain('missing-folder');
      expect(fs.existsSync(out)).toBe(false);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
  });

  it('AC6: a processing error in the unpublished core codex pipeline fails the run; no core-* written', async () => {
    const r = buildCustRepo();
    try {
      // Oversize bootstrap lead, scoped to set `core` and the codex target only.
      write(
        path.join(r, 'instructions', 'r3', 'core', 'rules', 'plugin-files-mode~set-core-only~ide-codex-only~overwrite~.md'),
        `---\nname: plugin-files-mode\ntags: ["bootstrap"]\n---\n${'X'.repeat(11000)}`,
      );
      const out = path.join(r, 'o-ac6');
      const { result, stderr } = await captureStderr(() => generate({
        sources: buildCustSources(r, out), release: 'r3', dryRun: false, verbose: false,
        publish: ['rosetta', 'rosetta-light'],
      }));
      expect(result).toBe(1);
      expect(stderr).toContain('core-codex');
      expect(stderr).toContain('Bootstrap entry exceeds');
      expect(fs.readdirSync(out).filter((d) => d.startsWith('core-'))).toEqual([]);
      expect(fs.existsSync(path.join(out, 'rosetta-codex'))).toBe(true);
    } finally {
      fs.rmSync(r, { recursive: true, force: true });
    }
  });

  it('dry-run + unpublished: the sink lists published plugins only; no output folder is created', async () => {
    const out = path.join(repo, 'o-dry');
    const sink = new PassThrough();
    let text = '';
    sink.on('data', (c) => { text += c.toString(); });
    const { result } = await captureStderr(() => generate({
      sources: buildCustSources(repo, out), release: 'r3', dryRun: true, verbose: false,
      publish: ['rosetta'], out: sink,
    }));
    sink.end();
    expect(result).toBe(0);
    expect(text).toContain('rosetta-claude');
    expect(text).not.toContain('core-claude');
    expect(text).not.toContain('rosetta-claude-light');
    expect(fs.existsSync(out)).toBe(false);
  });

  it('pre-flight order: an unknown --publish name is reported before customization-root problems', async () => {
    const { result, stderr } = await run('o-order', {
      publish: ['nope'], customizations: [path.join(repo, 'does-not-exist')],
    });
    expect(result).toBe(1);
    expect(stderr).toContain('nope');
    expect(stderr).not.toContain('does-not-exist');
  });
});

describe('generate() — customization roots pre-flight (FR-CUST-0002/0003, FR-ARCH-0024/0026)', () => {
  let repo: string;
  beforeAll(() => {
    repo = buildCustRepo();
    copyTree(CUSTOMIZATIONS_DIR, path.join(repo, 'roots'));
    // not committed (.gitignore / nested repo): created in the temp copy only
    fs.mkdirSync(path.join(repo, 'roots', 'repo-like', '.git'), { recursive: true });
    write(path.join(repo, 'roots', 'repo-like', '.git', 'HEAD'), 'ref: refs/heads/main');
    write(path.join(repo, 'roots', 'repo-like', 'r3', '.DS_Store'), 'junk');
  });
  afterAll(() => { fs.rmSync(repo, { recursive: true, force: true }); });

  const root = (n: string) => path.join(repo, 'roots', n);
  const run = (outName: string, customizations: string[], extra: Record<string, unknown> = {}) =>
    captureStderr(() => generate({
      sources: buildCustSources(repo, path.join(repo, outName)),
      release: 'r3', dryRun: false, verbose: false, customizations, ...extra,
    }));
  const notWritten = (outName: string) => expect(fs.existsSync(path.join(repo, outName))).toBe(false);

  it('FR-CUST-0002.AC1: undeclared folder under <root>/<release>/ -> exit 1 naming it, no output', async () => {
    const { result, stderr } = await run('o-u1', [root('bad-folder')]);
    expect(result).toBe(1);
    expect(stderr).toContain(path.join(root('bad-folder'), 'r3', 'acme'));
    notWritten('o-u1');
  });

  it('FR-CUST-0002.AC2: loose file under <root>/<release>/ -> exit 1 naming it, no output', async () => {
    const { result, stderr } = await run('o-u2', [root('bad-loose')]);
    expect(result).toBe(1);
    expect(stderr).toContain(path.join(root('bad-loose'), 'r3', 'README.md'));
    notWritten('o-u2');
  });

  it('FR-CUST-0002.AC3: a root holding only r3/core is accepted', async () => {
    const { result } = await run('o-u3', [root('acme')]);
    expect(result).toBe(0);
  });

  it('FR-CUST-0002.AC4: repo-like root (README, LICENSE, .git/, docs/) -> only r3/core used, exit 0', async () => {
    const { result } = await run('o-u4', [root('repo-like')]);
    expect(result).toBe(0);
    const files = listFilesRecursive(path.join(repo, 'o-u4')).map((f) => f.split(path.sep).join('/'));
    expect(files.some((f) => f.endsWith('rosetta-claude/skills/repolike/SKILL.md'))).toBe(true);
    // README / LICENSE / docs/ / .git/ of the root carry unique markers that must never ship.
    for (const f of files) {
      const text = fs.readFileSync(f, 'latin1');
      expect(text, f).not.toMatch(/REPO-LIKE-MARKER-(README|LICENSE|DOCS)|ref: refs\/heads/);
    }
  });

  it('FR-CUST-0002.AC5: r3/.DS_Store is ignored, exit 0, absent from every output', async () => {
    const { result } = await run('o-u5', [root('repo-like')]);
    expect(result).toBe(0);
    expect(listFilesRecursive(path.join(repo, 'o-u5')).filter((f) => path.basename(f) === '.DS_Store')).toEqual([]);
  });

  it('FR-CUST-0003.AC1: missing path -> exit 1 naming the resolved path, no output', async () => {
    const missing = path.join(repo, 'roots', 'missing');
    const { result, stderr } = await run('o-m1', [missing]);
    expect(result).toBe(1);
    expect(stderr).toContain(missing);
    notWritten('o-m1');
  });

  it('FR-CUST-0003.AC2: a file instead of a directory -> exit 1 naming it, no output', async () => {
    const file = path.join(root('repo-like'), 'README.md');
    const { result, stderr } = await run('o-m2', [file]);
    expect(result).toBe(1);
    expect(stderr).toContain(file);
    notWritten('o-m2');
  });

  it('FR-CUST-0003.AC3: a root with only r3/ contributes nothing to an r2 run (main source alone), exit 0', async () => {
    const r2repo = buildFakeRepo();
    try {
      copyTree(root('r3-only'), path.join(r2repo, 'r3-only'));
      const out = path.join(r2repo, 'out');
      const { result } = await captureStderr(() => generate({
        sources: buildSources(r2repo, out), release: 'r2', domain: 'core', dryRun: false, verbose: false,
        customizations: [path.join(r2repo, 'r3-only')],
      }));
      expect(result).toBe(0);
      expect(listFilesRecursive(out).some((f) => f.includes('r3only'))).toBe(false);
    } finally {
      fs.rmSync(r2repo, { recursive: true, force: true });
    }
  });

  it('FR-ARCH-0026.AC5: 25 roots accepted, 26 roots -> exit 1, no output', async () => {
    const make = (n: number) => Array.from({ length: n }, (_, i) => {
      const d = path.join(repo, 'many', `r${i}`);
      fs.mkdirSync(d, { recursive: true });
      return d;
    });
    expect((await run('o-n25', make(25))).result).toBe(0);
    const { result, stderr } = await run('o-n26', make(26));
    expect(result).toBe(1);
    expect(stderr).toMatch(/Too many customization roots/);
    notWritten('o-n26');
  });

  it('FR-ARCH-0024.AC4: an overwrite that is the only contribution -> exit 1 naming the file, no output', async () => {
    const file = path.join(repo, 'cust-a4', 'r3', 'core', 'workflows', 'codin-flow~overwrite~.md');
    write(file, '---\nname: codin-flow\ndescription: x\ntags: ["workflow"]\n---\nbody');
    const { result, stderr } = await run('o-a4', [path.join(repo, 'cust-a4')]);
    expect(result).toBe(1);
    expect(stderr).toContain(file);
    expect(stderr).toContain('overwrite has no predecessor');
    notWritten('o-a4');
  });

  it('FR-ARCH-0024.AC6: a target-scoped overwrite with no predecessor in that build names the file and the claude build', async () => {
    const dir = path.join(repo, 'cust-a6', 'r3', 'core', 'rules');
    write(path.join(dir, 'x~target-codex-only~.md'), 'codex x');
    const bad = path.join(dir, 'x~target-claude-only~overwrite~.md');
    write(bad, 'claude x');
    const { result, stderr } = await run('o-a6', [path.join(repo, 'cust-a6')]);
    expect(result).toBe(1);
    expect(stderr).toContain(bad);
    expect(stderr).toContain('rosetta-claude');
    expect(stderr).not.toMatch(/predecessor in build [^\n]*codex/);
    notWritten('o-a6');
  });

  it('M1: a dangling symlink folder under <root>/r3/ -> exit 1 (no thrown error), nothing written', async () => {
    const dir = path.join(repo, 'cust-dangling', 'r3');
    fs.mkdirSync(dir, { recursive: true });
    fs.symlinkSync(path.join(repo, 'cust-dangling', 'nowhere'), path.join(dir, 'core'));
    const { result, stderr } = await run('o-dangling', [path.join(repo, 'cust-dangling')]);
    expect(result).toBe(1);
    expect(stderr).toContain('broken symlink');
    notWritten('o-dangling');
  });

  it('M1: a folder-level symlink <root>/r3/core -> dir is accepted and its files ship', async () => {
    const real = path.join(repo, 'cust-linked-real');
    write(path.join(real, 'skills', 'linked', 'SKILL.md'), '---\nname: linked\ndescription: l\n---\nLINKED-BODY');
    const dir = path.join(repo, 'cust-linked', 'r3');
    fs.mkdirSync(dir, { recursive: true });
    fs.symlinkSync(real, path.join(dir, 'core'));
    const { result } = await run('o-linked', [path.join(repo, 'cust-linked')]);
    expect(result).toBe(0);
    const hit = listFilesRecursive(path.join(repo, 'o-linked', 'rosetta-claude'))
      .find((f) => f.split(path.sep).join('/').endsWith('skills/linked/SKILL.md'));
    expect(hit).toBeDefined();
    expect(fs.readFileSync(hit!, 'utf-8')).toContain('LINKED-BODY');
  });

  it('L1: a pre-flight failure leaves a pre-seeded undeclared folder alone (sweep runs only after pre-flight)', async () => {
    const out = path.join(repo, 'o-sweep');
    write(path.join(out, 'stale-undeclared', 'keep.txt'), 'survive');
    const file = path.join(repo, 'cust-sweep', 'r3', 'core', 'workflows', 'codin-flow~overwrite~.md');
    write(file, '---\nname: codin-flow\ndescription: x\ntags: ["workflow"]\n---\nbody');
    const { result } = await run('o-sweep', [path.join(repo, 'cust-sweep')]);
    expect(result).toBe(1);
    expect(fs.readFileSync(path.join(out, 'stale-undeclared', 'keep.txt'), 'utf-8')).toBe('survive');
    expect(fs.readdirSync(out)).toEqual(['stale-undeclared']);
  });

  it('FR-ARCH-0024.AC4/AC6: one orphan fault is not repeated per IDE/variant/set (one line per file and set-variant)', async () => {
    const bad = path.join(repo, 'cust-m6', 'r3', 'core', 'rules', 'y~overwrite~.md');
    write(bad, 'orphan');
    const { result, stderr } = await run('o-m6', [path.join(repo, 'cust-m6')]);
    expect(result).toBe(1);
    // 3 set-variants (rosetta, rosetta-light, core) x 2 targets = 6 specs -> 3 lines, not 6
    expect(stderr.split('\n').filter((l) => l.includes(bad))).toHaveLength(3);
    notWritten('o-m6');
  });

  it('FR-CUST-0002: one VFS-build fault shared by several sets is reported once, naming every set', async () => {
    const bad = path.join(repo, 'cust-m6b', 'r3', 'core', 'rules', 'z~bogus~.md');
    write(bad, 'bad directive');
    const { result, stderr } = await run('o-m6b', [path.join(repo, 'cust-m6b')]);
    expect(result).toBe(1);
    const lines = stderr.split('\n').filter((l) => l.includes('bogus'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('"rosetta"');
    expect(lines[0]).toContain('"core"');
    notWritten('o-m6b');
  });
});
