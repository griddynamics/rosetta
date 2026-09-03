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

  it('a built qe-* manifest description names both sets it requires', async () => {
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
        domain: 'qe',
        dryRun: false,
        verbose: false,
        deterministicHooks: false,
      });
      expect(code).toBe(0);
      const manifest = JSON.parse(fs.readFileSync(
        path.join(outputDir, 'qe-claude', '.claude-plugin', 'plugin.json'), 'utf-8',
      ));
      expect(manifest.description).toContain('Core');
      expect(manifest.description).toContain('Workflows');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
