// md-file-advisory.test.ts — TDD test suite for md-file-advisory.ts

import { test, describe, expect } from 'vitest';
import { Readable, Writable } from 'stream';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import cursorWrite from './fixtures/cursor-post-tool-use-write.json';

import {
  isMarkdown,
  isInTempDir,
  matchesAllowedPattern,
  shouldAdvisory,
  buildAdvisoryOutput,
  main,
  ADVISORY_MESSAGE,
} from '../src/md-file-advisory';

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

// Cursor advisory output (adapter maps additionalContext → additional_context, permissionDecision → permission).
// Key order matches Cursor adapter's formatOutput insertion order.
const EXPECTED_CURSOR = JSON.stringify({ additional_context: ADVISORY_MESSAGE, permission: 'allow' });

// Claude Code advisory output (formatOutput is identity for claude-code)
const EXPECTED_CLAUDE = JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    permissionDecision: 'allow',
    additionalContext: ADVISORY_MESSAGE,
  },
});

// ===========================================================================
// Unit tests — pure functions
// ===========================================================================

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

describe('buildAdvisoryOutput', () => {
  test('returns canonical CanonicalOutput with allow + message', () => {
    const out = buildAdvisoryOutput('PreToolUse');
    expect(out.hookSpecificOutput?.hookEventName).toBe('PreToolUse');
    expect(out.hookSpecificOutput?.permissionDecision).toBe('allow');
    expect(out.hookSpecificOutput?.additionalContext).toBe(ADVISORY_MESSAGE);
  });

  test('preserves provided hookEventName', () => {
    const out = buildAdvisoryOutput('PostToolUse');
    expect(out.hookSpecificOutput?.hookEventName).toBe('PostToolUse');
  });
});

// ===========================================================================
// Integration tests — main() with injectable streams
// ===========================================================================

describe('main() — Claude Code format (integration)', () => {
  test('emits advisory for non-standard .md', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'src/notes.md' } };
    expect(await runHook(payload)).toBe(EXPECTED_CLAUDE);
  });

  test('output is valid JSON with correct structure', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'lib/draft.md' } };
    const parsed = JSON.parse(await runHook(payload));
    expect(parsed.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(parsed.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(parsed.hookSpecificOutput.additionalContext.length).toBeGreaterThan(0);
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

describe('main() — Cursor format (integration)', () => {
  test('emits advisory for non-standard .md', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'src/notes.md' } };
    expect(await runHook(payload)).toBe(EXPECTED_CURSOR);
  });

  test('output is valid JSON with correct Cursor fields', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'lib/draft.md' } };
    const parsed = JSON.parse(await runHook(payload));
    expect(parsed.permission).toBe('allow');
    expect(typeof parsed.additional_context).toBe('string');
    expect(parsed.additional_context.length).toBeGreaterThan(0);
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
