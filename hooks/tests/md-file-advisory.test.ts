// md-file-advisory.test.ts — TDD test suite for md-file-advisory.ts

import { test, describe, expect } from 'vitest';
import { Readable, Writable } from 'stream';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import ccBash from './fixtures/claude-code-pre-tool-use-bash.json';
import cursorWrite from './fixtures/cursor-post-tool-use-write.json';

import {
  isMarkdown,
  isInTempDir,
  matchesAllowedPattern,
  shouldAdvisory,
  shouldCheck,
  buildAdvisoryOutput,
  advisoryMessage,
  main,
} from '../src/md-file-advisory';
import { normalize } from '../src/adapter';

// ---------------------------------------------------------------------------
// Helper: run main() with an in-memory payload; returns stdout string.
// ---------------------------------------------------------------------------
async function runHook(payload: unknown): Promise<string> {
  let output = '';
  const stdin = Readable.from([JSON.stringify(payload)]);
  const stdout = new Writable({
    write(chunk, _enc, cb) {
      output += String(chunk);
      cb();
    },
  });
  await main({ stdin, stdout });
  return output;
}

const expectedClaude = (filePath: string) => JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    permissionDecision: 'allow',
    additionalContext: advisoryMessage(filePath),
  },
});

const expectedCursor = (filePath: string) => JSON.stringify({
  additional_context: advisoryMessage(filePath),
  permission: 'allow',
});

// ===========================================================================
// Unit tests — pure functions
// ===========================================================================

describe('shouldCheck — event + tool filter', () => {
  test('PostToolUse + Write → true', () => {
    expect(shouldCheck(normalize(ccWrite))).toBe(true);
  });

  test('PostToolUse + Edit → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'Edit' }))).toBe(true);
  });

  test('PostToolUse + apply_patch → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'apply_patch' }))).toBe(true);
  });

  test('PostToolUse + functions.apply_patch → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'functions.apply_patch' }))).toBe(true);
  });

  test('PostToolUse + create_file → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'create_file' }))).toBe(true);
  });

  test('PostToolUse + replace_string_in_file → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'replace_string_in_file' }))).toBe(true);
  });

  test('PostToolUse + multi_replace_string_in_file → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'multi_replace_string_in_file' }))).toBe(true);
  });

  test('PostToolUse + Read → false', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'Read' }))).toBe(false);
  });

  test('PostToolUse + Bash → false', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'Bash' }))).toBe(false);
  });

  test('PostToolUse + Search → false', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'Search' }))).toBe(false);
  });

  test('PreToolUse + Write → false (wrong event)', () => {
    expect(shouldCheck(normalize({ ...ccWrite, hook_event_name: 'PreToolUse' }))).toBe(false);
  });

  test('PreToolUse + Bash → false (wrong event + wrong tool)', () => {
    expect(shouldCheck(normalize(ccBash))).toBe(false);
  });
});

describe('isMarkdown', () => {
  test('detects .md extension', () => expect(isMarkdown('file.md')).toBe(true));
  test('detects .MD extension (case-insensitive)', () => expect(isMarkdown('FILE.MD')).toBe(true));
  test('rejects .js', () => expect(isMarkdown('file.js')).toBe(false));
  test('rejects .mdx', () => expect(isMarkdown('file.mdx')).toBe(false));
  test('rejects .md.bak', () => expect(isMarkdown('file.md.bak')).toBe(false));
});

describe('isInTempDir', () => {
  test('detects agent-temp/', () => expect(isInTempDir('agent-temp/draft.md')).toBe(true));
  test('detects agents/TEMP/', () => expect(isInTempDir('agents/TEMP/draft.md')).toBe(true));
  test('detects .tmp/', () => expect(isInTempDir('.tmp/notes.md')).toBe(true));
  test('detects nested tmp/', () => expect(isInTempDir('build/tmp/out.md')).toBe(true));
  test('detects Temp (mixed case)', () => expect(isInTempDir('Temp/foo.md')).toBe(true));
  test('rejects normal path', () => expect(isInTempDir('docs/CONTEXT.md')).toBe(false));
  test('rejects template/ (not a temp dir)', () => expect(isInTempDir('template/foo.md')).toBe(false));
});

