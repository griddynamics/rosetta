// NFR-0001, GT-5, FR-GEN-0001-0004, PARITY-2 — byte-exact INDEX.md emitter

import path from 'path';

export interface IndexEntry {
  targetPath: string;     // final post-rename plugin-relative path (e.g. "rules/bootstrap-core-policy.md")
  description: string;    // frontmatter description or title-cased stem (FR-GEN-0002)
}

/**
 * Emit an INDEX.md file body.
 * GT-5 format:
 * # Rosetta {Rules|Workflows} Index\n
 * \n
 * All paths are relative to Rosetta Plugin Path.\n
 * \n
 * - `folder/file.ext`: description\n
 * ...
 */
export function emitMarkdownIndex(
  heading: 'rules' | 'workflows',
  entries: IndexEntry[],
): string {
  if (entries.length === 0) return ''; // FR-GEN-0001: no index when zero members

  const headingText = heading === 'rules'
    ? '# Rosetta Rules Index'
    : '# Rosetta Workflows Index'; // FR-GEN-0004: alias for workflows|commands|prompts

  const lines: string[] = [
    headingText,
    '',
    'All paths are relative to Rosetta Plugin Path.',
    '',
  ];

  for (const entry of entries) {
    // Use forward slashes always (NFR encoding)
    const entryPath = entry.targetPath.replace(/\\/g, '/');
    lines.push(`- \`${entryPath}\`: ${entry.description}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Title-case a filename stem (FR-GEN-0002 fallback when no description frontmatter).
 * Converts "coding-flow" → "Coding Flow"
 */
export function titleCaseStem(stem: string): string {
  return stem
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get the description from frontmatter or fall back to title-cased stem.
 * FR-GEN-0002
 * PARITY: when the YAML description is double-quoted, preserve those outer quotes
 * (the Python generator reads raw YAML string including surrounding quotes).
 */
export function resolveDescription(
  description: string | undefined,
  filePath: string,
  rawContent?: string,
): string {
  if (description && typeof description === 'string') {
    // Try to get the raw YAML value (including surrounding quotes if any)
    if (rawContent) {
      const rawDesc = extractRawYamlDescription(rawContent);
      if (rawDesc !== null) {
        // Use first line only
        return rawDesc.split('\n')[0].trim();
      }
    }
    // Fallback: use first line of parsed value
    const firstLine = description.split('\n')[0].trim();
    return firstLine;
  }
  const stem = path.basename(filePath, path.extname(filePath));
  return titleCaseStem(stem);
}

/**
 * Extract the raw description value from YAML frontmatter, preserving surrounding quotes.
 * Returns null if not found or no frontmatter.
 */
function extractRawYamlDescription(content: string): string | null {
  if (!content.trimStart().startsWith('---')) return null;

  const parts = content.split('---');
  if (parts.length < 3) return null;

  const yamlSection = parts[1];

  // Match: description: "..." or description: '...' or description: text
  // Preserve the raw value including surrounding quotes
  const match = yamlSection.match(/^description:\s*(.+)$/m);
  if (!match) return null;

  return match[1].trim();
}
