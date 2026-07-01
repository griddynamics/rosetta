import { test, describe, expect, vi, beforeEach, afterEach } from 'vitest';
import { runHook, runAsCli, resolveExitCode } from '../../src/runtime/run-hook';
import { defineHook } from '../../src/runtime/define-hook';
import { advise, sideEffect, deny, allow } from '../../src/runtime/result-helpers';
import { readStdin } from '../../src/adapter';
import type { FilePathPredicate } from '../../src/runtime/types';
import ccWrite from '../fixtures/claude-code-post-tool-use-write.json';
import codexApplyPatch from '../fixtures/codex-post-tool-use-apply_patch.json';

// Proper copilot PostToolUse shape (old format: toolName + toolArgs + toolResult, no hook_event_name)
const copilotCreateFile = {
  timestamp: 1704614400000,
  cwd: '/proj',
  toolName: 'create_file',
  toolArgs: JSON.stringify({ file_path: '/proj/src/app.js', content: 'x' }),
  toolResult: { resultType: 'success', textResultForLlm: 'done' },
};

vi.mock('../../src/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/adapter')>();
  return { ...actual, readStdin: vi.fn() };
});

const mockRead = (raw: Record<string, unknown>) =>
  (readStdin as ReturnType<typeof vi.fn>).mockResolvedValue(raw);

beforeEach(() => vi.clearAllMocks());

const ADVISE_HOOK = defineHook({
  name: 'test-advise',
  on: { event: 'PostToolUse', toolKinds: ['write'] },
  run: (ctx) => advise(`hello from ${ctx.filePath}`),
});

// ---------------------------------------------------------------------------
// Helper: run a hook with filePath predicate, returns true if output produced
const runWithFilePath = async (fp: FilePathPredicate, file_path: string): Promise<boolean> => {
  mockRead({ ...ccWrite, tool_input: { file_path } });
  const hook = defineHook({
    name: 'fp-test',
    on: { event: 'PostToolUse', toolKinds: ['write'], filePath: fp },
    run: () => advise('hit'),
  });
  const out: string[] = [];
  await runHook(hook, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WritableStream });
  return out.length > 0;
};
// ---------------------------------------------------------------------------

describe('runAsCli', () => {
  test('does nothing when require.main !== mod', () => {
    const fakeMod = {} as NodeModule;
    const hook = defineHook({
      name: 'test',
      on: { event: 'PostToolUse', toolKinds: ['write'] },
      run: () => null,
    });
    expect(() => runAsCli(hook, fakeMod)).not.toThrow();
  });
});

describe('runHook — activation gate', () => {
  test('matching event+toolKind → output written to stdout', async () => {
    mockRead(ccWrite);
    const out: string[] = [];
    await runHook(ADVISE_HOOK, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WriteStream });
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0])).toMatchObject({ hookSpecificOutput: expect.any(Object) });
  });

  test('wrong event → no stdout', async () => {
    mockRead({ ...ccWrite, hook_event_name: 'PreToolUse' });
    const out: string[] = [];
    await runHook(ADVISE_HOOK, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WriteStream });
    expect(out).toHaveLength(0);
  });

  test('wrong toolKind (Bash) → no stdout', async () => {
    mockRead({ ...ccWrite, tool_name: 'Bash' });
    const out: string[] = [];
    await runHook(ADVISE_HOOK, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WriteStream });
    expect(out).toHaveLength(0);
  });

  test('side-effect result → no stdout', async () => {
    mockRead(ccWrite);
    const h = defineHook({ name: 'test-side', on: { event: 'PostToolUse', toolKinds: ['write'] }, run: () => sideEffect() });
    const out: string[] = [];
    await runHook(h, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WriteStream });
    expect(out).toHaveLength(0);
  });

  test('run() returns null → no stdout', async () => {
    mockRead(ccWrite);
    const h = defineHook({ name: 'test-null', on: { event: 'PostToolUse', toolKinds: ['write'] }, run: () => null });
    const out: string[] = [];
    await runHook(h, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WriteStream });
    expect(out).toHaveLength(0);
  });
});

