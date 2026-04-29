// md-file-advisory.test.ts — TDD test suite for md-file-advisory.ts

import { test, describe, expect } from 'vitest';
import { Readable, Writable } from 'stream';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import cursorWrite from './fixtures/cursor-post-tool-use-write.json';

import { mdFileAdvisoryHook, advisoryMessage } from '../src/hooks/md-file-advisory';
import { runHook } from '../src/runtime/run-hook';

// ---------------------------------------------------------------------------
// Helper: run mdFileAdvisoryHook with an in-memory payload; returns stdout string.
// ---------------------------------------------------------------------------
async function execute(payload: unknown): Promise<string> {
  let output = '';
  const stdin = Readable.from([JSON.stringify(payload)]);
  const stdout = new Writable({
    write(chunk, _enc, cb) {
      output += String(chunk);
      cb();
    },
  });
  await runHook(mdFileAdvisoryHook, { stdin, stdout });
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

// ===========================================================================
// Integration tests — main() with injectable streams
// ===========================================================================

describe('main() — Claude Code format (integration)', () => {
  test('emits advisory for non-standard .md', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'src/notes.md' } };
    expect(await execute(payload)).toBe(expectedClaude('src/notes.md'));
  });

  test('output is valid JSON with correct structure', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'lib/draft.md' } };
    const parsed = JSON.parse(await execute(payload));
    expect(parsed.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(parsed.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(parsed.hookSpecificOutput.additionalContext).toContain('draft.md');
  });

  test('silent for docs/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'docs/CONTEXT.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for agents/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'agents/MEMORY.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for plans/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'plans/auth/auth-PLAN.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for README.md', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'packages/core/README.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for CHANGELOG.md', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'CHANGELOG.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for agent-temp/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'agent-temp/foo.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for agents/TEMP/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'agents/TEMP/bar.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for .tmp/ path', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: '.tmp/draft.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for non-.md file', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'src/index.js' } };
    expect(await execute(payload)).toBe('');
  });
});

describe('main() — tool filter (integration)', () => {
  test('silent for Read tool with non-standard .md path', async () => {
    const payload = { ...ccWrite, tool_name: 'Read', tool_input: { file_path: 'src/notes.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for Bash tool with .md in command', async () => {
    const payload = { ...ccWrite, tool_name: 'Bash', tool_input: { command: 'cat src/notes.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for Search tool referencing .md file', async () => {
    const payload = { ...ccWrite, tool_name: 'Search', tool_input: { query: 'notes.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for PreToolUse event even with Write tool', async () => {
    const payload = { ...ccWrite, hook_event_name: 'PreToolUse', tool_input: { file_path: 'src/notes.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('emits advisory for Edit tool with non-standard .md', async () => {
    const payload = { ...ccWrite, tool_name: 'Edit', tool_input: { file_path: 'src/notes.md' } };
    expect(await execute(payload)).toBe(expectedClaude('src/notes.md'));
  });

  test('emits advisory for create_file tool with non-standard .md', async () => {
    const payload = { ...ccWrite, tool_name: 'create_file', tool_input: { file_path: 'src/notes.md', content: '# Notes' } };
    expect(await execute(payload)).toBe(expectedClaude('src/notes.md'));
  });
});

describe('main() — Cursor format (integration)', () => {
  test('emits advisory for non-standard .md', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'src/notes.md' } };
    expect(await execute(payload)).toBe(expectedCursor('src/notes.md'));
  });

  test('output is valid JSON with correct Cursor fields', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'lib/draft.md' } };
    const parsed = JSON.parse(await execute(payload));
    expect(parsed.permission).toBe('allow');
    expect(parsed.additional_context).toContain('draft.md');
  });

  test('silent for docs/ path', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'docs/CONTEXT.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for agents/ path', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'agents/IMPLEMENTATION.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for README.md', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'packages/core/README.md' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for non-.md file', async () => {
    const payload = { ...cursorWrite, tool_input: { ...cursorWrite.tool_input, file_path: 'src/index.ts' } };
    expect(await execute(payload)).toBe('');
  });
});

describe('runHook — error handling', () => {
  test('silent for empty stdin (does not crash)', async () => {
    let output = '';
    const stdin = Readable.from(['']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await runHook(mdFileAdvisoryHook, { stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for malformed JSON (does not crash)', async () => {
    let output = '';
    const stdin = Readable.from(['not-json']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await runHook(mdFileAdvisoryHook, { stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for unrecognized IDE shape (does not crash)', async () => {
    expect(await execute({ unknown_field: 'value' })).toBe('');
  });
});
