import { mkdtempSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { ClaudeCodeAdapter } from '../../src/agents/claude-code/adapter';
import { CLAUDE_CODE_DEFAULT_PROFILE } from '../../src/agents/claude-code/profile';
import { computeTranscriptPath, encodeCwd } from '../../src/agents/claude-code/transcript-path';
import { agentProfileSchema } from '../../src/config/schema';
import type { CanonicalHookSpec, TrialContext } from '../../src/agents/types';

const adapter = new ClaudeCodeAdapter();

/** A trial context shaped like the lifecycle builds one (§7). */
function ctx(over: Partial<TrialContext> = {}): TrialContext {
  const workspace = over.workspace ?? '/tmp/ws';
  const ctrlDir = over.ctrlDir ?? '/tmp/ctrl';
  return {
    agentId: 'claude-code',
    caseName: 'c',
    repeat: 1,
    workspace,
    ctrlDir,
    sessionId: over.sessionId ?? 'sid-1234',
    prompt: over.prompt ?? 'do it',
    profile: over.profile ?? agentProfileSchema.parse(CLAUDE_CODE_DEFAULT_PROFILE),
    provision: over.provision ?? { mcps: [], plugins: [] },
    startedAt: Date.now(),
  };
}

// --- Realistic Claude session-JSONL fixture (shapes grounded in real transcripts) ---
const realisticTranscript = [
  { type: 'mode', mode: 'default', sessionId: 's' }, // noise line
  {
    type: 'user',
    timestamp: '2026-07-02T19:52:24.335Z',
    message: { role: 'user', content: 'Reply with the single word PONG and nothing else.' },
  },
  {
    type: 'assistant',
    timestamp: '2026-07-02T19:52:25.100Z',
    message: {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'internal', signature: 'x' },
        { type: 'text', text: 'PONG' },
      ],
      usage: {
        input_tokens: 23240,
        output_tokens: 5,
        cache_read_input_tokens: 18588,
        cache_creation_input_tokens: 3491,
      },
    },
  },
  { type: 'file-history-snapshot', messageId: 'm', snapshot: {} }, // noise line
]
  .map((l) => JSON.stringify(l))
  .join('\n');

describe('ClaudeCodeAdapter (§10.1) — dialect parser', () => {
  it('parseEvents normalizes user/assistant/tool + usage; ignores noise + thinking', () => {
    const events = adapter.parseEvents(realisticTranscript);
    // user text, assistant text, assistant usage — thinking + noise lines dropped.
    expect(events.map((e) => e.kind)).toEqual(['user', 'assistant', 'usage']);
    const assistant = events.find((e) => e.kind === 'assistant');
    expect((assistant!.payload as { text: string }).text).toBe('PONG');
    expect(events[0]!.ts).toBe('2026-07-02T19:52:24.335Z');
  });

  it('parseEvents handles tool_use (assistant) and tool_result (user) content items', () => {
    const raw = [
      {
        type: 'assistant',
        timestamp: '1',
        message: {
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'ls' } }],
          usage: { input_tokens: 1, output_tokens: 1 },
        },
      },
      {
        type: 'user',
        timestamp: '2',
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'file.txt' }] },
      },
    ]
      .map((l) => JSON.stringify(l))
      .join('\n');
    const events = adapter.parseEvents(raw);
    expect(events.map((e) => e.kind)).toEqual(['tool_call', 'usage', 'tool_result']);
    expect(events[0]!.name).toBe('Bash');
    expect((events[0]!.payload as { id: string }).id).toBe('toolu_1');
    expect((events[2]!.payload as { tool_use_id: string }).tool_use_id).toBe('toolu_1');
  });

  it('parseEvents tolerates malformed / blank lines', () => {
    const events = adapter.parseEvents('not json\n\n{"type":"assistant","message":{"content":"hi"}}\n');
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toBe('assistant');
  });

  it('extractUsage sums per-message usage incl. cache fields', () => {
    const usage = adapter.extractUsage(adapter.parseEvents(realisticTranscript));
    expect(usage).toMatchObject({
      inputTokens: 23240,
      outputTokens: 5,
      cacheReadInputTokens: 18588,
      cacheCreationInputTokens: 3491,
    });
  });

  it('classifyTurn: empty/null → working; present message → question', () => {
    expect(adapter.classifyTurn({ sessionId: 's', lastAssistantMessage: '' })).toBe('working');
    expect(adapter.classifyTurn({ sessionId: 's', lastAssistantMessage: null })).toBe('working');
    expect(adapter.classifyTurn({ sessionId: 's', lastAssistantMessage: 'PONG' })).toBe('question');
  });

  it('parseStopSignal normalizes the Stop hook JSONL payload', () => {
    const sig = adapter.parseStopSignal(
      JSON.stringify({
        session_id: 's1',
        transcript_path: '/t.jsonl',
        last_assistant_message: 'done',
        stop_hook_active: false,
      }),
    );
    expect(sig).toMatchObject({ sessionId: 's1', transcriptPath: '/t.jsonl', lastAssistantMessage: 'done' });
    expect(adapter.parseStopSignal('not json')).toBeNull();
    expect(adapter.parseStopSignal('   ')).toBeNull();
  });
});

