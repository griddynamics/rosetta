// codex.e2e.test.ts — log-driven end-to-end tests for Codex (OpenAI).
//
// Fixtures under fixtures/codex/ are VERBATIM RAW STDIN blocks captured in docs/hooks/codex-logs.txt
// (session 019f0634-3175-7702-b55c-e256f2966840, run folder .../spring-boot-react-mysql). Each real
// payload is replayed through the real pipeline (no mocks except the state store, see below) to
// verify: detection (env + shape), normalization (every field), and each Rosetta hook's output /
// exit code / stderr against the verified contract in docs/hooks/codex.md.
//
// Codex shares Claude Code's wire signature but adds `model` + `turn_id`. Codex validates output with a
// STRICT per-event schema, so its `formatOutput` PROJECTS the canonical shape down to exactly the fields
// that event allows: a PreToolUse deny is the nested `permissionDecision:"deny"` shape with NO top-level
// `continue`; every advisory (Pre or Post) is `additionalContext` ONLY, with NO `permissionDecision`.
// Codex has NO exitCode override → deny is exit 0 with the reason carried in the JSON body (per
// docs/hooks/codex.md Exit Codes + resolveExitCode). Every emitted output below is checked against the
// closed-world validator `assertCodexOutput` (adapters/codex-output.ts), which rejects ANY undocumented
// field for the event — so a future leaked field fails the suite rather than shipping to Codex.
//
// (!) ENV-TIER DETECTION IS LOAD-BEARING FOR CODEX. Codex's shape detect() requires `tool_input`
// (+ `model`), so ONLY PreToolUse / PostToolUse detect as codex by shape alone. Every other captured
// event (SessionStart, UserPromptSubmit, Stop, PreCompact, PostCompact) omits `tool_input` and so
// shape-detects as claude-code (whose signature is just hook_event_name + session_id). The captured
// runtime env (CODEX_MANAGED_BY_NPM=1 / CODEX_MANAGED_PACKAGE_ROOT) resolves them to codex via the
// env tier. So this suite passes the real captured env (fixtures/codex/env.json) to normalize AND to
// runReal for every case — without it the tool_input-less events would exercise the WRONG adapter.
//
// NOT FABRICATED — hooks with no real Codex trigger in this log:
//   • dangerous-actions never fires a real DENY here: the only PreToolUse tool captured is `Bash`
//     (Codex intercepts only Bash/apply_patch/MCP), and every captured command is SAFE (`echo …`,
//     `cat …`). No `apply_patch`/Write/Edit and no dangerous command appears in the Codex log, so the
//     deny/hard-deny paths and the write/edit tool kinds are covered by unit tests + other IDEs, not
//     invented here. We assert the real safe commands → null, and the event/tool-kind gates.
//   • read-once advise/deny cannot be pinned by a verbatim payload (needs a controlled file on disk +
//     accumulated state), so those are driven through the real pipeline using the REAL Codex Bash
//     shell-read wire SHAPE (`cat <file>`) pointed at a temp file. Codex reads are SHELL-ONLY (no read
//     tool; the path is recovered from the Bash command string by read-once's extractSimpleShellReadPath
//     — see docs/hooks/codex.md Practical Conclusion 3).

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectIDE, normalize } from '../../src/adapter';
import { dangerousActionsHook } from '../../src/hooks/dangerous-actions';
import { readOnceHook } from '../../src/hooks/read-once';
import { readOnceResetHook } from '../../src/hooks/read-once-reset';
import { mdFileAdvisoryHook } from '../../src/hooks/md-file-advisory';
import { rawFixture, jsonFixture, runReal, type Env } from './helpers';
import { assertCodexOutput } from '../../src/adapters/codex-output';

// Exact key sets a valid Codex output may carry, per event — used to assert the CLOSED shape (not a
// lone field-absence check): the nested key set must equal exactly this, so any leaked field fails.
const keysOf = (o: unknown): string[] => Object.keys(o as Record<string, unknown>).sort();