describe('runHook — filePath predicates', () => {
  test('extOneOf .py matches → fires', async () => {
    expect(await runWithFilePath({ extOneOf: ['.py'] }, 'src/foo.py')).toBe(true);
  });
  test('extOneOf .py does not match .ts → silent', async () => {
    expect(await runWithFilePath({ extOneOf: ['.py'] }, 'src/foo.ts')).toBe(false);
  });
  test('extOneOfCi .md matches FILE.MD → fires', async () => {
    expect(await runWithFilePath({ extOneOfCi: ['.md'] }, 'src/FILE.MD')).toBe(true);
  });
  test('notContainsAny scripts/ excludes → silent', async () => {
    expect(await runWithFilePath({ extOneOf: ['.py'], notContainsAny: ['scripts/'] }, 'scripts/run.py')).toBe(false);
  });
  test('notContainsAny no match → fires', async () => {
    expect(await runWithFilePath({ extOneOf: ['.py'], notContainsAny: ['scripts/'] }, 'src/run.py')).toBe(true);
  });
  test('notTokenSegmentAny tmp excludes agent-tmp/ → silent', async () => {
    expect(await runWithFilePath({ extOneOfCi: ['.md'], notTokenSegmentAny: ['tmp'] }, 'agent-tmp/file.md')).toBe(false);
  });
  test('notStartsWithAny docs/ excludes docs/README.md → silent', async () => {
    expect(await runWithFilePath({ extOneOfCi: ['.md'], notStartsWithAny: ['docs/'] }, 'docs/README.md')).toBe(false);
  });
  test('notStartsWithAny with absolute /proj/docs/ path → silent', async () => {
    expect(await runWithFilePath({ extOneOfCi: ['.md'], notStartsWithAny: ['docs/'] }, '/proj/docs/notes.md')).toBe(false);
  });
  test('notBasenameOneOf README.md excludes → silent', async () => {
    expect(await runWithFilePath({ extOneOfCi: ['.md'], notBasenameOneOf: ['README.md'] }, 'packages/web/README.md')).toBe(false);
  });
  test('all predicates combined — allowed path → fires', async () => {
    expect(await runWithFilePath({
      extOneOfCi: ['.md'],
      notTokenSegmentAny: ['tmp', 'temp'],
      notStartsWithAny: ['docs/', 'agents/'],
      notBasenameOneOf: ['README.md'],
    }, 'src/notes.md')).toBe(true);
  });
});

describe('runHook — toolInput.commandMatchWhen predicate', () => {
  const PATCH_HOOK = defineHook({
    name: 'patch-test',
    on: {
      event: 'PostToolUse',
      toolKinds: ['write'],
      toolInput: {
        commandMatchWhen: {
          tools: ['apply_patch', 'functions.apply_patch'],
          re: /^\*\*\* (?:Add|Create) File:/m,
        },
      },
    },
    run: () => advise('hit'),
  });

  const runPatch = async (command: string, toolName = 'apply_patch') => {
    mockRead({ ...codexApplyPatch, tool_name: toolName, tool_input: { command } });
    const out: string[] = [];
    await runHook(PATCH_HOOK, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WritableStream });
    return out.length > 0;
  };

  test('apply_patch with Add File marker → fires', async () => {
    expect(await runPatch('apply_patch\n*** Add File: src/new.py\n+content')).toBe(true);
  });
  test('apply_patch with Create File marker → fires', async () => {
    expect(await runPatch('apply_patch\n*** Create File: src/new.py\n+content')).toBe(true);
  });
  test('apply_patch with Update File marker (edit, not creation) → silent', async () => {
    expect(await runPatch('apply_patch\n*** Update File: src/exists.py\n+patch')).toBe(false);
  });
  test('functions.apply_patch with Add File → fires', async () => {
    expect(await runPatch('apply_patch\n*** Add File: src/new.py', 'functions.apply_patch')).toBe(true);
  });
  test('Write tool (not in tools list) → commandMatchWhen skipped → fires', async () => {
    mockRead({ ...ccWrite, tool_input: { file_path: 'src/new.py' } });
    const out: string[] = [];
    await runHook(PATCH_HOOK, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WritableStream });
    expect(out.length).toBe(1);
  });
});

