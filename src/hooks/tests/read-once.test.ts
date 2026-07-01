import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { mockRead, stateByNamespace } = vi.hoisted(() => ({
  mockRead: vi.fn(),
  stateByNamespace: new Map<string, unknown>(),
}));

vi.mock('../src/adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/adapter')>();
  return { ...actual, readStdin: mockRead };
});

vi.mock('../src/runtime/state-store', () => ({
  readNamespacedState: <T>(namespace: string, fallback: T): T => {
    const current = stateByNamespace.get(namespace);
    return current == null ? JSON.parse(JSON.stringify(fallback)) as T : current as T;
  },
  mutateNamespacedState: async <T>(
    namespace: string,
    fallback: T,
    mutate: (current: T) => T,
  ): Promise<T> => {
    const current = stateByNamespace.get(namespace) == null
      ? JSON.parse(JSON.stringify(fallback)) as T
      : stateByNamespace.get(namespace) as T;
    const next = mutate(current);
    stateByNamespace.set(namespace, next);
    return next;
  },
}));

import { runHook } from '../src/runtime/run-hook';
import { readOnceHook } from '../src/hooks/read-once';
import { readOnceResetHook } from '../src/hooks/read-once-reset';
import { readReadOnceState, READ_ONCE_NAMESPACE } from '../src/hooks/read-once-shared';
import fxCodexMcpRead from './fixtures/codex-pre-tool-use-mcp-read.json';

const makeClaudeRead = (
  filePath: string,
  sessionId = 'claude-session-001',
  toolInput: Record<string, unknown> = {},
): Record<string, unknown> => ({
  hook_event_name: 'PreToolUse',
  session_id: sessionId,
  tool_name: 'Read',
  tool_input: { file_path: filePath, ...toolInput },
  cwd: path.dirname(filePath),
});

const makeClaudePreCompact = (
  sessionId: string,
  agentId?: string,
): Record<string, unknown> => ({
  hook_event_name: 'PreCompact',
  session_id: sessionId,
  agent_id: agentId,
  tool_input: {},
  cwd: '/proj',
});

const makeClaudePostCompact = (sessionId: string): Record<string, unknown> => ({
  hook_event_name: 'PostCompact',
  session_id: sessionId,
  tool_input: {},
  cwd: '/proj',
});

const runHookWithRaw = async (
  def: Parameters<typeof runHook>[0],
  raw: Record<string, unknown>,
): Promise<Record<string, unknown> | null> => {
  mockRead.mockResolvedValue(raw);
  const out: string[] = [];
  await runHook(def, {
    stdout: {
      write: (chunk: string) => {
        out.push(chunk);
        return true;
      },
    } as unknown as NodeJS.WriteStream,
  });
  return out.length === 0 ? null : JSON.parse(out[0]) as Record<string, unknown>;
};

