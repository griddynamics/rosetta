// claude-code.e2e.test.ts — log-driven end-to-end tests for Claude Code.
//
// Fixtures under fixtures/claude-code/ are VERBATIM RAW STDIN blocks captured in
// docs/hooks/claude-logs.txt (session 6bd73c2b-242e-4e14-b4c8-ca6596546ac5). Each real payload is
// replayed through the real pipeline (no mocks) to verify: detection (env + shape), normalization
// (every field), and each Rosetta hook's output / exit code / stderr against the verified contract
// in docs/hooks/claude-code.md.
//
// Claude is the CANONICAL adapter (identity formatOutput). The session captured Bash / Read /
// Agent / ToolSearch tool calls — NO Write/Edit — so the write/edit-triggered hooks
// (lint-format-advisory, md-file-advisory, loose-files, codemap-refresh) have no real Claude input
// here and are covered under the IDEs whose sessions did capture writes. Not fabricated.

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectIDE, normalize } from '../../src/adapter';
import { dangerousActionsHook } from '../../src/hooks/dangerous-actions';
import { readOnceHook } from '../../src/hooks/read-once';
import { readOnceResetHook } from '../../src/hooks/read-once-reset';
import { rawFixture, jsonFixture, runReal, type Env } from './helpers';

// read-once persists to $HOME/.rosetta/state via a module-level STATE_ROOT bound at IMPORT time —
// an on-disk backend we deliberately swap for an in-memory one so this suite is HERMETIC and
// DETERMINISTIC (no real ~/.rosetta writes; no cross-run state coupling). This is the ONLY thing
// stubbed: the pipeline, adapters, real fs.statSync, and read-once's own decision logic all run for
// real. (Matches tests/read-once.test.ts.) Only read-once / read-once-reset touch this module.
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

const fx = (name: string) => rawFixture(`claude-code/${name}`);
// normalize/detectIDE operate on the PARSED object (only readStdin, exercised via runReal, parses
// the wire string); pass JSON.parse of the exact fixture bytes.
const norm = (name: string, env: Env = {}) => normalize(JSON.parse(fx(name)), env);

const REAL_ENV = jsonFixture<Env>('claude-code/env.json');
const SESSION = '6bd73c2b-242e-4e14-b4c8-ca6596546ac5';
const CWD = '/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql';

