# Windsurf (Cascade) Hooks Contract

Target agent: **Windsurf / Cascade** (Devin Desktop app + JetBrains plugin)

Status: **DRAFT — doc-grounded hypothesis, NOT empirically verified.** Grounded only in the manufacturer reference (R1). No `Observed` columns until the live-hook test (step 3) is run and folded in.

---

## References

| ID | System | URL |
|---|---|---|
| R1 | Windsurf / Cascade Hooks reference (official) | https://docs.windsurf.com/windsurf/cascade/hooks (redirects to https://docs.devin.ai/desktop/cascade/hooks) |

> R1 is the single authoritative manufacturer source. Every field below cites R1. Anything not in R1 is marked `unknown / not documented` — never invented.

---

## Practical Conclusions (doc-grounded; pending empirical confirmation)

The few facts that genuinely surprise a reader of the tables or carry silent-failure consequences. Everything else is in the tables.

1. **(!) Output is the EXIT CODE ONLY — hook stdout is NOT parsed as structured data (R1).** Cascade does not deserialize stdout JSON. There is **no** `permissionDecision`, `additionalContext`, `continue`, `decision`, or `hookSpecificOutput` contract. Emitting such JSON has **zero effect** — it is silently discarded. To block, the process must **exit 2**.
2. **(!) No context-injection mechanism exists (R1).** Hooks cannot add text to the model's context. `additionalContext`/advisory-message output goes nowhere. `show_output: true` only renders hook stdout/stderr in the Cascade **UI** for the user — it does **not** enter model context.
3. **(!) Only PRE-hooks can block; POST-hooks cannot block or redact (R1).** Exit 2 from a `post_*` hook does **not** stop or alter the action — post-hooks are observational only.
4. **(!) No session-level lifecycle events.** There is **no** `SessionStart`, `SessionEnd`, `Stop`, `AgentStop`, or `SubagentStop`. The closest documented analogs are `pre_user_prompt` (turn start) and `post_cascade_response` (turn end) — these are **not** session events; document and use them as their actual selves.
5. **(!) No generic tool events — tool hooks are split by operation.** There is **no** generic `PreToolUse`/`PostToolUse`. Tool interception is per-operation: read (`*_read_code`), write (`*_write_code`), shell (`*_run_command`), MCP (`*_mcp_tool_use`). A guard that must cover "any tool" must register on every relevant event.
6. **No matchers / no glob filtering (R1).** Hooks have no matcher field; each registered hook fires **unconditionally** on its event. All gating (which file, which command) must happen **inside the hook script**, off the stdin JSON.

### Mapping — Rosetta target events → Windsurf events

| Rosetta target event | Windsurf equivalent (R1) |
|---|---|
| `SessionStart` | **none documented** (closest: `pre_user_prompt`, per-turn not per-session) |
| `SessionStop` | **none documented** |
| `AgentStop` / `SubagentStop` | **none documented** (closest: `post_cascade_response` / `post_cascade_response_with_transcript`, per-turn) |
| `PreToolUse` | split: `pre_read_code`, `pre_write_code`, `pre_run_command`, `pre_mcp_tool_use` |
| `PostToolUse` | split: `post_read_code`, `post_write_code`, `post_run_command`, `post_mcp_tool_use` |

---

## Hook Configuration (R1)

### Config file locations (merged across all levels)

| Scope | Path |
|---|---|
| System (macOS) | `/Library/Application Support/Windsurf/hooks.json` |
| System (Linux/WSL) | `/etc/windsurf/hooks.json` |
| System (Windows) | `C:\ProgramData\Windsurf\hooks.json` |
| User (Devin Desktop) | `~/.codeium/windsurf/hooks.json` |
| User (JetBrains plugin) | `~/.codeium/hooks.json` |
| Workspace | `.windsurf/hooks.json` (workspace root) |

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

---

## Output Model (R1)

**(!) There is no structured stdout contract.** Hooks communicate results **solely through the process exit code**. stdout/stderr are not deserialized; with `show_output: true` they are displayed to the user in the Cascade UI only.

| Mechanism | Effect | Ref |
|---|---|---|
| process exit code | sole result channel (see Exit Codes) | R1 |
| stdout / stderr | shown in Cascade UI iff `show_output: true`; **never parsed, never injected into model context** | R1 |

No `permissionDecision`, `additionalContext`, `continue`, `decision`, `reason`, `hookSpecificOutput`, `modifiedArgs`, or `modifiedResult` — none documented; none honored.

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

**Open items / cross-references:** see `docs/hooks-verify.md` (Windsurf section, Bug 1).
