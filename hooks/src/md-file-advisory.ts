// md-file-advisory.ts — PostToolUse hook that advises AI when a .md file
// is created outside standard Rosetta documentation locations.
//
// Standard locations: docs/, agents/, plans/, refsrc/, README.md, CHANGELOG.md
// Temp dirs (agent-temp/, agents/TEMP/, .tmp/, tmp/) are silently skipped.
//
// Exports (for testability): shouldCheck, shouldAdvisory, isMarkdown, isInTempDir,
// matchesAllowedPattern, buildAdvisoryOutput, advisoryMessage

import path from 'path';
import { readStdin, normalize, formatOutput, detectIDE } from './adapter';
import { debugLog } from './debug-log';
import type { CanonicalOutput, NormalizedInput } from './types';

export const advisoryMessage = (filePath: string): string => {
  const name = path.basename(filePath);
  return `[Rosetta Advisory] ${name} is created in non-standard location, think if it is truly needed or you should have updated existing file.`;
};

const ALLOWED_PREFIXES = ['docs/', 'agents/', 'plans/', 'refsrc/'];
const ALLOWED_BASENAMES = ['README.md', 'CHANGELOG.md'];

const ALLOWED_TOOLS = new Set([
  'Write', 'Edit', 'apply_patch', 'functions.apply_patch',
  'create_file', 'replace_string_in_file', 'multi_replace_string_in_file',
]);

// ---------------------------------------------------------------------------

export const shouldCheck = (normalizedInput: NormalizedInput): boolean => {
  if (normalizedInput.hook_event_name !== 'PostToolUse') {
    debugLog('skip: not PostToolUse', { hook_event_name: normalizedInput.hook_event_name });
    return false;
  }
  if (!ALLOWED_TOOLS.has(normalizedInput.tool_name as string)) {
    debugLog('skip: tool not in ALLOWED_TOOLS', { tool_name: normalizedInput.tool_name });
    return false;
  }
  return true;
};

// ---------------------------------------------------------------------------

export const isMarkdown = (filePath: string): boolean =>
  filePath.toLowerCase().endsWith('.md');

export const isInTempDir = (normalizedPath: string): boolean => {
  const segments = normalizedPath.toLowerCase().split('/');
  return segments.some((seg) => {
    const parts = seg.split(/[-_.]/);
    return parts.some((p) => p === 'temp' || p === 'tmp');
  });
};

export const matchesAllowedPattern = (normalizedPath: string): boolean => {
  for (const prefix of ALLOWED_PREFIXES) {
    if (normalizedPath.startsWith(prefix)) return true;
  }
  const basename = path.basename(normalizedPath);
  return ALLOWED_BASENAMES.includes(basename);
};

// Strips leading slash and ./ to produce a repo-relative path for pattern matching.
const toRelative = (filePath: string): string => {
  let p = filePath.replace(/\\/g, '/');
  if (p.startsWith('/')) p = p.slice(1);
  if (p.startsWith('./')) p = p.slice(2);
  return p;
};

export const shouldAdvisory = (filePath: string): boolean => {
  if (!filePath) return false;
  const rel = toRelative(filePath);
  if (!isMarkdown(rel)) return false;
  if (isInTempDir(rel)) return false;
  if (matchesAllowedPattern(rel)) return false;
  return true;
};

export const buildAdvisoryOutput = (hookEventName: string, filePath: string): CanonicalOutput => ({
  hookSpecificOutput: {
    hookEventName,
    permissionDecision: 'allow',
    additionalContext: advisoryMessage(filePath),
  },
});

// ---------------------------------------------------------------------------

export const main = async ({
  stdin = process.stdin,
  stdout = process.stdout,
}: {
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
} = {}): Promise<void> => {
  try {
    const raw = await readStdin(stdin);
    const ide = detectIDE(raw);
    const normalized = normalize(raw);
    debugLog('md-file-advisory input', { ide, tool_name: normalized.tool_name, hook_event_name: normalized.hook_event_name });
    if (!shouldCheck(normalized)) {
      debugLog('skipped (shouldCheck=false)');
      return;
    }
    const filePath = normalized.file_path ?? '';
    if (shouldAdvisory(filePath)) {
      const canonical = buildAdvisoryOutput(normalized.hook_event_name, filePath);
      const output = formatOutput(canonical, ide);
      debugLog('md-file-advisory advisory emitted', { filePath });
      stdout.write(JSON.stringify(output));
    }
  } catch (_) {
    // Advisory-only — never block agent execution.
  }
};

if (require.main === module) {
  main().then(
    () => process.exit(0),
    (err: Error) => {
      process.stderr.write(`md-file-advisory hook error: ${err.message}\n`);
      process.exit(1);
    },
  );
}
