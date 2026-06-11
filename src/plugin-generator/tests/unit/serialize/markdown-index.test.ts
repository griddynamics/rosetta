// GT-5, PARITY-2 — INDEX.md format: heading, entries, title-case fallback
import { describe, it, expect } from 'vitest';
import { emitMarkdownIndex, titleCaseStem, resolveDescription } from '../../../src/serialize/markdown-index.js';

describe('emitMarkdownIndex', () => {
  it('produces correct GT-5 format for rules', () => {
    const result = emitMarkdownIndex('rules', [
      { targetPath: 'rules/bootstrap-core.md', description: 'Core bootstrap' },
    ]);
    expect(result).toBe(
      '# Rosetta Rules Index\n\nAll paths are relative to Rosetta Plugin Path.\n\n- `rules/bootstrap-core.md`: Core bootstrap\n'
    );
  });

  it('uses Workflows heading for workflows/commands/prompts', () => {
    const result = emitMarkdownIndex('workflows', [
      { targetPath: 'workflows/coding-flow.md', description: 'Coding Flow' },
    ]);
    expect(result).toContain('# Rosetta Workflows Index');
  });

  it('returns empty string when zero entries (FR-GEN-0001)', () => {
    expect(emitMarkdownIndex('rules', [])).toBe('');
  });

  it('includes all entries sorted as provided', () => {
    const entries = [
      { targetPath: 'rules/a.md', description: 'A' },
      { targetPath: 'rules/b.md', description: 'B' },
      { targetPath: 'rules/c.md', description: 'C' },
    ];
    const result = emitMarkdownIndex('rules', entries);
    const lines = result.split('\n').filter((l) => l.startsWith('- '));
    expect(lines[0]).toContain('rules/a.md');
    expect(lines[1]).toContain('rules/b.md');
    expect(lines[2]).toContain('rules/c.md');
  });

  it('ends with trailing newline', () => {
    const result = emitMarkdownIndex('rules', [{ targetPath: 'rules/x.md', description: 'X' }]);
    expect(result.endsWith('\n')).toBe(true);
  });

  it('uses backtick-path colon-space description format', () => {
    const result = emitMarkdownIndex('rules', [{ targetPath: 'rules/x.md', description: 'My Desc' }]);
    expect(result).toContain('- `rules/x.md`: My Desc');
  });

  it('uses forward slashes in paths', () => {
    const result = emitMarkdownIndex('rules', [{ targetPath: 'rules\\x.md', description: 'X' }]);
    expect(result).toContain('rules/x.md');
  });
});

describe('titleCaseStem', () => {
  it('converts hyphenated stem to title case', () => {
    expect(titleCaseStem('coding-flow')).toBe('Coding Flow');
  });

  it('converts underscore-separated stem to title case', () => {
    expect(titleCaseStem('my_workflow')).toBe('My Workflow');
  });

  it('handles single word', () => {
    expect(titleCaseStem('bootstrap')).toBe('Bootstrap');
  });

  it('handles empty string', () => {
    expect(titleCaseStem('')).toBe('');
  });
});

describe('resolveDescription', () => {
  it('returns provided description when available', () => {
    expect(resolveDescription('My description', 'rules/test.md')).toBe('My description');
  });

  it('falls back to title-cased stem when description undefined', () => {
    expect(resolveDescription(undefined, 'rules/coding-flow.md')).toBe('Coding Flow');
  });

  it('uses first line of multi-line description', () => {
    expect(resolveDescription('First line\nSecond line', 'rules/x.md')).toBe('First line');
  });

  it('extracts raw YAML description when rawContent provided (preserves quotes)', () => {
    const rawContent = '---\nname: test\ndescription: "My quoted description"\n---\n\n# Body\n';
    const result = resolveDescription('My quoted description', 'rules/test.md', rawContent);
    // Raw extraction preserves surrounding quotes
    expect(result).toBe('"My quoted description"');
  });

  it('falls back to parsed description when rawContent has no description field', () => {
    const rawContent = '---\nname: test\n---\n\n# Body\n';
    const result = resolveDescription('Parsed desc', 'rules/test.md', rawContent);
    // extractRawYamlDescription returns null → fallback to parsed
    expect(result).toBe('Parsed desc');
  });

  it('falls back to parsed when rawContent has no frontmatter', () => {
    const rawContent = '# No frontmatter here\n';
    const result = resolveDescription('Parsed', 'rules/test.md', rawContent);
    expect(result).toBe('Parsed');
  });
});