describe('runHook — fs.nearestMarker gate', () => {
  const FS_HOOK = defineHook({
    name: 'fs-test',
    on: { event: 'PostToolUse', toolKinds: ['write'], fs: { nearestMarker: '.gitnexus' } },
    run: (ctx) => advise(`root=${ctx.markerRoot ?? 'none'}`),
  });

  afterEach(() => vi.restoreAllMocks());

  test('marker not found → silent', async () => {
    vi.spyOn(require('fs'), 'existsSync').mockReturnValue(false);
    mockRead({ ...ccWrite, cwd: '/no-nexus' });
    const out: string[] = [];
    await runHook(FS_HOOK, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WritableStream });
    expect(out).toHaveLength(0);
  });

  test('marker found → fires and ctx.markerRoot equals resolved dir', async () => {
    vi.spyOn(require('fs'), 'existsSync').mockImplementation((p: unknown) =>
      (p as string).endsWith('/.gitnexus'),
    );
    mockRead({ ...ccWrite, cwd: '/proj' });
    const out: string[] = [];
    await runHook(FS_HOOK, { stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WritableStream });
    expect(out).toHaveLength(1);
    expect(JSON.parse(out[0]).hookSpecificOutput.additionalContext).toContain('root=/proj');
  });
});

describe('runHook — platform dedup via adapter', () => {
  test('Copilot raw sent twice — second call is silent (platform dedup)', async () => {
    mockRead(copilotCreateFile);
    const out1: string[] = [];
    await runHook(ADVISE_HOOK, { stdout: { write: (s: string) => out1.push(s) } as unknown as NodeJS.WritableStream });
    expect(out1).toHaveLength(1);

    mockRead(copilotCreateFile);
    const out2: string[] = [];
    await runHook(ADVISE_HOOK, { stdout: { write: (s: string) => out2.push(s) } as unknown as NodeJS.WritableStream });
    expect(out2).toHaveLength(0);
  });

  test('Claude Code raw sent twice — both fire (no platform dedup for CC)', async () => {
    mockRead(ccWrite);
    const out1: string[] = [];
    await runHook(ADVISE_HOOK, { stdout: { write: (s: string) => out1.push(s) } as unknown as NodeJS.WritableStream });
    expect(out1).toHaveLength(1);

    mockRead(ccWrite);
    const out2: string[] = [];
    await runHook(ADVISE_HOOK, { stdout: { write: (s: string) => out2.push(s) } as unknown as NodeJS.WritableStream });
    expect(out2).toHaveLength(1);
  });
});

describe('resolveExitCode — Bug 1 decision tree', () => {
  const DENY_CANONICAL = { hookSpecificOutput: { permissionDecision: 'deny' as const, permissionDecisionReason: 'no' } };
  const ALLOW_CANONICAL = { hookSpecificOutput: { permissionDecision: 'allow' as const } };

  test('deny on an exit-code-driven IDE (Windsurf) → adapter exit code (2)', () => {
    expect(resolveExitCode(deny('no')!, DENY_CANONICAL, 'windsurf')).toBe(2);
  });

  test('deny on a JSON-body-only IDE (Cursor) → 0 (deny is carried in the body, not the exit code)', () => {
    expect(resolveExitCode(deny('no')!, DENY_CANONICAL, 'cursor')).toBe(0);
  });

  test('deny on Claude Code / Codex / Copilot → 0', () => {
    expect(resolveExitCode(deny('no')!, DENY_CANONICAL, 'claude-code')).toBe(0);
    expect(resolveExitCode(deny('no')!, DENY_CANONICAL, 'codex')).toBe(0);
    expect(resolveExitCode(deny('no')!, DENY_CANONICAL, 'copilot')).toBe(0);
  });

  test('allow → 0 regardless of IDE', () => {
    expect(resolveExitCode(allow()!, ALLOW_CANONICAL, 'windsurf')).toBe(0);
  });

  test('_exitCode override bypasses deny-based resolution entirely', () => {
    expect(resolveExitCode({ kind: 'deny', reason: 'no', _exitCode: 7 }, DENY_CANONICAL, 'windsurf')).toBe(7);
  });

  test('_exitCode override applies even on an allow result', () => {
    expect(resolveExitCode({ kind: 'allow', _exitCode: 3 }, ALLOW_CANONICAL, 'cursor')).toBe(3);
  });

  test('unknown ide → 0 via exitCodeFor default, no throw', () => {
    expect(resolveExitCode(deny('no')!, DENY_CANONICAL, 'not-a-real-ide')).toBe(0);
  });

  test('malformed canonical that throws while resolving → 1000, not an unhandled error', () => {
    expect(resolveExitCode(deny('no')!, null as unknown as typeof DENY_CANONICAL, 'windsurf')).toBe(1000);
  });
});
