// gitnexus-refresh.test.ts — test suite for gitnexus-refresh.ts

import { test, describe, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

// vi.mock factories are hoisted to top-of-file before any let/const initializers,
// so mockSpawn must be declared with vi.hoisted() to be available inside them.
const { mockSpawn } = vi.hoisted(() => ({ mockSpawn: vi.fn() }));

vi.mock('../src/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/adapter')>();
  return { ...actual, readStdin: vi.fn() };
});

vi.mock('child_process', () => ({ spawn: mockSpawn }));

import { readStdin } from '../src/adapter';
import { gitnexusRefreshHook, DEBOUNCE_MS } from '../src/hooks/gitnexus-refresh';
import { runHook } from '../src/runtime/run-hook';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import ccEdit  from './fixtures/claude-code-post-tool-use-edit.json';

// ---------------------------------------------------------------------------
// Helpers

const REPO_ROOT = '/test-repo';

const makeInput = (overrides: Record<string, unknown> = {}) => ({
  ...ccWrite,
  cwd: REPO_ROOT,
  ...overrides,
});

const mockRead = (raw: Record<string, unknown>) =>
  (readStdin as ReturnType<typeof vi.fn>).mockResolvedValue(raw);

const getSpawnedScript = (): string => {
  const [, args] = mockSpawn.mock.calls[0] as [string, string[]];
  return args[1]; // sh -c "<script>"
};

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
  mockSpawn.mockReset();

  // Suppress real filesystem side-effects
  vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
  vi.spyOn(fs, 'appendFileSync').mockReturnValue(undefined);
  vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);
  vi.spyOn(fs, 'openSync').mockReturnValue(42 as ReturnType<typeof fs.openSync>);
  vi.spyOn(fs, 'closeSync').mockReturnValue(undefined);

  // .gitnexus/ exists only at REPO_ROOT by default
  vi.spyOn(fs, 'existsSync').mockImplementation(
    (p) => String(p) === `${REPO_ROOT}/.gitnexus`,
  );

  // No meta.json → hadEmbeddings = false
  vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  });

  mockSpawn.mockReturnValue({ unref: vi.fn() });

  // Default stdin: PostToolUse + Write at REPO_ROOT
  mockRead(makeInput());
});

