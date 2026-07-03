import { mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { CodexAdapter } from '../../src/agents/codex/adapter';
import { CODEX_DEFAULT_PROFILE } from '../../src/agents/codex/profile';
import { findFallbackRollout } from '../../src/agents/codex/transcript';
import { assertCodexFlags } from '../../src/agents/codex/preflight';
import { agentProfileSchema, provisionSchema } from '../../src/config/schema';
import type { CanonicalHookSpec, TrialContext } from '../../src/agents/types';

/**
 * Unit coverage for the `codex` adapter (§10.2). Hook wire format is BINDING per
 * docs/hooks/codex.md; the rollout dialect parser is exercised against the REAL
 * sample transcript fixture (a copy of docs/hooks/codex-019f0634-transcript.jsonl).
 * No CLI is launched here.
 */

const FIXTURE = fileURLToPath(new URL('../fixtures/codex/rollout-sample.jsonl', import.meta.url));
const adapter = new CodexAdapter();

function ctx(overrides: Partial<TrialContext> = {}): TrialContext {
  const workspace = overrides.workspace ?? '/tmp/ws-codex';
  const ctrlDir = overrides.ctrlDir ?? '/tmp/ctrl-codex';
  return {
    agentId: 'codex',
    caseName: 'c',
    repeat: 1,
    workspace,
    ctrlDir,
    sessionId: 'sess-1',
    prompt: 'Reply PONG',
    profile: agentProfileSchema.parse(CODEX_DEFAULT_PROFILE),
    provision: { mcps: [], plugins: [] },
    startedAt: Date.now(),
    ...overrides,
  };
}

function hookSpec(ctrlDir: string): CanonicalHookSpec {
  return {
    sessionStart: { writeTo: join(ctrlDir, 'session-start.json') },
    stop: { appendTo: join(ctrlDir, 'stop.jsonl') },
  };
}

describe('codex default profile', () => {
  it('is a valid, complete AgentProfile with the §10.2 launch flags', () => {
    const p = agentProfileSchema.parse(CODEX_DEFAULT_PROFILE);
    expect(p.command).toBe('codex');
    expect(p.args).toContain('--dangerously-bypass-hook-trust');
    expect(p.args).toContain('features.hooks=true');
    // -a never + --sandbox workspace-write
    expect(p.args.join(' ')).toContain('-a never');
    expect(p.args.join(' ')).toContain('--sandbox workspace-write');
    // No --session-id flag exists for codex.
    expect(p.args.join(' ')).not.toContain('--session-id');
    // The `-c projects.trust_level` seeding is DROPPED (it does not suppress the
    // dialog on 0.142.2 and it mutates config.toml — verified live). Trust is cleared
    // by a dialogPattern instead.
    expect(p.args.join(' ')).not.toContain('trust_level');
    expect(p.dialogPatterns?.some((d) => /trust the contents/.test(d.pattern))).toBe(true);
    expect(p.strategy).toBe('hybrid');
  });
});

describe('codex renderHooks (docs/hooks/codex.md registration format)', () => {
  it('writes workspace .codex/hooks.json with SessionStart cat> and Stop newline-safe append', async () => {
    const c = ctx();
    const frag = await adapter.renderHooks(hookSpec(c.ctrlDir), c);
    expect(frag.files).toHaveLength(1);
    const file = frag.files![0]!;
    expect(file.path).toBe(join(c.workspace, '.codex', 'hooks.json'));
    const parsed = JSON.parse(file.content) as {
      hooks: { SessionStart: unknown[]; Stop: unknown[] };
    };
    expect(Array.isArray(parsed.hooks.SessionStart)).toBe(true);
    expect(Array.isArray(parsed.hooks.Stop)).toBe(true);

    const ss = (parsed.hooks.SessionStart[0] as { hooks: Array<{ type: string; command: string }> })
      .hooks[0]!;
    expect(ss.type).toBe('command');
    expect(ss.command).toBe(`cat > '${join(c.ctrlDir, 'session-start.json')}'`);

    const stop = (parsed.hooks.Stop[0] as { hooks: Array<{ type: string; command: string }> }).hooks[0]!;
    // Newline guarantee (M4 review): `sh -c 'cat; echo' >>` — redirect wraps the whole
    // sh command so codex sees EMPTY stdout (strict-validation safe) and each append
    // is newline-terminated.
    expect(stop.command).toBe(`sh -c 'cat; echo' >> '${join(c.ctrlDir, 'stop.jsonl')}'`);
    // Our hooks NEVER emit JSON to stdout (no matcher, no hookSpecificOutput here).
    expect(file.content).not.toContain('hookSpecificOutput');
  });
});

describe('codex buildLaunch', () => {
  it('templates {prompt}, isolates CODEX_HOME under the ctrl dir, and seeds auth (P11)', () => {
    const c = ctx({ ctrlDir: '/tmp/ctrl-xyz', prompt: 'PONG please' });
    const frag = adapter.buildLaunch(c);
    expect(frag.args).toContain('PONG please');
    // CODEX_HOME is isolated per trial (never the user's real ~/.codex).
    expect(frag.env?.CODEX_HOME).toBe('/tmp/ctrl-xyz/codex-home');
    // Seed commands: create the home + symlink auth.json (guarded, idempotent).
    expect(frag.commands?.some((cmd) => cmd.includes('mkdir -p'))).toBe(true);
    expect(frag.commands?.some((cmd) => cmd.includes('auth.json'))).toBe(true);
  });
});

describe('codex renderProvisioning (P11)', () => {
  it('rejects plugins with a clear CuriocityError (no global ~/.codex mutation)', async () => {
    const spec = provisionSchema.parse({ plugins: [{ name: 'rosetta' }] });
    await expect(adapter.renderProvisioning(spec, ctx())).rejects.toThrow(/P11|plugin/i);
  });

  it('renders MCP servers as per-invocation -c dotted-path TOML overrides', async () => {
    const spec = provisionSchema.parse({
      mcps: [{ name: 'fs', command: 'npx', args: ['-y', 'server'], env: { TOKEN: 'x' } }],
    });
    const frag = await adapter.renderProvisioning(spec, ctx());
    const args = frag.args ?? [];
    // Every override is a `-c key=value` pair.
    expect(args.filter((a) => a === '-c').length).toBe(3);
    expect(args).toContain('mcp_servers.fs.command="npx"');
    expect(args).toContain('mcp_servers.fs.args=["-y", "server"]');
    expect(args).toContain('mcp_servers.fs.env={ TOKEN = "x" }');
  });

  it('empty provisioning → no args', async () => {
    const frag = await adapter.renderProvisioning(provisionSchema.parse({}), ctx());
    expect(frag).toEqual({});
  });
});

describe('codex parseEvents (rollout dialect, REAL fixture)', () => {
  const raw = readFileSync(FIXTURE, 'utf8');
  const events = adapter.parseEvents(raw);

  it('normalizes the real rollout into TrajectoryEvents', () => {
    expect(events.length).toBeGreaterThan(0);
    const kinds = new Set(events.map((e) => e.kind));
    expect(kinds.has('user')).toBe(true);
    expect(kinds.has('assistant')).toBe(true);
    expect(kinds.has('tool_call')).toBe(true);
    expect(kinds.has('tool_result')).toBe(true);
    expect(kinds.has('usage')).toBe(true);
    expect(kinds.has('lifecycle')).toBe(true);
  });

  it('takes the real user prompt from event_msg.user_message (not env-context noise)', () => {
    const users = events.filter((e) => e.kind === 'user');
    expect(users.length).toBe(1); // exactly the one real prompt in the sample
    expect(String((users[0]!.payload as { text?: string }).text)).toContain('sanctioned diagnostic test');
  });

  it('assistant text comes once per message (no agent_message duplication)', () => {
    const assistants = events.filter((e) => e.kind === 'assistant');
    // The sample has 4 assistant messages; agent_message duplicates are skipped.
    expect(assistants.length).toBe(4);
  });

  it('function_call → tool_call with parsed arguments; function_call_output → tool_result', () => {
    const call = events.find((e) => e.kind === 'tool_call' && e.name === 'exec_command');
    expect(call).toBeDefined();
    const input = (call!.payload as { input?: { cmd?: string } }).input;
    expect(input?.cmd).toBe('echo rosetta-hook-probe');
    const out = events.find((e) => e.kind === 'tool_result');
    expect(out).toBeDefined();
    expect(String((out!.payload as { content?: string }).content)).toContain('rosetta-hook-probe');
  });

  it('emits a task_complete lifecycle marker used by detectCompletion', () => {
    const complete = events.filter((e) => e.kind === 'lifecycle' && e.name === 'task_complete');
    expect(complete.length).toBeGreaterThan(0);
    expect(adapter.detectCompletion(events)).toBe(true);
  });
});

describe('codex extractUsage (token_count last_token_usage deltas)', () => {
  it('sums per-turn deltas to the session total (not the cumulative field)', () => {
    const events = adapter.parseEvents(readFileSync(FIXTURE, 'utf8'));
    const usage = adapter.extractUsage(events);
    // From the fixture: last_token_usage inputs 15260+15654+15861+16092+0 = 62867,
    // outputs 235+102+414+65+0 = 816 (== the final cumulative total_token_usage).
    expect(usage.inputTokens).toBe(62867);
    expect(usage.outputTokens).toBe(816);
  });
});

describe('codex parseStopSignal & structured questions', () => {
  it('normalizes a Stop payload (docs/hooks/codex.md fields)', () => {
    const line = JSON.stringify({
      session_id: 'abc',
      turn_id: 't1',
      transcript_path: '/x/rollout.jsonl',
      last_assistant_message: 'PONG',
    });
    const sig = adapter.parseStopSignal(line);
    expect(sig).not.toBeNull();
    expect(sig!.sessionId).toBe('abc');
    expect(sig!.transcriptPath).toBe('/x/rollout.jsonl');
    expect(sig!.lastAssistantMessage).toBe('PONG');
    expect(adapter.classifyTurn(sig!)).toBe('question');
  });

  it('empty/null last_assistant_message → working (deterministic pre-gate)', () => {
    const sig = adapter.parseStopSignal(JSON.stringify({ session_id: 'a', last_assistant_message: null }));
    expect(adapter.classifyTurn(sig!)).toBe('working');
  });

  it('detectStructuredQuestion always returns null (codex has no structured tool)', () => {
    const events = adapter.parseEvents(readFileSync(FIXTURE, 'utf8'));
    expect(adapter.detectStructuredQuestion(events)).toBeNull();
  });
});

describe('codex fallback rollout locator (§10.2 — cwd + mtime, never newest-alone)', () => {
  // `home` here is the (isolated) CODEX_HOME; rollouts live at `<home>/sessions/…`.
  function writeRollout(home: string, dateDir: string, file: string, cwd: string, mtimeMs: number): string {
    const dir = join(home, 'sessions', dateDir);
    mkdirSync(dir, { recursive: true });
    const path = join(dir, file);
    const meta = JSON.stringify({ type: 'session_meta', payload: { session_id: 's', cwd } });
    writeFileSync(path, meta + '\n');
    const secs = mtimeMs / 1000;
    utimesSync(path, secs, secs);
    return path;
  }

  it('matches by cwd + mtime≥start and returns that rollout', () => {
    const home = mkdtempSync(join(tmpdir(), 'codex-home-'));
    const workspace = mkdtempSync(join(tmpdir(), 'codex-ws-'));
    const start = Date.now();
    const wanted = writeRollout(home, '2026/07/02', 'rollout-A.jsonl', workspace, start + 1000);
    const match = findFallbackRollout(home, workspace, start);
    expect(match?.path).toBe(wanted);
  });

  it('NEVER selects newest-alone: a newer rollout with a different cwd is ignored', () => {
    const home = mkdtempSync(join(tmpdir(), 'codex-home-'));
    const workspace = mkdtempSync(join(tmpdir(), 'codex-ws-'));
    const other = mkdtempSync(join(tmpdir(), 'codex-other-'));
    const start = Date.now();
    // The matching one is OLDER; a newer file belongs to a different workspace.
    const wanted = writeRollout(home, '2026/07/02', 'rollout-mine.jsonl', workspace, start + 1000);
    writeRollout(home, '2026/07/02', 'rollout-newer-other.jsonl', other, start + 9000);
    const match = findFallbackRollout(home, workspace, start);
    expect(match?.path).toBe(wanted); // NOT the newer, non-matching one
  });

  it('excludes rollouts older than the trial start (mtime filter)', () => {
    const home = mkdtempSync(join(tmpdir(), 'codex-home-'));
    const workspace = mkdtempSync(join(tmpdir(), 'codex-ws-'));
    const start = Date.now();
    // Same cwd but written well BEFORE the trial started → must be excluded.
    writeRollout(home, '2026/07/01', 'rollout-stale.jsonl', workspace, start - 60_000);
    const match = findFallbackRollout(home, workspace, start);
    expect(match).toBeNull();
  });

  it('returns null when no rollout matches the workspace at all', () => {
    const home = mkdtempSync(join(tmpdir(), 'codex-home-'));
    const workspace = mkdtempSync(join(tmpdir(), 'codex-ws-'));
    const start = Date.now();
    writeRollout(home, '2026/07/02', 'rollout-elsewhere.jsonl', '/some/other/cwd', start + 1000);
    expect(findFallbackRollout(home, workspace, start)).toBeNull();
  });
});

describe('codex flag preflight (§10.2 build-start requirement)', () => {
  it('passes when all required flags are advertised', () => {
    const help = [
      '  -a, --ask-for-approval <APPROVAL_POLICY>',
      '  -s, --sandbox <SANDBOX_MODE>',
      '      --dangerously-bypass-hook-trust',
      '  -c, --config <key=value>',
    ].join('\n');
    expect(() => assertCodexFlags(help)).not.toThrow();
  });

  it('fails with a clear message listing the missing flag', () => {
    const help = ['  -a, --ask-for-approval', '  -c, --config'].join('\n');
    expect(() => assertCodexFlags(help)).toThrow(/dangerously-bypass-hook-trust|sandbox/);
  });
});
