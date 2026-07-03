// copilot.e2e.test.ts — log-driven end-to-end tests for GitHub Copilot (the TRICKIEST adapter:
// ONE adapter, TWO wire shapes).
//
// Fixtures under fixtures/copilot/ are VERBATIM RAW STDIN blocks captured in:
//   • docs/hooks/copilot-cli-logs.txt  — Copilot CLI   (sessions 8abb87fa…, 41b6a7e4…). The CLI
//     DOUBLE-FIRES: a camelCase R1 payload (toolName/toolArgs/toolResult, timestamp=ms number,
//     NO hook_event_name) AND a PascalCase R3 payload (snake_case: hook_event_name/tool_name/
//     tool_input/tool_result, timestamp=ISO). Both are captured and covered.
//   • docs/hooks/vs-copilot-logs.txt   — VS Code Copilot (sessions e946202d…, f46082a6…). Fires
//     ONCE, PascalCase key → snake_case R3 payload (tool_name run_in_terminal/read_file/list_dir,
//     tool_response = STRING).
// Each real payload is replayed through the real pipeline to verify detection (env + shape),
// normalization (every field, both shapes, the run_in_terminal→bash / read_file→read / Bash→bash /
// view→read routing), and each Rosetta hook's output / exit code / stderr against the verified
// contract in docs/hooks/copilot.md.
//
// DETECTION IS SUBTLE (docs/hooks/copilot.md §7, adapter.ts ENV_DETECTION_ORDER): Copilot's
// snake_case shape (hook_event_name + session_id + tool_input) is a structural SUPERSET-match of
// Claude Code's own wire shape, so shape-only detection of the snake_case payloads resolves to
// claude-code — the runtime ENV tier (COPILOT_CLI=1 for CLI, VSCODE_* for VS Code) is what
// disambiguates. The camelCase CLI payload has NO hook_event_name, so shape alone already yields
// copilot. Both are asserted below. env-cli.json / env-vscode.json are real identifying-var subsets
// of the ENV blocks in the two logs.
//
// OUTPUT = MERGED EMIT (docs/hooks/copilot.md §4/§5, adapters/copilot.ts formatOutput): advise/deny
// place additionalContext / permissionDecision / permissionDecisionReason at BOTH top-level (R1/CLI
// honors this) AND nested in hookSpecificOutput (R3/VS Code honors this). Every output assertion
// below checks BOTH placements. Copilot deny is carried in the JSON body at exit 0 (NOT exit 2, and
// — unlike claude-code — the copilot formatOutput does NOT emit a top-level `continue`).
//
// NOT-FABRICATED GAPS (real captures only; documented, never invented):
//   • No DANGEROUS command was ever captured (every real bash command is `echo …`), so
//     dangerous-actions' deny path has no real Copilot input — only its safe→null and gating paths
//     are covered here (the deny logic itself is unit-tested in tests/dangerous-actions.test.ts).
//   • No COMPLETED read (PostToolUse on a read-kind tool) was captured in EITHER runtime — the read
//     probe (HOOK-DENY-PROBE.txt) was blocked by Copilot's own permission prompt, so it never
//     produced a PostToolUse. The inferEvent "completed-read stays PostToolUse, not PreRead" fix
//     (adapters/copilot.ts) is therefore locked with a shape DERIVED from the real read_file
//     payload (clearly marked), the same technique the stateful read-once tests use.
//   • No PostCompact fired anywhere (docs/hooks/copilot.md §10: VS Code fires no compaction hook;
//     CLI fires PreCompact only), so read-once-reset's PostCompact branch has no real input — only
//     its PreCompact branch is exercised (both wire shapes).
//   • write/edit tool kinds were never captured (no create_file/replace_string_in_file/Write/Edit),
//     so write/edit-triggered hooks have no real Copilot input here.
//   • Stop / SubagentStop normalize to event=null: the copilot adapter's inferEvent maps no
//     SemanticEvent for turn-stop payloads, and no Rosetta hook targets them, so they are asserted
//     as normalization data points only.

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

const raw = (name: string) => rawFixture(`copilot/${name}`);
const parse = (name: string) => JSON.parse(raw(name)) as Record<string, unknown>;
// normalize/detectIDE operate on the PARSED object; pass JSON.parse of the exact fixture bytes.
const norm = (name: string, env: Env) => normalize(parse(name), env);

// Real identifying-var subsets of the two logs' ENV blocks (COPILOT_CLI=1 / VSCODE_*).
const CLI_ENV = jsonFixture<Env>('copilot/env-cli.json');
const VSC_ENV = jsonFixture<Env>('copilot/env-vscode.json');

