// antigravity.e2e.test.ts — log-driven end-to-end tests for Google Antigravity (2.0 / CLI / IDE —
// one combined adapter, contract verified identical across all three surfaces).
//
// Fixtures under fixtures/antigravity/ are VERBATIM RAW STDIN blocks captured across THREE real
// sessions (docs/hooks/agy-{cli,ide,2.0}-logs.txt):
//   • CLI  — session 9996e494-b3d9-4cf7-aabf-36acef4972bf, model gemini-3.6-flash-high (terminal/tmux)
//   • IDE  — session b3e702af-9b15-471d-be12-501be4fc9f36, NO modelName (Antigravity IDE, a VS Code
//            fork — its captured env carries BOTH ANTIGRAVITY_CONVERSATION_ID and VSCODE_* vars)
//   • 2.0  — session be777993-927d-49ef-a024-3f87ca05e670, model gemini-3.5-flash-low (Electron app)
// env-{cli,ide,20}.json are the matching captured ENV blocks (secrets redacted at capture time by
// docs/hooks/split-logs.js — see its header for the redaction rule; verified clean here too).
//
// ─── Antigravity is STRICT-SCHEMA — this is the whole point of this suite ───
// Antigravity validates output against the EXACT documented shape for the firing event and drops
// the WHOLE output on any extra/misplaced field (docs/hooks/antigravity.md Practical Conclusion 1).
// So every stdout assertion below checks the EXACT key set (`Object.keys(...).sort()`), not a subset
// — a foreign field slipping through would be invisible to a plain `toEqual` on selected keys alone
// if the implementation also happened to include the right ones, but WOULD sink Antigravity's real
// output-validation in production. `formatOutput` carries no per-IDE stderr channel and no exitCode
// override (deny rides the JSON body at exit 0 — docs/hooks/antigravity.md Exit Codes), so exit code
// is always 0 and stderr is always empty throughout this suite.
//
// ─── Gaps (NOT fabricated) ───
// • None of the three captured sessions contain a genuinely dangerous command/content — the log's
//   HOOK-DENY-PROBE hits were the antigravity tester script's OWN synthetic `--deny-on-match`
//   mechanism (verifying Antigravity's wire contract), NOT a Rosetta dangerous-actions decision, and
//   `view_file` normalizes to toolKind 'read', which dangerous-actions does not gate on at all. So:
//     - the verbatim HOOK-DENY-PROBE `view_file` payloads are replayed to prove they correctly GATE
//       OUT (tool-kind-mismatch) — not a fabricated deny;
//     - the real dangerous-actions DENY proof (the strict {"decision":"deny","reason"} shape) uses
//       the real captured wire SHAPE with only the dangerous field (CommandLine / CodeContent)
//       SUBSTITUTED — everything else verbatim — mirroring windsurf.e2e.test.ts's established
//       "SHAPE(...) + substituted value" convention for the same reason (no real dangerous input was
//       ever captured on any IDE's log).
// • dangerous-actions is stateless (pure function over ctx.toolInput) — no state-store mock needed
//   here (unlike claude-code/windsurf's read-once suites).

import { describe, test, expect } from 'vitest';
import { detectIDE, normalize } from '../../src/adapter';
import { dangerousActionsHook } from '../../src/hooks/dangerous-actions';
import { rawFixture, jsonFixture, runReal, type Env } from './helpers';

const fx = (name: string) => rawFixture(`antigravity/${name}`);
// normalize/detectIDE operate on the PARSED object (only readStdin, exercised via runReal, parses
// the wire string); pass JSON.parse of the exact fixture bytes.
const norm = (name: string, env: Env = {}) => normalize(JSON.parse(fx(name)), env);

const ENV_CLI = jsonFixture<Env>('antigravity/env-cli.json');
const ENV_IDE = jsonFixture<Env>('antigravity/env-ide.json');
const ENV_20  = jsonFixture<Env>('antigravity/env-20.json');

const CLI_SESSION = '9996e494-b3d9-4cf7-aabf-36acef4972bf';
const IDE_SESSION = 'b3e702af-9b15-471d-be12-501be4fc9f36';
const AGY20_SESSION = 'be777993-927d-49ef-a024-3f87ca05e670';
const CWD = '/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql';

/** Assert stdout carries exactly one JSON write whose top-level key set is EXACTLY `keys`. */
const expectStrictStdout = (stdout: string[], keys: string[]): Record<string, unknown> => {
  expect(stdout).toHaveLength(1);
  const parsed = JSON.parse(stdout[0]) as Record<string, unknown>;
  expect(Object.keys(parsed).sort()).toEqual([...keys].sort());
  return parsed;
};

