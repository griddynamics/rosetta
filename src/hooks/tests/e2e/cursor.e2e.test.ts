// cursor.e2e.test.ts — log-driven end-to-end tests for Cursor.
//
// Fixtures under fixtures/cursor/ are VERBATIM RAW STDIN blocks captured in docs/hooks/cursor-logs.txt
// (Runs 1–2, session 74676b03-c5c8-4868-ace0-0099aafab72e), docs/hooks/cursor-run3-logs.txt (Run 3,
// session 614ce89f-8bd4-4bf0-818a-8858bb3aeda4) and docs/hooks/cursor-run4-logs.txt (Run 4, session
// 78d9aebd-5573-4e6b-b018-832b56991975), all Cursor 3.9.16. Each real payload is replayed through the
// real pipeline (no adapter mocks) to verify: detection (env + shape), normalization (every field),
// and each Rosetta hook's output / exit code / stderr against the verified contract in
// docs/hooks/cursor.md and adapters/cursor.ts.
//
// Cursor specifics exercised here (vs the Claude reference):
//   • OUTPUT IS FLAT snake_case — permission / user_message / additional_context at TOP LEVEL, NO
//     hookSpecificOutput wrapper (adapters/cursor.ts formatOutput; cursor.md Practical Conclusion 1).
//   • DENY = EXIT 0 (JSON body permission:"deny" + user_message) — the cursor adapter deliberately
//     has NO exit-2 override (adapters/cursor.ts comment; cursor.md Practical Conclusion 9).
//   • Event names are camelCase and mapped via ide-rows/cursor.ts: preToolUse→PreToolUse,
//     postToolUse→PostToolUse, beforeReadFile→PreRead (special case), sessionStart→SessionStart,
//     preCompact→PreCompact, beforeSubmitPrompt→PrePromptSubmit, stop→Stop. Events with no mapping
//     (beforeShellExecution / afterShellExecution / postToolUseFailure / afterAgentThought /
//     afterAgentResponse / afterFileEdit / subagentStart / subagentStop) normalize to event=null.
//   • Cursor is a VS Code fork: its captured env carries VSCODE_* too, so detection MUST resolve
//     cursor via CURSOR_VERSION (checked before the generic VSCODE→copilot env fallback).
//
// Gaps (NOT fabricated — no real Cursor input in any captured run):
//   • dangerous-actions HARD-DENY / reconsider-deny: every captured Shell command is safe (echo / cat)
//     and the one captured Write targets a benign scratch file — so no real payload triggers a deny.
//     Covered under IDEs whose sessions captured a dangerous action. The safe/gated paths ARE covered.
//   • read-once-reset PostCompact: Cursor has no postCompact event (ide-rows/cursor.ts maps only
//     preCompact→PreCompact); only PreCompact fired. PostCompact is covered under Claude Code.
//   • read-once same-session advise/deny: a verbatim single read can't pin fs+state deterministically,
//     so the stateful contract is driven through the real pipeline using the real Cursor read wire
//     SHAPE (pre-read.json) pointed at a controlled temp file — same technique as the Claude suite.

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

const fx = (name: string) => rawFixture(`cursor/${name}`);
// normalize/detectIDE operate on the PARSED object (only readStdin, exercised via runReal, parses
// the wire string); pass JSON.parse of the exact fixture bytes.
const norm = (name: string, env: Env = {}) => normalize(JSON.parse(fx(name)), env);

const REAL_ENV = jsonFixture<Env>('cursor/env.json');
const CWD = '/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql';
const SESSION_R1 = '74676b03-c5c8-4868-ace0-0099aafab72e';   // Runs 1–2
const SESSION_R3 = '614ce89f-8bd4-4bf0-818a-8858bb3aeda4';   // Run 3
const SESSION_R4 = '78d9aebd-5573-4e6b-b018-832b56991975';   // Run 4

