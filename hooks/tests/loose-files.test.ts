// loose-files.test.ts — TDD test suite for loose-files.ts

import { test, describe, expect } from 'vitest';
import { Readable, Writable } from 'stream';
import { existsSync, unlinkSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';
import os from 'os';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import ccEdit  from './fixtures/claude-code-post-tool-use-edit.json';
import ccBash  from './fixtures/claude-code-pre-tool-use-bash.json';
import codexApplyPatch from './fixtures/codex-post-tool-use-apply_patch.json';
import copilotCC from './fixtures/copilot-post-tool-use-cc-format.json';

import { shouldCheck, isLooseFile, buildNudgeOutput, main } from '../src/loose-files';
import { normalize } from '../src/adapter';
import type { NormalizedInput } from '../src/types';

function mockFs(existingPaths: string[]): { existsSync: (p: string) => boolean } {
  return { existsSync: (p: string) => existingPaths.includes(p) };
}

// ---------------------------------------------------------------------------
describe('shouldCheck — file extension filter', () => {

  test('.py file → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_input: { file_path: '/proj/utils.py' } }))).toBe(true);
  });

  test('.js file → true', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_input: { file_path: '/proj/app.js' } }))).toBe(true);
  });

  test('.ts file → false', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_input: { file_path: '/proj/app.ts' } }))).toBe(false);
  });

  test('.md file → false', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_input: { file_path: '/proj/README.md' } }))).toBe(false);
  });

  test('.json file → false', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_input: { file_path: '/proj/config.json' } }))).toBe(false);
  });

});

// ---------------------------------------------------------------------------
describe('shouldCheck — event + tool filter', () => {

  test('PostToolUse + Write → true', () => {
    expect(shouldCheck(normalize(ccWrite))).toBe(true);
  });

  test('PostToolUse + Edit → false', () => {
    expect(shouldCheck(normalize(ccEdit))).toBe(false);
  });

  test('PostToolUse + Bash → false', () => {
    expect(shouldCheck(normalize(ccBash))).toBe(false);
  });

  test('PostToolUse + Read → false', () => {
    expect(shouldCheck(normalize({ ...ccWrite, tool_name: 'Read' }))).toBe(false);
  });

  test('PreToolUse + Write → false (wrong event)', () => {
    expect(shouldCheck(normalize({ ...ccWrite, hook_event_name: 'PreToolUse' }))).toBe(false);
  });

  test('PostToolUse + apply_patch with Update File (.js) → false', () => {
    expect(shouldCheck(normalize(codexApplyPatch))).toBe(false);
  });

  test('PostToolUse + apply_patch with Update File (.py) → false', () => {
    const input = { ...codexApplyPatch, tool_input: { command: 'apply_patch\n*** Begin Patch\n*** Update File: src/utils.py\n*** End Patch' } };
    expect(shouldCheck(normalize(input))).toBe(false);
  });

  test('PostToolUse + apply_patch (.ts) → false (extension not allowed)', () => {
    const input = { ...codexApplyPatch, tool_input: { command: 'apply_patch\n*** Begin Patch\n*** Update File: src/utils.ts\n*** End Patch' } };
    expect(shouldCheck(normalize(input))).toBe(false);
  });

  test('PostToolUse + functions.apply_patch with Update File → false', () => {
    const input = { ...codexApplyPatch, tool_name: 'functions.apply_patch' };
    expect(shouldCheck(normalize(input))).toBe(false);
  });

  test('PostToolUse + apply_patch with Add File → true', () => {
    const input = { ...codexApplyPatch, tool_input: { command: 'apply_patch\n*** Begin Patch\n*** Add File: src/new.py\n+content\n*** End Patch' } };
    expect(shouldCheck(normalize(input))).toBe(true);
  });

  test('PostToolUse + apply_patch with Create File → true', () => {
    const input = { ...codexApplyPatch, tool_input: { command: 'apply_patch\n*** Begin Patch\n*** Create File: src/new.py\n+content\n*** End Patch' } };
    expect(shouldCheck(normalize(input))).toBe(true);
  });

});

