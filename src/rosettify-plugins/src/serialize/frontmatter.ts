// FR-ARCH-0040 — gray-matter frontmatter read + model-line rewrite preserving layout

import matter from 'gray-matter';
import type { Frontmatter } from '../types.js';

export interface ParsedContent {
  frontmatter: Frontmatter | undefined;
  body: string; // content after frontmatter (may start with \n)
  raw: string;  // original raw content
}

/**
 * Parse frontmatter from a markdown file using gray-matter.
 * No frontmatter → body = full content, frontmatter = undefined.
 * FR-ARCH-0040
 */
export function parseFrontmatter(content: string): ParsedContent {
  try {
    const result = matter(content);
    const hasFrontmatter = content.trimStart().startsWith('---');

    if (!hasFrontmatter) {
      return { frontmatter: undefined, body: content, raw: content };
    }

    return {
      frontmatter: result.data as Frontmatter,
      body: result.content,
      raw: content,
    };
  } catch {
    // Malformed frontmatter — return body as full content
    return { frontmatter: undefined, body: content, raw: content };
  }
}

/**
 * Rewrite the model: line ONLY within YAML frontmatter.
 * Preserves all other lines. If no model line in frontmatter, content is unchanged.
 */
export function rewriteModelLine(content: string, newModelValue: string): string {
  if (!content.trimStart().startsWith('---')) return content;

  // Split into frontmatter section and rest
  const fmMatch = content.match(/^(---\n[\s\S]*?\n---)([\s\S]*)$/);
  if (!fmMatch) return content;

  const fmSection = fmMatch[1];
  const rest = fmMatch[2];

  // Replace model: line ONLY in frontmatter
  const newFm = fmSection.replace(
    /^(model:\s*)(.+)$/m,
    `$1${newModelValue}`,
  );

  return newFm + rest;
}

/**
 * Strip frontmatter from content, returning only the body.
 * Used for bootstrap payload construction (FR-HOOK-0002).
 * The body starts with a newline if frontmatter was present.
 */
export function stripFrontmatter(content: string): string {
  const parsed = parseFrontmatter(content);
  return parsed.body;
}