// ─────────────────────────────────────────────────────────────────────────────
// Detection — ENV signature and payload shape both resolve to claude-code.
// ─────────────────────────────────────────────────────────────────────────────
describe('claude-code E2E — detection', () => {
  test('real ENV signature (CLAUDECODE=1) → claude-code, via env tier', () => {
    // The captured env carries CLAUDECODE=1 and none of the other IDEs' signature vars.
    expect(REAL_ENV.CLAUDECODE).toBe('1');
    for (const name of ['session-start-startup.json', 'pre-bash-echo.json', 'pre-read-deny-probe.json'])
      expect(detectIDE(JSON.parse(fx(name)), REAL_ENV)).toBe('claude-code');
  });

  test('payload SHAPE alone (no env) → claude-code', () => {
    // hook_event_name + session_id, without codex (turn_id) / cursor (cursor_version) extras.
    for (const name of ['session-start-startup.json', 'pre-bash-echo.json', 'post-bash-find.json', 'stop.json'])
      expect(detectIDE(JSON.parse(fx(name)), {})).toBe('claude-code');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Normalization — every field of the canonical NormalizedInput, per real payload.
// ─────────────────────────────────────────────────────────────────────────────
describe('claude-code E2E — normalization', () => {
  test('SessionStart (startup): event SessionStart, no tool, source passthrough', () => {
    const n = norm('session-start-startup.json');
    expect(n.ide).toBe('claude-code');
    expect(n.event).toBe('SessionStart');
    expect(n.toolKind).toBeNull(); // TRULY-ABSENT: SessionStart is not a tool event — payload has no tool_name/tool_input (claude-code.md SessionStart Input); not derivable.
    expect(n.file_path).toBe(''); // TRULY-ABSENT: SessionStart carries only source/model — no file target anywhere in the payload.
    expect(n.cwd).toBe(CWD);
    expect(n.session_id).toBe(SESSION);
    expect(n.source).toBe('startup');            // passthrough via ...raw
    expect(n.model).toBe('claude-opus-4-8[1m]'); // passthrough
    expect(n.tool_name).toBeUndefined(); // TRULY-ABSENT: no tool_name key on SessionStart; canonical identity adapter leaves it undefined.
  });

  test('PreToolUse Bash: event PreToolUse, toolKind bash, command preserved', () => {
    const n = norm('pre-bash-echo.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('Bash');
    expect(n.file_path).toBe(''); // TRULY-ABSENT: Bash tool_input is {command:"echo rosetta-hook-probe", description} — no file_path/filePath/path key, and the command targets no file. Not derivable.
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
    expect(n.tool_use_id).toBe('toolu_016h7PRcPhgfyuKN186ZnWpJ');
  });

  test('PreToolUse Read: event re-routed to PreRead, toolKind read, file_path resolved', () => {
    const n = norm('pre-read-deny-probe.json');
    expect(n.event).toBe('PreRead'); // PreToolUse + read → PreRead (claude-code adapter rule)
    expect(n.toolKind).toBe('read');
    expect(n.tool_name).toBe('Read');
    expect(n.file_path).toBe(`${CWD}/docs/hooks/HOOK-DENY-PROBE.txt`);
  });

  test('PreToolUse Agent: unmapped tool → toolKind null, event stays PreToolUse', () => {
    const n = norm('pre-agent.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBeNull(); // TRULY-ABSENT: Agent (subagent spawn) maps to no Rosetta SemanticKind (write/edit/multi-edit/patch/create/replace/bash/read/mcp-call) — it is not a file/shell/mcp op. Not derivable.
    expect(n.tool_name).toBe('Agent');
    expect(n.file_path).toBe(''); // TRULY-ABSENT: Agent tool_input is {description, prompt} — no file_path key; prompt prose mentioning a dir is not a file target. Not derivable.
  });

  test('PostToolUse Bash: event PostToolUse, toolKind bash, tool_response passthrough', () => {
    const n = norm('post-bash-find.json');
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('bash');
    expect((n.tool_response as { interrupted: boolean }).interrupted).toBe(false);
    expect(n.agent_type).toBe('general-purpose'); // passthrough
  });

  test('Stop: event Stop, no tool, stop_hook_active passthrough', () => {
    const n = norm('stop.json');
    expect(n.event).toBe('Stop');
    expect(n.toolKind).toBeNull(); // TRULY-ABSENT: Stop is a turn-end event — no tool_name/tool_input (claude-code.md Stop Input). Not derivable.
    expect(n.file_path).toBe(''); // TRULY-ABSENT: Stop payload has no file target (stop_hook_active/last_assistant_message only).
    expect(n.stop_hook_active).toBe(false); // passthrough
    expect(n.session_id).toBe(SESSION);
  });

  test('PreCompact / PostCompact: event mapped 1:1, trigger passthrough, no tool', () => {
    const pre = norm('pre-compact.json');
    expect(pre.event).toBe('PreCompact');
    expect(pre.toolKind).toBeNull(); // TRULY-ABSENT: PreCompact is a compaction event — no tool_name/tool_input (claude-code.md PreCompact Input: trigger + custom_instructions only). Not derivable.
    expect(pre.trigger).toBe('manual');
    const post = norm('post-compact.json');
    expect(post.event).toBe('PostCompact');
    expect(post.trigger).toBe('manual');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: dangerous-actions (on PreToolUse × bash/write/edit/multi-edit/mcp-call).
// Real captured commands are all SAFE (echo / find -type f) → null → exit 0, no stdout.
// ─────────────────────────────────────────────────────────────────────────────
describe('claude-code E2E — dangerous-actions', () => {
  test('safe Bash `echo …` → no output, exit 0, no stderr', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-bash-echo.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('safe Bash `find … -type f` → no output, exit 0 (matches no DANGEROUS_BASH pattern)', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-bash-find.json'));
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
    expect(report.reason).toBe('null-result');
  });

  test('Agent tool (toolKind null) → gated out (tool-kind-mismatch), exit 0', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-agent.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('tool-kind-mismatch');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('Read (event PreRead) → gated out (event-mismatch: hook targets PreToolUse only)', async () => {
    const { report } = await runReal(dangerousActionsHook, fx('pre-read-deny-probe.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once (on PreRead/PreToolUse × read/bash). read-once is STATEFUL (persistent state at
// $HOME/.rosetta/state) and does a real fs.statSync. Two parts:
//   • routing/no-op on the VERBATIM captured payloads (deterministic: a single read → null);
//   • the stateful advise/deny contract driven through the real pipeline using the real Claude wire
//     SHAPE pointed at a controlled temp file (a verbatim log can't pin fs+state deterministically).
// State is isolated under a temp HOME so the suite is hermetic and never touches the real store.
// ─────────────────────────────────────────────────────────────────────────────
describe('claude-code E2E — read-once', () => {
  let tmp: string;

  beforeEach(() => {
    stateByNamespace.clear();                                  // fresh in-memory state per test
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ro-e2e-'));   // real files for real fs.statSync
    delete process.env.READ_ONCE_MODE;
    delete process.env.READ_ONCE_DISABLED;
  });
  afterEach(() => {
    delete process.env.READ_ONCE_MODE;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // Build a real Claude PreToolUse Read wire object pointed at `file` (keeps every other real field).
  const readOf = (file: string, sessionId = SESSION): string => {
    const base = JSON.parse(fx('pre-read-deny-probe.json')) as Record<string, unknown>;
    return JSON.stringify({ ...base, session_id: sessionId, cwd: path.dirname(file), tool_input: { file_path: file } });
  };

  test('routing: verbatim Bash `echo …` reaches read-once but is not a read → null, exit 0', async () => {
    // toolKind bash IS in read-once's set, so it runs; `echo` is not cat/sed/… → pass-through null.
    const { stdout, report } = await runReal(readOnceHook, fx('pre-bash-echo.json'));
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('routing: verbatim Read (PreRead) reaches read-once (not gated) → safe no-op single read', async () => {
    const { stdout, report } = await runReal(readOnceHook, fx('pre-read-deny-probe.json'));
    expect(report.status).toBe('completed'); // reached run(): PreRead+read accepted (contrast dangerous-actions)
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);              // first-read-allow OR stat-miss → null either way
    expect(report.stderrMessage).toBeUndefined();
  });

  test('stateful (warn): first read → null; unchanged re-read same session → advise (nested additionalContext), exit 0', async () => {
    const file = path.join(tmp, 'notes.md');
    fs.writeFileSync(file, 'hello read-once');

    const first = await runReal(readOnceHook, readOf(file));
    expect(first.stdout).toEqual([]);        // first read allowed
    expect(first.report.exitCode).toBe(0);

    const second = await runReal(readOnceHook, readOf(file));
    expect(second.report.exitCode).toBe(0);  // claude advise → exit 0
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    expect(out.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(out.hookSpecificOutput.additionalContext).toContain('read-once:');
    expect(out.hookSpecificOutput.additionalContext).toContain('notes.md');
  });

  test('stateful (deny mode): unchanged re-read → deny in JSON body, exit 0, NO stderr (claude carries deny in stdout)', async () => {
    process.env.READ_ONCE_MODE = 'deny';
    const file = path.join(tmp, 'secret.txt');
    fs.writeFileSync(file, 'top secret');

    await runReal(readOnceHook, readOf(file));         // first read records state
    const second = await runReal(readOnceHook, readOf(file));
    expect(second.report.exitCode).toBe(0);            // claude deny is carried in the body, not exit code
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('read-once:');
    expect(out.continue).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once-reset (side-effect on PreCompact/PostCompact — clears the session's read-once
// state). Real compact payloads → side-effect → NO stdout, exit 0. State isolated under temp HOME.
// ─────────────────────────────────────────────────────────────────────────────
describe('claude-code E2E — read-once-reset', () => {
  beforeEach(() => stateByNamespace.clear());

  test('verbatim PreCompact → side-effect (no stdout, exit 0)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, fx('pre-compact.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('side-effect');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
  });

  test('verbatim PostCompact → side-effect (no stdout, exit 0)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, fx('post-compact.json'));
    expect(report.reason).toBe('side-effect');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('non-compact event (verbatim PreToolUse Bash) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(readOnceResetHook, fx('pre-bash-echo.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
  });
});
