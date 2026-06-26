import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { NormalizedInput } from '../../src/types';

const readStdinMock = vi.hoisted(() => vi.fn());
const debugLogHookMock = vi.hoisted(() => vi.fn());
const debugLogBranchMock = vi.hoisted(() => vi.fn());

vi.mock('../../src/adapter', () => ({
  readStdin: readStdinMock,
  detectIDE: () => 'codex',
  normalize: (raw: Record<string, unknown>): NormalizedInput => ({
    ...raw,
    ide: 'codex',
    event: 'PostToolUse',
    toolKind: 'write',
    hook_event_name: 'PostToolUse',
    tool_name: 'Write',
    tool_input: { file_path: '/proj/src/note.md' },
    file_path: '/proj/src/note.md',
    cwd: '/proj',
    session_id: 'session-1',
  } as NormalizedInput),
  formatOutput: (canonicalOutput: Record<string, unknown>) => canonicalOutput,
  dedupKey: () => null,
}));

vi.mock('../../src/runtime/debug-log', () => ({
  collectEnvironment: () => ({}),
  debugLogHook: debugLogHookMock,
  debugLogBranch: debugLogBranchMock,
}));

describe('runHook debug logging contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readStdinMock.mockResolvedValue({
      hook_event_name: 'PostToolUse',
      tool_name: 'Write',
      tool_input: { file_path: '/proj/src/note.md' },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('logs full hook, canonical, final, and serialized stdout output', async () => {
    const { runHook } = await import('../../src/runtime/run-hook');
    const { defineHook } = await import('../../src/runtime/define-hook');
    const { advise } = await import('../../src/runtime/result-helpers');
    const hook = defineHook({
      name: 'debug-output-test',
      on: { event: 'PostToolUse', toolKinds: ['write'] },
      run: () => advise('full additional context'),
    });
    const out: string[] = [];

    await runHook(hook, {
      stdout: { write: (s: string) => out.push(s) } as unknown as NodeJS.WritableStream,
    });

    const outputCall = debugLogHookMock.mock.calls.find(
      ([hookName, phase]) => hookName === 'debug-output-test' && phase === 'output',
    );
    expect(outputCall).toBeTruthy();
    const context = outputCall![2] as Record<string, unknown>;

    expect(context.hookResultFull).toEqual({ kind: 'advise', message: 'full additional context' });
    expect(context.canonicalOutputFull).toMatchObject({
      hookSpecificOutput: {
        additionalContext: 'full additional context',
      },
    });
    expect(context.finalOutputFull).toBe(context.canonicalOutputFull);
    expect(context.finalOutputText).toBe(out[0]);
    expect(JSON.parse(context.finalOutputText as string)).toMatchObject({
      hookSpecificOutput: {
        additionalContext: 'full additional context',
      },
    });
  });

  test('logs actual process exit code from process exit event', async () => {
    const { runAsCli } = await import('../../src/runtime/run-hook');
    const { defineHook } = await import('../../src/runtime/define-hook');
    const hook = defineHook({
      name: 'debug-exit-test',
      on: { event: 'PostToolUse', toolKinds: ['write'] },
      run: () => null,
    });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: string | number | null) => {
      process.emit('exit', Number(code ?? 0));
      return undefined as never;
    }) as typeof process.exit);

    runAsCli(hook, require.main as NodeModule);

    await vi.waitFor(() => {
      expect(exitSpy).toHaveBeenCalledWith(0);
    });
    const exitCall = debugLogHookMock.mock.calls.find(
      ([hookName, phase]) => hookName === 'debug-exit-test' && phase === 'process-exit',
    );
    expect(exitCall?.[2]).toMatchObject({
      actualExitCode: 0,
      intendedExitCode: 0,
      status: 'completed',
      wroteOutput: false,
      reason: 'null-result',
    });
  });
});
