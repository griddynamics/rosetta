// loose-files.test.ts — TDD test suite for loose-files.ts

import { test, describe, expect, vi, afterEach } from 'vitest';
import { Readable, Writable } from 'stream';
import fs from 'fs';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import copilotCC from './fixtures/copilot-post-tool-use-cc-format.json';
import cursorWrite from './fixtures/cursor-post-tool-use-write.json';
import codexWrite from './fixtures/codex-post-tool-use-write.json';

import { looseFilesHook, isLooseFile } from '../src/hooks/loose-files';
import { runHook } from '../src/runtime/run-hook';

// ---------------------------------------------------------------------------
describe('isLooseFile — Python module detection (.py)', () => {
  afterEach(() => vi.restoreAllMocks());

  test('.py with __init__.py in same dir → false (not loose)', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string) === '/proj/src/mypackage/__init__.py',
    );
    expect(isLooseFile('/proj/src/mypackage/utils.py')).toBe(false);
  });

  test('.py with __init__.py two levels up → false', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string) === '/proj/src/mypackage/__init__.py',
    );
    expect(isLooseFile('/proj/src/mypackage/sub/utils.py')).toBe(false);
  });

  test('.py with NO __init__.py anywhere → true (loose)', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(isLooseFile('/proj/orphan.py')).toBe(true);
  });

  test('.py at deep nesting — stops at 10 levels max, returns true', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(isLooseFile('/a/b/c/d/e/f/g/h/i/j/k/deep.py')).toBe(true);
  });

  test('.py — __init__.py and .git coexist in same dir → false (marker wins over boundary)', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string) === '/repo/__init__.py' || (p as string) === '/repo/.git',
    );
    expect(isLooseFile('/repo/utils.py')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('isLooseFile — JavaScript module detection (.js)', () => {
  afterEach(() => vi.restoreAllMocks());

  test('.js with package.json in same dir → false (not loose)', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string) === '/proj/src/package.json',
    );
    expect(isLooseFile('/proj/src/app.js')).toBe(false);
  });

  test('.js with package.json three levels up → false', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string) === '/proj/src/package.json',
    );
    expect(isLooseFile('/proj/src/lib/utils/helpers.js')).toBe(false);
  });

  test('.js with NO package.json anywhere → true (loose)', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(isLooseFile('/proj/helper.js')).toBe(true);
  });

  test('.js at deep nesting — stops at 10 levels, returns true', () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    expect(isLooseFile('/a/b/c/d/e/f/g/h/i/j/k/deep.js')).toBe(true);
  });

  test('.js — package.json and .git coexist in same dir → false (marker wins)', () => {
    vi.spyOn(fs, 'existsSync').mockImplementation((p) =>
      (p as string) === '/repo/package.json' || (p as string) === '/repo/.git',
    );
    expect(isLooseFile('/repo/app.js')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration helpers for main() tests
const toStream = (obj: unknown): Readable => Readable.from([JSON.stringify(obj)]);

const capture = () => {
  const chunks: string[] = [];
  const writable = new Writable({ write(chunk, _, cb) { chunks.push(chunk.toString()); cb(); } });
  return { writable, output(): string { return chunks.join(''); } };
};

// Builds a Copilot-shaped raw input (old format, no hook_event_name).
const makeCopilotRaw = (filePath: string) => ({
  timestamp: 1704614400000,
  cwd: '/tmp',
  toolName: 'create_file',
  toolArgs: JSON.stringify({ file_path: filePath, content: 'pass\n' }),
  toolResult: { resultType: 'success', textResultForLlm: 'done' },
});

// ---------------------------------------------------------------------------
describe('runHook — nudge output shape', () => {

  test('old Copilot format → output is valid JSON with hookSpecificOutput.additionalContext', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const raw = makeCopilotRaw(`/tmp/rosetta-nudge-shape-${uniq}.py`);
    const { writable, output } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(hso?.additionalContext).toBeTruthy();
    expect(hso?.hookEventName).toBe('PostToolUse');
    expect(hso?.additionalContext as string).toContain(`rosetta-nudge-shape-${uniq}.py`);
  });

  test('VS Code CC-shaped Copilot input with filePath → output has hookSpecificOutput.additionalContext', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const raw = { ...copilotCC, session_id: `test-${uniq}`,
                   tool_input: { filePath: `/tmp/rosetta-cc-${uniq}.js`, content: 'x' } };
    const { writable, output } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(hso?.additionalContext).toBeTruthy();
    expect(hso?.additionalContext as string).toContain(`rosetta-cc-${uniq}.js`);
  });

  test('Cursor Write fixture with file_path → nudge emitted with extracted path', async () => {
    const { writable, output } = capture();
    await runHook(looseFilesHook, { stdin: toStream(cursorWrite), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    expect(parsed.additional_context as string).toBeTruthy();
    expect(parsed.additional_context as string).toContain('app.js');
  });

  test('Codex Write fixture with file_path → nudge emitted with extracted path', async () => {
    const { writable, output } = capture();
    await runHook(looseFilesHook, { stdin: toStream(codexWrite), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(hso?.additionalContext).toBeTruthy();
    expect(hso?.additionalContext as string).toContain('app.js');
  });

  test('non-JS/PY file → no stdout output at all', async () => {
    const raw = { ...copilotCC, tool_input: { filePath: '/tmp/file.ts', content: 'x' } };
    const { writable, output } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

  test('excluded path → no stdout output at all', async () => {
    const raw = { ...copilotCC, tool_input: { filePath: '/tmp/scripts/runner.js', content: 'x' } };
    const { writable, output } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

});

// Platform-level dedup removed 2026-06-30 (see define-hook.ts): it existed to collapse TWO
// invocations Copilot CLI made for a SINGLE registered hook per real event — a Copilot-side
// runtime bug, now fixed by GitHub (confirmed empirically). Copilot no longer needs special
// treatment here — an identical raw payload sent twice is two real invocations, same as CC.
describe('runHook — no platform dedup (Copilot behaves like every other IDE)', () => {

  test('Copilot: identical raw sent twice — both fire', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const filePath = `/tmp/rosetta-test-copilot-nodedup-${uniq}.py`;
    const raw = makeCopilotRaw(filePath);

    const { writable: out1, output: get1 } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: out1 });
    expect(get1().length > 0, 'first Copilot call should emit nudge').toBeTruthy();

    const { writable: out2, output: get2 } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: out2 });
    expect(get2().length > 0, 'second Copilot call must also emit nudge (no platform dedup)').toBeTruthy();
  });

  test('Claude Code: identical raw sent twice — both fire', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const filePath = `/tmp/rosetta-test-cc-nodedup-${uniq}.py`;
    const sessionId = `test-cc-${uniq}`;
    const raw = { ...ccWrite, session_id: sessionId, tool_input: { file_path: filePath } };

    const { writable: out1, output: get1 } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: out1 });
    expect(get1().length > 0, 'first CC call should emit nudge').toBeTruthy();

    const { writable: out2, output: get2 } = capture();
    await runHook(looseFilesHook, { stdin: toStream(raw), stdout: out2 });
    expect(get2().length > 0, 'second CC call must also emit nudge (no platform dedup)').toBeTruthy();
  });

});