describe('ClaudeCodeAdapter — structured questions (AskUserQuestion)', () => {
  const askLine = {
    type: 'assistant',
    timestamp: '1',
    message: {
      role: 'assistant',
      content: [
        {
          type: 'tool_use',
          id: 'toolu_ask',
          name: 'AskUserQuestion',
          input: {
            questions: [
              {
                question: 'How should the project be packaged?',
                header: 'Packaging',
                options: [{ label: 'Single package' }, { label: 'Monorepo' }],
              },
            ],
          },
        },
      ],
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  };

  it('detects a pending AskUserQuestion in the tail (question + option labels)', () => {
    const events = adapter.parseEvents(JSON.stringify(askLine));
    const sq = adapter.detectStructuredQuestion(events);
    expect(sq).toMatchObject({
      question: 'How should the project be packaged?',
      options: ['Single package', 'Monorepo'],
    });
  });

  it('returns null once answered by a matching tool_result', () => {
    const answered = adapter.parseEvents(
      [
        askLine,
        {
          type: 'user',
          timestamp: '2',
          message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_ask', content: 'Single package' }] },
        },
      ]
        .map((l) => JSON.stringify(l))
        .join('\n'),
    );
    expect(adapter.detectStructuredQuestion(answered)).toBeNull();
  });

  it('returns null when there is no AskUserQuestion', () => {
    expect(adapter.detectStructuredQuestion(adapter.parseEvents(realisticTranscript))).toBeNull();
  });
});

describe('ClaudeCodeAdapter — computed-path encoding (§10.1 fallback)', () => {
  it('encodeCwd replaces every "/" with "-" (leading slash included)', () => {
    expect(encodeCwd('/a/b/c-does-not-exist-xyz')).toBe('-a-b-c-does-not-exist-xyz');
  });

  it('encodeCwd resolves realpath — the macOS /private symlink case', () => {
    // Build target + a symlink pointing at it; realpath must follow the symlink so the
    // encoding matches how Claude names the projects/<dir> folder for the REAL path.
    const base = mkdtempSync(join(tmpdir(), 'cc-enc-'));
    const target = join(base, 'target');
    mkdirSync(target);
    const link = join(base, 'link');
    symlinkSync(target, link);
    // Encoding via the symlink equals encoding the realpath of the target.
    expect(encodeCwd(link)).toBe(realpathSync(target).replace(/\//g, '-'));
    // And on macOS the resolved path passes through /private (the validated case).
    if (process.platform === 'darwin') {
      expect(encodeCwd(link).startsWith('-private-')).toBe(true);
    }
  });

  it('computeTranscriptPath builds ~/.claude/projects/<encoded-cwd>/<sid>.jsonl', () => {
    const p = computeTranscriptPath('/home/u', '/proj/x-nope', 'sid-9');
    expect(p).toBe('/home/u/.claude/projects/-proj-x-nope/sid-9.jsonl');
  });

  it('locateTranscript: authoritative from session-start payload, else computed fallback', async () => {
    const ctrlDir = mkdtempSync(join(tmpdir(), 'cc-ctrl-'));
    const workspace = mkdtempSync(join(tmpdir(), 'cc-ws-'));
    const c = ctx({ ctrlDir, workspace, sessionId: 'sid-abc' });

    // No ctrl file → computed fallback (through realpath, so /private on macOS).
    const fallback = await adapter.locateTranscript(c);
    expect(fallback.kind).toBe('fallback');
    expect(fallback.path).toBe(computeTranscriptPath(homedir(), workspace, 'sid-abc'));

    // With the SessionStart payload present → authoritative path wins.
    writeFileSync(join(ctrlDir, 'session-start.json'), JSON.stringify({ transcript_path: '/real/t.jsonl' }));
    const auth = await adapter.locateTranscript(c);
    expect(auth).toEqual({ path: '/real/t.jsonl', kind: 'authoritative' });
  });
});

describe('ClaudeCodeAdapter — renderHooks (settings file shape vs docs/hooks/claude-code.md)', () => {
  const hookSpec = (ctrlDir: string): CanonicalHookSpec => ({
    sessionStart: { writeTo: join(ctrlDir, 'session-start.json') },
    stop: { appendTo: join(ctrlDir, 'stop.jsonl') },
  });

  it('writes a --settings file with additive SessionStart + Stop capture hooks', async () => {
    const ctrlDir = '/tmp/ctrl-xyz';
    const frag = await adapter.renderHooks(hookSpec(ctrlDir), ctx({ ctrlDir }));
    expect(frag.files).toHaveLength(1);
    const file = frag.files![0]!;
    expect(file.path).toBe(join(ctrlDir, 'settings.json'));
    const parsed = JSON.parse(file.content) as {
      hooks: {
        SessionStart: Array<{ hooks: Array<{ type: string; command: string }> }>;
        Stop: Array<{ hooks: Array<{ type: string; command: string }> }>;
      };
    };
    // Registration shape matches docs/hooks/claude-code.md ("hooks" → event → [{hooks:[{type,command}]}]).
    const ss = parsed.hooks.SessionStart[0]!.hooks[0]!;
    const stop = parsed.hooks.Stop[0]!.hooks[0]!;
    expect(ss.type).toBe('command');
    expect(ss.command).toBe(`cat > '${join(ctrlDir, 'session-start.json')}'`);
    expect(stop.type).toBe('command');
    expect(stop.command).toBe(`cat >> '${join(ctrlDir, 'stop.jsonl')}'`);
  });

  it('the --settings flag path (profile args) matches the file renderHooks writes', async () => {
    // The profile references {ctrlDir}/settings.json; renderHooks must write that path.
    const ctrlDir = mkdtempSync(join(tmpdir(), 'cc-ctrl2-'));
    const c = ctx({ ctrlDir });
    const launch = adapter.buildLaunch(c);
    const settingsIdx = launch.args!.indexOf('--settings');
    expect(settingsIdx).toBeGreaterThanOrEqual(0);
    const settingsArg = launch.args![settingsIdx + 1]!;
    const frag = await adapter.renderHooks(hookSpec(ctrlDir), c);
    expect(frag.files![0]!.path).toBe(settingsArg);
  });
});

describe('ClaudeCodeAdapter — buildLaunch env stripping (§10.1)', () => {
  it('strips CLAUDECODE, CLAUDE_CODE*, ANTHROPIC_* keys; keeps HOME/PATH; leaves CLAUDE_CONFIG_DIR untouched', () => {
    const saved = { ...process.env };
    try {
      process.env.CLAUDECODE = '1';
      process.env.CLAUDE_CODE_ENTRYPOINT = 'cli';
      process.env.CLAUDE_CODE_SESSION_ID = 'abc';
      process.env.ANTHROPIC_API_KEY = 'sk-should-be-stripped';
      process.env.ANTHROPIC_AUTH_TOKEN = 'tok';
      process.env.ANTHROPIC_BASE_URL = 'http://x';
      process.env.CLAUDE_CONFIG_DIR = '/should/remain';
      process.env.HOME = process.env.HOME ?? '/home/u';

      const env = adapter.buildLaunch(ctx()).env!;
      expect(env.CLAUDECODE).toBeUndefined();
      expect(env.CLAUDE_CODE_ENTRYPOINT).toBeUndefined();
      expect(env.CLAUDE_CODE_SESSION_ID).toBeUndefined();
      expect(env.ANTHROPIC_API_KEY).toBeUndefined();
      expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
      expect(env.ANTHROPIC_BASE_URL).toBeUndefined();
      // Neither set nor stripped by the adapter — it just is not in envRemove.
      expect(env.CLAUDE_CONFIG_DIR).toBe('/should/remain');
      expect(env.HOME).toBeDefined();
      expect(env.PATH).toBeDefined();
    } finally {
      process.env = saved;
    }
  });

  it('templates prompt/sessionId into args (prompt first; fresh session id flag present)', () => {
    const c = ctx({ prompt: 'say PONG', sessionId: 'uuid-xyz' });
    const args = adapter.buildLaunch(c).args!;
    expect(args[0]).toBe('say PONG');
    expect(args).toContain('--permission-mode');
    expect(args[args.indexOf('--permission-mode') + 1]).toBe('auto');
    expect(args[args.indexOf('--session-id') + 1]).toBe('uuid-xyz');
  });
});

describe('ClaudeCodeAdapter — renderProvisioning (P11)', () => {
  it('rejects plugin provisioning with a clear P11 message (no global mutation)', async () => {
    await expect(
      adapter.renderProvisioning({ mcps: [], plugins: [{ name: 'rosetta' }] }, ctx()),
    ).rejects.toThrow(/P11|plugins|~\/\.claude/);
  });

  it('renders MCPs into a workspace .mcp.json (workspace-scoped only)', async () => {
    const workspace = '/tmp/ws-mcp';
    const frag = await adapter.renderProvisioning(
      { mcps: [{ name: 'rosetta', command: 'node', args: ['server.js'] }], plugins: [] },
      ctx({ workspace }),
    );
    expect(frag.files).toHaveLength(1);
    expect(frag.files![0]!.path).toBe(join(workspace, '.mcp.json'));
    const parsed = JSON.parse(frag.files![0]!.content) as {
      mcpServers: Record<string, { command?: string; args?: string[]; name?: string }>;
    };
    expect(parsed.mcpServers.rosetta).toMatchObject({ command: 'node', args: ['server.js'] });
    // `name` is the map key, not duplicated into the entry.
    expect(parsed.mcpServers.rosetta!.name).toBeUndefined();
  });

  it('no provisioning → empty fragment', async () => {
    const frag = await adapter.renderProvisioning({ mcps: [], plugins: [] }, ctx());
    expect(frag).toEqual({});
  });
});

describe('ClaudeCodeAdapter — default profile validity', () => {
  it('the built-in default profile passes the AgentProfile schema', () => {
    expect(() => agentProfileSchema.parse(CLAUDE_CODE_DEFAULT_PROFILE)).not.toThrow();
    expect(CLAUDE_CODE_DEFAULT_PROFILE.adapter).toBe('claude-code');
    expect(CLAUDE_CODE_DEFAULT_PROFILE.command).toBe('claude');
    // envRemove carries the validated strip list; CLAUDE_CONFIG_DIR is deliberately absent.
    expect(CLAUDE_CODE_DEFAULT_PROFILE.envRemove).toContain('CLAUDECODE');
    expect(CLAUDE_CODE_DEFAULT_PROFILE.envRemove).toContain('CLAUDE_CODE*');
    expect(CLAUDE_CODE_DEFAULT_PROFILE.envRemove).not.toContain('CLAUDE_CONFIG_DIR');
  });
});