// ---------------------------------------------------------------------------
describe('gitnexus-refresh — event filter', () => {

  test('PreToolUse → no spawn', async () => {
    mockRead(makeInput({ hook_event_name: 'PreToolUse' }));
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('Stop event → no spawn', async () => {
    mockRead(makeInput({ hook_event_name: 'Stop' }));
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('gitnexus-refresh — tool filter', () => {

  test('PostToolUse + Write → spawn triggered', async () => {
    mockRead(makeInput({ tool_name: 'Write' }));
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + Edit → spawn triggered', async () => {
    mockRead({ ...ccEdit, cwd: REPO_ROOT });
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + MultiEdit → spawn triggered', async () => {
    mockRead(makeInput({ tool_name: 'MultiEdit' }));
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + Bash → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Bash' }));
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('PostToolUse + Read → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Read' }));
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('PostToolUse + Glob → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Glob' }));
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('gitnexus-refresh — repo root detection', () => {

  test('no .gitnexus anywhere → no spawn', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('.gitnexus in cwd → spawn triggered', async () => {
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('.gitnexus one level up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src` }));
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === `${REPO_ROOT}/.gitnexus`,
    );
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('.gitnexus two levels up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src/components` }));
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === `${REPO_ROOT}/.gitnexus`,
    );
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('spawn is called with repoRoot as cwd option', async () => {
    await runHook(gitnexusRefreshHook);
    const callOpts = mockSpawn.mock.calls[0][2] as { cwd: string };
    expect(callOpts.cwd).toBe(REPO_ROOT);
  });

});

// ---------------------------------------------------------------------------
describe('gitnexus-refresh — trailing-edge debounce', () => {

  test('every invocation writes a pending stamp file', async () => {
    const wfSpy = vi.spyOn(fs, 'writeFileSync');
    await runHook(gitnexusRefreshHook);
    const pendingWrite = wfSpy.mock.calls.find(
      ([p]) => String(p).includes('.pending'),
    );
    expect(pendingWrite).toBeDefined();
  });

  test('every invocation spawns a deferred sleeper (no local suppression)', async () => {
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
    // Second call also spawns — debounce is in the spawned process
    await runHook(gitnexusRefreshHook);
    expect(mockSpawn).toHaveBeenCalledTimes(2);
  });

  test('spawned script sleeps for DEBOUNCE_MS before running analyze', async () => {
    await runHook(gitnexusRefreshHook);
    const script = getSpawnedScript();
    const expectedSleep = Math.ceil(DEBOUNCE_MS / 1000);
    expect(script).toContain(`sleep ${expectedSleep}`);
  });

  test('spawned script uses token-identity check before executing analyze', async () => {
    await runHook(gitnexusRefreshHook);
    const script = getSpawnedScript();
    expect(script).toContain(`current !== '`);
    expect(script).not.toContain('Date.now() - stamp');
  });

  test('spawned script reads the pending stamp file', async () => {
    await runHook(gitnexusRefreshHook);
    const script = getSpawnedScript();
    expect(script).toContain('.pending');
    expect(script).toContain('readFileSync');
  });

});

// ---------------------------------------------------------------------------
describe('gitnexus-refresh — analyze command in deferred script', () => {

  test('no meta.json → script contains analyze --force without --embeddings', async () => {
    await runHook(gitnexusRefreshHook);
    const script = getSpawnedScript();
    expect(script).toContain('npx gitnexus analyze --force');
    expect(script).not.toContain('--embeddings');
  });

  test('meta.json with embeddings=0 → no --embeddings in script', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return JSON.stringify({ stats: { embeddings: 0 } });
      throw new Error('ENOENT');
    });
    await runHook(gitnexusRefreshHook);
    const script = getSpawnedScript();
    expect(script).not.toContain('--embeddings');
  });

  test('meta.json with embeddings>0 → --embeddings included in script', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return JSON.stringify({ stats: { embeddings: 42 } });
      throw new Error('ENOENT');
    });
    await runHook(gitnexusRefreshHook);
    const script = getSpawnedScript();
    expect(script).toContain('--embeddings');
  });

  test('malformed meta.json → no --embeddings in script (graceful fallback)', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return 'NOT_JSON{{{';
      throw new Error('ENOENT');
    });
    await runHook(gitnexusRefreshHook);
    const script = getSpawnedScript();
    expect(script).not.toContain('--embeddings');
  });

  test('spawn is invoked as sh -c', async () => {
    await runHook(gitnexusRefreshHook);
    const [cmd, args] = mockSpawn.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('sh');
    expect(args[0]).toBe('-c');
  });

  test('spawn is called with detached: true', async () => {
    await runHook(gitnexusRefreshHook);
    const opts = mockSpawn.mock.calls[0][2] as { detached: boolean };
    expect(opts.detached).toBe(true);
  });

  test('child.unref() is called so hook does not block the agent', async () => {
    const unrefSpy = vi.fn();
    mockSpawn.mockReturnValue({ unref: unrefSpy });
    await runHook(gitnexusRefreshHook);
    expect(unrefSpy).toHaveBeenCalledOnce();
  });

});

// ---------------------------------------------------------------------------
describe('gitnexus-refresh — error resilience', () => {

  test('empty stdin (readStdin rejects) → no crash, no spawn', async () => {
    (readStdin as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('empty stdin'));
    await expect(runHook(gitnexusRefreshHook)).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('unrecognized IDE format → no crash, no spawn', async () => {
    (readStdin as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Unsupported IDE: [foo]'),
    );
    await expect(runHook(gitnexusRefreshHook)).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('spawn throwing → hook resolves without propagating error', async () => {
    mockSpawn.mockImplementation(() => { throw new Error('spawn failed'); });
    await expect(runHook(gitnexusRefreshHook)).resolves.toBeUndefined();
  });

});

// ---------------------------------------------------------------------------
describe('gitnexus-refresh — never writes to stdout', () => {

  test('happy path (trigger fires) → nothing written to process.stdout', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runHook(gitnexusRefreshHook);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test('no-op path (wrong tool) → nothing written to process.stdout', async () => {
    mockRead(makeInput({ tool_name: 'Bash' }));
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runHook(gitnexusRefreshHook);
    expect(writeSpy).not.toHaveBeenCalled();
  });

});