// ─────────────────────────────────────────────────────────────────────────────
// Detection — ENV signature and payload shape both resolve to cursor.
// ─────────────────────────────────────────────────────────────────────────────
describe('cursor E2E — detection', () => {
  test('real ENV signature (CURSOR_VERSION) → cursor, via env tier — wins over the VSCODE→copilot fallback', () => {
    // Cursor is a VS Code fork: the captured env carries VSCODE_* AND CURSOR_VERSION, and no
    // CLAUDECODE. CURSOR_VERSION is checked BEFORE the generic VSCODE_* copilot catch-all, so it
    // must resolve to cursor (not copilot) — the exact ambiguity ENV_DETECTION_ORDER exists to break.
    expect(REAL_ENV.CURSOR_VERSION).toBe('3.9.16');
    expect(REAL_ENV.VSCODE_PID).toBeDefined();       // the VS Code fork signal is present…
    expect(REAL_ENV.CLAUDECODE).toBeUndefined();     // …and it is not claude that would otherwise win
    for (const name of ['session-start.json', 'pre-shell-echo.json', 'stop.json', 'before-shell-execution.json'])
      expect(detectIDE(JSON.parse(fx(name)), REAL_ENV)).toBe('cursor');
  });

  test('payload SHAPE alone (no env) → cursor', () => {
    // CURSOR_SIGNATURE = hook_event_name + cursor_version. Payloads WITH tool_input would also match
    // claude-code's shape (hook_event_name+tool_input+session_id), but cursor is checked first in
    // DETECTION_ORDER; codex needs turn_id (absent — cursor uses generation_id). Both classes resolve
    // to cursor: with tool_input (pre-shell-echo/pre-read/pre-write) and without (session-start/stop).
    for (const name of [
      'session-start.json', 'pre-shell-echo.json', 'pre-read.json', 'pre-write.json',
      'post-shell.json', 'stop.json', 'pre-compact.json', 'before-shell-execution.json',
    ])
      expect(detectIDE(JSON.parse(fx(name)), {})).toBe('cursor');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Normalization — every field of the canonical NormalizedInput, per real payload.
// session_id is derived from conversation_id (cursor replaces session_id with conversation_id).
// ─────────────────────────────────────────────────────────────────────────────
describe('cursor E2E — normalization', () => {
  test('sessionStart → SessionStart, no tool, conversation_id→session_id, passthroughs', () => {
    const n = norm('session-start.json');
    expect(n.ide).toBe('cursor');
    expect(n.event).toBe('SessionStart');
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.hook_event_name).toBe('SessionStart');       // camelCase → PascalCase
    expect(n.session_id).toBe(SESSION_R3);
    expect(n.conversation_id).toBe(SESSION_R3);            // preserved alongside session_id
    expect(n.cwd).toBeUndefined();                         // no cwd key; NOT derived from workspace_roots — Cursor reports them as distinct fields (cursor.md:226 shows cwd "" while workspace_roots is populated); workspace_roots itself passes through via ...rest
    expect(n.workspace_roots).toEqual([CWD]);              // the workspace root IS carried (passthrough) — so nothing is lost by leaving cwd absent
    expect(n.composer_mode).toBe('agent');                 // passthrough via ...rest
    expect(n.tool_name).toBeUndefined();
  });

  test('beforeSubmitPrompt → PrePromptSubmit, no tool, prompt passthrough', () => {
    const n = norm('beforesubmitprompt.json');
    expect(n.event).toBe('PrePromptSubmit');
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.hook_event_name).toBe('BeforeSubmitPrompt');  // no mapping to a PreRead special case → PascalCase
    expect(typeof n.prompt).toBe('string');                // passthrough
    expect(n.session_id).toBe(SESSION_R1);
  });

  test('preToolUse Shell → PreToolUse, toolKind bash, command preserved, empty cwd kept', () => {
    const n = norm('pre-shell-echo.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');                       // Shell → bash (ide-rows/cursor TOOL_KINDS)
    expect(n.tool_name).toBe('Shell');
    expect(n.file_path).toBe('');                          // no file in tool_input
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
    expect(n.tool_use_id).toBe('09dca0a5-cdf3-4c9a-9cae-ad30ed8d1fbb');
    expect(n.cwd).toBe('');                                // raw cwd is "" → preserved (not undefined)
    expect(n.hook_event_name).toBe('PreToolUse');
  });

  test('preToolUse Read → PreToolUse (NOT re-routed to PreRead), toolKind read, file_path from tool_input', () => {
    // Unlike claude-code (PreToolUse+Read → PreRead), the cursor adapter has NO such re-route; only
    // beforeReadFile / beforeTabFileRead map to PreRead. A tool-driven Read stays PreToolUse.
    const n = norm('pre-read.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('read');
    expect(n.tool_name).toBe('Read');
    expect(n.file_path).toBe(`${CWD}/docs/hooks/HOOK-DENY-PROBE.txt`);
    expect(n.cwd).toBeUndefined();                         // no cwd key in a Read payload; not derivable (see sessionStart — workspace_roots ≠ cwd)
  });

  test('beforeReadFile → PreRead, toolKind "read", file_path from the TOP LEVEL', () => {
    // beforeReadFile is Cursor's granular file-read hook: it carries file_path + content at the TOP
    // LEVEL (no tool_input wrapper, no tool_name — docs/hooks/cursor.md:56). The canonical must still
    // be fully mapped: file_path resolved from the top level and toolKind derived as 'read' from the
    // PreRead event — otherwise read-once's ['read','bash'] gate silently skips a real read (OI-8, fixed).
    const n = norm('before-read-file.json');
    expect(n.event).toBe('PreRead');
    expect(n.hook_event_name).toBe('PreRead');             // PreRead special-case output name
    expect(n.toolKind).toBe('read');                       // derived from the event
    expect(n.tool_name).toBe('Read');                      // derived: Cursor's read tool is "Read" (grounded in cursor-logs.txt); absent from THIS payload but knowable
    expect(n.file_path).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql/docs/hooks/tester.js');
    expect(n.session_id).toBe(SESSION_R3);
  });

  test('preToolUse Grep → PreToolUse, toolKind null (unmapped tool), file_path from tool_input', () => {
    const n = norm('pre-grep.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBeNull();                         // TRULY-ABSENT: no SemanticKind fits a search tool — vocabulary is write/edit/multi-edit/patch/create/replace/bash/read/mcp-call (ide-registry TOOL_KINDS); Grep is none
    expect(n.tool_name).toBe('Grep');
    expect(n.file_path).toBe(CWD);                         // Grep's tool_input.file_path is the search root
  });

  test('preToolUse Task → PreToolUse, toolKind null, no file_path', () => {
    const n = norm('pre-task.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBeNull();                         // TRULY-ABSENT: no SemanticKind fits a subagent-spawn tool (Task ∉ TOOL_KINDS vocabulary); not derivable
    expect(n.tool_name).toBe('Task');
    expect(n.file_path).toBe('');
    expect(n.session_id).toBe(SESSION_R4);
  });

  test('preToolUse Write → PreToolUse, toolKind write, file_path + content preserved', () => {
    const n = norm('pre-write.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('write');                      // Write matches write BEFORE edit in TOOL_KINDS
    expect(n.tool_name).toBe('Write');
    expect(n.file_path).toBe(`${CWD}/docs/hooks/_run4-scratch.txt`);
    expect((n.tool_input as { content: string }).content).toBe('run4\n');
  });

  test('postToolUse Shell → PostToolUse, toolKind bash, tool_output passthrough', () => {
    const n = norm('post-shell.json');
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('Shell');
    expect(typeof n.tool_output).toBe('string');           // passthrough (cursor uses tool_output, not tool_response)
    expect(n.duration).toBe(728.221);                      // passthrough
    expect(n.hook_event_name).toBe('PostToolUse');
  });

  test('preCompact → PreCompact, no tool, trigger passthrough', () => {
    const n = norm('pre-compact.json');
    expect(n.event).toBe('PreCompact');
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.trigger).toBe('manual');                      // passthrough
    expect(n.is_first_compaction).toBe(true);              // passthrough
    expect(n.hook_event_name).toBe('PreCompact');
  });

  test('stop → Stop, no tool, status passthrough', () => {
    const n = norm('stop.json');
    expect(n.event).toBe('Stop');
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.status).toBe('error');                        // passthrough
    expect(n.loop_count).toBe(0);                          // passthrough
    expect(n.session_id).toBe(SESSION_R1);
    expect(n.hook_event_name).toBe('Stop');
  });

  test('unmapped events → event null, but toolKind still fully mapped where derivable (beforeShellExecution / afterShellExecution / postToolUseFailure)', () => {
    // None of these are in ide-rows/cursor EVENTS → lookupEvent returns null (Rosetta has no semantic
    // event for the granular shell/failure hooks; mapping them to PreToolUse would wrongly double-fire
    // with the generic layer — cursor.md Practical Conclusion 2). Normalization does not throw;
    // hook_event_name is still PascalCased; fields passthrough via ...rest. The EVENT being null does NOT
    // license a null toolKind: toolKind is a separate axis and must be filled when derivable.
    const bse = norm('before-shell-execution.json');
    expect(bse.event).toBeNull();                          // no semantic event exists for beforeShellExecution (by design; registry unmapped)
    // beforeShellExecution is the Shell tool's granular hook (cursor.md Practical Conclusion 2; tool
    // name "Shell" per cursor.md:223) — command is top-level, tool_name is omitted but KNOWABLE. Derive
    // Shell → bash so the canonical is fully mapped (same shape as postToolUseFailure below: toolKind on
    // a null event). Was wrongly asserted null (canonical-completeness bug).
    expect(bse.tool_name).toBe('Shell');                   // derived from the event (grounded)
    expect(bse.toolKind).toBe('bash');                     // Shell → bash (ide-rows/cursor TOOL_KINDS)
    expect(bse.hook_event_name).toBe('BeforeShellExecution');
    expect(bse.command).toBe('echo rosetta-hook-probe');   // top-level passthrough
    expect(bse.cwd).toBe('');                              // raw cwd is "" → preserved; NOT derived from workspace_roots (cursor.md:226 shows cwd "" alongside a populated workspace_roots — distinct fields)

    const ase = norm('after-shell-execution.json');
    expect(ase.event).toBeNull();
    expect(ase.tool_name).toBe('Shell');                   // afterShellExecution is also the Shell tool's granular hook → derived
    expect(ase.toolKind).toBe('bash');                     // Shell → bash
    expect(ase.hook_event_name).toBe('AfterShellExecution');
    expect(ase.output).toBe('rosetta-hook-probe\n');       // passthrough

    // postToolUseFailure carries a real tool_name (Read) → toolKind read even though the EVENT is null.
    const ptf = norm('post-tool-use-failure.json');
    expect(ptf.event).toBeNull();
    expect(ptf.toolKind).toBe('read');
    expect(ptf.tool_name).toBe('Read');
    expect(ptf.failure_type).toBe('permission_denied');    // passthrough
    expect(ptf.hook_event_name).toBe('PostToolUseFailure');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: dangerous-actions (on PreToolUse × bash/write/edit/multi-edit/mcp-call).
// Real captured Shell commands are all SAFE (echo / cat) and the captured Write targets a benign
// scratch file → null → exit 0, no stdout. No dangerous payload was captured (see header). Gating is
// verified for the events/tools cursor produces that the hook must ignore.
// ─────────────────────────────────────────────────────────────────────────────
describe('cursor E2E — dangerous-actions', () => {
  test('safe Shell `echo …` (toolKind bash) → no output, exit 0, no stderr', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-shell-echo.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('safe Shell `cat docs/hooks/…` → no output, exit 0 (matches no DANGEROUS_BASH pattern)', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-shell-cat.json'));
    expect(report.exitCode).toBe(0);
    expect(report.reason).toBe('null-result');
    expect(stdout).toEqual([]);
  });

  test('benign Write (toolKind write) → hook runs, benign path+content → null, exit 0', async () => {
    // Exercises the write branch on a REAL cursor Write payload: PreToolUse+write passes the gate,
    // evalWrite finds no dangerous path/content → null.
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-write.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('Grep (toolKind null) → gated out (tool-kind-mismatch), exit 0', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('pre-grep.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('tool-kind-mismatch');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('Read (PreToolUse × read) → gated out (tool-kind-mismatch: hook targets bash/write/edit/mcp)', async () => {
    const { report } = await runReal(dangerousActionsHook, fx('pre-read.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('tool-kind-mismatch');
    expect(report.exitCode).toBe(0);
  });

  test('postToolUse Shell (event PostToolUse) → gated out (event-mismatch: hook targets PreToolUse only)', async () => {
    const { report } = await runReal(dangerousActionsHook, fx('post-shell.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
  });

  test('beforeShellExecution (event null) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(dangerousActionsHook, fx('before-shell-execution.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once (on PreRead/PreToolUse × read/bash). read-once is STATEFUL and does a real
// fs.statSync. Two parts:
//   • routing/no-op on the VERBATIM captured payloads (deterministic: single read / stat-miss → null);
//   • the stateful advise/deny contract driven through the real pipeline using the real cursor read
//     wire SHAPE pointed at a controlled temp file — asserting CURSOR'S FLAT output.
// State is swapped for the in-memory mock above so the suite is hermetic and never touches ~/.rosetta.
// ─────────────────────────────────────────────────────────────────────────────
describe('cursor E2E — read-once', () => {
  let tmp: string;

  beforeEach(() => {
    stateByNamespace.clear();                                  // fresh in-memory state per test
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ro-cursor-e2e-')); // real files for real fs.statSync
    delete process.env.READ_ONCE_MODE;
    delete process.env.READ_ONCE_DISABLED;
  });
  afterEach(() => {
    delete process.env.READ_ONCE_MODE;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // Build a real cursor PreToolUse Read wire object pointed at `file` (keeps every other real field).
  const readOf = (file: string, sessionId = SESSION_R1): string => {
    const base = JSON.parse(fx('pre-read.json')) as Record<string, unknown>;
    return JSON.stringify({
      ...base,
      conversation_id: sessionId,
      session_id: sessionId,
      cwd: path.dirname(file),
      tool_input: { file_path: file },
    });
  };

  // Build a real cursor beforeReadFile wire object (TOP-LEVEL file_path, no tool_input) pointed at `file`.
  const beforeReadFileOf = (file: string, sessionId = SESSION_R3): string => {
    const base = JSON.parse(fx('before-read-file.json')) as Record<string, unknown>;
    return JSON.stringify({ ...base, conversation_id: sessionId, session_id: sessionId, cwd: path.dirname(file), file_path: file });
  };

  test('routing: verbatim Shell `echo …` reaches read-once but is not a read → null, exit 0', async () => {
    // toolKind bash IS in read-once's set, so it runs; `echo` is not cat/sed/… → pass-through null.
    const { stdout, report } = await runReal(readOnceHook, fx('pre-shell-echo.json'));
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('routing: verbatim Shell `cat …` (a simple shell read) reaches stat but path is unresolved → stat-miss null', async () => {
    // extractSimpleShellReadPath detects `cat <path>`; the relative path resolves against the (empty)
    // cwd → the file does not exist → stat-miss → null. Reaches run() (contrast the gated cases).
    const { stdout, report } = await runReal(readOnceHook, fx('pre-shell-cat.json'));
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('routing: verbatim Read (PreToolUse × read) reaches read-once → single read → null', async () => {
    const { stdout, report } = await runReal(readOnceHook, fx('pre-read.json'));
    expect(report.status).toBe('completed'); // reached run(): PreToolUse+read accepted
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);              // first-read-allow OR stat-miss → null either way
    expect(report.stderrMessage).toBeUndefined();
  });

  test('routing: verbatim beforeReadFile (PreRead) now REACHES read-once (toolKind read) → single-read no-op', async () => {
    // OI-8 fix: beforeReadFile normalizes to event PreRead AND toolKind 'read' (derived from the
    // event), so it PASSES read-once's ['read','bash'] gate and runs — it is no longer silently
    // skipped. A single read → first-read-allow (or stat-miss) → null.
    const { stdout, report } = await runReal(readOnceHook, fx('before-read-file.json'));
    expect(report.status).toBe('completed'); // reached run() — was wrongly 'skipped' before the fix
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('beforeReadFile IS now deduped by read-once: unchanged re-read same session → advise (FLAT), exit 0', async () => {
    // The payoff of the OI-8 fix: Cursor's native file-read event is tracked. Two reads of the same
    // unchanged file in one session → the 2nd is an advise, in Cursor's FLAT shape (no hookSpecificOutput).
    const file = path.join(tmp, 'notes.md');
    fs.writeFileSync(file, 'hello read-once');

    const first = await runReal(readOnceHook, beforeReadFileOf(file));
    expect(first.stdout).toEqual([]);          // first read allowed
    expect(first.report.exitCode).toBe(0);

    const second = await runReal(readOnceHook, beforeReadFileOf(file));
    expect(second.report.exitCode).toBe(0);
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    expect(out.permission).toBe('allow');            // FLAT cursor advise
    expect(out.additional_context).toContain('read-once:');
    expect(out.additional_context).toContain('notes.md');
    expect(out.hookSpecificOutput).toBeUndefined();  // cursor never nests
  });

  test('stateful (warn): first read → null; unchanged re-read same session → advise (FLAT additional_context+permission:allow), exit 0', async () => {
    const file = path.join(tmp, 'notes.md');
    fs.writeFileSync(file, 'hello read-once cursor');

    const first = await runReal(readOnceHook, readOf(file));
    expect(first.stdout).toEqual([]);        // first read allowed
    expect(first.report.exitCode).toBe(0);

    const second = await runReal(readOnceHook, readOf(file));
    expect(second.report.exitCode).toBe(0);  // cursor advise → exit 0
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    // FLAT snake_case — NO hookSpecificOutput wrapper.
    expect(out.hookSpecificOutput).toBeUndefined();
    expect(out.permission).toBe('allow');
    expect(out.additional_context).toContain('read-once:');
    expect(out.additional_context).toContain('notes.md');
  });

  test('stateful (deny mode): unchanged re-read → FLAT deny (permission:deny + user_message), exit 0, NO stderr', async () => {
    process.env.READ_ONCE_MODE = 'deny';
    const file = path.join(tmp, 'secret.txt');
    fs.writeFileSync(file, 'top secret');

    await runReal(readOnceHook, readOf(file));         // first read records state
    const second = await runReal(readOnceHook, readOf(file));
    expect(second.report.exitCode).toBe(0);            // cursor deny is carried in the body at exit 0 (no exit-2 override)
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    expect(out.hookSpecificOutput).toBeUndefined();    // FLAT — no wrapper
    expect(out.permission).toBe('deny');
    expect(out.user_message).toContain('read-once:');
    expect(out.user_message).toContain('secret.txt');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once-reset (side-effect on PreCompact/PostCompact — clears the session's read-once
// state). Cursor's real preCompact → side-effect → NO stdout, exit 0. Cursor has no postCompact event
// (see header) — PostCompact is covered under Claude Code. State isolated via the in-memory mock.
// ─────────────────────────────────────────────────────────────────────────────
describe('cursor E2E — read-once-reset', () => {
  beforeEach(() => stateByNamespace.clear());

  test('verbatim preCompact (→ PreCompact) → side-effect (no stdout, exit 0)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, fx('pre-compact.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('side-effect');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
  });

  test('non-compact event (verbatim stop) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(readOnceResetHook, fx('stop.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
  });

  test('unmapped event (verbatim beforeShellExecution, event null) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(readOnceResetHook, fx('before-shell-execution.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
  });
});
