import { test, describe, expect, vi, beforeEach } from 'vitest';
import { runHook } from '../../src/runtime/run-hook';
import { defineHook } from '../../src/runtime/define-hook';
import { advise, sideEffect } from '../../src/runtime/result-helpers';
import { readStdin } from '../../src/adapter';
import ccWrite from '../fixtures/claude-code-post-tool-use-write.json';

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
