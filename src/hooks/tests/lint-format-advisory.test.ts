// src/hooks/tests/lint-format-advisory.test.ts
import { test, describe, expect } from 'vitest';
import { Readable, Writable } from 'stream';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import ccEdit from './fixtures/claude-code-post-tool-use-edit.json';
import cursorWrite from './fixtures/cursor-post-tool-use-write.json';
import codexApplyPatch from './fixtures/codex-post-tool-use-apply_patch.json';

import { advisoryMessage, lintFormatAdvisoryHook } from '../src/hooks/lint-format-advisory';
import { runHook } from '../src/runtime/run-hook';
import { assertCodexOutput } from '../src/adapters/codex-output';

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

// ── integration: case-insensitive extension matching (extOneOfCi) ───────────────────
//
// The filter uses `extOneOfCi` (case-insensitive). All other extension tests use
// lowercase only, so the case-folding branch was previously unexercised.

describe('case-insensitive extension matching', () => {
  test('fires for uppercase .TS', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'src/app.TS' } };
    expect(await execute(payload)).toBe(expectedClaude('src/app.TS'));
  });

  test('fires for mixed-case .Tsx', async () => {
    const payload = { ...ccWrite, tool_input: { file_path: 'src/app.Tsx' } };
    expect(await execute(payload)).toBe(expectedClaude('src/app.Tsx'));
  });
});

// ── integration: exclusion boundary precision (notContainsAny w/ trailing slash) ────
//
// Exclusions match exact substrings WITH a trailing slash (`dist/`, `build/`,
// `node_modules/`). Directory names that merely share a prefix must NOT be
// excluded.

describe('exclusion boundary — prefix-only matches still fire', () => {
  const nearMiss = [
    'distillery/app.ts',          // `dist` ≠ `dist/`
    'builder/app.ts',             // `build` ≠ `build/`
    'node_modules_local/foo.ts',  // `node_modules` ≠ `node_modules/`
  ];

  for (const filePath of nearMiss) {
    test(`fires for ${filePath}`, async () => {
      const payload = { ...ccWrite, tool_input: { file_path: filePath } };
      expect(await execute(payload)).toBe(expectedClaude(filePath));
    });
  }
});

// ── integration: MultiEdit tool (multi-edit kind) for PostToolUse ───────────────────
//
// Claude Code maps `MultiEdit` → `multi-edit`, which the hook lists in toolKinds,
// but only Write/Edit were previously exercised. Uses a distinct path to avoid a
// throttle-lock collision with the `Edit` test (same session + `src/app.ts`).

describe('MultiEdit tool', () => {
  test('fires for MultiEdit on .ts', async () => {
    const payload = {
      ...ccEdit,
      tool_name: 'MultiEdit',
      hook_event_name: 'PostToolUse',
      tool_input: { file_path: 'src/multi-edit-app.ts' },
    };
    expect(await execute(payload)).toBe(expectedClaude('src/multi-edit-app.ts'));
  });
});

// ── integration: file-path field fallback chain (file_path → filePath → path) ────────
//
// Claude Code getFilePath falls back across field names; only `file_path` was
// previously covered.

describe('file-path field extraction', () => {
  test('fires when path is in camelCase filePath', async () => {
    const payload = { ...ccWrite, tool_input: { filePath: 'src/filepath-variant.ts' } };
    expect(await execute(payload)).toBe(expectedClaude('src/filepath-variant.ts'));
  });

  test('fires when path is in path field', async () => {
    const payload = { ...ccWrite, tool_input: { path: 'src/path-variant.ts' } };
    expect(await execute(payload)).toBe(expectedClaude('src/path-variant.ts'));
  });
});

// ── integration: Codex apply_patch — path parsed from command string ────────────────
//
// Codex extracts the file path from the patch command (`*** Update File: ...`),
// not from tool_input.file_path. Codex's formatOutput PROJECTS the canonical shape to its STRICT
// PostToolUse schema: additionalContext ONLY — NO permissionDecision (illegal on PostToolUse → the
// whole output would be rejected). Validated closed-world via assertCodexOutput. Fixture targets src/app.js.

describe('Codex apply_patch', () => {
  test('fires with path parsed from command string; strict PostToolUse advise shape (no permissionDecision)', async () => {
    const out = await execute(codexApplyPatch);
    const parsed = JSON.parse(out);
    assertCodexOutput('PostToolUse', parsed);
    expect(parsed).toStrictEqual({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: advisoryMessage('src/app.js') },
    });
  });
});

// ── integration: throttle with null session_id (no-session key) ────────────────────
//
// makeDedupKey falls back to `no-session` when session_id is absent; two
// consecutive session-less fires for the same file must dedupe. session_id is set
// to null (not omitted) because Claude Code detection requires the key to be
// present. The `no-session` key is shared across all session-less calls, so a
// Date.now()-unique path is required to avoid cross-test/cross-run lock collisions.

describe('throttle without session_id', () => {
  test('silent on immediate re-fire for same file', async () => {
    const filePath = `no-session-${Date.now()}.ts`;
    const payload = { ...ccWrite, session_id: null, tool_input: { file_path: filePath } };
    const first = await execute(payload);
    const second = await execute(payload);
    expect(first).not.toBe('');
    expect(second).toBe('');
  });
});
