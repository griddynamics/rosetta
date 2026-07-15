import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, it, expect } from 'vitest';
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

describe('CodexAdapter — trust-folder dialogPattern robustness (m5-review R1)', () => {
  // The engine re-checks `dialogPatterns` against every screen redraw for the WHOLE
  // session (interaction/engine.ts `processDialogPatterns`), not just at startup —
  // same fact the M4 review hardened claude-code's trust-folder pattern against — so
  // a pattern must be specific enough not to fire on ordinary assistant output.
  const trustRule = CODEX_DEFAULT_PROFILE.dialogPatterns!.find((r) =>
    r.pattern.includes('trust the contents of this directory'),
  )!;
  const trustRe = (): RegExp => new RegExp(trustRule.pattern);

  it('matches the real live dialog text (codex 0.142.2, captured verbatim via a live probe)', () => {
    const screen = [
      '> You are in /private/var/folders/xx/T/curiocity-codex-ws-abc123',
      '',
      '  Do you trust the contents of this directory? Working with untrusted contents comes with higher risk of prompt',
      '  injection. Trusting the directory allows project-local config, hooks, and exec policies to load.',
      '',
      '› 1. Yes, continue',
      '  2. No, quit',
      '',
      '  Press enter to continue',
    ].join('\n');
    expect(trustRe().test(screen)).toBe(true);
  });

  it('does NOT false-positive on ordinary assistant prose that merely mentions directory trust', () => {
    // A plausible real assistant utterance discussing permissions/trust — must not
    // be mistaken for the startup dialog (no "Yes, continue" option ever follows it).
    const chatter = [
      'Before running this script, you should decide whether you trust the contents of this directory.',
      "Since we're operating in a sandboxed workspace, continuing is fine either way.",
    ].join('\n');
    expect(trustRe().test(chatter)).toBe(false);
  });

  it('does NOT false-positive on the header alone without the option text', () => {
    const partial =
      'Do you trust the contents of this directory? Something unrelated happened here instead of the menu.';
    expect(trustRe().test(partial)).toBe(false);
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

describe('codex buildLaunch — conditional OPENAI_API_KEY/OPENAI_BASE_URL strip (m5-review R1)', () => {
  // `buildLaunch` reads `homedir()` and `process.env` at call time; `os.homedir()`
  // honors `$HOME` on POSIX, so a fake HOME + a temporarily-set ambient var let us
  // exercise both branches without touching the real ~/.codex or mocking fs. This is
  // exactly the "ad-hoc invocation reads the CURRENT process env" gap the fix
  // targets: an ambient key must never silently override an existing auth.json, but
  // must NOT be stripped when auth.json doesn't exist (the documented no-auth.json
  // fallback, §10.2).
  const realHome = process.env.HOME;
  const realKey = process.env.OPENAI_API_KEY;
  let fakeHome: string;

  afterEach(() => {
    if (realHome !== undefined) process.env.HOME = realHome;
    if (realKey !== undefined) process.env.OPENAI_API_KEY = realKey;
    else delete process.env.OPENAI_API_KEY;
    if (fakeHome) rmSync(fakeHome, { recursive: true, force: true });
  });

  it('auth.json present → an ambient OPENAI_API_KEY is stripped from the launched env', () => {
    fakeHome = mkdtempSync(join(tmpdir(), 'codex-fake-home-'));
    mkdirSync(join(fakeHome, '.codex'), { recursive: true });
    writeFileSync(join(fakeHome, '.codex', 'auth.json'), '{}');
    process.env.HOME = fakeHome;
    process.env.OPENAI_API_KEY = 'sk-ambient-not-real';

    const c = ctx({ ctrlDir: '/tmp/ctrl-auth-present' });
    const frag = adapter.buildLaunch(c);
    expect(frag.env?.OPENAI_API_KEY).toBeUndefined();
    expect(frag.env?.OPENAI_BASE_URL).toBeUndefined();
  });

  it('no auth.json → an ambient OPENAI_API_KEY passes through (the documented no-auth.json path)', () => {
    fakeHome = mkdtempSync(join(tmpdir(), 'codex-fake-home-'));
    process.env.HOME = fakeHome; // no .codex/auth.json created
    process.env.OPENAI_API_KEY = 'sk-ambient-not-real';

    const c = ctx({ ctrlDir: '/tmp/ctrl-auth-absent' });
    const frag = adapter.buildLaunch(c);
    expect(frag.env?.OPENAI_API_KEY).toBe('sk-ambient-not-real');
  });

  it('auth.json present → an explicit envSet.OPENAI_API_KEY override still wins', () => {
    fakeHome = mkdtempSync(join(tmpdir(), 'codex-fake-home-'));
    mkdirSync(join(fakeHome, '.codex'), { recursive: true });
    writeFileSync(join(fakeHome, '.codex', 'auth.json'), '{}');
    process.env.HOME = fakeHome;
    process.env.OPENAI_API_KEY = 'sk-ambient-not-real';

    const c = ctx({ ctrlDir: '/tmp/ctrl-auth-present' });
    const withOverride = {
      ...c,
      profile: { ...c.profile, envSet: { ...(c.profile.envSet ?? {}), OPENAI_API_KEY: 'sk-deliberate-override' } },
    };
    const frag = adapter.buildLaunch(withOverride);
    expect(frag.env?.OPENAI_API_KEY).toBe('sk-deliberate-override');
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

describe('codex extractUsage (token_count deltas → disjoint full breakdown §12)', () => {
  it('sums per-turn deltas and decomposes into disjoint classes', () => {
    const events = adapter.parseEvents(readFileSync(FIXTURE, 'utf8'));
    const usage = adapter.extractUsage(events);
    // From the fixture last_token_usage deltas:
    //   input_tokens  15260+15654+15861+16092+0 = 62867
    //   cached_input  2432 +15232+15232+14208+0 = 47104  → cacheRead
    //   output_tokens 235  +102  +414  +65   +0 = 816
    //   reasoning     74   +0    +200  +0    +0 = 274     → reasoning
    // Disjoint mapping (codex input INCLUDES cached, output INCLUDES reasoning):
    expect(usage.cacheRead).toBe(47104);
    expect(usage.reasoning).toBe(274);
    expect(usage.input).toBe(62867 - 47104); // fresh (uncached) input = 15763
    expect(usage.output).toBe(816 - 274); // fresh output = 542
    // The verified per-turn delta sums are preserved as class sums.
    expect(usage.input + usage.cacheRead).toBe(62867);
    expect(usage.output + usage.reasoning).toBe(816);
    expect(usage.total).toBe(62867 + 816);
  });

  it('compaction: zero last_token_usage deltas + nonzero total_token_usage contribute zero, raw preserved (§12)', () => {
    // After a context compaction, codex emits a token_count whose per-turn DELTA is all
    // zeros while the cumulative TOTAL is nonzero. We key off the delta only, so the
    // event contributes zero (the total is already summed from prior deltas); the native
    // object is still preserved on `raw`.
    const zeroDelta = {
      input_tokens: 0,
      output_tokens: 0,
      cached_input_tokens: 0,
      reasoning_output_tokens: 0,
    };
    const line = JSON.stringify({
      timestamp: '2026-07-03T00:00:00.000Z',
      type: 'event_msg',
      payload: {
        type: 'token_count',
        info: { last_token_usage: zeroDelta, total_token_usage: { input_tokens: 123456 } },
      },
    });
    const events = adapter.parseEvents(line);
    const usage = events.filter((e) => e.kind === 'usage');
    expect(usage.length).toBe(1); // the zero-delta event is still recorded (raw kept)
    const u = usage[0]!.payload as { input: number; output: number; total: number; raw?: unknown };
    expect(u.input).toBe(0);
    expect(u.output).toBe(0);
    expect(u.total).toBe(0);
    expect(u.raw).toEqual(zeroDelta); // native object preserved verbatim
    // extractUsage over just this event sums to zero — no double-count from the total.
    expect(adapter.extractUsage(events).total).toBe(0);
  });

  it('compaction: absent last_token_usage emits no usage event (no synthesized numbers, §12)', () => {
    const line = JSON.stringify({
      timestamp: '2026-07-03T00:00:00.000Z',
      type: 'event_msg',
      payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 999 } } },
    });
    const events = adapter.parseEvents(line);
    expect(events.filter((e) => e.kind === 'usage').length).toBe(0);
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
  // (m5-review R1) Every `mkdtemp` created here is tracked and removed in `afterEach`
  // — previously these leaked on every `vitest run`/`npm run test` invocation
  // (confirmed accumulating in $TMPDIR across many prior runs during this review).
  const tempDirs: string[] = [];
  function tmpDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      rmSync(tempDirs.pop()!, { recursive: true, force: true });
    }
  });

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
    const home = tmpDir('codex-home-');
    const workspace = tmpDir('codex-ws-');
    const start = Date.now();
    const wanted = writeRollout(home, '2026/07/02', 'rollout-A.jsonl', workspace, start + 1000);
    const match = findFallbackRollout(home, workspace, start);
    expect(match?.path).toBe(wanted);
  });

  it('NEVER selects newest-alone: a newer rollout with a different cwd is ignored', () => {
    const home = tmpDir('codex-home-');
    const workspace = tmpDir('codex-ws-');
    const other = tmpDir('codex-other-');
    const start = Date.now();
    // The matching one is OLDER; a newer file belongs to a different workspace.
    const wanted = writeRollout(home, '2026/07/02', 'rollout-mine.jsonl', workspace, start + 1000);
    writeRollout(home, '2026/07/02', 'rollout-newer-other.jsonl', other, start + 9000);
    const match = findFallbackRollout(home, workspace, start);
    expect(match?.path).toBe(wanted); // NOT the newer, non-matching one
  });

  it('excludes rollouts older than the trial start (mtime filter)', () => {
    const home = tmpDir('codex-home-');
    const workspace = tmpDir('codex-ws-');
    const start = Date.now();
    // Same cwd but written well BEFORE the trial started → must be excluded.
    writeRollout(home, '2026/07/01', 'rollout-stale.jsonl', workspace, start - 60_000);
    const match = findFallbackRollout(home, workspace, start);
    expect(match).toBeNull();
  });

  it('returns null when no rollout matches the workspace at all', () => {
    const home = tmpDir('codex-home-');
    const workspace = tmpDir('codex-ws-');
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
