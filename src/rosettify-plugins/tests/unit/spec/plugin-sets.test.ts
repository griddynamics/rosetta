// DATA-CFG-0007 — plugin-set catalog: load, total structural validation, and selection.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadPluginCatalog,
  selectSets,
  allDeclaredDestinations,
  resolveHookModules,
  defaultConfigPath,
  resolveConfigPath,
  PluginCatalogError,
} from '../../../src/spec/plugin-sets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_CONFIG = path.join(__dirname, '..', '..', '..', 'plugins.json');

const VALID = {
  targets: ['claude', 'cursor', 'copilot', 'codex', 'cursor-standalone', 'copilot-standalone', 'antigravity'],
  hookSupportModules: { 'read-once': ['read-once-reset', 'read-once-shared'] },
  sets: [
    {
      name: 'core',
      folders: ['core'],
      template: 'template',
      releases: ['r2', 'r3'],
      requires: [],
      bootstrap: true,
      hooks: ['dangerous-actions', 'read-once'],
      manifest: { name: 'rosetta-core', description: 'Core.' },
      variants: [{ profile: null, destinationSuffix: '', manifestNameSuffix: '', manifestDescriptionSuffix: '' }],
    },
    {
      name: 'qe',
      folders: ['qe'],
      template: 'template',
      releases: ['r3'],
      requires: ['core'],
      bootstrap: false,
      hooks: [],
      manifest: { name: 'rosetta-qe', description: 'QE.' },
      variants: [{ profile: 'lightweight', destinationSuffix: '', manifestNameSuffix: '', manifestDescriptionSuffix: '' }],
    },
  ],
};

