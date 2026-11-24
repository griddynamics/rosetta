/**
 * E2E: customization roots merged into the main instruction source (FR-CUST-0001, FR-ARCH-0024.AC2).
 * Fixtures: tests/fixtures/cust-instructions (main), tests/fixtures/customizations/{acme,team}.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generate } from '../../src/index.js';
import {
  buildCustRepo, buildCustSources, captureStderr, copyDirSync, CUSTOMIZATIONS_DIR, listFilesRecursive,
  write,
} from '../helpers/cust-repo.js';

const PUBLISH = ['rosetta', 'rosetta-light'];
const STANDARD = ['rosetta-claude', 'rosetta-codex'];
const LIGHT = ['rosetta-claude-light', 'rosetta-codex-light'];
// Codex restructures workflows into skills and agents into TOML; claude keeps `coding-flow.md` /
// `architect.md` verbatim, so file-content assertions on those use the claude plugins.
const CLAUDE_STD = ['rosetta-claude'];
const CLAUDE_LIGHT = ['rosetta-claude-light'];

function find(outDir: string, dest: string, suffix: string): string[] {
  const root = path.join(outDir, dest);
  return listFilesRecursive(root).filter((f) => f.split(path.sep).join('/').endsWith(suffix));
}
function read1(outDir: string, dest: string, suffix: string): string {
  const hits = find(outDir, dest, suffix);
  expect(hits, `${dest}: expected exactly one *${suffix}`).toHaveLength(1);
  return fs.readFileSync(hits[0], 'utf-8');
}

let repo: string;
let roots: string;
let outAcmeTeam: string;
let outTeamAcme: string;
let outFive: string;
const codes: Record<string, number> = {};

describe('customizations E2E (FR-CUST-0001)', () => {
  beforeAll(async () => {
    repo = buildCustRepo();
    roots = path.join(repo, 'roots');
    for (const r of ['acme', 'team']) copyDirSync(path.join(CUSTOMIZATIONS_DIR, r), path.join(roots, r));
    const run = async (name: string, customizations: string[]): Promise<string> => {
      const out = path.join(repo, `out-${name}`);
      codes[name] = await generate({
        sources: buildCustSources(repo, out), release: 'r3', dryRun: false, verbose: false,
        customizations, publish: PUBLISH,
      });
      return out;
    };
    outAcmeTeam = await run('acme-team', [path.join(roots, 'acme'), path.join(roots, 'team')]);
    outTeamAcme = await run('team-acme', [path.join(roots, 'team'), path.join(roots, 'acme')]);

    // FR-ARCH-0024.AC2: five contributions: 1 main, 2 cust1 overwrite, 3 cust2, 4 cust3 light-only overwrite, 5 cust4
    const wf = (body: string) => `---\nname: coding-flow\ndescription: x\ntags: ["workflow"]\n---\n\n${body}\n`;
    const c = (n: number, file: string, body: string) =>
      write(path.join(roots, `cust${n}`, 'r3', 'core', 'workflows', file), wf(body));
    c(1, 'coding-flow~overwrite~.md', 'C2-OVERWRITE');
    c(2, 'coding-flow.md', 'C3-APPEND');
    c(3, 'coding-flow~profile-lightweight-only~overwrite~.md', 'C4-LIGHT-OVERWRITE');
    c(4, 'coding-flow.md', 'C5-APPEND');
    outFive = await run('five', [1, 2, 3, 4].map((n) => path.join(roots, `cust${n}`)));
  }, 60000);

  afterAll(() => {
    if (repo) fs.rmSync(repo, { recursive: true, force: true });
  });

  it('runs exit 0 and writes only the published plugins', () => {
    expect(codes['acme-team']).toBe(0);
    expect(fs.readdirSync(outAcmeTeam).sort()).toEqual([...STANDARD, ...LIGHT].sort());
  });

  it('FR-CUST-0001.AC1: a skill only the customization holds ships as a new skill in every rosetta-* plugin', () => {
    for (const d of [...STANDARD, ...LIGHT]) {
      expect(read1(outAcmeTeam, d, 'skills/acme-deploy/SKILL.md')).toContain('ACME-DEPLOY-BODY');
    }
  });

  it('FR-CUST-0001.AC2: a customization file lands in the existing skill references/ next to the main files', () => {
    for (const d of STANDARD) {
      const refs = find(outAcmeTeam, d, 'skills/demo/references/acme-rules.md');
      expect(refs, d).toHaveLength(1);
      expect(fs.existsSync(path.join(path.dirname(path.dirname(refs[0])), 'SKILL.md')), `${d}: demo/SKILL.md next to references/`).toBe(true);
      expect(fs.readFileSync(refs[0], 'utf-8')).toContain('ACME-RULES-REFERENCE');
    }
  });

  it('FR-CUST-0001.AC3: workflow keeps the main frontmatter and appends the customization body', () => {
    for (const d of CLAUDE_STD) {
      const text = read1(outAcmeTeam, d, 'coding-flow.md');
      expect(text).toContain('Main coding workflow');
      expect(text).not.toContain('description: ACME');
      expect(text).not.toMatch(/description:\s*"?TEAM/);
      expect(text).toContain('MAIN-BODY');
      expect(text.indexOf('MAIN-BODY')).toBeLessThan(text.indexOf('## ACME rules'));
    }
  });

  it('FR-CUST-0001.AC4: a profile-lightweight-only contribution reaches the -light plugins only', () => {
    for (const d of CLAUDE_LIGHT) expect(read1(outAcmeTeam, d, 'coding-flow.md')).toContain('## ACME LIGHT rules');
    for (const d of CLAUDE_STD) expect(read1(outAcmeTeam, d, 'coding-flow.md')).not.toContain('ACME LIGHT');
  });

  it('FR-ARCH-0026: contributions follow --customizations order (acme,team vs team,acme)', () => {
    const ab = read1(outAcmeTeam, 'rosetta-claude', 'coding-flow.md');
    expect(ab.indexOf('## ACME rules')).toBeLessThan(ab.indexOf('## TEAM rules'));
    expect(codes['team-acme']).toBe(0);
    const ba = read1(outTeamAcme, 'rosetta-claude', 'coding-flow.md');
    expect(ba.indexOf('## TEAM rules')).toBeLessThan(ba.indexOf('## ACME rules'));
  });

  it('FR-ARCH-0024.AC2: standard ships 2,3,5; light ships 4,5 (profile-scoped last overwrite wins)', () => {
    expect(codes['five']).toBe(0);
    for (const d of CLAUDE_STD) {
      const t = read1(outFive, d, 'coding-flow.md');
      expect(t).not.toContain('MAIN-BODY');
      expect(t).not.toContain('C4-LIGHT-OVERWRITE');
      const [i2, i3, i5] = ['C2-OVERWRITE', 'C3-APPEND', 'C5-APPEND'].map((m) => t.indexOf(m));
      expect(i2).toBeGreaterThanOrEqual(0);
      expect(i2).toBeLessThan(i3);
      expect(i3).toBeLessThan(i5);
    }
    for (const d of CLAUDE_LIGHT) {
      const t = read1(outFive, d, 'coding-flow.md');
      expect(t).not.toContain('MAIN-BODY');
      expect(t).not.toContain('C2-OVERWRITE');
      expect(t).not.toContain('C3-APPEND');
      const [i4, i5] = ['C4-LIGHT-OVERWRITE', 'C5-APPEND'].map((m) => t.indexOf(m));
      expect(i4).toBeGreaterThanOrEqual(0);
      expect(i4).toBeLessThan(i5);
    }
  });

  it('FR-ARCH-0024.AC5: main standard architect vs light overwrite, no error', () => {
    for (const d of CLAUDE_STD) expect(read1(outAcmeTeam, d, 'architect.md')).toContain('STANDARD-ARCHITECT');
    for (const d of CLAUDE_LIGHT) {
      const t = read1(outAcmeTeam, d, 'architect.md');
      expect(t).toContain('LIGHT-ARCHITECT');
      expect(t).not.toContain('STANDARD-ARCHITECT');
    }
  });
});

// A `.js` file is binary to the generator (copied verbatim, never appended). Overwrite and -only
// filtering still apply to it; only more than one REMAINING source is an error (FR-ARCH-0042).
describe('customizations E2E: binary file overwrite (FR-ARCH-0024, FR-ARCH-0042)', () => {
  const TOOL = 'skills/demo/scripts/tool.js';
  // CRLF on purpose: a binary file is copied byte for byte, with no LF normalization.
  const MAIN = '// MAIN tool\r\n';
  const ACME = '// ACME tool\r\n';
  const CLAUDE = ['rosetta-claude', 'rosetta-claude-light'];
  const CODEX = ['rosetta-codex', 'rosetta-codex-light'];
  let binRepo: string;

  const run = async (name: string, file: string) => {
    const root = path.join(binRepo, 'roots', name);
    write(path.join(root, 'r3', 'core', path.dirname(TOOL), file), ACME);
    const out = path.join(binRepo, `out-${name}`);
    const { result: code, stderr } = await captureStderr(() => generate({
      sources: buildCustSources(binRepo, out), release: 'r3', dryRun: false, verbose: false,
      customizations: [root], publish: PUBLISH,
    }));
    return { code, out, stderr };
  };
  const shipped = (outDir: string, dest: string): string => {
    const hits = find(outDir, dest, TOOL);
    expect(hits, `${dest}: expected exactly one *${TOOL}`).toHaveLength(1);
    return fs.readFileSync(hits[0]).toString('latin1');
  };

  beforeAll(() => {
    binRepo = buildCustRepo();
    write(path.join(binRepo, 'instructions', 'r3', 'core', TOOL), MAIN);
  });

  afterAll(() => {
    if (binRepo) fs.rmSync(binRepo, { recursive: true, force: true });
  });

  it('FR-ARCH-0024: `tool~overwrite~.js` replaces the main file in every plugin, exit 0', async () => {
    const { code, out, stderr } = await run('overwrite', 'tool~overwrite~.js');
    expect(stderr).not.toContain('[hard]');
    expect(code).toBe(0);
    for (const d of [...CLAUDE, ...CODEX]) expect(shipped(out, d), d).toBe(ACME);
  });

  it('FR-ARCH-0024: `tool~ide-claude-only~overwrite~.js` replaces it in claude plugins only', async () => {
    const { code, out, stderr } = await run('scoped', 'tool~ide-claude-only~overwrite~.js');
    expect(stderr).not.toContain('[hard]');
    expect(code).toBe(0);
    for (const d of CLAUDE) expect(shipped(out, d), d).toBe(ACME);
    for (const d of CODEX) expect(shipped(out, d), d).toBe(MAIN);
  });

  it('FR-ARCH-0042: a second `tool.js` with no overwrite is a hard error naming the file, exit 1', async () => {
    const { code, stderr } = await run('append', 'tool.js');
    expect(code).toBe(1);
    expect(stderr).toContain(`Binary file ${TOOL} has 2 sources`);
  });
});
