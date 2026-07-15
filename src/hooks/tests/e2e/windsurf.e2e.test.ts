// windsurf.e2e.test.ts — log-driven end-to-end tests for Windsurf (Devin Desktop / Cascade).
//
// Fixtures under fixtures/windsurf/ are VERBATIM RAW STDIN blocks captured in
// docs/hooks/windsurf-logs.txt (trajectory 64944513-a64d-410b-af09-426251271f8b, Devin Desktop,
// model "SWE-1.6 Slow", 2026-06-29). Each real payload is replayed through the real pipeline (no
// adapter mocks) to verify: detection (env + shape), normalization (every field), and each Rosetta
// hook's output / exit code / stderr against the verified contract in docs/hooks/windsurf.md.
//
// ─── Windsurf is the OPPOSITE of the stdout-JSON IDEs. Internalize this before reading assertions ───
// Cascade NEVER parses stdout as JSON (docs/hooks/windsurf.md, Practical Conclusion 1; adapter
// formatOutput() returns {} ALWAYS; live run: 9× exit 0, textLen 0). So there is NO
// permissionDecision/additionalContext/continue contract on the wire. A hook communicates through
// exactly TWO channels:
//   • EXIT CODE — 2 blocks a pre-hook, 0 lets it proceed (adapters/windsurf.ts exitCode()).
//   • STDERR on a blocking (exit-2) pre-hook — the deny REASON reaches the model here, verbatim
//     (Cascade appends ": action blocked by hook"). This is the Windsurf analog of
//     permissionDecisionReason (adapters/windsurf.ts stderrMessage()).
// Consequences asserted throughout:
//   • DENY   → report.exitCode === 2, report.stderrMessage === <reason>, stdout === ['{}'] (the
//              empty formatOutput body still gets written since a result was produced), wroteOutput true.
//   • ADVISE → report.exitCode === 0, report.stderrMessage undefined (advise is NOT a deny, so the
//              windsurf adapter emits no stderr — the advice text is DROPPED, Windsurf has no
//              non-blocking model channel), stdout === ['{}'], wroteOutput true.
//   • NULL (safe / no match) → executeHook short-circuits before formatOutput: exitCode 0,
//              wroteOutput false, stdout === [] (nothing written), no stderr.
// This mirrors the "deny delivery per IDE contract" block in tests/runtime/run-hook.test.ts
// (resolveExitCode(deny, …, 'windsurf') === 2) and is the inverse of claude-code.e2e.test.ts, where
// the deny rides in the stdout JSON body at exit 0.
//
// ─── Gaps (NOT fabricated) ───
// • Windsurf has NO session-lifecycle events (no SessionStart/Stop/PreCompact/PostCompact — docs
//   Practical Conclusion 4). The captured log has none, so read-once-reset (PreCompact/PostCompact)
//   has NO real Windsurf input; we only assert it correctly GATES OUT a verbatim Windsurf event.
// • The session captured NO genuinely dangerous command (`echo …`, `cat …` are both safe; the log's
//   "deny probe" was the tester's synthetic --deny-on-match, NOT a Rosetta decision). So the
//   dangerous-actions DENY headline case is driven through the real pipeline using the real
//   pre_run_command wire SHAPE with the command_line SUBSTITUTED for a real dangerous command
//   (`rm -rf /`). This is clearly marked below (shape-with-substituted-command); everything else is
//   verbatim. read-once's stateful advise/deny likewise uses the real pre_read_code wire shape
//   pointed at a controlled temp file (a verbatim log can't pin fs mtime + state deterministically).
// • MCP events (pre/post_mcp_tool_use) and post_setup_worktree did not fire in this session → no
//   fixtures, not covered.

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectIDE, normalize } from '../../src/adapter';
import { dangerousActionsHook } from '../../src/hooks/dangerous-actions';
import { readOnceHook } from '../../src/hooks/read-once';
import { readOnceResetHook } from '../../src/hooks/read-once-reset';
import { rawFixture, jsonFixture, runReal, type Env } from './helpers';