function withCatalog<T>(catalog: unknown, fn: (configPath: string) => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'catalog-'));
  try {
    const p = path.join(dir, 'plugins.json');
    fs.writeFileSync(p, typeof catalog === 'string' ? catalog : JSON.stringify(catalog, null, 2));
    return fn(p);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Deep-clone VALID and apply a mutation, so each violation case starts from a passing catalog. */
function mutate(fn: (c: any) => void): any {
  const clone = JSON.parse(JSON.stringify(VALID));
  fn(clone);
  return clone;
}

describe('loadPluginCatalog — valid catalog', () => {
  it('loads sets, targets and support modules', () => {
    withCatalog(VALID, (p) => {
      const catalog = loadPluginCatalog(p);
      expect(catalog.targets).toHaveLength(7);
      expect(catalog.sets.map((s) => s.name)).toEqual(['core', 'qe']);
      expect(catalog.sets[0].bootstrap).toBe(true);
      expect(catalog.sets[1].hooks).toEqual([]);
      expect(catalog.hookSupportModules['read-once']).toEqual(['read-once-reset', 'read-once-shared']);
    });
  });

  it('defaults an omitted requires/hooks to empty arrays', () => {
    const c = mutate((x) => { delete x.sets[0].requires; delete x.sets[0].hooks; });
    withCatalog(c, (p) => {
      const set = loadPluginCatalog(p).sets[0];
      expect(set.requires).toEqual([]);
      expect(set.hooks).toEqual([]);
    });
  });
});

describe('loadPluginCatalog — every violation aborts and names the file', () => {
  // The message must name the catalog path: it is the file the user has to edit, and the failure
  // happens at pre-flight where no other context is on screen.
  const cases: Array<[string, unknown]> = [
    ['unparseable JSON', '{ not json'],
    ['a non-object root', '[]'],
    ['an unknown top-level field', mutate((c) => { c.extra = 1; })],
    ['an unknown set field', mutate((c) => { c.sets[0].extraField = 1; })],
    ['an unknown variant field', mutate((c) => { c.sets[0].variants[0].extraField = 1; })],
    ['an unknown manifest field', mutate((c) => { c.sets[0].manifest.extraField = 1; })],
    ['a duplicate set name', mutate((c) => { c.sets[1].name = 'core'; })],
    ['two variants writing the same folder', mutate((c) => {
      c.sets[0].variants.push({ ...c.sets[0].variants[0] });
    })],
    ['a requires naming an undeclared set', mutate((c) => { c.sets[1].requires = ['nope']; })],
    ['a set requiring itself', mutate((c) => { c.sets[1].requires = ['qe']; })],
    ['an unknown IDE target', mutate((c) => { c.targets.push('windsurf'); })],
    ['a duplicate target', mutate((c) => { c.targets.push('claude'); })],
    ['an empty sets array', mutate((c) => { c.sets = []; })],
    ['an empty folders array', mutate((c) => { c.sets[0].folders = []; })],
    ['an empty variants array', mutate((c) => { c.sets[0].variants = []; })],
    ['an empty releases array', mutate((c) => { c.sets[0].releases = []; })],
    ['a non-boolean bootstrap', mutate((c) => { c.sets[0].bootstrap = 'yes'; })],
    ['a non-string template', mutate((c) => { c.sets[0].template = 42; })],
    ['a set name that is not an identifier', mutate((c) => { c.sets[0].name = 'Core Set'; })],
    ['a non-object variant', mutate((c) => { c.sets[0].variants[0] = 'light'; })],
    ['a non-string profile', mutate((c) => { c.sets[0].variants[0].profile = 7; })],
  ];

  it.each(cases)('rejects %s', (_label, catalog) => {
    withCatalog(catalog, (p) => {
      let err: Error | undefined;
      try { loadPluginCatalog(p); } catch (e) { err = e as Error; }
      expect(err, 'expected the catalog to be rejected').toBeInstanceOf(PluginCatalogError);
      expect(err!.message).toContain(p);
    });
  });

  it('rejects a missing file, naming the path it looked for', () => {
    const missing = path.join(os.tmpdir(), 'definitely-absent-plugins.json');
    let err: Error | undefined;
    try { loadPluginCatalog(missing); } catch (e) { err = e as Error; }
    expect(err).toBeInstanceOf(PluginCatalogError);
    expect(err!.message).toContain(missing);
  });
});

describe('selectSets', () => {
  it('selects by release — r2 resolves to the one set built from core/', () => {
    withCatalog(VALID, (p) => {
      const catalog = loadPluginCatalog(p);
      expect(selectSets(catalog, 'r2', undefined).map((s) => s.name)).toEqual(['core']);
    });
  });

  it('with no domain, builds every set available for the release', () => {
    withCatalog(VALID, (p) => {
      const catalog = loadPluginCatalog(p);
      expect(selectSets(catalog, 'r3', undefined).map((s) => s.name)).toEqual(['core', 'qe']);
    });
  });

  it('--domain is a folder filter: a set is built only when ALL its folders are listed', () => {
    withCatalog(VALID, (p) => {
      const catalog = loadPluginCatalog(p);
      expect(selectSets(catalog, 'r3', 'qe').map((s) => s.name)).toEqual(['qe']);
      expect(selectSets(catalog, 'r3', 'core,qe').map((s) => s.name)).toEqual(['core', 'qe']);
      expect(selectSets(catalog, 'r3', 'nothing').map((s) => s.name)).toEqual([]);
    });
  });

  it('a multi-folder set is excluded unless EVERY folder it layers is listed', () => {
    const c = mutate((x) => { x.sets[1].folders = ['qe', 'shared']; });
    withCatalog(c, (p) => {
      const catalog = loadPluginCatalog(p);
      expect(selectSets(catalog, 'r3', 'qe').map((s) => s.name)).toEqual([]);
      expect(selectSets(catalog, 'r3', 'qe,shared').map((s) => s.name)).toEqual(['qe']);
    });
  });
});

describe('resolveHookModules', () => {
  it('expands support modules and de-duplicates', () => {
    withCatalog(VALID, (p) => {
      const catalog = loadPluginCatalog(p);
      expect(resolveHookModules(catalog, catalog.sets[0]))
        .toEqual(['dangerous-actions', 'read-once', 'read-once-reset', 'read-once-shared']);
    });
  });

  it('a set declaring no hooks resolves to no modules', () => {
    withCatalog(VALID, (p) => {
      const catalog = loadPluginCatalog(p);
      expect(resolveHookModules(catalog, catalog.sets[1])).toEqual([]);
    });
  });
});

describe('allDeclaredDestinations — the orphan sweep keep-list', () => {
  it('spans every release, set, variant and target, not the current selection', () => {
    withCatalog(VALID, (p) => {
      const declared = allDeclaredDestinations(loadPluginCatalog(p));
      // 2 sets x 1 variant x 7 targets — including the r2-only set, which an r3 run does not build.
      expect(declared.size).toBe(14);
      expect(declared.has('core-claude')).toBe(true);
      expect(declared.has('qe-copilot-standalone')).toBe(true);
    });
  });
});

// The whole feature in one assertion: the committed catalog must expand to exactly 49 folders.
describe('the committed plugins.json', () => {
  it('is valid and declares exactly 49 output folders', () => {
    const catalog = loadPluginCatalog(REPO_CONFIG);
    expect(allDeclaredDestinations(catalog).size).toBe(49);
  });

  it('builds 7 folders for r2 — the legacy path, whose instructions tree has only core/', () => {
    const catalog = loadPluginCatalog(REPO_CONFIG);
    const r2 = selectSets(catalog, 'r2', undefined);
    expect(r2.map((s) => s.name)).toEqual(['core']);
    expect(r2[0].folders).toEqual(['core']);
    expect(r2.length * r2[0].variants.length * catalog.targets.length).toBe(7);
  });

  it('every set declares a template and at least one variant', () => {
    for (const set of loadPluginCatalog(REPO_CONFIG).sets) {
      expect(set.template).toBeTruthy();
      expect(set.variants.length).toBeGreaterThan(0);
    }
  });
});

describe('defaultConfigPath', () => {
  it('derives from --source exactly as profileSource does', () => {
    expect(defaultConfigPath('/repo'))
      .toBe(path.join('/repo', 'src', 'rosettify-plugins', 'plugins.json'));
  });
});

// FR-CLI-0034 — --config is derived from --source, like every other source location.
describe('resolveConfigPath', () => {
  it('falls back to the default location under --source when no override is given', () => {
    expect(resolveConfigPath('/repo', undefined)).toBe(defaultConfigPath('/repo'));
  });

  it('resolves a RELATIVE --config against --source, not the process CWD', () => {
    // Regression guard: this used to resolve against the CWD, so
    // `--source <repo> --config src/rosettify-plugins/plugins.json` failed from anywhere but the
    // repo root — even though that path is exactly where the catalog lives inside --source.
    expect(resolveConfigPath('/repo', 'src/rosettify-plugins/plugins.json'))
      .toBe(path.resolve('/repo', 'src/rosettify-plugins/plugins.json'));
    expect(resolveConfigPath('/repo', 'custom/catalog.json'))
      .toBe(path.join('/repo', 'custom', 'catalog.json'));
  });

  it('leaves an ABSOLUTE --config untouched', () => {
    expect(resolveConfigPath('/repo', '/elsewhere/catalog.json')).toBe('/elsewhere/catalog.json');
  });

  it('loads a real catalog through a relative --config while the CWD is somewhere else', () => {
    // End-to-end proof of the resolution, not just the string arithmetic: the catalog sits inside
    // a fake source root, the override names it relatively, and the CWD is a different directory.
    const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-source-'));
    const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-cwd-'));
    const originalCwd = process.cwd();
    try {
      const nested = path.join(sourceRoot, 'src', 'rosettify-plugins');
      fs.mkdirSync(nested, { recursive: true });
      fs.writeFileSync(path.join(nested, 'plugins.json'), JSON.stringify(VALID));

      process.chdir(elsewhere);
      const resolved = resolveConfigPath(sourceRoot, 'src/rosettify-plugins/plugins.json');

      expect(resolved).toBe(path.join(nested, 'plugins.json'));
      expect(loadPluginCatalog(resolved).sets.map((set) => set.name)).toEqual(['core', 'qe']);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(sourceRoot, { recursive: true, force: true });
      fs.rmSync(elsewhere, { recursive: true, force: true });
    }
  });
});
