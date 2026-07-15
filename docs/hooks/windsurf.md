# Devin Desktop / Cascade Hooks Contract (flat Cascade schema)

> # ✅ CURRENT — this is what Devin Desktop reads.
> Devin Desktop (**formerly Windsurf**; Cascade is its agent) reads this **flat Cascade** hook schema at **`.devin/hooks.json`** (current) and **`.windsurf/hooks.json`** (legacy path alias — same format). **Verified live** (Appendix). This is the schema **Rosetta targets for Devin Desktop**. *(The separate **Devin CLI** uses a different Claude-Code-format file `.devin/hooks.v1.json`, which Devin Desktop does **NOT** read → [`devin-cli.md`](./devin-cli.md).)*

Target agent: **Devin Desktop / Cascade** (formerly Windsurf; + JetBrains plugin)

> **(!) Naming — Windsurf is now Devin (Cognition).** The desktop app is **Devin Desktop**; **Cascade** is its agent (live-run env: `CODEIUM_EDITOR_APP_ROOT=/Applications/Devin.app/…`). Hooks docs: `docs.windsurf.com/windsurf/cascade/hooks` → `docs.devin.ai/desktop/cascade/hooks` (301). Devin Desktop reads this flat schema at **`.devin/hooks.json`** (current) or **`.windsurf/hooks.json`** (legacy alias) — both verified-equivalent. The **Devin CLI's** Claude-format `.devin/hooks.v1.json` is a *different product's* file (Desktop ignores it) → [`devin-cli.md`](./devin-cli.md).

Status: **COMPLETE — VERIFIED & finalized (2026-06-30).** Live runs (Devin Desktop, model `SWE-1.6 Slow`, 2026-06-29/30) confirmed this flat schema fires at **BOTH** `.windsurf/hooks.json` (LR1) and `.devin/hooks.json` (LR2): 9 events fired, exit-2 + stderr block confirmed (see Appendix). The Devin CLI's `.devin/hooks.v1.json` (Claude-format) is in [`devin-cli.md`](./devin-cli.md) — verified **NOT** read by Devin Desktop.

---

## References