// ─────────────────────────────────────────────────────────────────────────────
// Detection — ENV signature (all three surfaces, including the IDE+VSCODE_* fork collision) and
// payload SHAPE (no env) both resolve to antigravity.
// ─────────────────────────────────────────────────────────────────────────────
describe('antigravity E2E — detection', () => {

  test('CLI real ENV (ANTIGRAVITY_CONVERSATION_ID, no VSCODE_*) → antigravity via env tier', () => {
    expect('ANTIGRAVITY_CONVERSATION_ID' in ENV_CLI).toBe(true);
    expect(Object.keys(ENV_CLI).some((k) => k.startsWith('VSCODE_'))).toBe(false);
    for (const name of ['cli-pre-run-command.json', 'cli-pre-view-deny-probe.json', 'cli-pre-write.json', 'cli-stop.json'])
      expect(detectIDE(JSON.parse(fx(name)), ENV_CLI)).toBe('antigravity');
  });

  // (!) The whole point of this fixture: Antigravity IDE is a VS Code fork and its real captured
  // env carries VSCODE_* vars TOO — the exact routing-bug class already fixed for Cursor (adapter.ts
  // ENV_DETECTION_ORDER: ANTIGRAVITY_CONVERSATION_ID is checked before the generic VSCODE_* catch-all).
  test('IDE real ENV carries BOTH ANTIGRAVITY_CONVERSATION_ID and VSCODE_* → antigravity wins, not copilot', () => {
    expect('ANTIGRAVITY_CONVERSATION_ID' in ENV_IDE).toBe(true);
    expect(Object.keys(ENV_IDE).some((k) => k.startsWith('VSCODE_'))).toBe(true);
    expect(detectIDE(JSON.parse(fx('ide-pre-run-command.json')), ENV_IDE)).toBe('antigravity');
    expect(detectIDE(JSON.parse(fx('ide-pre-invocation.json')), ENV_IDE)).toBe('antigravity');
  });

  test('2.0 real ENV (ANTIGRAVITY_CONVERSATION_ID, no VSCODE_*) → antigravity via env tier', () => {
    expect('ANTIGRAVITY_CONVERSATION_ID' in ENV_20).toBe(true);
    expect(Object.keys(ENV_20).some((k) => k.startsWith('VSCODE_'))).toBe(false);
    for (const name of ['agy20-pre-run-command.json', 'agy20-pre-view-deny-probe.json', 'agy20-post-tool-use.json'])
      expect(detectIDE(JSON.parse(fx(name)), ENV_20)).toBe('antigravity');
  });

  test('payload SHAPE alone (no env) → antigravity, for all three surfaces', () => {
    for (const name of [
      'cli-pre-run-command.json', 'cli-pre-view-deny-probe.json',
      'ide-pre-run-command.json', 'ide-pre-invocation.json',
      'agy20-pre-run-command.json', 'agy20-pre-view-deny-probe.json', 'agy20-post-tool-use.json',
    ])
      expect(detectIDE(JSON.parse(fx(name)), {})).toBe('antigravity');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Normalization — real payloads from all three surfaces → canonical NormalizedInput.
// ─────────────────────────────────────────────────────────────────────────────
describe('antigravity E2E — normalization', () => {

  test('CLI run_command → PreToolUse, toolKind bash, command/cwd extracted, modelName present', () => {
    const n = norm('cli-pre-run-command.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('run_command');
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
    expect(n.cwd).toBe(CWD);
    expect(n.session_id).toBe(CLI_SESSION);
    expect((n._antigravity as Record<string, unknown>).modelName).toBe('gemini-3.6-flash-high');
  });

  test('IDE run_command → PreToolUse, toolKind bash, NO modelName (per contract: absent on IDE)', () => {
    const n = norm('ide-pre-run-command.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
    expect(n.session_id).toBe(IDE_SESSION);
    expect((n._antigravity as Record<string, unknown>).modelName).toBeUndefined();
  });

  test('IDE PreInvocation (invocationNum:0 = session start) → event null, no tool identity', () => {
    const n = norm('ide-pre-invocation.json');
    expect(n.hook_event_name).toBe('PreInvocation');
    expect(n.event).toBeNull();
    expect(n.toolKind).toBeNull();
    expect(n.cwd).toBe(CWD);
  });

  test('2.0 run_command → PreToolUse, toolKind bash, session_id + modelName both present', () => {
    const n = norm('agy20-pre-run-command.json');
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
    expect(n.session_id).toBe(AGY20_SESSION);
    expect((n._antigravity as Record<string, unknown>).modelName).toBe('gemini-3.5-flash-low');
  });

  test('2.0 PostToolUse (toolCall: null) → NO tool identity, per contract', () => {
    const n = norm('agy20-post-tool-use.json');
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBeNull();
    expect(n.tool_name).toBeUndefined();
    expect(n.tool_input).toEqual({});
  });

  test('CLI/2.0 view_file(HOOK-DENY-PROBE.txt) → toolKind read, AbsolutePath extracted', () => {
    for (const [name, session] of [
      ['cli-pre-view-deny-probe.json', CLI_SESSION],
      ['agy20-pre-view-deny-probe.json', AGY20_SESSION],
    ] as const) {
      const n = norm(name);
      expect(n.toolKind).toBe('read');
      expect(n.tool_name).toBe('view_file');
      expect(n.file_path).toBe(`${CWD}/HOOK-DENY-PROBE.txt`);
      expect(n.session_id).toBe(session);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: dangerous-actions (PreToolUse × bash/write/edit/multi-edit/mcp-call). STRICT shape asserted
// throughout — a benign/gated-out case writes NOTHING (report.wroteOutput false, stdout []); a real
// deny writes EXACTLY {"decision":"deny","reason":...} (Object.keys checked), always at exit 0 (no
// exitCode() override for antigravity — see docs/hooks/antigravity.md Exit Codes).
// ─────────────────────────────────────────────────────────────────────────────
describe('antigravity E2E — dangerous-actions', () => {

  test('verbatim CLI run_command `echo …` → safe, no match → no output, exit 0, empty stderr', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('cli-pre-run-command.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('verbatim 2.0 run_command `echo …` → safe, no match → no output, exit 0', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('agy20-pre-run-command.json'));
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
  });

  test('verbatim CLI write_to_file (benign CodeContent) → safe, no match → no output, exit 0', async () => {
    // toolKind write → evalWrite scans file_path (hook-probe-tmp.txt, safe) AND content ("rosetta
    // antigravity probe line one", safe) → null.
    const { stdout, report } = await runReal(dangerousActionsHook, fx('cli-pre-write.json'));
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  // (!) view_file → toolKind 'read', which dangerous-actions does NOT gate on (its toolKinds are
  // bash/write/edit/multi-edit/mcp-call only) — so this is a real, honest GATE-OUT, not a deny. The
  // log's HOOK-DENY-PROBE hit was the Antigravity tester script's OWN synthetic mechanism, not a
  // Rosetta decision (see file header "Gaps" note). Verified on BOTH the CLI and 2.0 captures.
  test('verbatim CLI/2.0 view_file(HOOK-DENY-PROBE.txt) → gated OUT (tool-kind-mismatch: read is not gated), exit 0', async () => {
    for (const name of ['cli-pre-view-deny-probe.json', 'agy20-pre-view-deny-probe.json']) {
      const { stdout, report } = await runReal(dangerousActionsHook, fx(name));
      expect(report.status).toBe('skipped');
      expect(report.reason).toBe('tool-kind-mismatch');
      expect(report.exitCode).toBe(0);
      expect(stdout).toEqual([]);
      expect(report.stderrMessage).toBeUndefined();
    }
  });

  // ── DENY headline: real wire SHAPE (CLI run_command), CommandLine SUBSTITUTED for a genuinely
  // dangerous command — everything else verbatim (session id, cwd, model, transcript path, …). ──
  test('SHAPE(CLI run_command) + `rm -rf /` in CommandLine → DENY: strict {"decision":"deny","reason"}, exit 0', async () => {
    const base = JSON.parse(fx('cli-pre-run-command.json')) as Record<string, unknown>;
    const toolCall = base.toolCall as { args: Record<string, unknown>; name: string };
    const payload = JSON.stringify({ ...base, toolCall: { ...toolCall, args: { ...toolCall.args, CommandLine: 'rm -rf /' } } });

    const { stdout, report } = await runReal(dangerousActionsHook, payload);
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);                 // (!) Antigravity deny rides the JSON body, not exit code
    expect(report.wroteOutput).toBe(true);
    expect(report.stderrMessage).toBeUndefined();     // (!) no stderr channel for antigravity — ever
    const out = expectStrictStdout(stdout, ['decision', 'reason']);
    expect(out.decision).toBe('deny');
    expect(out.reason).toContain('rm-rf-root');
  });

  // ── DENY headline #2: real wire SHAPE (CLI write_to_file), CodeContent SUBSTITUTED for a
  // destructive SQL statement — proves the PascalCase→canonical content mapping is actually wired
  // into the real evaluator end-to-end (not just unit-tested in isolation). ──
  test('SHAPE(CLI write_to_file) + dangerous SQL in CodeContent → DENY: strict shape, exit 0', async () => {
    const base = JSON.parse(fx('cli-pre-write.json')) as Record<string, unknown>;
    const toolCall = base.toolCall as { args: Record<string, unknown>; name: string };
    const payload = JSON.stringify({ ...base, toolCall: { ...toolCall, args: { ...toolCall.args, CodeContent: 'DROP TABLE users;' } } });

    const { stdout, report } = await runReal(dangerousActionsHook, payload);
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(true);
    expect(report.stderrMessage).toBeUndefined();
    const out = expectStrictStdout(stdout, ['decision', 'reason']);
    expect(out.decision).toBe('deny');
    expect(out.reason).toContain('content-sql-drop-table');
  });

  test('verbatim CLI Stop → gated out (event-mismatch: dangerous-actions targets PreToolUse only)', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('cli-stop.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('verbatim IDE PreInvocation → gated out (event-mismatch: no SemanticEvent mapping)', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('ide-pre-invocation.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('verbatim 2.0 PostToolUse (toolCall: null) → gated out (event-mismatch: hook targets PreToolUse only)', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, fx('agy20-post-tool-use.json'));
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });
});