// read-once persists to $HOME/.rosetta/state via a module-level STATE_ROOT bound at IMPORT time — an
// on-disk backend we deliberately swap for an in-memory one so this suite is HERMETIC and
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

const fx = (name: string) => rawFixture(`windsurf/${name}`);
// normalize/detectIDE operate on the PARSED object (only readStdin, exercised via runReal, parses
// the wire string); pass JSON.parse of the exact fixture bytes.
const norm = (name: string, env: Env = {}) => normalize(JSON.parse(fx(name)), env);

const REAL_ENV = jsonFixture<Env>('windsurf/env.json');
const TRAJ = '64944513-a64d-410b-af09-426251271f8b';   // trajectory_id — the session/cleaning key
const EXEC = '0b8ee740-32eb-4415-a31b-6da673e21988';   // execution_id  — per-action id
const CWD = '/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql';

// ─────────────────────────────────────────────────────────────────────────────
// Detection — ENV signature and payload SHAPE both resolve to windsurf.
// ─────────────────────────────────────────────────────────────────────────────
describe('windsurf E2E — detection', () => {
  test('real ENV signature (CODEIUM_*/WINDSURF_* prefix) → windsurf, via env tier', () => {
    // The captured env carries CODEIUM_EDITOR_APP_ROOT + WINDSURF_CSRF_TOKEN (Devin.app keeps the
    // Codeium/Windsurf prefixes) and none of the other IDEs' env signatures.
    expect('CODEIUM_EDITOR_APP_ROOT' in REAL_ENV).toBe(true);
    expect('WINDSURF_CSRF_TOKEN' in REAL_ENV).toBe(true);
    expect(REAL_ENV.CLAUDECODE).toBeUndefined();
    expect(REAL_ENV.CURSOR_VERSION).toBeUndefined();
    // (!) The env ALSO carries VSCODE_* vars (Devin is a VS Code fork), but the windsurf env tier is
    // checked BEFORE the copilot VSCODE_* catch-all (adapter ENV_DETECTION_ORDER), so windsurf wins.
    for (const name of ['pre-user-prompt.json', 'pre-run-command-echo.json', 'pre-read-readme.json'])
      expect(detectIDE(JSON.parse(fx(name)), REAL_ENV)).toBe('windsurf');
  });

  test('payload SHAPE alone (no env) → windsurf', () => {
    // Signature = { agent_action_name, trajectory_id, tool_info } — none of the CC/codex/cursor
    // shape keys (hook_event_name, session_id, turn_id, cursor_version) are present.
    for (const name of [
      'pre-run-command-echo.json', 'pre-read-readme.json', 'post-write-probe.json',
      'post-cascade-response.json', 'post-cascade-response-transcript.json',
    ])
      expect(detectIDE(JSON.parse(fx(name)), {})).toBe('windsurf');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Normalization — the flat Cascade shape → canonical NormalizedInput, per real payload.
// Windsurf carries trajectory_id (→ session_id), execution_id, and a per-event tool_info; there is
// NO hook_event_name/session_id/tool_input on the wire — the adapter synthesizes them (EVENT_MAP).
// ─────────────────────────────────────────────────────────────────────────────
describe('windsurf E2E — normalization', () => {
  test('pre_user_prompt → PrePromptSubmit, no tool, prompt in tool_input', () => {
    const n = norm('pre-user-prompt.json');
    expect(n.ide).toBe('windsurf');
    expect(n.event).toBe('PrePromptSubmit');           // pre_user_prompt → new canonical name
    expect(n.hook_event_name).toBe('PrePromptSubmit');
    // TRULY-ABSENT: pre_user_prompt tool_info = {user_prompt} only (log l.12; docs §tool_info) — no
    // tool and no file are involved in a prompt event, so toolKind/tool_name/file_path are genuinely absent.
    expect(n.toolKind).toBeNull();
    expect(n.tool_name).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.session_id).toBe(TRAJ);
    expect(n.execution_id).toBe(EXEC);
    expect((n.tool_input as { prompt: string }).prompt).toContain('sanctioned diagnostic test');
  });

  test('pre_run_command → PreToolUse, toolKind bash, command_line→command', () => {
    const n = norm('pre-run-command-echo.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.hook_event_name).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('Bash');
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
    expect(n.cwd).toBe(CWD);                            // pre_run_command tool_info carries cwd
    // TRULY-ABSENT: pre_run_command tool_info = {command_line, cwd} (log l.63; docs §tool_info) — has
    // no file_path key; a shell command's file is an argument inside command, not a canonical file_path.
    expect(n.file_path).toBe('');
  });

  test('post_run_command → PostToolUse, toolKind bash', () => {
    const n = norm('post-run-command-echo.json');
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('Bash');
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
  });

  test('pre_read_code → PreRead, toolKind read, file_path resolved (ABSOLUTE)', () => {
    const n = norm('pre-read-readme.json');
    expect(n.event).toBe('PreRead');                    // pre_read_code → PreRead
    expect(n.toolKind).toBe('read');
    expect(n.tool_name).toBe('Read');
    expect(n.file_path).toBe(`${CWD}/README.md`);
    expect((n.tool_input as { file_path: string }).file_path).toBe(`${CWD}/README.md`);
    // TRULY-ABSENT: pre_read_code tool_info = {file_path} only (log l.115; docs §tool_info) — no cwd key.
    expect(n.cwd).toBeUndefined();                      // pre_read_code tool_info carries NO cwd
  });

  test('post_read_code → PostToolUse, toolKind read', () => {
    const n = norm('post-read-readme.json');
    expect(n.event).toBe('PostToolUse');                // post_read_code → PostToolUse (not PreRead)
    expect(n.toolKind).toBe('read');
    expect(n.tool_name).toBe('Read');
    expect(n.file_path).toBe(`${CWD}/README.md`);
  });

  test('pre_write_code → PreToolUse, toolKind multi-edit, file_path + edits[] carried through', () => {
    const n = norm('pre-write-probe.json');
    expect(n.event).toBe('PreToolUse');
    // tool_info carries edits=[{old_string,new_string}] (docs/hooks/windsurf.md §tool_info; log l.269)
    // — the Claude-Code MultiEdit shape. Adapter maps to MultiEdit/multi-edit so dangerous-actions
    // can scan edits[].new_string (was 'Write' with edits dropped → edit content unscanned = BUG).
    expect(n.toolKind).toBe('multi-edit');
    expect(n.tool_name).toBe('MultiEdit');
    expect(n.file_path).toBe(`${CWD}/docs/hooks/_ws_write_probe.txt`);
    expect((n.tool_input as { file_path: string }).file_path).toBe(`${CWD}/docs/hooks/_ws_write_probe.txt`);
    // (!) The real `edits` array is now carried into tool_input (verbatim from tool_info) so
    // content-based checks (dangerous-actions.evalMultiEdit) can inspect what is being written.
    expect((n.tool_input as { edits: unknown[] }).edits).toEqual([{ old_string: '', new_string: 'windsurf-write-probe' }]);
  });

  test('post_write_code → PostToolUse, toolKind multi-edit', () => {
    const n = norm('post-write-probe.json');
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('multi-edit');
    expect(n.tool_name).toBe('MultiEdit');
    expect((n.tool_input as { edits: unknown[] }).edits).toEqual([{ old_string: '', new_string: 'windsurf-write-probe' }]);
  });

  test('post_cascade_response → event null (PostResponse has no semantic mapping), no tool', () => {
    const n = norm('post-cascade-response.json');
    // hook_event_name is the new canonical "PostResponse", but the windsurf ide-row EVENTS map has
    // no entry for it → lookupEvent returns null. So no Rosetta hook targets it (see gating below).
    expect(n.hook_event_name).toBe('PostResponse');
    // TRULY-ABSENT: docs Practical Conclusion 4 + Rosetta-mapping table = "AgentStop/SubagentStop: none
    // documented" for post_cascade_response → no windsurf EVENTS entry → event null by design (not a bug).
    expect(n.event).toBeNull();
    // TRULY-ABSENT: response event carries tool_info={response} only (log l.475) — no tool involved.
    expect(n.toolKind).toBeNull();
    expect(n.tool_name).toBeNull();
    expect((n.tool_input as { response: string }).response).toContain('Summary of Diagnostic Test');
  });

  test('post_cascade_response_with_transcript → event null, transcript_path surfaced', () => {
    const n = norm('post-cascade-response-transcript.json');
    expect(n.hook_event_name).toBe('PostResponse');
    expect(n.event).toBeNull();
    expect(n.transcript_path).toBe(`/Users/isolomatov/.windsurf/transcripts/${TRAJ}.jsonl`);
    // TRULY-ABSENT: tool_info = {transcript_path} only (log l.526; docs §tool_info) — no file_path key
    // (the transcript path is surfaced via n.transcript_path above, not as an operation target).
    expect(n.file_path).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: dangerous-actions (PreToolUse × bash/write/edit/multi-edit/mcp-call).
// The real captured commands are all SAFE (`echo …`, `cat …`) → null → exit 0, no stdout, no stderr.
// The DENY headline (exit 2 + stderr reason, empty {} stdout) is the Windsurf contract's whole
// point; no dangerous command was captured, so it is driven through the real pre_run_command wire
// SHAPE with command_line SUBSTITUTED for a real dangerous command (clearly marked).
// ─────────────────────────────────────────────────────────────────────────────
describe('windsurf E2E — dangerous-actions', () => {
  // Real pre_run_command wire shape, command_line substituted (everything else verbatim).
  const dangerousRun = (command: string): string => {
    const base = JSON.parse(fx('pre-run-command-echo.json')) as Record<string, unknown>;
    const ti = { ...(base.tool_info as Record<string, unknown>), command_line: command };
    return JSON.stringify({ ...base, tool_info: ti });
  };

  test('verbatim safe Bash `echo …` → no output, exit 0, no stderr', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-run-command-echo.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);                         // null result → nothing written to stdout
    expect(report.stderrMessage).toBeUndefined();
  });

  test('verbatim safe Bash `cat docs/hooks/HOOK-DENY-PROBE.txt` → no match → exit 0', async () => {
    // `cat` is not in DANGEROUS_BASH — the log's block was the tester's synthetic --deny-on-match,
    // NOT a Rosetta decision. Rosetta lets it through.
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-run-command-cat-deny-probe.json'));
    expect(report.exitCode).toBe(0);
    expect(report.reason).toBe('null-result');
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('verbatim pre_write_code (safe path + safe edits) → no match → exit 0', async () => {
    // toolKind multi-edit → evalMultiEdit scans file_path (_ws_write_probe.txt, safe) AND
    // edits[].new_string ("windsurf-write-probe", safe) → null → exit 0.
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-write-probe.json'));
    expect(report.exitCode).toBe(0);
    expect(report.reason).toBe('null-result');
    expect(stdout).toEqual([]);
  });

  // ── DOWNSTREAM-PROOF for the edits-carried-through fix: dangerous CONTENT inside the real Windsurf
  // pre_write_code edits[] is scanned (was dropped when mapped to Write) → soft-deny (exit 2 + stderr).
  // Uses a DANGEROUS_CONTENT match (SQL DROP); the inline secret detectors were removed in #118. ──
  test('SHAPE(pre_write_code) + SQL DROP in edits[].new_string → DENY: exit 2 + stderr reason', async () => {
    const base = JSON.parse(fx('pre-write-probe.json')) as Record<string, unknown>;
    const ti = { ...(base.tool_info as Record<string, unknown>),
      edits: [{ old_string: '', new_string: 'DROP TABLE users;' }] };
    const payload = JSON.stringify({ ...base, tool_info: ti });
    const { stdout, report } = await runReal(dangerousActionsHook, payload);
    expect(report.exitCode).toBe(2);                    // (!) edit content is inspectable & soft-denied
    expect(report.wroteOutput).toBe(true);
    expect(report.stderrMessage).toBeDefined();
    expect(report.stderrMessage).toContain('content-sql-drop-table');
    expect(stdout).toEqual(['{}']);
  });

  // ── DENY headline: exit 2 + stderr reason + empty {} stdout (real shape, substituted command) ──
  test('SHAPE(pre_run_command) + `rm -rf /` → DENY: exit 2, reason on STDERR, stdout ["{}"]', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, dangerousRun('rm -rf /'));
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(2);                    // (!) Windsurf blocks a pre-hook via exit 2
    expect(report.wroteOutput).toBe(true);
    // (!) The deny reason reaches Cascade ONLY via stderr — NOT in the stdout body.
    expect(report.stderrMessage).toBeDefined();
    expect(report.stderrMessage).toContain('rm-rf-root');
    // (!) stdout is the empty formatOutput body — Cascade never parses it (no permissionDecision here).
    expect(stdout).toEqual(['{}']);
    expect(JSON.parse(stdout[0])).toEqual({});
  });

  test('SHAPE(pre_run_command) + `git reset --hard` → reconsider DENY: exit 2 + stderr reason', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, dangerousRun('git reset --hard HEAD~3'));
    expect(report.exitCode).toBe(2);
    expect(report.stderrMessage).toContain('git-reset-hard');
    expect(report.stderrMessage).toContain('Rosetta-AI-reviewed'); // reconsider tier offers override
    expect(stdout).toEqual(['{}']);
  });

  test('post_run_command (PostToolUse) → gated out (event-mismatch: hook targets PreToolUse only)', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('post-run-command-echo.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('pre_user_prompt (event PrePromptSubmit) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(dangerousActionsHook, fx('pre-user-prompt.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once (PreRead/PreToolUse × read/bash). read-once is STATEFUL (persistent state at
// $HOME/.rosetta/state) and does a real fs.statSync. Two parts:
//   • routing/no-op on the VERBATIM captured payloads (deterministic: single read / stat-miss → null);
//   • the stateful advise/deny contract driven through the real pipeline using the real Windsurf
//     pre_read_code wire SHAPE pointed at a controlled temp file. On Windsurf, advise carries NO
//     stderr (not a deny) and deny rides exit-2+stderr — the inverse of claude-code, where both ride
//     the stdout JSON body. State is in-memory (mock above) so the suite never touches ~/.rosetta.
// ─────────────────────────────────────────────────────────────────────────────
describe('windsurf E2E — read-once', () => {
  let tmp: string;

  beforeEach(() => {
    stateByNamespace.clear();                                  // fresh in-memory state per test
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ro-ws-e2e-')); // real files for real fs.statSync
    delete process.env.READ_ONCE_MODE;
    delete process.env.READ_ONCE_DISABLED;
  });
  afterEach(() => {
    delete process.env.READ_ONCE_MODE;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // Real Windsurf pre_read_code wire object pointed at `file` (file_path is absolute, as in the log).
  const readOf = (file: string, trajectoryId = TRAJ): string => {
    const base = JSON.parse(fx('pre-read-readme.json')) as Record<string, unknown>;
    return JSON.stringify({ ...base, trajectory_id: trajectoryId, tool_info: { file_path: file } });
  };

  test('routing: verbatim Bash `echo …` reaches read-once but is not a read → null, exit 0', async () => {
    // toolKind bash IS in read-once's set, so it runs; `echo` is not cat/sed/… → pass-through null.
    const { stdout, report } = await runReal(readOnceHook, fx('pre-run-command-echo.json'));
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('routing: verbatim Bash `cat <file>` (real Windsurf shell-read shape) → shell read detected, stat-miss → null', async () => {
    // The real `cat docs/hooks/HOOK-DENY-PROBE.txt` is a genuine Windsurf shell read: it reaches
    // read-once's simple-shell-reader path (cat + one file), but the captured cwd/file doesn't exist
    // on this machine → fs.statSync miss → pass-through null. Confirms the shell-read routing on the
    // REAL wire shape without depending on the file existing.
    const { stdout, report } = await runReal(readOnceHook, fx('pre-run-command-cat-deny-probe.json'));
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('routing: verbatim pre_read_code (PreRead) reaches read-once → safe no-op (stat-miss) → null', async () => {
    const { stdout, report } = await runReal(readOnceHook, fx('pre-read-readme.json'));
    expect(report.status).toBe('completed'); // reached run(): PreRead+read accepted (not gated)
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);              // README path doesn't exist here → stat-miss → null
    expect(report.stderrMessage).toBeUndefined();
  });

  test('stateful (warn): first read → null; unchanged re-read same session → ADVISE (no stderr, stdout ["{}"], exit 0)', async () => {
    const file = path.join(tmp, 'notes.md');
    fs.writeFileSync(file, 'hello windsurf read-once');

    const first = await runReal(readOnceHook, readOf(file));
    expect(first.stdout).toEqual([]);        // first read allowed → null
    expect(first.report.exitCode).toBe(0);
    expect(first.report.wroteOutput).toBe(false);

    const second = await runReal(readOnceHook, readOf(file));
    expect(second.report.exitCode).toBe(0);            // advise is NOT a deny → exit 0
    // (!) On Windsurf, advise carries NO model channel: the adapter emits no stderr for a non-deny,
    // and the stdout body is the empty {} (Cascade never reads it). The advice text is effectively
    // dropped — this is the documented Windsurf limitation, asserted here as reality.
    expect(second.report.stderrMessage).toBeUndefined();
    expect(second.report.wroteOutput).toBe(true);
    expect(second.stdout).toEqual(['{}']);
    expect(JSON.parse(second.stdout[0])).toEqual({});
  });

  test('stateful (deny mode): unchanged re-read → DENY via exit 2 + stderr reason, stdout ["{}"]', async () => {
    process.env.READ_ONCE_MODE = 'deny';
    const file = path.join(tmp, 'secret.txt');
    fs.writeFileSync(file, 'top secret windsurf');

    await runReal(readOnceHook, readOf(file));         // first read records state
    const second = await runReal(readOnceHook, readOf(file));
    expect(second.report.exitCode).toBe(2);            // (!) Windsurf deny → exit 2
    // (!) the read-once deny reason reaches the model via STDERR (not the stdout JSON body).
    expect(second.report.stderrMessage).toBeDefined();
    expect(second.report.stderrMessage).toContain('read-once:');
    expect(second.report.stderrMessage).toContain('secret.txt');
    expect(second.report.wroteOutput).toBe(true);
    expect(second.stdout).toEqual(['{}']);             // empty formatOutput body (never parsed)
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once-reset (PreCompact/PostCompact side-effect). Windsurf has NO compact / session
// lifecycle events (docs Practical Conclusion 4) — the log captured none, so there is NO verbatim
// Windsurf input that TRIGGERS this hook (documented gap, not fabricated). We assert only that a
// real Windsurf event is correctly GATED OUT.
// ─────────────────────────────────────────────────────────────────────────────
describe('windsurf E2E — read-once-reset (no compact events on Windsurf)', () => {
  beforeEach(() => stateByNamespace.clear());

  test('verbatim pre_read_code (PreRead) → gated out (event-mismatch: hook targets Pre/PostCompact)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, fx('pre-read-readme.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });
});