// ---------------------------------------------------------------------------
describe('shouldCheck — exclusion paths', () => {

  const makeInput = (filePath: string) =>
    normalize({ ...ccWrite, tool_input: { file_path: filePath } });

  test('path contains agents/TEMP/ → false', () => {
    expect(shouldCheck(makeInput('/proj/agents/TEMP/debug.py'))).toBe(false);
  });

  test('path contains scripts/ → false', () => {
    expect(shouldCheck(makeInput('/proj/scripts/runner.py'))).toBe(false);
  });

  test('path contains node_modules/ → false', () => {
    expect(shouldCheck(makeInput('/proj/node_modules/foo/bar.js'))).toBe(false);
  });

  test('path contains .venv/ → false', () => {
    expect(shouldCheck(makeInput('/proj/.venv/lib/site.py'))).toBe(false);
  });

  test('path contains __pycache__/ → false', () => {
    expect(shouldCheck(makeInput('/proj/src/__pycache__/util.py'))).toBe(false);
  });

});

// ---------------------------------------------------------------------------
describe('shouldCheck — filePath camelCase (VS Code Copilot CC-shaped input)', () => {

  const makeCCCopilot = (toolName: string, toolInput: Record<string, unknown>) =>
    normalize({ hook_event_name: 'PostToolUse', session_id: 'test-session', tool_name: toolName,
                 tool_input: toolInput, tool_use_id: 'toolu__vscode-123', cwd: '/proj' });

  test('create_file with filePath (.js) → true', () => {
    expect(shouldCheck(makeCCCopilot('create_file', { filePath: '/proj/app.js', content: 'x' }))).toBe(true);
  });

  test('replace_string_in_file with filePath (.py) → false', () => {
    expect(shouldCheck(makeCCCopilot('replace_string_in_file', { filePath: '/proj/utils.py', old_str: 'a', new_str: 'b' }))).toBe(false);
  });

  test('multi_replace_string_in_file with filePath (.js) → false', () => {
    expect(shouldCheck(makeCCCopilot('multi_replace_string_in_file', { filePath: '/proj/app.js' }))).toBe(false);
  });

  test('create_file with filePath (.ts) → false (extension not allowed)', () => {
    expect(shouldCheck(makeCCCopilot('create_file', { filePath: '/proj/app.ts', content: 'x' }))).toBe(false);
  });

  test('create_file with empty tool_input {} → false (no path)', () => {
    expect(shouldCheck(makeCCCopilot('create_file', {}))).toBe(false);
  });

  test('file_path (snake_case) still resolves correctly', () => {
    expect(shouldCheck(makeCCCopilot('create_file', { file_path: '/proj/app.js', content: 'x' }))).toBe(true);
  });

  test('file_path takes priority over filePath when both present', () => {
    // file_path is .ts → false, even though filePath is .js
    expect(shouldCheck(makeCCCopilot('create_file', { file_path: '/proj/app.ts', filePath: '/proj/app.js' }))).toBe(false);
  });

  test('VS Code CC fixture → shouldCheck=true (filePath is .js)', () => {
    expect(shouldCheck(normalize(copilotCC))).toBe(true);
  });

});

// ---------------------------------------------------------------------------
describe('isLooseFile — Python module detection (.py)', () => {

  test('.py with __init__.py in same dir → false (not loose)', () => {
    const fs = mockFs(['/proj/src/mypackage/__init__.py']);
    expect(isLooseFile('/proj/src/mypackage/utils.py', fs)).toBe(false);
  });

  test('.py with __init__.py two levels up → false', () => {
    const fs = mockFs(['/proj/src/mypackage/__init__.py']);
    expect(isLooseFile('/proj/src/mypackage/sub/utils.py', fs)).toBe(false);
  });

  test('.py with NO __init__.py anywhere → true (loose)', () => {
    expect(isLooseFile('/proj/orphan.py', mockFs([]))).toBe(true);
  });

  test('.py at root with no markers — stops at 10 levels max, returns true', () => {
    expect(isLooseFile('/a/b/c/d/e/f/g/h/i/j/k/deep.py', mockFs([]))).toBe(true);
  });

  test('.py — __init__.py and .git coexist in same dir → false (marker wins over boundary)', () => {
    const fs = mockFs(['/repo/__init__.py', '/repo/.git']);
    expect(isLooseFile('/repo/utils.py', fs)).toBe(false);
  });

});

