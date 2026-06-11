// FR-ARCH-0040 — frontmatter parse, model-line rewrite, strip
import { describe, it, expect } from 'vitest';
import { parseFrontmatter, rewriteModelLine, stripFrontmatter } from '../../../src/serialize/frontmatter.js';

describe('parseFrontmatter', () => {
  it('parses YAML frontmatter and body', () => {
    const content = '---\nname: test\ndescription: A test\n---\n\n# Body\n';
    const result = parseFrontmatter(content);
    expect(result.frontmatter?.name).toBe('test');
    expect(result.frontmatter?.description).toBe('A test');
    expect(result.body).toContain('# Body');
  });

  it('returns undefined frontmatter for content without ---', () => {
    const result = parseFrontmatter('# No frontmatter\n');
    expect(result.frontmatter).toBeUndefined();
    expect(result.body).toContain('No frontmatter');
  });

  it('returns undefined frontmatter for malformed (graceful)', () => {
    // gray-matter handles most cases gracefully; testing empty/minimal
    const result = parseFrontmatter('just plain text');
    expect(result.frontmatter).toBeUndefined();
  });

  it('parses tags array from frontmatter', () => {
    const content = '---\ntags: ["workflow"]\n---\n\n# Body\n';
    const result = parseFrontmatter(content);
    expect(result.frontmatter?.tags).toEqual(['workflow']);
  });
});

describe('rewriteModelLine', () => {
  it('rewrites model value in frontmatter', () => {
    const content = '---\nname: test\nmodel: claude-4.8-opus-high\n---\n\n# Body\n';
    const result = rewriteModelLine(content, 'opus');
    expect(result).toContain('model: opus');
    expect(result).not.toContain('model: claude-4.8-opus-high');
  });

  it('preserves all other frontmatter lines', () => {
    const content = '---\nname: test\nmodel: old\ndescription: desc\n---\n\n# Body\n';
    const result = rewriteModelLine(content, 'new-model');
    expect(result).toContain('name: test');
    expect(result).toContain('description: desc');
  });

  it('preserves body unchanged', () => {
    const content = '---\nmodel: old\n---\n\n# Body content here\n';
    const result = rewriteModelLine(content, 'new');
    expect(result).toContain('# Body content here');
  });

  it('returns content unchanged when no frontmatter', () => {
    const content = '# No frontmatter\n';
    expect(rewriteModelLine(content, 'new')).toBe(content);
  });
});

describe('stripFrontmatter', () => {
  it('returns body without frontmatter', () => {
    const content = '---\nname: test\n---\n\n# Body here\n';
    const result = stripFrontmatter(content);
    expect(result).toContain('# Body here');
    expect(result).not.toContain('name: test');
  });

  it('returns full content when no frontmatter', () => {
    const content = '# Just content\n';
    expect(stripFrontmatter(content)).toBe(content);
  });
});
