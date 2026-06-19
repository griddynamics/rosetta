// codemap-refresh.test.ts — test suite for codemap-refresh.ts

import { test, describe, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// vi.mock factories are hoisted to top-of-file before any let/const initializers,
// so mockSpawn must be declared with vi.hoisted() to be available inside them.
const { mockSpawn } = vi.hoisted(() => ({ mockSpawn: vi.fn() }));

vi.mock('../src/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/adapter')>();
  return { ...actual, readStdin: vi.fn() };
});

vi.mock('child_process', () => ({ spawn: mockSpawn }));

import { readStdin } from '../src/adapter';
import { codemapRefreshHook, DEBOUNCE_MS } from '../src/hooks/codemap-refresh';
import { runHook } from '../src/runtime/run-hook';

import ccWrite from './fixtures/claude-code-post-tool-use-write.json';
import ccEdit  from './fixtures/claude-code-post-tool-use-edit.json';

// ---------------------------------------------------------------------------
// Helpers

const REPO_ROOT = '/test-repo';
const CACHE_DIR = path.join(os.homedir(), '.cache', 'codemap');

const makeInput = (overrides: Record<string, unknown> = {}) => ({
  ...ccWrite,
  cwd: REPO_ROOT,
  ...overrides,
});

const mockRead = (raw: Record<string, unknown>) =>
  (readStdin as ReturnType<typeof vi.fn>).mockResolvedValue(raw);

const getSpawnedScript = (callIndex = 0): string => {
  const [, args] = mockSpawn.mock.calls[callIndex] as [string, string[]];
  return args[1]; // sh -c "<script>"
};

// Compute the exact lock path the hook will use for a backend+repoRoot, so
// tests can pre-seed a stale lock deterministically.
const lockPathFor = (backend: string, repoRoot: string): string => {
  const key = Buffer.from(`${backend}:${repoRoot}`).toString('base64').replace(/[/+=]/g, '_');
  return path.join(CACHE_DIR, `${key}.pending`);
};

// In-memory model of the lock files on disk. Modelling the atomic `wx` create
// (O_EXCL) lets us assert the PRE-CHECK debounce without running real sleepers.
let lockFiles: Map<string, string>;

const installLockFsModel = () => {
  // openSync: 'wx' = atomic exclusive create of a lock; anything else = log fd.
  vi.spyOn(fs, 'openSync').mockImplementation((p, flags) => {
    const ps = String(p);
    if (flags === 'wx') {
      if (lockFiles.has(ps)) {
        throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
      }
      lockFiles.set(ps, String(Date.now()));
      return 99 as ReturnType<typeof fs.openSync>;
    }
    return 42 as ReturnType<typeof fs.openSync>; // log file append fd
  });
  vi.spyOn(fs, 'writeSync').mockReturnValue(0);
  vi.spyOn(fs, 'closeSync').mockReturnValue(undefined);
  vi.spyOn(fs, 'unlinkSync').mockImplementation((p) => { lockFiles.delete(String(p)); });

  // readFileSync: lock staleness reads return the stored creation time (fresh);
  // .gitnexus/meta.json defaults to ENOENT (hadEmbeddings = false).
  vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
    const ps = String(p);
    if (ps.endsWith('.pending')) {
      const v = lockFiles.get(ps);
      if (v === undefined) throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return v;
    }
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  });
};

// existsSync helpers for backend marker detection (used by walkUp).
const mockOnlyGitnexus = () => {
  vi.spyOn(fs, 'existsSync').mockImplementation(
    (p) => String(p) === `${REPO_ROOT}/.gitnexus`,
  );
};

const mockOnlyGraphify = () => {
  vi.spyOn(fs, 'existsSync').mockImplementation(
    (p) => String(p) === path.join(REPO_ROOT, 'graphify-out', 'graph.json'),
  );
};

const mockBothBackends = () => {
  vi.spyOn(fs, 'existsSync').mockImplementation(
    (p) =>
      String(p) === `${REPO_ROOT}/.gitnexus` ||
      String(p) === path.join(REPO_ROOT, 'graphify-out', 'graph.json'),
  );
};

