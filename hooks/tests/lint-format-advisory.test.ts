// hooks/tests/lint-format-advisory.test.ts
import { test, describe, expect } from 'vitest';
import { Readable, Writable } from 'stream';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import ccEdit from './fixtures/claude-code-post-tool-use-edit.json';
import cursorWrite from './fixtures/cursor-post-tool-use-write.json';

import { advisoryMessage, lintFormatAdvisoryHook } from '../src/hooks/lint-format-advisory';
import { runHook } from '../src/runtime/run-hook';

// ── helper ────────────────────────────────────────────────────────────────────

async function execute(payload: unknown): Promise<string> {
  let output = '';
  const stdin = Readable.from([JSON.stringify(payload)]);
  const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
  await runHook(lintFormatAdvisoryHook, { stdin, stdout });
  return output;
}

const expectedClaude = (filePath: string) => JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PostToolUse',
    permissionDecision: 'allow',
    additionalContext: advisoryMessage(filePath),
  },
});

// ── unit: advisoryMessage ─────────────────────────────────────────────────────

describe('advisoryMessage', () => {
  test('matches spec wording exactly', () => {
    expect(advisoryMessage('src/app.ts')).toBe(
      '[Rosetta Advisory] app.ts modified. If not already planned, add a step to run syntax, type, lint, and format checks before commit.'
    );
  });

  test('uses basename, not full path', () => {
    const msg = advisoryMessage('/abs/path/to/foo.py');
    expect(msg).toContain('foo.py');
    expect(msg).not.toContain('/abs/path/to/');
  });

  test('works for bare filename with no directory', () => {
    const msg = advisoryMessage('bare-file.ts');
    expect(msg).toContain('bare-file.ts');
  });
});

// ── integration: extension gating ────────────────────────────────────────────

describe('extension gating — fires for monitored extensions', () => {
  const monitored = ['.ts', '.js', '.jsx', '.tsx', '.py', '.go', '.rs',
                     '.java', '.cs', '.html', '.css', '.md', '.ps1', '.cmd'];

  for (const ext of monitored) {
    test(`fires for ${ext}`, async () => {
      const payload = { ...ccWrite, tool_input: { file_path: `src/foo${ext}` } };
      expect(await execute(payload)).toBe(expectedClaude(`src/foo${ext}`));
    });
  }
});

describe('extension gating — silent for non-monitored extensions', () => {
  const ignored = ['.json', '.gitignore', '.env', '.lock', '.toml', '.yaml', '.sh', '.txt'];

  for (const ext of ignored) {
    test(`silent for ${ext}`, async () => {
      const payload = { ...ccWrite, tool_input: { file_path: `src/foo${ext}` } };
      expect(await execute(payload)).toBe('');
    });
  }
});

// ── integration: path exclusions ─────────────────────────────────────────────

describe('path exclusions — Claude Code', () => {
  const excluded = [
    'node_modules/react/index.ts',
    '.venv/lib/site-packages/foo.py',
    '__pycache__/module.py',
    'dist/bundle.js',
    'build/output.ts',
    '.git/hooks/pre-commit.py',
  ];

  for (const filePath of excluded) {
    test(`silent for ${filePath}`, async () => {
      const payload = { ...ccWrite, tool_input: { file_path: filePath } };
      expect(await execute(payload)).toBe('');
    });
  }
});

// ── integration: throttle dedupe ─────────────────────────────────────────────
//
// Throttle is file-lock-based (os.tmpdir(), 5-second TTL).
// Tests use unique session_id values to avoid cross-test lock collisions.

describe('throttle dedupe', () => {
  test('silent on immediate re-fire for same session+file', async () => {
    const payload = {
      ...ccWrite,
      session_id: 'throttle-A-' + Date.now(),
      tool_input: { file_path: 'throttle-a.ts' },
    };
    const first = await execute(payload);
    const second = await execute(payload);
    expect(first).not.toBe('');   // first fire: advisory
    expect(second).toBe('');      // immediate re-fire: throttled
  });

  test('fires for different filePath in same session', async () => {
    const sessionId = 'throttle-B-' + Date.now();
    const payloadA = { ...ccWrite, session_id: sessionId, tool_input: { file_path: 'b-file-a.ts' } };
    const payloadB = { ...ccWrite, session_id: sessionId, tool_input: { file_path: 'b-file-b.ts' } };
    expect(await execute(payloadA)).not.toBe('');
    expect(await execute(payloadB)).not.toBe('');
  });

  test('fires for same file in a different session', async () => {
    const payloadA = { ...ccWrite, session_id: 'throttle-C1-' + Date.now(), tool_input: { file_path: 'shared-c.ts' } };
    const payloadB = { ...ccWrite, session_id: 'throttle-C2-' + Date.now(), tool_input: { file_path: 'shared-c.ts' } };
    expect(await execute(payloadA)).not.toBe('');
    expect(await execute(payloadB)).not.toBe('');
  });
});

// ── integration: tool/event filter ───────────────────────────────────────────

describe('tool and event filter', () => {
  test('silent for Read tool', async () => {
    const payload = { ...ccWrite, tool_name: 'Read', tool_input: { file_path: 'src/app.ts' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for Bash tool', async () => {
    const payload = { ...ccWrite, tool_name: 'Bash', tool_input: { command: 'cat src/app.ts' } };
    expect(await execute(payload)).toBe('');
  });

  test('silent for PreToolUse event', async () => {
    const payload = { ...ccWrite, hook_event_name: 'PreToolUse', tool_input: { file_path: 'src/app.ts' } };
    expect(await execute(payload)).toBe('');
  });

  test('fires for Edit tool', async () => {
    const payload = { ...ccEdit, tool_input: { ...ccEdit.tool_input, file_path: 'src/app.ts' } };
    expect(await execute(payload)).not.toBe('');
  });
});

// ── integration: Cursor format ────────────────────────────────────────────────

describe('Cursor format', () => {
  test('fires for .ts — Cursor output shape', async () => {
    const payload = {
      ...cursorWrite,
      session_id: 'cursor-' + Date.now(),
      tool_input: { ...cursorWrite.tool_input, file_path: 'src/app.ts' },
    };
    const out = await execute(payload);
    expect(out).not.toBe('');
    const parsed = JSON.parse(out);
    expect(parsed.permission).toBe('allow');
    expect(parsed.additional_context).toContain('app.ts');
  });

  test('silent for .json — Cursor', async () => {
    const payload = {
      ...cursorWrite,
      tool_input: { ...cursorWrite.tool_input, file_path: 'config.json' },
    };
    expect(await execute(payload)).toBe('');
  });
});

// ── integration: error robustness ────────────────────────────────────────────

describe('error handling', () => {
  test('silent for empty stdin', async () => {
    let output = '';
    const stdin = Readable.from(['']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await runHook(lintFormatAdvisoryHook, { stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for malformed JSON', async () => {
    let output = '';
    const stdin = Readable.from(['not-json']);
    const stdout = new Writable({ write(chunk, _, cb) { output += String(chunk); cb(); } });
    await runHook(lintFormatAdvisoryHook, { stdin, stdout });
    expect(output).toBe('');
  });

  test('silent for unknown IDE shape', async () => {
    expect(await execute({ unknown_field: 'value' })).toBe('');
  });
});