// ---------------------------------------------------------------------------
describe('isLooseFile — JavaScript module detection (.js)', () => {

  test('.js with package.json in same dir → false (not loose)', () => {
    const fs = mockFs(['/proj/src/package.json']);
    expect(isLooseFile('/proj/src/app.js', fs)).toBe(false);
  });

  test('.js with package.json three levels up → false', () => {
    const fs = mockFs(['/proj/src/package.json']);
    expect(isLooseFile('/proj/src/lib/utils/helpers.js', fs)).toBe(false);
  });

  test('.js with NO package.json anywhere → true (loose)', () => {
    expect(isLooseFile('/proj/helper.js', mockFs([]))).toBe(true);
  });

  test('.js at deep nesting — stops at 10 levels, returns true', () => {
    expect(isLooseFile('/a/b/c/d/e/f/g/h/i/j/k/deep.js', mockFs([]))).toBe(true);
  });

  test('.js — package.json and .git coexist in same dir → false (marker wins over boundary)', () => {
    // Repo root has both package.json and .git/ — file in root must NOT be flagged as loose.
    const fs = mockFs(['/repo/package.json', '/repo/.git']);
    expect(isLooseFile('/repo/app.js', fs)).toBe(false);
  });

});

// ---------------------------------------------------------------------------
describe('buildNudgeOutput', () => {

  test('returns valid JSON-serializable object', () => {
    const result = buildNudgeOutput('/proj/orphan.py');
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  test('has hookSpecificOutput.hookEventName === "PostToolUse"', () => {
    expect(buildNudgeOutput('/proj/orphan.py').hookSpecificOutput.hookEventName).toBe('PostToolUse');
  });

  test('.py — additionalContext mentions file path', () => {
    expect(buildNudgeOutput('/proj/orphan.py').hookSpecificOutput.additionalContext.includes('orphan.py')).toBeTruthy();
  });

  test('.py — additionalContext mentions __init__.py', () => {
    expect(buildNudgeOutput('/proj/orphan.py').hookSpecificOutput.additionalContext.includes('__init__.py')).toBeTruthy();
  });

  test('.js — additionalContext mentions package.json', () => {
    expect(buildNudgeOutput('/proj/helper.js').hookSpecificOutput.additionalContext.includes('package.json')).toBeTruthy();
  });

  test('has continue: true', () => {
    expect(buildNudgeOutput('/proj/orphan.py').continue).toBe(true);
  });

});

// ---------------------------------------------------------------------------
describe('integration with adapter', () => {

  test('Claude Code Write fixture (.py loose) → shouldCheck=true + isLooseFile=true', () => {
    const input = normalize({
      ...ccWrite,
      tool_input: { file_path: '/proj/orphan.py', content: 'pass\n' },
      tool_response: { filePath: '/proj/orphan.py' },
    });
    expect(shouldCheck(input)).toBe(true);
    expect(isLooseFile(input.tool_input.file_path as string, mockFs([]))).toBe(true);
  });

  test('Claude Code Write fixture (.py inside module) → shouldCheck=true + isLooseFile=false', () => {
    const input = normalize({
      ...ccWrite,
      tool_input: { file_path: '/proj/src/mypackage/utils.py', content: 'pass\n' },
      tool_response: { filePath: '/proj/src/mypackage/utils.py' },
    });
    expect(shouldCheck(input)).toBe(true);
    expect(
      isLooseFile(input.tool_input.file_path as string, mockFs(['/proj/src/mypackage/__init__.py'])),
    ).toBe(false);
  });

  test('Claude Code Edit fixture (.js) → shouldCheck=false (Edit is not a creation tool)', () => {
    const normalized = normalize(ccEdit);
    expect(shouldCheck(normalized)).toBe(false);
    expect(isLooseFile(normalized.tool_input.file_path as string, mockFs([]))).toBe(true);
  });

  test('Claude Code Bash fixture → shouldCheck=false', () => {
    expect(shouldCheck(normalize(ccBash))).toBe(false);
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

// Mirror lock.ts fingerprint to compute lock path for cleanup.
const lockPathFor = (input: NormalizedInput): string => {
  const fp = createHash('sha256')
    .update(`${input.session_id ?? 'no-session'}:${input.hook_event_name}:${input.tool_name ?? ''}:${JSON.stringify(input.tool_input ?? {})}`)
    .digest('hex')
    .slice(0, 16);
  return path.join(os.tmpdir(), `rosetta-hooks-${fp}.lock`);
};

// Builds a Copilot-shaped raw input where toolName='Write' to pass shouldCheck.
const makeCopilotRaw = (filePath: string) => ({
  timestamp: 1704614400000,
  cwd: '/tmp',
  toolName: 'Write',
  toolArgs: JSON.stringify({ file_path: filePath, content: 'pass\n' }),
  toolResult: { resultType: 'success', textResultForLlm: 'done' },
});

// ---------------------------------------------------------------------------
describe('main() — nudge output shape', () => {

  test('old Copilot format → output is valid JSON with top-level additionalContext', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const raw = makeCopilotRaw(`/tmp/rosetta-nudge-shape-${uniq}.py`);
    const { writable, output } = capture();
    await main({ stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    expect(parsed.additionalContext).toBeTruthy();
    expect(parsed.hookSpecificOutput).toBeUndefined();
  });

  test('VS Code CC-shaped Copilot input with filePath → output has hookSpecificOutput.additionalContext', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const raw = { ...copilotCC, session_id: `test-${uniq}`,
                   tool_input: { filePath: `/tmp/rosetta-cc-${uniq}.js`, content: 'x' } };
    const { writable, output } = capture();
    await main({ stdin: toStream(raw), stdout: writable });
    const parsed = JSON.parse(output().trim()) as Record<string, unknown>;
    const hso = parsed.hookSpecificOutput as Record<string, unknown> | undefined;
    expect(hso?.additionalContext).toBeTruthy();
  });

  test('non-JS/PY file → no stdout output at all', async () => {
    const raw = { ...copilotCC, tool_input: { filePath: '/tmp/file.ts', content: 'x' } };
    const { writable, output } = capture();
    await main({ stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

  test('excluded path → no stdout output at all', async () => {
    const raw = { ...copilotCC, tool_input: { filePath: '/tmp/scripts/runner.js', content: 'x' } };
    const { writable, output } = capture();
    await main({ stdin: toStream(raw), stdout: writable });
    expect(output()).toBe('');
  });

});

// ---------------------------------------------------------------------------
describe('main() — dedup gate is Copilot-only', () => {

  test('Copilot: second identical call within TTL is silenced', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const filePath = `/tmp/rosetta-test-copilot-dedup-${uniq}.py`;
    const raw = makeCopilotRaw(filePath);
    const lp = lockPathFor(normalize(raw));
    if (existsSync(lp)) unlinkSync(lp);

    try {
      const { writable: out1, output: get1 } = capture();
      await main({ stdin: toStream(raw), stdout: out1 });
      expect(get1().length > 0, 'first Copilot call should emit nudge').toBeTruthy();

      const { writable: out2, output: get2 } = capture();
      await main({ stdin: toStream(raw), stdout: out2 });
      expect(get2()).toBe('');
    } finally {
      if (existsSync(lp)) unlinkSync(lp);
    }
  });

  test('Claude Code: duplicate call is NOT silenced (dedup inactive for non-Copilot)', async () => {
    const uniq = Math.random().toString(36).slice(2);
    const filePath = `/tmp/rosetta-test-cc-nodedup-${uniq}.py`;
    const sessionId = `test-cc-${uniq}`;
    const raw = { ...ccWrite, session_id: sessionId, tool_input: { file_path: filePath } };

    const { writable: out1, output: get1 } = capture();
    await main({ stdin: toStream(raw), stdout: out1 });
    expect(get1().length > 0, 'first Claude Code call should emit nudge').toBeTruthy();

    const { writable: out2, output: get2 } = capture();
    await main({ stdin: toStream(raw), stdout: out2 });
    expect(get2().length > 0, 'second Claude Code call must also emit nudge (no dedup for CC)').toBeTruthy();
  });

});
