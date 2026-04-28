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
import { main } from '../src/gitnexus-refresh';

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

  // No stamp file → shouldTrigger returns true (first run)
  vi.spyOn(fs, 'statSync').mockImplementation(() => {
    throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
  });

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
describe('main() — event filter', () => {

  test('PreToolUse → no spawn', async () => {
    mockRead(makeInput({ hook_event_name: 'PreToolUse' }));
    await main();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('Stop event → no spawn', async () => {
    mockRead(makeInput({ hook_event_name: 'Stop' }));
    await main();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('main() — tool filter', () => {

  test('PostToolUse + Write → spawn triggered', async () => {
    mockRead(makeInput({ tool_name: 'Write' }));
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + Edit → spawn triggered', async () => {
    mockRead({ ...ccEdit, cwd: REPO_ROOT });
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + MultiEdit → spawn triggered', async () => {
    mockRead(makeInput({ tool_name: 'MultiEdit' }));
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('PostToolUse + Bash → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Bash' }));
    await main();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('PostToolUse + Read → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Read' }));
    await main();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('PostToolUse + Glob → no spawn', async () => {
    mockRead(makeInput({ tool_name: 'Glob' }));
    await main();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('main() — repo root detection', () => {

  test('no .gitnexus anywhere → no spawn', async () => {
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    await main();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('.gitnexus in cwd → spawn triggered', async () => {
    // existsSync already returns true for REPO_ROOT/.gitnexus (default)
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('.gitnexus one level up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src` }));
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === `${REPO_ROOT}/.gitnexus`,
    );
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('.gitnexus two levels up → spawn triggered', async () => {
    mockRead(makeInput({ cwd: `${REPO_ROOT}/src/components` }));
    vi.spyOn(fs, 'existsSync').mockImplementation(
      (p) => String(p) === `${REPO_ROOT}/.gitnexus`,
    );
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('spawn is called with repoRoot as cwd option', async () => {
    await main();
    const callOpts = mockSpawn.mock.calls[0][2] as { cwd: string };
    expect(callOpts.cwd).toBe(REPO_ROOT);
  });

});

// ---------------------------------------------------------------------------
describe('main() — debounce gate', () => {

  test('no stamp file (first run) → spawn triggered', async () => {
    // Default: statSync throws → first run
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('stamp mtime within 5 s → spawn suppressed', async () => {
    vi.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: Date.now() - 100 } as fs.Stats);
    await main();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('stamp mtime older than 5 s → spawn triggered', async () => {
    vi.spyOn(fs, 'statSync').mockReturnValue({ mtimeMs: Date.now() - 6000 } as fs.Stats);
    await main();
    expect(mockSpawn).toHaveBeenCalledOnce();
  });

  test('stamp file is written when hook fires', async () => {
    const wfSpy = vi.spyOn(fs, 'writeFileSync');
    await main();
    expect(wfSpy).toHaveBeenCalled();
  });

});

// ---------------------------------------------------------------------------
describe('main() — analyze spawn arguments', () => {

  test('no meta.json → args are [gitnexus, analyze, --force] without --embeddings', async () => {
    await main();
    const [cmd, args] = mockSpawn.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('npx');
    expect(args).toEqual(['gitnexus', 'analyze', '--force']);
    expect(args).not.toContain('--embeddings');
  });

  test('meta.json with embeddings=0 → no --embeddings flag', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return JSON.stringify({ stats: { embeddings: 0 } });
      throw new Error('ENOENT');
    });
    await main();
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).not.toContain('--embeddings');
  });

  test('meta.json with embeddings>0 → --embeddings flag appended', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return JSON.stringify({ stats: { embeddings: 42 } });
      throw new Error('ENOENT');
    });
    await main();
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).toContain('--embeddings');
    expect(args).toEqual(['gitnexus', 'analyze', '--force', '--embeddings']);
  });

  test('malformed meta.json → no --embeddings flag (graceful fallback)', async () => {
    vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
      if (String(p).includes('meta.json')) return 'NOT_JSON{{{';
      throw new Error('ENOENT');
    });
    await main();
    const args = mockSpawn.mock.calls[0][1] as string[];
    expect(args).not.toContain('--embeddings');
  });

  test('spawn is called with detached: true', async () => {
    await main();
    const opts = mockSpawn.mock.calls[0][2] as { detached: boolean };
    expect(opts.detached).toBe(true);
  });

  test('child.unref() is called so hook does not block the agent', async () => {
    const unrefSpy = vi.fn();
    mockSpawn.mockReturnValue({ unref: unrefSpy });
    await main();
    expect(unrefSpy).toHaveBeenCalledOnce();
  });

});

// ---------------------------------------------------------------------------
describe('main() — error resilience', () => {

  test('empty stdin (readStdin rejects) → no crash, no spawn', async () => {
    (readStdin as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('empty stdin'));
    await expect(main()).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('unrecognized IDE format → no crash, no spawn', async () => {
    (readStdin as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Unsupported IDE: [foo]'),
    );
    await expect(main()).resolves.toBeUndefined();
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  test('spawn throwing → hook resolves without propagating error', async () => {
    mockSpawn.mockImplementation(() => { throw new Error('spawn failed'); });
    await expect(main()).resolves.toBeUndefined();
  });

});

// ---------------------------------------------------------------------------
describe('main() — never writes to stdout', () => {

  test('happy path (trigger fires) → nothing written to process.stdout', async () => {
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await main();
    expect(writeSpy).not.toHaveBeenCalled();
  });

  test('no-op path (wrong tool) → nothing written to process.stdout', async () => {
    mockRead(makeInput({ tool_name: 'Bash' }));
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    await main();
    expect(writeSpy).not.toHaveBeenCalled();
  });

});