| ID | Source | What it proves / documents | URL |
|---|---|---|---|
| R1 | Windsurf / Cascade Hooks reference (official; primary contract) | The full hook I/O model: the **12 event names**, the **stdin JSON** shape (`agent_action_name`/`trajectory_id`/`execution_id`/`tool_info`/…), **exit-code-only output** + **stderr-on-block** ("The Cascade agent will see the error message from stderr"), exit codes, `show_output`, cross-platform `command`/`powershell`, and the `.windsurf/` + `~/.codeium/…` + system config paths. | https://docs.windsurf.com/windsurf/cascade/hooks → redirects to https://docs.devin.ai/desktop/cascade/hooks |
| LR1 | Live-hook run (this repo's `tester.js`), Windsurf/Devin Desktop, `SWE-1.6 Slow`, 2026-06-29 | Empirical confirmation: which events fire, real `tool_info` shapes, exit-2+stderr block, stdout ignored. | `docs/hooks/windsurf-logs.txt` + `docs/hooks-verify-run-logs.md` |

> R1 is the authoritative contract for the hook **I/O model**; LR1 (`.windsurf/hooks.json`) + LR2 (`.devin/hooks.json`) are the live-run evidence (`Observed`). Fields below cite R1; the Appendix records the runs. The Devin **CLI**'s separate `.devin/hooks.v1.json` (Claude-format) schema + its sources are in [`devin-cli.md`](./devin-cli.md). Anything not in a cited source is marked `unknown / not documented` — never invented.

---

## Practical Conclusions

The few facts that genuinely surprise a reader of the tables or carry silent-failure consequences. Everything else is in the tables. (Items 1–6 doc-grounded R1; item 7 from the live run LR1.)

1. **(!) Output = EXIT CODE + STDERR — stdout is NEVER parsed as JSON (R1).** Cascade does not deserialize stdout. There is **no** `permissionDecision`/`additionalContext`/`continue`/`decision`/`hookSpecificOutput` contract — emitting such JSON has **zero effect**. To block, the process must **exit 2**, and the **stderr** it writes is delivered to the agent: *"The Cascade agent will see the error message from stderr."* (R1)
2. **(!) The ONLY hook→model text channel is stderr on a BLOCKING pre-hook (exit 2) (R1).** A deny reason reaches the model via stderr+exit-2 — the Windsurf analog of `permissionDecisionReason`. There is **no arbitrary context injection**: no SessionStart-style `additionalContext`, and **non-blocking hooks (exit 0) and all post-hooks pass NOTHING to the model**. `show_output: true` only renders hook stdout/stderr in the Cascade **UI** (user-facing/debugging; and it does NOT apply to `pre_user_prompt`, `post_cascade_response`, `post_cascade_response_with_transcript`) — it does not enter model context.
3. **(!) Only PRE-hooks can block; POST-hooks cannot block or redact (R1).** Exit 2 from a `post_*` hook does **not** stop or alter the action — post-hooks are observational only.
4. **(!) No session-level lifecycle events.** There is **no** `SessionStart`, `SessionEnd`, `Stop`, `AgentStop`, or `SubagentStop`. The closest documented analogs are `pre_user_prompt` (turn start) and `post_cascade_response` (turn end) — these are **not** session events; document and use them as their actual selves.
5. **(!) No generic tool events — tool hooks are split by operation.** There is **no** generic `PreToolUse`/`PostToolUse`. Tool interception is per-operation: read (`*_read_code`), write (`*_write_code`), shell (`*_run_command`), MCP (`*_mcp_tool_use`). A guard that must cover "any tool" must register on every relevant event.
6. **No matchers / no glob filtering (R1).** Hooks have no matcher field; each registered hook fires **unconditionally** on its event. All gating (which file, which command) must happen **inside the hook script**, off the stdin JSON.
7. **(!) Cascade appends `: action blocked by hook` to the stderr it shows the agent (LR1).** On a `pre_*` exit-2 block, the hook's stderr reaches the agent **verbatim with the suffix `: action blocked by hook`** appended; the agent quotes/acts on it and continues. Confirmed for `pre_read_code` and `pre_run_command`. So a deny reason DOES reach the model — via stderr, not JSON.

### Mapping — Rosetta target events → Windsurf events

| Rosetta target event | Windsurf equivalent (R1) |
|---|---|
| `SessionStart` | **none documented** (closest: `pre_user_prompt`, per-turn not per-session) |
| `SessionStop` | **none documented** |
| `AgentStop` / `SubagentStop` | **none documented** (closest: `post_cascade_response` / `post_cascade_response_with_transcript`, per-turn) |
| `PreToolUse` | split: `pre_read_code`, `pre_write_code`, `pre_run_command`, `pre_mcp_tool_use` |
| `PostToolUse` | split: `post_read_code`, `post_write_code`, `post_run_command`, `post_mcp_tool_use` |

---

## Capability Matrix (verification status)

Legend: ✅ confirmed live (LR1 = `.windsurf/hooks.json`; LR2 = `.devin/hooks.json`) · 📄 documented (R1), not exercised · ❌ documented-absent · ❓ unknown.

| Capability | Documented (R1) | Status |
|---|---|---|
| `.devin/hooks.json` (flat Cascade) loads + fires — **current Desktop path** | yes | ✅ 9 events fired, deny works (LR2) |
| `.windsurf/hooks.json` (flat Cascade) loads + fires — legacy alias | yes | ✅ 9/12 events fired (LR1) |
| `pre_*` hook blocks the action via **exit 2** | yes (pre-hooks only) | ✅ `pre_read_code` + `pre_run_command` blocked (LR1) |
| **deny reason reaches the agent via stderr** (on `pre_*` + exit 2) | yes — "agent will see the error message from stderr" | ✅ quoted verbatim + continued; Cascade suffixes `: action blocked by hook` (LR1) |
| hook stdout JSON parsed (`permissionDecision`/…) | no — exit code only | ✅ confirmed ignored — 9× exit 0, textLen 0 (LR1; BUG 1) |
| per-operation tool events (read/write/command/prompt/response) | yes | ✅ fired with real `tool_info` shapes (LR1) |
| MCP events (`pre/post_mcp_tool_use`) fire | yes | ❓ not exercised (no MCP tool used) |
| `post_setup_worktree` fires | yes | ❓ not exercised (no worktree) |
| `post_*` hook can block / redact | no | 📄 documented-absent |
| arbitrary / non-blocking context injection (SessionStart-style `additionalContext`) | no mechanism | 📄 documented-absent |
| `show_output:true` surfaces stdout/stderr in Cascade UI (user-facing, not model) | yes | ❓ not isolated this run |
| session lifecycle events (`SessionStart`/`Stop`/`SubagentStop`) | none | 📄 documented-absent |
| matcher / glob filtering in config | none — gate inside script | 📄 documented-absent |

> The Devin **CLI**'s `.devin/hooks.v1.json` (Claude-format) — a different product Devin Desktop does NOT read — is in [`devin-cli.md`](./devin-cli.md).

---

## Hook Configuration (R1)

### Config file locations (merged across all levels)

All paths below use the **flat Cascade format** `{ "hooks": { "<event>": [ { "command", "show_output" } ] } }`.

| Scope | Path | Ref |
|---|---|---|
| Workspace (**current**) | `.devin/hooks.json` (workspace root) | LR2 (verified) |
| Workspace (legacy alias) | `.windsurf/hooks.json` (workspace root) | R1 / LR1 |
| User (Devin Desktop) | `~/.codeium/windsurf/hooks.json` | R1 |
| User (JetBrains plugin) | `~/.codeium/hooks.json` | R1 |
| System (macOS) | `/Library/Application Support/Windsurf/hooks.json` | R1 |
| System (Linux/WSL) | `/etc/windsurf/hooks.json` | R1 |
| System (Windows) | `C:\ProgramData\Windsurf\hooks.json` | R1 |

> **(!) `.devin/hooks.json` is the current path; `.windsurf/hooks.json` is the legacy alias** — same flat format, both verified to fire identically (LR1 + LR2). Devin Desktop prompts to migrate `.windsurf/` → `.devin/`. Rosetta targets **`.devin/hooks.json`** for Devin Desktop. *(Do not confuse with the Devin CLI's `.devin/hooks.v1.json` — different product, Claude-format, Desktop ignores it → [`devin-cli.md`](./devin-cli.md).)*

### Config format

```json
{
  "hooks": {
    "<event_name>": [
      {
        "command": "shell command (macOS/Linux, via bash -c)",
        "powershell": "command (Windows, via powershell -Command) — optional",
        "show_output": false,
        "working_directory": "optional path; defaults to workspace root"
      }
    ]
  }
}
```

| Parameter | Type | Required | Ref | Notes |
|---|---|---|---|---|
| `command` | string | one of `command`/`powershell` required | R1 | macOS/Linux: run via `bash -c`. Windows: used as fallback via `powershell -Command` if `powershell` absent. |
| `powershell` | string | optional | R1 | Windows command, via `powershell -Command`. |
| `show_output` | boolean | optional | R1 | Render hook stdout/stderr in the Cascade **UI** (user-facing). Does NOT inject into model context. |
| `working_directory` | string | optional | R1 | Execution dir; defaults to workspace root. |

> **(!) No `matcher` field exists (R1).** Hooks cannot be scoped to a tool/file pattern via config — every registered hook fires on its event. Gate inside the script.

### Cross-platform `command` / `powershell` resolution (R1)

| Platform | `command` set | `powershell` set | Result |
|---|:--:|:--:|---|
| macOS/Linux | ✓ | (any) | runs `command` via `bash -c` |
| macOS/Linux | ✗ | ✓ | **hook silently skipped** |
| Windows | ✓ | ✗ | falls back to `command` via `powershell -Command` |
| Windows | ✗ | ✓ | runs `powershell` |
| Windows | ✓ | ✓ | runs `powershell` (takes precedence) |
| any | ✗ | ✗ | validation error |

---

## Hook Events (R1)

Exactly twelve events. Names are **snake_case**, verbatim from R1. `Blockable` = whether exit 2 stops the action.

| Event name (exact) | Phase | Trigger | Blockable (exit 2) | Ref |
|---|---|---|:--:|---|
| `pre_read_code` | pre | before Cascade reads a file | yes | R1 |
| `post_read_code` | post | after Cascade reads a file | no | R1 |
| `pre_write_code` | pre | before Cascade writes/edits a file | yes | R1 |
| `post_write_code` | post | after Cascade writes/edits a file | no | R1 |
| `pre_run_command` | pre | before Cascade runs a terminal command | yes | R1 |
| `post_run_command` | post | after a terminal command completes | no | R1 |
| `pre_mcp_tool_use` | pre | before an MCP tool is invoked | yes | R1 |
| `post_mcp_tool_use` | post | after an MCP tool returns | no | R1 |
| `pre_user_prompt` | pre | before a user prompt is processed | yes | R1 |
| `post_cascade_response` | post | after Cascade produces a response (turn end) | no | R1 |
| `post_cascade_response_with_transcript` | post | after a response; provides transcript file path | no | R1 |
| `post_setup_worktree` | post | after a worktree is set up | no | R1 |

---

## Input Model — stdin JSON (R1)

Every hook receives JSON on **stdin**.

### Common fields (all events)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `agent_action_name` | string | R1 | the action/event being performed |
| `trajectory_id` | string | R1 | conversation/trajectory identifier |
| `execution_id` | string | R1 | per-action execution identifier |
| `timestamp` | string (ISO 8601) | R1 | |
| `model_name` | string | R1 | active model |
| `tool_info` | object | R1 | event-specific payload — see below |

### Event-specific `tool_info` (R1)

| Event(s) | `tool_info` fields |
|---|---|
| `pre_read_code` / `post_read_code` | `file_path` (string) |
| `pre_write_code` / `post_write_code` | `file_path` (string), `edits` (array of `{old_string, new_string}`) |
| `pre_run_command` / `post_run_command` | `command_line` (string), `cwd` (string) |
| `pre_mcp_tool_use` | `mcp_server_name` (string), `mcp_tool_name` (string), `mcp_tool_arguments` (object) |
| `post_mcp_tool_use` | `mcp_server_name` (string), `mcp_tool_name` (string), `mcp_tool_arguments` (object), `mcp_result` (string) |
| `pre_user_prompt` | `user_prompt` (string) |
| `post_cascade_response` | `response` (string, markdown) |
| `post_cascade_response_with_transcript` | `transcript_path` (string — JSONL file path) |
| `post_setup_worktree` | `worktree_path` (string), `root_workspace_path` (string) |

### Environment provided to hook processes (R1)

| Variable | Ref | Notes |
|---|---|---|
| `ROOT_WORKSPACE_PATH` | R1 | original workspace root. Used by `post_setup_worktree` (which executes inside the new worktree dir) — e.g. `bash $ROOT_WORKSPACE_PATH/hooks/setup_worktree.sh`. |

---

## Output Model (R1)

**(!) No structured stdout contract.** stdout is **never** deserialized as JSON — there is no `permissionDecision`/`additionalContext`/`continue`/`decision`/`reason`/`hookSpecificOutput`/`modifiedArgs`/`modifiedResult`; none documented, none honored. A hook communicates through **two channels only**: the **exit code**, and **stderr on a blocking pre-hook**.

| Channel | Behavior | Ref |
|---|---|---|
| process exit code | primary result channel — `0` / `2` / other (see Exit Codes) | R1 |
| **stderr** (on `pre_*` + exit 2) | **(!) delivered to the model: *"The Cascade agent will see the error message from stderr."*** This is the ONLY documented hook→model text channel (the Windsurf analog of a deny reason). | R1 |
| stdout / stderr (UI) | shown in the Cascade UI iff `show_output: true` (user-facing/debugging). **Does NOT enter model context.** `show_output` does not apply to `pre_user_prompt`, `post_cascade_response`, `post_cascade_response_with_transcript`. | R1 |

**(!) No non-blocking agent channel.** Non-blocking hooks (exit 0) and ALL post-hooks pass nothing to the model — their stdout is UI-only. The agent-facing text channel is coupled to **blocking** (`pre_*` + exit 2 + stderr). There is no arbitrary/standalone context injection.

**Documented block pattern (R1):** a `pre_*` hook writes the reason to stderr and exits 2 — e.g. (Python) `print("Command blocked: …", file=sys.stderr); sys.exit(2)`. On `pre_user_prompt` block, R1 notes the **user** sees the error in the Cascade UI (the prompt never reaches the agent).

---

## Exit Codes (R1)

| Code | Meaning | Effect |
|---|---|---|
| `0` | success | action proceeds normally |
| `2` | blocking error | **pre-hooks only**: blocks the action; stderr surfaced. **post-hooks cannot block.** |
| other non-zero | error | non-blocking — action proceeds normally |

---

## Enterprise distribution (R1, informational)

- **Cloud dashboard:** admins set hooks in Team Settings (Enterprise plan + `TEAM_SETTINGS_UPDATE`); auto-distributed to members.
- **System-level deployment:** via MDM (Jamf, Intune, Workspace ONE) or config management (Ansible, Puppet, Chef, SaltStack); end users cannot disable without root.

---

## Appendix — Observed Wire Examples (LR1 + LR2: live runs, 2026-06-29/30)

Captured via `docs/hooks/tester.js --mode windsurf` → `~/.rosetta/hooks.log`. Runtime **Devin Desktop**, model `SWE-1.6 Slow`, workspace `…/5-min-demo/spring-boot-react-mysql`. **LR1** = config at `.windsurf/hooks.json`; **LR2** = same flat config at `.devin/hooks.json` — **both fired the identical 9 events + exit-2 deny**, confirming the two paths are equivalent. (Also confirmed: `.devin/hooks.v1.json` Claude-format → **0 invocations**, i.e. Desktop does not read it.) Cleaned excerpt: `docs/hooks/windsurf-logs.txt`. Narrative: `docs/hooks-verify-run-logs.md` (`grep "Windsurf Run"`).

**Events that fired (9 of 12):** `pre_user_prompt`, `pre_run_command` (×2), `post_run_command`, `pre_read_code` (×2), `post_read_code`, `pre_write_code`, `post_write_code`, `post_cascade_response`, `post_cascade_response_with_transcript`. **Not fired** (no such action occurred): `pre_mcp_tool_use`, `post_mcp_tool_use`, `post_setup_worktree`.

**Common fields (every event):** `agent_action_name`, `trajectory_id`, `execution_id`, `timestamp` (ISO 8601 **with TZ offset**, e.g. `2026-06-29T18:10:30.653398-04:00`), `model_name` (`"SWE-1.6 Slow"`), `tool_info`.

### Captured INPUT payloads (real `tool_info` shapes)
```json
// pre_user_prompt
{"agent_action_name":"pre_user_prompt", … ,"tool_info":{"user_prompt":"…"}}
// pre_run_command / post_run_command
{"agent_action_name":"pre_run_command", … ,"tool_info":{"command_line":"echo rosetta-hook-probe","cwd":"…/spring-boot-react-mysql"}}
// pre_read_code / post_read_code — file_path is ABSOLUTE
{"agent_action_name":"pre_read_code", … ,"tool_info":{"file_path":"…/README.md"}}
// pre_write_code / post_write_code
{"agent_action_name":"pre_write_code", … ,"tool_info":{"edits":[{"old_string":"","new_string":"windsurf-write-probe"}],"file_path":"…/docs/hooks/_ws_write_probe.txt"}}
// post_cascade_response
{"agent_action_name":"post_cascade_response", … ,"tool_info":{"response":"…(markdown)…"}}
// post_cascade_response_with_transcript
{"agent_action_name":"post_cascade_response_with_transcript", … ,"tool_info":{"transcript_path":"~/.windsurf/transcripts/<trajectory_id>.jsonl"}}
```

### Block (deny) behavior — CONFIRMED
- `pre_read_code` (reading `HOOK-DENY-PROBE.txt`) AND `pre_run_command` (`cat …HOOK-DENY-PROBE…`) → tester emitted **stderr (340 B) + exit 2**; both actions were **blocked**.
- The stderr reason reached the agent **verbatim**, with Cascade appending **`: action blocked by hook`**; the agent quoted it and continued. → stderr-on-block is the hook→model channel.
- All non-matching pre-hooks + every post-hook → **exit 0, stdout/stderr length 0** (9× in the log) — stdout-JSON is irrelevant; only the exit code acts (BUG 1).

### Runtime env signature
| Var | Value | Proves |
|---|---|---|
| `CODEIUM_EDITOR_APP_ROOT` | `/Applications/Devin.app/Contents/Resources/app` | the app is **Devin.app** (Windsurf→Devin rebrand) |
| `WINDSURF_CSRF_TOKEN` | `…[REDACTED]` | Windsurf/Cascade runtime present (CSRF token — redacted) |

> Detection: env keeps `CODEIUM_*` / `WINDSURF_*` prefixes even though the app is Devin. Transcripts live under `~/.windsurf/transcripts/`.

---

**Open items / cross-references:** see `docs/hooks-verify.md` (Windsurf section, Bug 1).