const CWD = '/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql';
const CLI_SESSION = '8abb87fa-4187-49e0-ba62-ded536d9ba99';   // Copilot CLI
const VSC_SESSION_A = 'e946202d-1afd-4ae7-9876-b7cfd1b60a6c'; // VS Code (bash/subagent/list_dir run)
const VSC_SESSION_B = 'f46082a6-3b68-4dd7-8073-ac1cff42344d'; // VS Code (read_file deny-probe run)

// ─────────────────────────────────────────────────────────────────────────────
// Detection — env tier vs shape tier, both runtimes. (adapter.ts ENV/ DETECTION_ORDER.)
// ─────────────────────────────────────────────────────────────────────────────
describe('copilot E2E — detection', () => {
  test('CLI camelCase (no hook_event_name): SHAPE alone → copilot; COPILOT_CLI env → copilot', () => {
    // camelCase fire carries timestamp+cwd+toolName/source but NO hook_event_name, so copilot.detect
    // matches by shape without help from env.
    for (const name of ['cli-session-start.json', 'cli-pre-bash.json', 'cli-post-bash.json', 'cli-pre-view.json', 'cli-session-end.json']) {
      expect(detectIDE(parse(name), {})).toBe('copilot');       // shape tier
      expect(detectIDE(parse(name), CLI_ENV)).toBe('copilot');  // env tier
    }
    expect(CLI_ENV.COPILOT_CLI).toBe('1');
  });

  test('CLI PascalCase (snake_case): SHAPE alone is ambiguous → claude-code; COPILOT_CLI env → copilot', () => {
    // The snake_case fire (hook_event_name + session_id + tool_input) matches Claude Code's own
    // signature, so shape-only detection resolves to claude-code; COPILOT_CLI=1 disambiguates.
    for (const name of ['cli-pascal-pre-bash.json', 'cli-pascal-post-bash.json', 'cli-pascal-pre-agent.json', 'cli-pascal-precompact.json', 'cli-pascal-session-start.json']) {
      expect(detectIDE(parse(name), {})).toBe('claude-code');   // shape tier (ambiguous)
      expect(detectIDE(parse(name), CLI_ENV)).toBe('copilot');  // env tier resolves it
    }
  });

  test('VS Code snake_case: SHAPE alone is ambiguous → claude-code; VSCODE_* env → copilot', () => {
    for (const name of ['vscode-session-start.json', 'vscode-pre-run-terminal.json', 'vscode-post-run-terminal.json', 'vscode-pre-read-file.json', 'vscode-pre-list-dir.json', 'vscode-stop.json']) {
      expect(detectIDE(parse(name), {})).toBe('claude-code');   // shape tier (ambiguous)
      expect(detectIDE(parse(name), VSC_ENV)).toBe('copilot');  // VSCODE_* catch-all → copilot
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 1 — COPILOT CLI (camelCase / R1 fire)
// ═════════════════════════════════════════════════════════════════════════════
describe('copilot CLI (camelCase) E2E — normalization', () => {
  test('sessionStart: event SessionStart, no tool, source passthrough (camelCase sessionId)', () => {
    const n = norm('cli-session-start.json', CLI_ENV);
    expect(n.ide).toBe('copilot');
    expect(n.event).toBe('SessionStart');
    expect(n.toolKind).toBeNull();
    expect(n.file_path).toBe('');
    expect(n.cwd).toBe(CWD);
    expect(n.session_id).toBe(CLI_SESSION);   // sessionId → session_id
    expect(n.source).toBe('new');
    expect(n.tool_name).toBeUndefined();
  });

  test('preToolUse bash: toolName "bash" → toolKind bash, event PreToolUse, toolArgs JSON-string parsed', () => {
    const n = norm('cli-pre-bash.json', CLI_ENV);
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');
    expect(n.tool_name).toBe('bash');
    expect(n.file_path).toBe('');
    // toolArgs is a JSON STRING in the wire; the adapter parses it into tool_input.
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
  });

  test('postToolUse bash: event PostToolUse (NOT reclassified), toolResult object → tool_response', () => {
    const n = norm('cli-post-bash.json', CLI_ENV);
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('bash');
    // camelCase result field toolResult{resultType,textResultForLlm}.
    expect((n.tool_response as { resultType: string }).resultType).toBe('success');
  });

  test('preToolUse view: toolName "view" → toolKind read, PreRead, file_path resolved from toolArgs.path', () => {
    const n = norm('cli-pre-view.json', CLI_ENV);
    expect(n.event).toBe('PreRead');   // read-kind PreToolUse → PreRead
    expect(n.toolKind).toBe('read');
    expect(n.tool_name).toBe('view');
    // The CLI `view` tool carries its target under the `path` key inside toolArgs. getFilePath now
    // reads `path` too (OI-8 fix), so the canonical file_path is populated — without it read-once
    // would silently fail to track every CLI `view` read.
    expect(n.file_path).toBe('/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql/docs/hooks/HOOK-DENY-PROBE.txt');
  });

  test('preToolUse task: unmapped tool → toolKind null, event stays PreToolUse', () => {
    const n = norm('cli-pre-task.json', CLI_ENV);
    expect(n.event).toBe('PreToolUse');
    // GROUNDING (TRULY-ABSENT, not a bug): `task` is Copilot CLI's subagent-spawn tool
    // (docs/hooks/copilot.md §"Tool names": camelCase `task`, PascalCase `Agent`, VS Code
    // `runSubagent`). No Rosetta SemanticKind covers subagent spawning — the vocabulary is
    // write/edit/multi-edit/patch/create/replace/bash/read/mcp-call (ide-registry.ts TOOL_KINDS).
    // The verbatim toolArgs carry only name/agent_type/description/prompt/mode — no file path and
    // no shell command — so toolKind is genuinely non-derivable, not a dropped value.
    expect(n.toolKind).toBeNull();
    expect(n.tool_name).toBe('task');
  });

  test('preCompact (camelCase): event PreCompact, trigger passthrough, no tool', () => {
    const n = norm('cli-precompact.json', CLI_ENV);
    expect(n.event).toBe('PreCompact');
    expect(n.toolKind).toBeNull();
    expect(n.trigger).toBe('manual');
  });

  test('sessionEnd (camelCase, `reason` present): event SessionEnd, reason passthrough', () => {
    const n = norm('cli-session-end.json', CLI_ENV);
    expect(n.event).toBe('SessionEnd');
    expect(n.reason).toBe('user_exit');
    expect(n.toolKind).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 2 — COPILOT CLI PascalCase fire (snake_case / R3 payload)
// ═════════════════════════════════════════════════════════════════════════════
describe('copilot CLI (PascalCase→snake_case) E2E — normalization', () => {
  test('PreToolUse Bash (PascalCase tool name): "Bash" → toolKind bash, tool_input object', () => {
    const n = norm('cli-pascal-pre-bash.json', CLI_ENV);
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');       // PascalCase "Bash" mapped to bash
    expect(n.tool_name).toBe('Bash');
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
  });

  test('PostToolUse Bash: event PostToolUse, tool_result object (snake) → tool_response', () => {
    const n = norm('cli-pascal-post-bash.json', CLI_ENV);
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('bash');
    // CLI snake_case result field is tool_result{result_type,text_result_for_llm}.
    expect((n.tool_response as { result_type: string }).result_type).toBe('success');
  });

  test('PreToolUse Agent: unmapped → toolKind null, event stays PreToolUse', () => {
    const n = norm('cli-pascal-pre-agent.json', CLI_ENV);
    expect(n.event).toBe('PreToolUse');
    // GROUNDING (TRULY-ABSENT, not a bug): `Agent` is the PascalCase name of the same subagent-spawn
    // tool as camelCase `task` (docs/hooks/copilot.md §"Tool names"). No Rosetta SemanticKind covers
    // subagent spawning (vocabulary: write/edit/multi-edit/patch/create/replace/bash/read/mcp-call —
    // ide-registry.ts). The verbatim tool_input carries only name/agent_type/description/prompt/mode
    // (no path, no command), so toolKind is non-derivable. Confirmed downstream: dangerous-actions
    // gates it out as tool-kind-mismatch (see below) — null is the intended canonical value.
    expect(n.toolKind).toBeNull();
    expect(n.tool_name).toBe('Agent');
  });

  test('PreCompact (snake_case): event PreCompact, trigger passthrough', () => {
    const n = norm('cli-pascal-precompact.json', CLI_ENV);
    expect(n.event).toBe('PreCompact');
    expect(n.trigger).toBe('manual');
  });

  test('SessionStart (snake_case): event SessionStart, source passthrough, session_id native', () => {
    const n = norm('cli-pascal-session-start.json', CLI_ENV);
    expect(n.event).toBe('SessionStart');
    expect(n.source).toBe('new');
    expect(n.session_id).toBe(CLI_SESSION);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECTION 3 — VS CODE COPILOT (snake_case / R3)
// ═════════════════════════════════════════════════════════════════════════════
describe('copilot VS Code (snake_case) E2E — normalization', () => {
  test('SessionStart: event SessionStart, no tool, transcript_path/session_id native', () => {
    const n = norm('vscode-session-start.json', VSC_ENV);
    expect(n.ide).toBe('copilot');
    expect(n.event).toBe('SessionStart');
    expect(n.toolKind).toBeNull();
    expect(n.session_id).toBe(VSC_SESSION_A);
    expect(n.source).toBe('new');
    expect(n.cwd).toBe(CWD);
  });

  test('PreToolUse run_in_terminal: VS Code terminal tool → toolKind bash (routing-bug-fix path)', () => {
    const n = norm('vscode-pre-run-terminal.json', VSC_ENV);
    expect(n.event).toBe('PreToolUse');
    expect(n.toolKind).toBe('bash');        // run_in_terminal → bash
    expect(n.tool_name).toBe('run_in_terminal');
    expect((n.tool_input as { command: string }).command).toBe('echo rosetta-hook-probe');
  });

  test('PostToolUse run_in_terminal: event PostToolUse, tool_response is a STRING (VS Code shape)', () => {
    const n = norm('vscode-post-run-terminal.json', VSC_ENV);
    expect(n.event).toBe('PostToolUse');
    expect(n.toolKind).toBe('bash');
    expect(typeof n.tool_response).toBe('string');   // VS Code sends a plain string, not an object
    expect(n.tool_response as string).toContain('rosetta-hook-probe');
  });

  test('PreToolUse read_file: → toolKind read, event PreRead, file_path from tool_input.filePath', () => {
    const n = norm('vscode-pre-read-file.json', VSC_ENV);
    expect(n.event).toBe('PreRead');        // read_file → read → PreRead
    expect(n.toolKind).toBe('read');
    expect(n.tool_name).toBe('read_file');
    // VS Code nests the path under tool_input.filePath (camelCase key inside snake_case payload).
    expect(n.file_path).toBe(`${CWD}/docs/hooks/HOOK-DENY-PROBE.txt`);
    expect(n.session_id).toBe(VSC_SESSION_B);
  });

  test('PreToolUse list_dir: unmapped tool → toolKind null, event stays PreToolUse', () => {
    const n = norm('vscode-pre-list-dir.json', VSC_ENV);
    expect(n.event).toBe('PreToolUse');
    // GROUNDING (TRULY-ABSENT, not a bug): `list_dir` is VS Code's directory-listing tool
    // (docs/hooks/copilot.md §"Tool names"). No Rosetta SemanticKind covers directory listing —
    // `read` is documented for file reads only (view/Read/read_file), NOT list_dir — and the
    // vocabulary has no list/search/glob kind (ide-registry.ts TOOL_KINDS). So toolKind is
    // non-derivable and MUST stay null: mapping it to `read` would (a) reclassify the event to
    // PreRead and (b) make read-once try to track a directory as if it were a file. Note: file_path
    // IS populated here (tool_input.path → getFilePath), which is harmless since event≠PreRead.
    expect(n.toolKind).toBeNull();
    expect(n.tool_name).toBe('list_dir');
  });

  test('Stop → semantic Stop (registry-mapped); SubagentStop → null (intentionally unmapped)', () => {
    // Stop is a registry-known event (ide-rows/copilot.ts Stop→'Stop'); a real payload carries
    // hook_event_name "Stop", so the canonical event MUST be 'Stop', not null (OI-8 fix). SubagentStop
    // is deliberately NOT in the registry (documented-only decision) → event null is correct there.
    const stop = norm('vscode-stop.json', VSC_ENV);
    expect(stop.event).toBe('Stop');
    expect(stop.hook_event_name).toBe('Stop');
    const sub = norm('vscode-subagent-stop.json', VSC_ENV);
    expect(sub.event).toBeNull();                 // by design — SubagentStop not mapped
    expect(sub.hook_event_name).toBe('SubagentStop');
  });

  // inferEvent fix (adapters/copilot.ts): a COMPLETED read must stay PostToolUse — a prior version
  // returned PreRead unconditionally the moment a read-kind tool matched, before checking Pre/Post,
  // which made read-once fire a spurious second time on every completed read (see hooks-verify.md).
  // No verbatim completed read was captured (the read probe was permission-blocked, never posted) —
  // so this locks the fix with a shape DERIVED from the real read_file payload (real PostToolUse
  // envelope + real read_file tool_input), the same technique the stateful read-once tests use.
  test('DERIVED (no verbatim capture): PostToolUse on a read tool stays PostToolUse, NOT PreRead', () => {
    const base = parse('vscode-pre-read-file.json');
    const completedRead = { ...base, hook_event_name: 'PostToolUse', tool_response: 'file contents…' };
    const n = normalize(completedRead, VSC_ENV);
    expect(n.event).toBe('PostToolUse');   // the fix: NOT PreRead
    expect(n.toolKind).toBe('read');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: dangerous-actions (PreToolUse × bash/write/edit/multi-edit/mcp-call).
// Every real captured command is SAFE (`echo …`) → null → exit 0, no stdout. No dangerous command
// was captured in either runtime (documented gap: the deny path is unit-tested elsewhere).
// ─────────────────────────────────────────────────────────────────────────────
describe('copilot E2E — dangerous-actions', () => {
  test('CLI camelCase safe bash `echo …` → no output, exit 0, no stderr', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, raw('cli-pre-bash.json'), CLI_ENV);
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('CLI PascalCase safe bash (Bash `echo …`) → no output, exit 0', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, raw('cli-pascal-pre-bash.json'), CLI_ENV);
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('VS Code safe bash (run_in_terminal `echo …`) → no output, exit 0', async () => {
    const { stdout, report } = await runReal(dangerousActionsHook, raw('vscode-pre-run-terminal.json'), VSC_ENV);
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('null-result');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('unmapped tool (VS Code list_dir, toolKind null) → gated out (tool-kind-mismatch), exit 0', async () => {
    const { report } = await runReal(dangerousActionsHook, raw('vscode-pre-list-dir.json'), VSC_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('tool-kind-mismatch');
    expect(report.exitCode).toBe(0);
  });

  test('unmapped tool (CLI Agent, toolKind null) → gated out (tool-kind-mismatch)', async () => {
    const { report } = await runReal(dangerousActionsHook, raw('cli-pascal-pre-agent.json'), CLI_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('tool-kind-mismatch');
  });

  test('read (VS Code read_file, event PreRead) → gated out (event-mismatch: targets PreToolUse)', async () => {
    const { report } = await runReal(dangerousActionsHook, raw('vscode-pre-read-file.json'), VSC_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
  });

  test('completed tool (CLI PostToolUse bash) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(dangerousActionsHook, raw('cli-post-bash.json'), CLI_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once (PreRead/PreToolUse × read/bash). STATEFUL (in-memory mock) + real fs.statSync.
// Part 1 — routing/no-op on VERBATIM captured payloads (deterministic single reads → null).
// Part 2 — the stateful advise/deny contract driven through the real pipeline using the real VS Code
//   read_file wire SHAPE pointed at a controlled temp file (a verbatim log can't pin fs+state).
//   VS Code read_file is used (not CLI `view`) because it carries the path under tool_input.filePath,
//   which the adapter resolves — CLI `view` uses a `path` key the adapter does not read (see the
//   cli-pre-view normalization gap above). Detection routes to copilot via the real VS Code env.
// ─────────────────────────────────────────────────────────────────────────────
describe('copilot E2E — read-once', () => {
  let tmp: string;

  beforeEach(() => {
    stateByNamespace.clear();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ro-copilot-e2e-'));
    delete process.env.READ_ONCE_MODE;
    delete process.env.READ_ONCE_DISABLED;
  });
  afterEach(() => {
    delete process.env.READ_ONCE_MODE;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  // Build a real VS Code read_file PreToolUse wire object pointed at `file` (keeps every other real
  // field). event normalizes to PreRead; VSC_ENV routes detection to copilot.
  const readOf = (file: string, sessionId = VSC_SESSION_B): string => {
    const base = parse('vscode-pre-read-file.json');
    return JSON.stringify({ ...base, session_id: sessionId, cwd: path.dirname(file), tool_input: { filePath: file } });
  };

  test('routing: verbatim CLI camelCase bash `echo …` reaches read-once but is not a read → null', async () => {
    // toolKind bash IS in read-once's set, so it runs; `echo` is not cat/sed/… → pass-through null.
    const { stdout, report } = await runReal(readOnceHook, raw('cli-pre-bash.json'), CLI_ENV);
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('routing: verbatim CLI `view` (PreRead, empty file_path from `path` gap) → null, exit 0', async () => {
    // classifyReadPath(PreRead) requires ctx.filePath; the CLI view path lives under `path` (unread
    // by the adapter) so file_path is '' → pass-through null. Deterministic on the verbatim payload.
    const { stdout, report } = await runReal(readOnceHook, raw('cli-pre-view.json'), CLI_ENV);
    expect(report.status).toBe('completed');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('routing: verbatim VS Code read_file (PreRead) reaches read-once → stat-miss no-op (path absent)', async () => {
    // The captured absolute path does not exist on this machine → real fs.statSync miss → null.
    const { stdout, report } = await runReal(readOnceHook, raw('vscode-pre-read-file.json'), VSC_ENV);
    expect(report.status).toBe('completed');   // reached run(): PreRead+read accepted (not gated)
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
    expect(report.stderrMessage).toBeUndefined();
  });

  test('stateful (warn): first read → null; unchanged re-read → advise, MERGED (top-level + nested), exit 0', async () => {
    const file = path.join(tmp, 'notes.md');
    fs.writeFileSync(file, 'hello read-once');

    const first = await runReal(readOnceHook, readOf(file), VSC_ENV);
    expect(first.stdout).toEqual([]);          // first read allowed
    expect(first.report.exitCode).toBe(0);

    const second = await runReal(readOnceHook, readOf(file), VSC_ENV);
    expect(second.report.exitCode).toBe(0);    // copilot advise → exit 0
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    // MERGED emit — top-level (R1/CLI honors) AND nested (R3/VS Code honors).
    expect(out.permissionDecision).toBe('allow');
    expect(out.additionalContext).toContain('read-once:');
    expect(out.additionalContext).toContain('notes.md');
    expect(out.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(out.hookSpecificOutput.additionalContext).toContain('read-once:');
    expect(out.hookSpecificOutput.additionalContext).toContain('notes.md');
  });

  test('stateful (deny mode): unchanged re-read → deny in JSON body, MERGED placements, exit 0, NO stderr', async () => {
    process.env.READ_ONCE_MODE = 'deny';
    const file = path.join(tmp, 'secret.txt');
    fs.writeFileSync(file, 'top secret');

    await runReal(readOnceHook, readOf(file), VSC_ENV);          // first read records state
    const second = await runReal(readOnceHook, readOf(file), VSC_ENV);
    expect(second.report.exitCode).toBe(0);                     // copilot deny is carried in the body, exit 0
    expect(second.report.stderrMessage).toBeUndefined();
    const out = JSON.parse(second.stdout[0]);
    // MERGED emit — both placements carry deny + reason.
    expect(out.permissionDecision).toBe('deny');
    expect(out.permissionDecisionReason).toContain('read-once:');
    expect(out.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain('read-once:');
    // Unlike claude-code, copilot's formatOutput does NOT emit a top-level `continue`.
    expect(out.continue).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hook: read-once-reset (side-effect on PreCompact/PostCompact — clears the session's read-once
// state). Real PreCompact payloads (BOTH wire shapes, CLI only) → side-effect → NO stdout, exit 0.
// No PostCompact fired anywhere (docs/hooks/copilot.md §10) → that branch has no real input (gap).
// ─────────────────────────────────────────────────────────────────────────────
describe('copilot E2E — read-once-reset', () => {
  beforeEach(() => stateByNamespace.clear());

  test('verbatim CLI camelCase PreCompact → side-effect (no stdout, exit 0)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, raw('cli-precompact.json'), CLI_ENV);
    expect(report.status).toBe('completed');
    expect(report.reason).toBe('side-effect');
    expect(report.exitCode).toBe(0);
    expect(report.wroteOutput).toBe(false);
    expect(stdout).toEqual([]);
  });

  test('verbatim CLI PascalCase (snake_case) PreCompact → side-effect (no stdout, exit 0)', async () => {
    const { stdout, report } = await runReal(readOnceResetHook, raw('cli-pascal-precompact.json'), CLI_ENV);
    expect(report.reason).toBe('side-effect');
    expect(report.exitCode).toBe(0);
    expect(stdout).toEqual([]);
  });

  test('non-compact event (verbatim VS Code PreToolUse run_in_terminal) → gated out (event-mismatch)', async () => {
    const { report } = await runReal(readOnceResetHook, raw('vscode-pre-run-terminal.json'), VSC_ENV);
    expect(report.status).toBe('skipped');
    expect(report.reason).toBe('event-mismatch');
  });
});