describe('matchesAllowedPattern', () => {
  test('allows docs/**', () => expect(matchesAllowedPattern('docs/CONTEXT.md')).toBe(true));
  test('allows nested docs/', () => expect(matchesAllowedPattern('docs/REQUIREMENTS/INDEX.md')).toBe(true));
  test('allows agents/**', () => expect(matchesAllowedPattern('agents/IMPLEMENTATION.md')).toBe(true));
  test('allows plans/**', () => expect(matchesAllowedPattern('plans/feature/feature-PLAN.md')).toBe(true));
  test('allows refsrc/**', () => expect(matchesAllowedPattern('refsrc/INDEX.md')).toBe(true));
  test('allows README.md at root', () => expect(matchesAllowedPattern('README.md')).toBe(true));
  test('allows nested README.md', () => expect(matchesAllowedPattern('packages/web/README.md')).toBe(true));
  test('allows CHANGELOG.md', () => expect(matchesAllowedPattern('CHANGELOG.md')).toBe(true));
  test('rejects src/notes.md', () => expect(matchesAllowedPattern('src/notes.md')).toBe(false));
  test('rejects root-level random.md', () => expect(matchesAllowedPattern('random.md')).toBe(false));
});

describe('shouldAdvisory', () => {
  test('returns true for non-standard .md', () => expect(shouldAdvisory('src/notes.md')).toBe(true));
  test('returns true for root-level random.md', () => expect(shouldAdvisory('random-doc.md')).toBe(true));
  test('returns true for absolute path outside allowed', () => expect(shouldAdvisory('/proj/src/notes.md')).toBe(true));
  test('returns false for docs/ .md', () => expect(shouldAdvisory('docs/CONTEXT.md')).toBe(false));
  test('returns false for agents/ .md', () => expect(shouldAdvisory('agents/MEMORY.md')).toBe(false));
  test('returns false for plans/ .md', () => expect(shouldAdvisory('plans/feat/feat-PLAN.md')).toBe(false));
  test('returns false for README.md', () => expect(shouldAdvisory('some/nested/README.md')).toBe(false));
  test('returns false for CHANGELOG.md', () => expect(shouldAdvisory('CHANGELOG.md')).toBe(false));
  test('returns false for temp dirs', () => {
    expect(shouldAdvisory('agent-temp/scratch.md')).toBe(false);
    expect(shouldAdvisory('agents/TEMP/scratch.md')).toBe(false);
    expect(shouldAdvisory('.tmp/draft.md')).toBe(false);
  });
  test('returns false for non-.md files', () => {
    expect(shouldAdvisory('src/index.js')).toBe(false);
    expect(shouldAdvisory('docs/data.json')).toBe(false);
  });
  test('returns false for empty path', () => expect(shouldAdvisory('')).toBe(false));
});

describe('advisoryMessage', () => {
  test('includes basename without path', () => {
    expect(advisoryMessage('/proj/src/notes.md')).toContain('notes.md');
    expect(advisoryMessage('/proj/src/notes.md')).not.toContain('/proj/src/');
  });

  test('includes [Rosetta Advisory] prefix', () => {
    expect(advisoryMessage('notes.md')).toMatch(/^\[Rosetta Advisory\]/);
  });

  test('mentions non-standard location', () => {
    expect(advisoryMessage('notes.md')).toContain('non-standard location');
  });
});

