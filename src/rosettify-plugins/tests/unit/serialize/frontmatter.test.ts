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

  it('returns body=content and frontmatter=undefined when YAML is malformed and gray-matter throws (line 33 catch)', () => {
    // gray-matter throws a YAML parse error on truly invalid YAML syntax inside the --- block.
    // parseFrontmatter must catch it and return body=full content, frontmatter=undefined (FR-ARCH-0040).
    // Malformed YAML: unclosed flow mapping inside frontmatter triggers a throw in gray-matter.
    const malformed = '---\nkey: {broken: yaml: [\n---\n\n# Body after bad frontmatter\n';
    const result = parseFrontmatter(malformed);
    expect(result.frontmatter).toBeUndefined();
    // body and raw must both be the full original content (graceful degradation)
    expect(result.body).toBe(malformed);
    expect(result.raw).toBe(malformed);
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

  it('returns content unchanged when content starts with --- but regex does not match full frontmatter block (line 46)', () => {
    // Content starts with --- so the first guard passes, but the `^(---\n[\s\S]*?\n---)([\s\S]*)$`
    // regex fails to match (e.g. single --- line, no closing ---).
    // The `if (!fmMatch) return content` branch at line 46 must be taken.
    const content = '---\n'; // starts with --- but has no closing --- delimiter
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