// read-once persists to $HOME/.rosetta/state via a module-level STATE_ROOT bound at IMPORT time —
// an on-disk backend we deliberately swap for an in-memory one so this suite is HERMETIC and
// DETERMINISTIC (no real ~/.rosetta writes; no cross-run state coupling). This is the ONLY thing
// stubbed: the pipeline, adapters, real fs.statSync, and read-once's own decision logic all run for
// real. (Copied VERBATIM from claude-code.e2e.test.ts.) Only read-once / read-once-reset touch this.
const { stateByNamespace } = vi.hoisted(() => ({ stateByNamespace: new Map<string, unknown>() }));
vi.mock('../../src/runtime/state-store', () => ({
  readNamespacedState: <T>(ns: string, fallback: T): T => {
    const cur = stateByNamespace.get(ns);
    return cur == null ? (JSON.parse(JSON.stringify(fallback)) as T) : (cur as T);
  },
  mutateNamespacedState: async <T>(ns: string, fallback: T, mutate: (c: T) => T): Promise<T> => {
    const cur = stateByNamespace.get(ns) == null
      ? (JSON.parse(JSON.stringify(fallback)) as T)
      : (stateByNamespace.get(ns) as T);
    const next = mutate(cur);
    stateByNamespace.set(ns, next);
    return next;
  },
}));

const fx = (name: string) => rawFixture(`codex/${name}`);

// The captured runtime env signature (CODEX_MANAGED_BY_NPM / CODEX_MANAGED_PACKAGE_ROOT). Passed to
// detection so tool_input-less events (SessionStart/Stop/compacts) resolve to codex, not claude-code.
const REAL_ENV = jsonFixture<Env>('codex/env.json');

// normalize/detectIDE operate on the PARSED object (only readStdin, exercised via runReal, parses the
// wire string); pass JSON.parse of the exact fixture bytes + the real env so codex wins detection.
const norm = (name: string, env: Env = REAL_ENV) => normalize(JSON.parse(fx(name)), env);

const SESSION = '019f0634-3175-7702-b55c-e256f2966840';
const TURN = '019f0637-2541-7473-a5b7-fa768c09d9b8';
const CWD = '/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql';