describe('buildAdvisoryOutput', () => {
  test('returns canonical CanonicalOutput with allow + dynamic message', () => {
    const out = buildAdvisoryOutput('PreToolUse', '/proj/notes.md');
    expect(out.hookSpecificOutput?.hookEventName).toBe('PreToolUse');
    expect(out.hookSpecificOutput?.permissionDecision).toBe('allow');
    expect(out.hookSpecificOutput?.additionalContext).toBe(advisoryMessage('/proj/notes.md'));
  });

  test('preserves provided hookEventName', () => {
    const out = buildAdvisoryOutput('PostToolUse', 'src/draft.md');
    expect(out.hookSpecificOutput?.hookEventName).toBe('PostToolUse');
  });

  test('message includes file basename', () => {
    const out = buildAdvisoryOutput('PostToolUse', '/deep/path/report.md');
    expect(out.hookSpecificOutput?.additionalContext).toContain('report.md');
    expect(out.hookSpecificOutput?.additionalContext).not.toContain('/deep/path/');
  });
});

// ===========================================================================
// Integration tests — main() with injectable streams
// ===========================================================================

describe('main() — Claude Code format (integration)', () => {
  test('emits advisory for non-standard .md', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'src/notes.md' } };
    expect(await runHook(payload)).toBe(expectedClaude('src/notes.md'));
  });

  test('output is valid JSON with correct structure', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'lib/draft.md' } };
    const parsed = JSON.parse(await runHook(payload));
    expect(parsed.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(parsed.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('draft.md');
  });

  test('silent for docs/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'docs/CONTEXT.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for agents/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'agents/MEMORY.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for plans/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'plans/auth/auth-PLAN.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for README.md', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'packages/core/README.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for CHANGELOG.md', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'CHANGELOG.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for agent-temp/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'agent-temp/foo.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for agents/TEMP/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'agents/TEMP/bar.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for .tmp/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: '.tmp/draft.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for non-.md file', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'src/index.js' } };
    expect(await runHook(payload)).toBe('');
  });
});

describe('main() — tool filter (integration)', () => {
  test('silent for Read tool with non-standard .md path', async () => {
    const payload = { ...ccWrite, tool_name: 'Read', tool_input: { file_path: 'src/notes.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for Bash tool with .md in command', async () => {
    const payload = { ...ccWrite, tool_name: 'Bash', tool_input: { command: 'cat src/notes.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for Search tool referencing .md file', async () => {
    const payload = { ...ccWrite, tool_name: 'Search', tool_input: { query: 'notes.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for PreToolUse event even with Write tool', async () => {
    const payload = { ...ccWrite, hook_event_name: 'PreToolUse', tool_input: { file_path: 'src/notes.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('emits advisory for Edit tool with non-standard .md', async () => {
    const payload = { ...ccWrite, tool_name: 'Edit', tool_input: { file_path: 'src/notes.md' } };
    expect(await runHook(payload)).toBe(expectedClaude('src/notes.md'));
  });

  test('emits advisory for create_file tool with non-standard .md', async () => {
    const payload = { ...ccWrite, tool_name: 'create_file', tool_input: { file_path: 'src/notes.md', content: '# Notes' } };
    expect(await runHook(payload)).toBe(expectedClaude('src/notes.md'));
  });
});

describe('main() — Cursor format (integration)', () => {
  test('emits advisory for non-standard .md', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'src/notes.md' } };
    expect(await runHook(payload)).toBe(expectedCursor('src/notes.md'));
  });

  test('output is valid JSON with correct Cursor fields', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'lib/draft.md' } };
    const parsed = JSON.parse(await runHook(payload));
    expect(parsed.permission).toBe('allow');
    expect(parsed.additional_context).toContain('draft.md');
  });

  test('silent for docs/ path', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'docs/CONTEXT.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for agents/ path', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'agents/IMPLEMENTATION.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for README.md', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'packages/core/README.md' } };
    expect(await runHook(payload)).toBe('');
  });

  test('silent for non-.md file', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'src/index.ts' } };
    expect(await runHook(payload)).toBe('');
  });
});

describe('main() — error handling', () => {
  test('silent for empty stdin (does not crash)', async () => {
    let output = '';
    const stdin = Readable.from(['']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await main({ stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for malformed JSON (does not crash)', async () => {
    let output = '';
    const stdin = Readable.from(['not-json']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await main({ stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for unrecognized IDE shape (does not crash)', async () => {
    expect(await runHook({ unknown_field: 'value' })).toBe('');
  });
});
