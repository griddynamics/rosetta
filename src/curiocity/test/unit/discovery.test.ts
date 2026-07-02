import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { discoverCases } from '../../src/cases/discovery';
import { validateCase } from '../../src/cases/validation';
import { ConfigError } from '../../src/shared/errors';

const fixtures = fileURLToPath(new URL('../fixtures/cases', import.meta.url));

describe('case discovery (§8)', () => {
  const result = discoverCases(fixtures);

  it('finds the valid case with its parsed config', () => {
    expect(result.valid.map((c) => c.name)).toEqual(['hello-world']);
    const hw = result.valid[0]!;
    expect(hw.config.agents).toEqual(['claude-code', 'codex']);
    expect(hw.config.repeats).toBe(2);
    expect(hw.ephemeral).toBe(false);
    expect(hw.prompt).toContain('hello world');
    expect(hw.srcZipPath).toMatch(/src\.zip$/);
  });

  it('skips incomplete cases with a missing-files reason', () => {
    const inc = result.skipped.find((s) => s.name === 'incomplete');
    expect(inc?.reason).toContain('missing files:');
    expect(inc?.reason).toContain('qna.md');
    expect(inc?.reason).toContain('src.zip');
  });

  it('skips cases whose config.json fails validation, with a reason', () => {
    const broken = result.skipped.find((s) => s.name === 'broken-config');
    expect(broken?.reason).toContain('invalid config.json');
    expect(broken?.reason).toContain('agents');
  });

  it('throws ConfigError on a missing source folder', () => {
    expect(() => discoverCases('/no/such/dir/curiocity')).toThrow(ConfigError);
  });
});

describe('validateCase', () => {
  it('reports invalid JSON distinctly from schema failure', () => {
    // The broken-config fixture is valid JSON but invalid schema.
    const res = validateCase(`${fixtures}/broken-config`, 'broken-config');
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toContain('invalid config.json');
  });
});
