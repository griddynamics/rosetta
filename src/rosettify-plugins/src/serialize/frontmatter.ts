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

/**
 * Reduce YAML frontmatter to EXACTLY `name` + `description`, dropping every other field
 * (model, mode, readonly, baseSchema, tags, and any others). The body is left unchanged.
 * Preserves the original raw `name:`/`description:` line text (including quoting) rather than
 * re-serializing, matching the layout-preserving style of rewriteModelLine/removeModelLine.
 * No frontmatter, or frontmatter already exactly name+description → content unchanged (idempotent).
 * FR-COPY-0081 (Antigravity-only; the caller gates which files pass through this function).
 */
export function reduceFrontmatterToNameDescription(content: string): string {
  // Strict guard aligned with the anchored regex below: both require `---` at absolute start.
  if (!content.startsWith('---')) return content;

  const fmMatch = content.match(/^(---\n)([\s\S]*?)(\n---)([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, openDelim, yamlBody, closeDelim, rest] = fmMatch;

  const nameLine = yamlBody.match(/^name:\s*.*$/m)?.[0];
  const descriptionLine = yamlBody.match(/^description:\s*.*$/m)?.[0];

  // The single-line capture above would silently truncate a YAML block scalar (`name: |` / `>`),
  // dropping its continuation lines. Fail loud instead — agent/skill name+description are
  // single-line by contract; a block scalar here is an authoring error worth surfacing.
  for (const [key, line] of [['name', nameLine], ['description', descriptionLine]] as const) {
    if (line && /:\s*[|>][+\-0-9]*\s*$/.test(line)) {
      throw new Error(
        `reduceFrontmatterToNameDescription: block-scalar '${key}:' is unsupported (would truncate); use a single-line value.`,
      );
    }
  }

  const keptLines = [nameLine, descriptionLine].filter((l): l is string => l !== undefined);
  const newYaml = keptLines.join('\n');

  if (newYaml === yamlBody) return content; // already exactly name+description: no-op (idempotent)
  return openDelim + newYaml + closeDelim + rest;
}