const ALL_FIXTURES = [
  'session-start-startup.json', 'user-prompt-submit.json', 'pre-bash-echo.json',
  'pre-bash-cat-read.json', 'post-bash-echo.json', 'stop.json', 'pre-compact.json',
  'post-compact.json',
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Detection — ENV signature resolves every event; shape resolves only Pre/PostToolUse.
// ─────────────────────────────────────────────────────────────────────────────
describe('codex E2E — detection', () => {
  test('real ENV signature (CODEX_MANAGED_*) → codex for EVERY captured event, via env tier', () => {
    // The captured env carries the codex markers and none of the other IDEs' signature vars.
    expect(REAL_ENV.CODEX_MANAGED_BY_NPM).toBe('1');
    expect(REAL_ENV.CODEX_MANAGED_PACKAGE_ROOT).toContain('@openai/codex');
    for (const name of ALL_FIXTURES)
      expect(detectIDE(JSON.parse(fx(name)), REAL_ENV)).toBe('codex');
  });

  test('payload SHAPE alone (no env): only tool_input-bearing events → codex', () => {
    // Codex shape detect() requires tool_input + model, so Pre/PostToolUse resolve to codex...
    for (const name of ['pre-bash-echo.json', 'pre-bash-cat-read.json', 'post-bash-echo.json'])
      expect(detectIDE(JSON.parse(fx(name)), {})).toBe('codex');
  });

  test('payload SHAPE alone (no env): tool_input-less events fall back to claude-code (why env tier exists)', () => {
    // ...but SessionStart/UserPromptSubmit/Stop/PreCompact/PostCompact carry no tool_input, so codex's
    // superset detect() misses and they match claude-code's leaner (hook_event_name + session_id)
    // signature. This ambiguity is EXACTLY why detection checks the runtime env FIRST (see file header).
    for (const name of ['session-start-startup.json', 'user-prompt-submit.json', 'stop.json', 'pre-compact.json', 'post-compact.json'])
      expect(detectIDE(JSON.parse(fx(name)), {})).toBe('claude-code');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Normalization — every field of the canonical NormalizedInput, per real payload.
// (All go through the codex adapter via REAL_ENV; see file header.)
// ─────────────────────────────────────────────────────────────────────────────
describe('codex E2E — normalization', () => {
  test('SessionStart (startup): event SessionStart, no tool, source/model/permission_mode passthrough', () => {
    const n = norm('session-start-startup.json');
    expect(n.ide).toBe('codex');
    expect(n.event).toBe('SessionStart');
    // GROUNDED absent: docs/hooks/codex.md SessionStart Input adds only `source` — no tool_name/
    // tool_input/turn_id. A session-lifecycle event has no tool or file; nothing is derivable.
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.cwd).toBe(CWD);
    expect(n.session_id).toBe(SESSION);
    expect(n.source).toBe('startup');          // passthrough via ...raw
    expect(n.model).toBe('gpt-5.5');           // passthrough (codex extra)
    expect(n.permission_mode).toBe('default'); // passthrough
    expect(n.tool_name).toBeUndefined();       // GROUNDED absent: no tool_name in SessionStart input
  });

  test('UserPromptSubmit: event re-mapped to PrePromptSubmit, no tool, turn_id/prompt passthrough', () => {
    const n = norm('user-prompt-submit.json');
    expect(n.event).toBe('PrePromptSubmit');   // codex EVENTS: PrePromptSubmit ← "UserPromptSubmit"
    // GROUNDED absent: docs/hooks/codex.md UserPromptSubmit Input adds only turn_id + prompt — no
    // tool_name/tool_input. A prompt-submit event carries no tool or file; nothing is derivable.
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.turn_id).toBe(TURN);              // passthrough
    expect(typeof n.prompt).toBe('string');    // passthrough (verbatim captured prompt)
    expect(n.tool_name).toBeUndefined();
  });

  test('PreToolUse Bash (echo): event PreToolUse, toolKind bash, command preserved, no file_path', () => {
    const n = norm('pre-bash-echo.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('Bash');
    expect(n.file_path).toBe('');              // GROUNDED absent: Bash has no structured file_path field; `echo` reads no file
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
    expect(n.tool_use_id).toBe('call_wOnIFlARQD4XbIGGjpb5z8oS');
    expect(n.turn_id).toBe(TURN);
  });

  test('PreToolUse Bash (cat read): shell read stays toolKind bash with EMPTY file_path (Codex reads are shell-only)', () => {
    const n = norm('pre-bash-cat-read.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');           // NOT promoted to read — Codex has no read tool
    expect(n.tool_name).toBe('Bash');
    // GROUNDED absent (structured field) — NOT dropped: Codex reads are shell-only (docs/hooks/codex.md
    // Practical Conclusion 3), so there is no structured file_path field; the path lives in the command
    // string, which IS fully mapped as tool_input.command below. Path recovery is the read hook's job
    // (read-once-shared extractSimpleShellReadPath reads ctx.toolInput.command) — deliberately NOT done
    // in the adapter, which cannot know a bare `cat` isn't piped/redirected/part of a dangerous command.
    expect(n.file_path).toBe('');
    expect((n.tool_input as { command: string }).command).toBe('cat docs/hooks/HOOK-DENY-PROBE.txt');
  });

  test('PostToolUse Bash: event PostToolUse, toolKind bash, tool_response passthrough', () => {
    const n = norm('post-bash-echo.json');
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('Bash');
    expect(n.tool_response).toBe('rosetta-hook-probe\n'); // passthrough
  });

  test('Stop: event Stop, no tool, stop_hook_active passthrough', () => {
    const n = norm('stop.json');
    expect(n.event).toBe('Stop');
    // GROUNDED absent: docs/hooks/codex.md Stop Input adds only turn_id + stop_hook_active +
    // last_assistant_message — no tool_name/tool_input. Turn-stop carries no tool or file.
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.stop_hook_active).toBe(false);    // passthrough
    expect(n.session_id).toBe(SESSION);
  });

  test('PreCompact / PostCompact: event mapped 1:1, trigger passthrough, no tool, model gpt-5.4', () => {
    const pre = norm('pre-compact.json');
    expect(pre.event).toBe('PreCompact');
    // GROUNDED absent: docs/hooks/codex.md PreCompact Input adds only turn_id + trigger — no tool.
    expect(pre.toolKind).toBeNull();
    expect(pre.trigger).toBe('manual');
    expect(pre.model).toBe('gpt-5.4');
    const post = norm('post-compact.json');
    expect(post.event).toBe('PostCompact');
    expect(post.trigger).toBe('manual');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: dangerous-actions (on PreToolUse × bash/write/edit/multi-edit/mcp-call).
// Real captured tool is Bash only; all captured commands are SAFE (echo / cat) → null → exit 0.
// No apply_patch/Write/Edit and no dangerous command in the Codex log — deny paths covered elsewhere.
// ─────────────────────────────────────────────────────────────────────────────
describe('codex E2E — dangerous-actions', () => {
  test('safe Bash `echo …` → no output, exit 0, no stderr', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-bash-echo.json'), REAL_ENV);
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('safe Bash `cat …` (a shell read) → not a DANGEROUS_BASH pattern → no output, exit 0', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-bash-cat-read.json'), REAL_ENV);
    expect(report.exitCode).toBe(0);
    expect(report.reason).toBe('null-result');
    expect(stdout).toEqual([]);
  });

  test('PostToolUse Bash → gated out (event-mismatch: hook targets PreToolUse only)', async () => {
    const { report } = await runReal(dangerousActionsHook, fx('post-bash-echo.json'), REAL_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
  });

  test('SessionStart → gated out (event-mismatch), exit 0', async () => {
    const { report } = await runReal(dangerousActionsHook, fx('session-start-startup.json'), REAL_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once (on PreRead/PreToolUse × read/bash). Codex reads are SHELL-only: the path is
// parsed out of the Bash command string. read-once is STATEFUL + does a real fs.statSync. Two parts:
//   • routing/no-op on VERBATIM captured payloads (deterministic: echo isn't a read; the real `cat`
//     targets a file that doesn't exist here → stat-miss → null);
//   • the stateful advise/deny contract driven through the pipeline using the real Codex Bash
//     shell-read SHAPE (`cat <file>`) pointed at a controlled temp file.
// State is the in-memory mock (cleared per test) so the suite is hermetic and deterministic.
// ─────────────────────────────────────────────────────────────────────────────
describe('codex E2E — read-once', () => {
  let tmp: string;

  beforeEach(() => {
    stateByNamespace.clear();                                  // fresh in-memory state per test
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ro-codex-e2e-')); // real files for real fs.statSync
    delete process.env.READ_ONCE_MODE;
    delete process.env.READ_ONCE_DISABLED;
  });
  afterEach(() => {
    delete process.env.READ_ONCE_MODE;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // Build a real Codex PreToolUse Bash shell-read wire (`cat <file>`) pointed at `file`, keeping every
  // other real field. `cat <abs-path>` has no shell metacharacters → extractSimpleShellReadPath detects it.
  const shellReadOf = (file: string, sessionId = SESSION): string => {
    const base = JSON.parse(fx('pre-bash-cat-read.json')) as Record<string, unknown>;
    return JSON.stringify({ ...base, session_id: sessionId, cwd: path.dirname(file), tool_input: { command: `cat ${file}` } });
  };

  test('routing: verbatim Bash `echo …` reaches read-once but is not a read → null, exit 0', async () => {
    // toolKind bash IS in read-once's set, so it runs; `echo` is not cat/sed/… → pass-through null.
    const { stdout, report } = await runReal(readOnceHook, fx('pre-bash-echo.json'), REAL_ENV);
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('routing: verbatim Bash `cat …` IS classified as a shell read, but target file is absent → stat-miss → null', async () => {
    // Proves the Codex shell-read path is reached (cat → simple reader), and read-once fails open on a
    // stat miss (the captured `docs/hooks/HOOK-DENY-PROBE.txt` under the demo cwd doesn't exist here).
    const { stdout, report } = await runReal(readOnceHook, fx('pre-bash-cat-read.json'), REAL_ENV);
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('stateful (warn): first read → null; unchanged re-read same session → advise (nested additionalContext), exit 0', async () => {
    const file = path.join(tmp, 'notes.md');
    fs.writeFileSync(file, 'hello read-once');

    const first = await runReal(readOnceHook, shellReadOf(file), REAL_ENV);
    expect(first.stdout).toEqual([]);          // first read allowed
    expect(first.report.exitCode).toBe(0);

    const second = await runReal(readOnceHook, shellReadOf(file), REAL_ENV);
    expect(second.report.exitCode).toBe(0);    // codex advise → exit 0
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    assertCodexOutput('PreToolUse', out);      // strict: rejects any field not in the PreToolUse schema
    // advise is a NON-blocking context injection → additionalContext ONLY (a permissionDecision:"allow"
    // here would auto-approve the tool). Exact key set, not a lone absence check.
    expect(keysOf(out)).toEqual(['hookSpecificOutput']);
    expect(keysOf(out.hookSpecificOutput)).toEqual(['additionalContext', 'hookEventName']);
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(out.hookSpecificOutput.additionalContext).toContain('read-once:');
    expect(out.hookSpecificOutput.additionalContext).toContain('notes.md');
  });

  test('stateful (deny mode): unchanged re-read → deny in JSON body (nested only, NO top-level continue), exit 0, NO stderr', async () => {
    process.env.READ_ONCE_MODE = 'deny';
    const file = path.join(tmp, 'secret.txt');
    fs.writeFileSync(file, 'top secret');

    await runReal(readOnceHook, shellReadOf(file), REAL_ENV);          // first read records state
    const second = await runReal(readOnceHook, shellReadOf(file), REAL_ENV);
    expect(second.report.exitCode).toBe(0);    // codex deny is carried in the body, not the exit code
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    assertCodexOutput('PreToolUse', out);      // strict: `continue:false` is unsupported on PreToolUse → must be absent
    // Closed shape: nested deny ONLY, no top-level `continue` (it would mark the hook FAILED on Codex).
    expect(keysOf(out)).toEqual(['hookSpecificOutput']);
    expect(keysOf(out.hookSpecificOutput)).toEqual(['hookEventName', 'permissionDecision', 'permissionDecisionReason']);
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('read-once:');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: md-file-advisory (PostToolUse advisory) — proves LEAK A fixed end-to-end. We drive a REAL Codex
// PostToolUse Write wire for a .md file and assert the emitted output is the STRICT PostToolUse advise
// shape: additionalContext ONLY, NO permissionDecision (which is NOT in Codex's PostToolUse schema →
// whole-output rejection + unhooked run if present). The other PostToolUse nudges (loose-files,
// lint-format-advisory) emit the IDENTICAL advise→PostToolUse output shape, covered by the strict-schema
// unit suite (adapter.codex.test.ts); md-file-advisory is the deterministic (pure path-based) trigger.
// ─────────────────────────────────────────────────────────────────────────────
describe('codex E2E — md-file-advisory (PostToolUse advise, strict schema)', () => {
  // Real Codex PostToolUse Write wire for `file`, spread from a captured PostToolUse payload.
  const postWriteOf = (file: string): string => {
    const base = JSON.parse(fx('post-bash-echo.json')) as Record<string, unknown>;
    return JSON.stringify({
      ...base,
      tool_name: 'Write',
      tool_input: { file_path: file, content: '# notes\n' },
      tool_response: { filePath: file },
    });
  };

  test('.md write → advise: additionalContext ONLY (no permissionDecision), exit 0', async () => {
    const { stdout, report } = await runReal(mdFileAdvisoryHook, postWriteOf('/proj/notes.md'), REAL_ENV);
    expect(report.exitCode).toBe(0);
    expect(report.stderrMessage).toBeUndefined();
    const out = JSON.parse(stdout[0]);
    assertCodexOutput('PostToolUse', out);     // strict: permissionDecision is NOT a PostToolUse field
    expect(keysOf(out)).toEqual(['hookSpecificOutput']);
    expect(keysOf(out.hookSpecificOutput)).toEqual(['additionalContext', 'hookEventName']);
    expect(out.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    expect(out.hookSpecificOutput.additionalContext).toContain('[Rosetta Advisory]');
  });

  test('.md write under docs/ → gated out (no advisory), no stdout, exit 0', async () => {
    const { stdout, report } = await runReal(mdFileAdvisoryHook, postWriteOf('/proj/docs/notes.md'), REAL_ENV);
    expect(report.status).toBe('skipped');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once-reset (side-effect on PreCompact/PostCompact — clears the session's read-once
// state). Real Codex compact payloads (trigger:"manual") → side-effect → NO stdout, exit 0.
// ─────────────────────────────────────────────────────────────────────────────
describe('codex E2E — read-once-reset', () => {
  beforeEach(() => stateByNamespace.clear());

  test('verbatim PreCompact → side-effect (no stdout, exit 0)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, fx('pre-compact.json'), REAL_ENV);
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('side-effect');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
  });

  test('verbatim PostCompact → side-effect (no stdout, exit 0)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, fx('post-compact.json'), REAL_ENV);
    expect(report.reason).toBe('side-effect');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('non-compact event (verbatim PreToolUse Bash) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(readOnceResetHook, fx('pre-bash-echo.json'), REAL_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
  });
});