describe('read-once', () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    stateByNamespace.clear();
    delete process.env.READ_ONCE_MODE;
    delete process.env.READ_ONCE_TTL;
    delete process.env.READ_ONCE_DISABLED;

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'read-once-'));
    filePath = path.join(tempDir, 'sample.ts');
    fs.writeFileSync(filePath, 'export const value = 1;\n');
  });

  afterEach(() => {
    vi.useRealTimers();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('first read is allowed and recorded', async () => {
    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    expect(result).toBeNull();

    const state = readReadOnceState();
    expect(stateByNamespace.has(READ_ONCE_NAMESPACE)).toBe(true);
    expect(Object.keys(state.sessions)).toHaveLength(1);
    expect(Object.keys(state.global)).toContain(filePath);
  });

  test('second same-session read warns by default', async () => {
    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));

    expect(result?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'allow',
    });
    expect((result?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('already in context');
    expect((result?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('retry via shell');
    expect((result?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('# READ-OVERRIDE');
  });

  test('second same-session read denies in deny mode', async () => {
    process.env.READ_ONCE_MODE = 'deny';

    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));

    expect(result?.continue).toBe(false);
    expect(result?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'deny',
    });
  });

  test('partial reads bypass dedupe', async () => {
    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    const result = await runHookWithRaw(
      readOnceHook,
      makeClaudeRead(filePath, 'claude-session-001', { offset: 10 }),
    );
    expect(result).toBeNull();
  });

  test('cross-session first read is advisory, not blocked', async () => {
    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath, 'claude-session-a'));
    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(filePath, 'claude-session-b'));

    expect(result?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'allow',
    });
    expect((result?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('another context');
  });

  test('ttl expiry re-allows the read', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    process.env.READ_ONCE_TTL = '1';

    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    vi.setSystemTime(new Date('2026-01-01T00:00:02Z'));

    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    expect(result).toBeNull();
  });

  test('preCompact reset clears the ledger for the current session', async () => {
    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    await runHookWithRaw(readOnceResetHook, makeClaudePreCompact('claude-session-001'));

    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    expect(result).toBeNull();
  });

  test('postCompact reset clears the ledger for the current session', async () => {
    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    await runHookWithRaw(readOnceResetHook, makeClaudePostCompact('claude-session-001'));

    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    expect(result).toBeNull();
  });

  test('same session different agents do not dedupe each other', async () => {
    await runHookWithRaw(readOnceHook, {
      ...makeClaudeRead(filePath, 'claude-session-001'),
      agent_id: 'agent-a',
    });

    const result = await runHookWithRaw(readOnceHook, {
      ...makeClaudeRead(filePath, 'claude-session-001'),
      agent_id: 'agent-b',
    });

    expect(result?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'allow',
    });
    expect((result?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('another context');
  });

  test('reset clears the matching agent session ledger but preserves cross-agent advisory state', async () => {
    await runHookWithRaw(readOnceHook, {
      ...makeClaudeRead(filePath, 'claude-session-001'),
      agent_id: 'agent-a',
    });
    await runHookWithRaw(readOnceHook, {
      ...makeClaudeRead(filePath, 'claude-session-001'),
      agent_id: 'agent-b',
    });

    await runHookWithRaw(readOnceResetHook, makeClaudePreCompact('claude-session-001', 'agent-a'));

    const agentAResult = await runHookWithRaw(readOnceHook, {
      ...makeClaudeRead(filePath, 'claude-session-001'),
      agent_id: 'agent-a',
    });
    const agentBResult = await runHookWithRaw(readOnceHook, {
      ...makeClaudeRead(filePath, 'claude-session-001'),
      agent_id: 'agent-b',
    });

    expect(agentAResult?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'allow',
    });
    expect((agentAResult?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('another context');
    expect(agentBResult?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'allow',
    });
    expect((agentBResult?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('already in context');
  });

  test('simple bash reads are deduplicated through the same hook', async () => {
    const raw = {
      hook_event_name: 'PreToolUse',
      session_id: 'claude-session-001',
      tool_name: 'Bash',
      tool_input: { command: `cat "${filePath}"` },
      cwd: tempDir,
    };

    await runHookWithRaw(readOnceHook, raw);
    const result = await runHookWithRaw(readOnceHook, raw);

    expect(result?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'allow',
    });
    expect((result?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('already in context');
  });

  test('same-session read override allows a repeated bash read without advisory', async () => {
    const first = {
      hook_event_name: 'PreToolUse',
      session_id: 'claude-session-001',
      tool_name: 'Bash',
      tool_input: { command: `cat "${filePath}"` },
      cwd: tempDir,
    };
    const second = {
      ...first,
      tool_input: { command: `cat "${filePath}" # READ-OVERRIDE` },
    };

    await runHookWithRaw(readOnceHook, first);
    const result = await runHookWithRaw(readOnceHook, second);

    expect(result).toBeNull();
  });

  test('same-session read override bypasses deny mode too', async () => {
    process.env.READ_ONCE_MODE = 'deny';

    await runHookWithRaw(readOnceHook, makeClaudeRead(filePath));
    const result = await runHookWithRaw(readOnceHook, makeClaudeRead(
      filePath,
      'claude-session-001',
      { comment: 'READ-OVERRIDE' },
    ));

    expect(result).toBeNull();
  });

  test('complex bash commands pass through without read-once blocking', async () => {
    const raw = {
      hook_event_name: 'PreToolUse',
      session_id: 'claude-session-001',
      tool_name: 'Bash',
      tool_input: { command: `cat "${filePath}" | sed -n '1,5p'` },
      cwd: tempDir,
    };

    await runHookWithRaw(readOnceHook, raw);
    const result = await runHookWithRaw(readOnceHook, raw);

    expect(result).toBeNull();
  });

  test('codex MCP filesystem read goes through the same runtime path', async () => {
    const raw = {
      ...(fxCodexMcpRead as unknown as Record<string, unknown>),
      tool_input: { file_path: filePath },
      cwd: tempDir,
    };
    await runHookWithRaw(readOnceHook, raw);
    const result = await runHookWithRaw(readOnceHook, raw);

    expect(result?.hookSpecificOutput).toMatchObject({
      permissionDecision: 'allow',
    });
    expect((result?.hookSpecificOutput as Record<string, unknown>).additionalContext).toContain('already in context');
  });
});