const mockNeitherBackend = () => {
  vi.spyOn(fs, 'existsSync').mockReturnValue(false);
};

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
  mockSpawn.mockReset();
  lockFiles = new Map();

  // Suppress real filesystem side-effects
  vi.spyOn(fs, 'mkdirSync').mockReturnValue(undefined);
  vi.spyOn(fs, 'appendFileSync').mockReturnValue(undefined);
  vi.spyOn(fs, 'writeFileSync').mockReturnValue(undefined);

  installLockFsModel();

  // Default: only .gitnexus/ at REPO_ROOT
  mockOnlyGitnexus();

  mockSpawn.mockReturnValue({ unref: vi.fn() });

  // Default stdin: PostToolUse + Write at REPO_ROOT
  mockRead(makeInput());
});

// ---------------------------------------------------------------------------
describe('codemap-refresh — event filter', () => {

  test('PreToolUse → no spawn', async () => {
    mockRead(makeInput({ hook_event_name: 'PreToolUse' }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('Stop event → no spawn', async () => {
    mockRead(makeInput({ hook_event_name: 'Stop' }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — tool filter', () => {

  test('PostToolUse + Write → spawn triggered', async () => {
    mockRead(makeInput({ tool_name: 'Write' }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + Edit → spawn triggered', async () => {
    mockRead({ ...ccEdit, cwd: REPO_ROOT });
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + MultiEdit → spawn triggered', async () => {
    mockRead(makeInput({ tool_name: 'MultiEdit' }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + Bash → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Bash' }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('PostToolUse + Read → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Read' }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('PostToolUse + Glob → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Glob' }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — neither backend → silent no-op', () => {

  test('no backend markers anywhere → no spawn', async () => {
    mockNeitherBackend();
    await runHook(codemapRefreshHook);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('no backend markers → no lock acquired', async () => {
    mockNeitherBackend();
    await runHook(codemapRefreshHook);
    expect(lockFiles.size).toBe(0);
  });

  test('no backend markers → no stdout output', async () => {
    mockNeitherBackend();
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runHook(codemapRefreshHook);
    expect(writeSpy).not.toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — GitNexus only backend', () => {

  test('.gitnexus in cwd → spawn triggered', async () => {
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('.gitnexus one level up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src` }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('.gitnexus two levels up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src/components` }));
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('spawn is called with repoRoot as cwd option', async () => {
    await runHook(codemapRefreshHook);
    const callOpts = mockSpawn.mock.calls[0][2] as { cwd: string };
    expect(callOpts.cwd).toBe(REPO_ROOT);
  });

  test('spawned script contains npx gitnexus analyze --force', async () => {
    await runHook(codemapRefreshHook);
    expect(getSpawnedScript()).toContain('npx gitnexus analyze --force');
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — Graphify only backend', () => {

  beforeEach(() => {
    mockOnlyGraphify();
  });

  test('graphify-out/graph.json in cwd → spawn triggered', async () => {
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('graphify-out/graph.json one level up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src` }));
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === path.join(REPO_ROOT, 'graphify-out', 'graph.json'),
    );
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('graphify-out/graph.json two levels up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src/components` }));
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === path.join(REPO_ROOT, 'graphify-out', 'graph.json'),
    );
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('spawned script contains graphify update .', async () => {
    await runHook(codemapRefreshHook);
    expect(getSpawnedScript()).toContain('graphify update .');
  });

  test('spawned script does NOT contain npx gitnexus', async () => {
    await runHook(codemapRefreshHook);
    expect(getSpawnedScript()).not.toContain('npx gitnexus');
  });

  test('no --embeddings flag for Graphify', async () => {
    await runHook(codemapRefreshHook);
    expect(getSpawnedScript()).not.toContain('--embeddings');
  });

  test('spawn cwd set to graphify repo root', async () => {
    await runHook(codemapRefreshHook);
    const callOpts = mockSpawn.mock.calls[0][2] as { cwd: string };
    expect(callOpts.cwd).toBe(REPO_ROOT);
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — both backends present', () => {

  beforeEach(() => {
    mockBothBackends();
  });

  test('both backends → two spawns (one per backend)', async () => {
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledTimes(2);
  });

  test('both backends → gitnexus command in one script', async () => {
    await runHook(codemapRefreshHook);
    const scripts = mockSpawn.mock.calls.map((call) => (call as [string, string[]])[1][1]);
    expect(scripts.some((s) => s.includes('npx gitnexus analyze --force'))).toBe(true);
  });

  test('both backends → graphify command in one script', async () => {
    await runHook(codemapRefreshHook);
    const scripts = mockSpawn.mock.calls.map((call) => (call as [string, string[]])[1][1]);
    expect(scripts.some((s) => s.includes('graphify update .'))).toBe(true);
  });

  test('both backends → two distinct lock files (keyed per backend)', async () => {
    await runHook(codemapRefreshHook);
    const keys = [...lockFiles.keys()];
    expect(keys).toHaveLength(2);
    expect(keys[0]).not.toBe(keys[1]);
  });

  test('both backends are scheduled independently in one window (each once)', async () => {
    // Second burst edit while both are scheduled → no additional spawns.
    await runHook(codemapRefreshHook);
    mockRead(makeInput());
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledTimes(2); // still 2, not 4
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — PRE-CHECK debounce (burst coalescing)', () => {

  test('5 edits in one window → exactly ONE spawn (one sleep, one refresh)', async () => {
    for (let i = 0; i < 5; i++) {
      mockRead(makeInput());
      await runHook(codemapRefreshHook);
    }
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    // exactly one lock is held for the burst
    expect(lockFiles.size).toBe(1);
  });

  test('a new edit AFTER the deferred refresh released the lock → schedules again', async () => {
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    // Simulate the deferred process finishing: it removes the lock in `finally`.
    lockFiles.clear();
    mockRead(makeInput());
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledTimes(2);
  });

  test('the lock is created with atomic exclusive create (wx), not plain write', async () => {
    await runHook(codemapRefreshHook);
    const openCalls = (fs.openSync as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const lockOpens = openCalls.filter(([, flags]) => flags === 'wx');
    expect(lockOpens).toHaveLength(1);
  });

  test('deferred script waits DEBOUNCE_MS via setTimeout before refreshing', async () => {
    await runHook(codemapRefreshHook);
    const script = getSpawnedScript();
    expect(script).toContain('setTimeout');
    expect(script).toContain(`}, ${DEBOUNCE_MS});`);
  });

  test('deferred script releases the lock when done (unlinkSync in finally)', async () => {
    await runHook(codemapRefreshHook);
    const script = getSpawnedScript();
    expect(script).toContain('finally');
    expect(script).toContain('unlinkSync');
  });

  test('a stale lock (dead sleeper) is reclaimed and reschedules', async () => {
    // Pre-seed the gitnexus lock with an ancient timestamp → considered stale.
    lockFiles.set(lockPathFor('gitnexus', REPO_ROOT), '1');
    await runHook(codemapRefreshHook);
    expect(mockSpawn).toHaveBeenCalledTimes(1); // reclaimed and rescheduled
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — cross-platform deferral & escaping', () => {

  test('deferred process is detached node -e (no shell), so it runs on Windows too', async () => {
    await runHook(codemapRefreshHook);
    const [cmd, args, opts] = mockSpawn.mock.calls[0] as [string, string[], { detached: boolean }];
    expect(cmd).toBe(process.execPath); // the node binary, not `sh`
    expect(args[0]).toBe('-e');
    expect(opts.detached).toBe(true);
    // no shell artifacts in the script
    expect(getSpawnedScript()).not.toContain('sleep ');
  });

  test('repoRoot with a quote and a backslash is JS-escaped in the deferred script', async () => {
    const TRICKY = "/tmp/a'b\\c"; // actual value: /tmp/a'b\c  (one quote, one backslash)
    mockRead(makeInput({ cwd: TRICKY }));
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === `${TRICKY}/.gitnexus`,
    );
    await runHook(codemapRefreshHook);
    const script = getSpawnedScript();
    // backslash doubled, quote backslash-escaped → safe inside a single-quoted JS string
    expect(script).toContain("/tmp/a\\'b\\\\c");
    // the raw, unescaped form must NOT appear (would break the JS string)
    expect(script).not.toContain("/tmp/a'b\\c");
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — concurrent sessions', () => {

  test('two/three sessions editing the SAME repo → coalesce to one refresh', async () => {
    // Distinct sessions appear as edits from different cwds under the same repo.
    for (const cwd of [REPO_ROOT, `${REPO_ROOT}/src`, `${REPO_ROOT}/lib`]) {
      mockRead(makeInput({ cwd }));
      await runHook(codemapRefreshHook);
    }
    // All resolve to repoRoot=REPO_ROOT → same lock → one spawn.
    expect(mockSpawn).toHaveBeenCalledTimes(1);
    expect(lockFiles.size).toBe(1);
  });

  test('sessions editing DIFFERENT repos → independent refresh each', async () => {
    const REPO_A = '/repo-a';
    const REPO_B = '/repo-b';
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === `${REPO_A}/.gitnexus` || String(p) === `${REPO_B}/.gitnexus`,
    );

    mockRead(makeInput({ cwd: REPO_A }));
    await runHook(codemapRefreshHook);
    mockRead(makeInput({ cwd: REPO_B }));
    await runHook(codemapRefreshHook);

    expect(mockSpawn).toHaveBeenCalledTimes(2);
    expect(lockFiles.size).toBe(2);
    const cwds = mockSpawn.mock.calls.map((c) => (c[2] as { cwd: string }).cwd);
    expect(cwds).toContain(REPO_A);
    expect(cwds).toContain(REPO_B);
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — analyze command in deferred script (GitNexus)', () => {

  test('no meta.json → script contains analyze --force without --embeddings', async () => {
    await runHook(codemapRefreshHook);
    const script = getSpawnedScript();
    expect(script).toContain('npx gitnexus analyze --force');
    expect(script).not.toContain('--embeddings');
  });

  test('meta.json with embeddings=0 → no --embeddings in script', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return JSON.stringify({ stats: { embeddings: 0 } });
      if (String(p).endsWith('.pending')) return String(Date.now());
      throw new Error('ENOENT');
    });
    await runHook(codemapRefreshHook);
    expect(getSpawnedScript()).not.toContain('--embeddings');
  });

  test('meta.json with embeddings>0 → --embeddings included in script', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return JSON.stringify({ stats: { embeddings: 42 } });
      if (String(p).endsWith('.pending')) return String(Date.now());
      throw new Error('ENOENT');
    });
    await runHook(codemapRefreshHook);
    expect(getSpawnedScript()).toContain('--embeddings');
  });

  test('malformed meta.json → no --embeddings in script (graceful fallback)', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return 'NOT_JSON{{{';
      if (String(p).endsWith('.pending')) return String(Date.now());
      throw new Error('ENOENT');
    });
    await runHook(codemapRefreshHook);
    expect(getSpawnedScript()).not.toContain('--embeddings');
  });

  test('spawn is called with detached: true', async () => {
    await runHook(codemapRefreshHook);
    const opts = mockSpawn.mock.calls[0][2] as { detached: boolean };
    expect(opts.detached).toBe(true);
  });

  test('child.unref() is called so hook does not block the agent', async () => {
    const unrefSpy = vi.fn();
    mockSpawn.mockReturnValue({ unref: unrefSpy });
    await runHook(codemapRefreshHook);
    expect(unrefSpy).toHaveBeenCalledOnce();
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — error resilience', () => {

  test('empty stdin (readStdin rejects) → no crash, no spawn', async () => {
    (readStdin as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('empty stdin'));
    await expect(runHook(codemapRefreshHook)).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('unrecognized IDE format → no crash, no spawn', async () => {
    (readStdin as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Unsupported IDE: [foo]'),
    );
    await expect(runHook(codemapRefreshHook)).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('spawn throwing → hook resolves and the lock is released (not wedged)', async () => {
    mockSpawn.mockImplementation(() => { throw new Error('spawn failed'); });
    await expect(runHook(codemapRefreshHook)).resolves.toBeUndefined();
    // a failed spawn must release the lock so the next edit can reschedule
    expect(lockFiles.size).toBe(0);
  });

  test('log-file open failure → lock released (not wedged), no spawn', async () => {
    // Lock acquire (wx) still succeeds; opening the log fd ('a') fails.
    vi.spyOn(fs, 'openSync').mockImplementation((p, flags) => {
      if (flags === 'wx') {
        const ps = String(p);
        if (lockFiles.has(ps)) throw Object.assign(new Error('EEXIST'), { code: 'EEXIST' });
        lockFiles.set(ps, String(Date.now()));
        return 99 as ReturnType<typeof fs.openSync>;
      }
      throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
    });
    await expect(runHook(codemapRefreshHook)).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
    expect(lockFiles.size).toBe(0); // lock released despite the log-open failure
  });

});

// ---------------------------------------------------------------------------
describe('codemap-refresh — never writes to stdout', () => {

  test('happy path (trigger fires) → nothing written to process.stdout', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runHook(codemapRefreshHook);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test('no-op path (wrong tool) → nothing written to process.stdout', async () => {
    mockRead(makeInput({ tool_name: 'Bash' }));
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runHook(codemapRefreshHook);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test('no-op path (neither backend) → nothing written to process.stdout', async () => {
    mockNeitherBackend();
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await runHook(codemapRefreshHook);
    expect(writeSpy).not.toHaveBeenCalled();
  });

});
