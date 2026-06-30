# Cursor Hooks Contract

Target agent: **Cursor** (Agent / Cmd-K chat + Tab inline completions; shared `hooks.json`).

Exact input/output contract for Cursor lifecycle hooks. Facts only, sourced from Cursor's hooks reference.

**Status: DRAFT (doc-grounded hypothesis, NOT yet verified).** Grounded in Cursor's hooks reference (R1). The `Observed` evidence and Capability-Matrix `✅` marks are **pending the live-hook run** — until then every contract claim here is a hypothesis to be tested, not confirmed truth. The hook protocol is model-independent — one verified run seals the contract; the model does not change it.

---

## Practical Conclusions (Cursor)

Findings NOT obvious from the per-event tables below — and where Cursor genuinely diverges from Claude / Codex / Copilot:

1. **(!) Output is FLAT snake_case — NO `hookSpecificOutput` wrapper.** Unlike Claude / Codex / Copilot-VS-Code (nested `hookSpecificOutput.*`), Cursor reads fields at the TOP LEVEL: `permission`, `additional_context`, `user_message`, `agent_message`, `updated_input`, `continue`, `env`, `followup_message`. Emitting a `hookSpecificOutput` wrapper does NOT work on Cursor.
2. **(!) Two layers of tool hooks — generic AND granular.** Cursor exposes BOTH a generic `preToolUse`/`postToolUse` pair (fires for every tool) AND granular per-tool-class hooks (`beforeShellExecution`/`afterShellExecution`, `beforeMCPExecution`/`afterMCPExecution`, `beforeReadFile`, `afterFileEdit`). A tool call can fire both the generic and the granular hook. Choose the layer deliberately — wiring a Bash guard on `beforeShellExecution` AND `preToolUse` double-fires it.
3. **(!) Fail-OPEN by default.** A hook crash / timeout / invalid-JSON lets the action through (the opposite of Copilot's fail-closed `preToolUse`). To make a deny-hook block on failure, set `"failClosed": true` on that hook entry in `hooks.json`. A deny guard wired without `failClosed` silently degrades to allow on any error.
4. **(!) Deny reason has TWO audiences — `user_message` (UI) vs `agent_message` (model).** `user_message` is shown to the USER in the client; `agent_message` is fed back to the AGENT/model for reasoning. Put a model-facing block reason in `user_message` and the model never sees it (silent). Use `agent_message` when the model must read the reason.
5. **(!) `permission: "ask"` is NOT universal.** Accepted (and enforced) on `beforeShellExecution` / `beforeMCPExecution`. On `preToolUse` it is *"accepted by the schema but not enforced today"* — only `allow`/`deny` act. `beforeReadFile` is `allow`/`deny` only.
6. **Tool names are Cursor-specific.** Matchers/`tool_name` use `Shell`, `Read`, `Write`, `Task`, `MCP:<toolName>` (and Tab variants `TabRead`/`TabWrite`) — NOT Claude/Codex names (`Bash`, `apply_patch`). Wiring that assumes `Bash` will never match.

---

## Capability Matrix (Cursor)

Verification status per hook capability. ✅ = confirmed by live-hook run; 📄 = documented (R1), not yet exercised. **All rows are 📄 until the live-hook run (step 3) — this spec is DRAFT.**

| Capability | Status |
|---|---|
| Flat snake_case output (no `hookSpecificOutput` wrapper) | 📄 |
| `sessionStart` — inject `additional_context` | 📄 |
| `sessionStart` — set session `env` vars | 📄 |
| `preToolUse` — `permission:"deny"` + `user_message`/`agent_message` | 📄 |
| `preToolUse` — `updated_input` rewrite | 📄 |
| `preToolUse` — `permission:"ask"` (schema-accepted, NOT enforced) | 📄 |
| `beforeShellExecution` — `permission` allow/deny/ask + messages | 📄 |
| `beforeMCPExecution` — `permission` allow/deny/ask + messages | 📄 |
| `beforeReadFile` — `permission` allow/deny | 📄 |
| `postToolUse` — inject `additional_context` | 📄 |
| `postToolUse` — `updated_mcp_tool_output` (MCP only) | 📄 |
| `subagentStop` — `followup_message` (status=completed) | 📄 |
| `stop` — `followup_message` | 📄 |
| Exit code 2 ≡ `permission:"deny"` | 📄 |
| `failClosed:true` blocks on hook failure (else fail-open) | 📄 |

---

## Events of Interest (Rosetta)

Rosetta's 5 target lifecycle events, mapped to Cursor's event model. The remaining Cursor events are documented below for completeness.

| Rosetta purpose | Cursor event(s) |
|---|---|
| Session context injection | `sessionStart` |
| Pre-tool guard (deny / rewrite / advise) | `preToolUse` (generic) — and granular `beforeShellExecution` / `beforeReadFile` / `beforeMCPExecution` |
| Post-tool advisory | `postToolUse` (generic) — and granular `afterShellExecution` / `afterFileEdit` / `afterMCPExecution` |
| Subagent end | `subagentStop` |
| Turn / session stop | `stop` (turn end) · `sessionEnd` (session end) |

> **(!) Pre/PostToolUse layering (R1):** Cursor fires BOTH a generic `preToolUse`/`postToolUse` and a granular per-tool hook. The generic hook sees every tool (`Shell`/`Read`/`Write`/`Task`/`MCP:*`); the granular hooks see one tool class with richer input (e.g. `beforeShellExecution` gets the raw `command` + `sandbox`). Pick ONE layer per guard to avoid double-fire.

---

## References

| ID | System | URL |
|---|---|---|
| R1 | Cursor — Hooks reference | https://cursor.com/docs/reference/hooks |

All fields cite **R1** unless a row is marked otherwise.

---

## Hook Configuration & Locations

| Item | Value | Ref |
|---|---|---|
| Project hooks file | `<project-root>/.cursor/hooks.json` | R1 |
| User hooks file | `~/.cursor/hooks.json` | R1 |
| Enterprise (macOS) | `/Library/Application Support/Cursor/hooks.json` | R1 |
| Enterprise (Linux/WSL) | `/etc/cursor/hooks.json` | R1 |
| Enterprise (Windows) | `C:\ProgramData\Cursor\hooks.json` | R1 |

### `hooks.json` registration format (R1)

```json
{
  "version": 1,
  "hooks": {
    "<hookName>": [
      {
        "command": "path/to/script",
        "type": "command",
        "timeout": 60,
        "loop_limit": null,
        "failClosed": false,
        "matcher": "Shell"
      }
    ]
  }
}
```

| Handler field | Type | Ref | Notes |
|---|---|---|---|
| `command` | string | R1 | **required**; the hook command to run |
| `type` | `"command"` \| `"prompt"` | R1 | default `"command"` |
| `timeout` | number | R1 | optional |
| `loop_limit` | number \| null | R1 | optional |
| `failClosed` | boolean | R1 | default `false`; `true` → hook failure BLOCKS the action (else fail-open) |
| `matcher` | string | R1 | optional; pattern matched per-hook (see Matcher Rules) |

### Matcher rules per hook (R1)

| Hook | Matcher matches against |
|---|---|
| `preToolUse` / `postToolUse` / `postToolUseFailure` | tool type — `Shell`, `Read`, `Write`, `Task`, `MCP:<toolName>` |
| `subagentStart` / `subagentStop` | subagent type (e.g. `explore|shell`) |
| `beforeShellExecution` / `afterShellExecution` | the command text |
| `beforeMCPExecution` / `afterMCPExecution` | MCP tool name |
| `beforeReadFile` | tool type — `Read`, `TabRead` |
| `afterFileEdit` | tool type — `Write`, `TabWrite` |
| `beforeSubmitPrompt` | `UserPromptSubmit` |
| `stop` | `Stop` |
| `afterAgentResponse` | `AgentResponse` |
| `afterAgentThought` | `AgentThought` |

### Environment variables available to hooks (R1)

`CURSOR_PROJECT_DIR` (always), `CURSOR_VERSION` (always), `CURSOR_USER_EMAIL` (if logged in), `CURSOR_TRANSCRIPT_PATH` (if transcripts enabled), `CURSOR_CODE_REMOTE` (`"true"` for remote workspaces), `CLAUDE_PROJECT_DIR` (alias, always). Plus session-scoped vars set via `sessionStart` `env`.

---

## Hook Events (complete list)

Agent hooks: `sessionStart`, `sessionEnd`, `preToolUse`, `postToolUse`, `postToolUseFailure`, `subagentStart`, `subagentStop`, `beforeShellExecution`, `afterShellExecution`, `beforeMCPExecution`, `afterMCPExecution`, `beforeReadFile`, `afterFileEdit`, `beforeSubmitPrompt`, `preCompact`, `stop`, `afterAgentResponse`, `afterAgentThought`.
Tab hooks: `beforeTabFileRead`, `afterTabFileEdit`.
App lifecycle: `workspaceOpen`.

> All event names are **camelCase** (R1). No PascalCase aliases documented.

---

## Common Input Fields (ALL agent hooks)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `conversation_id` | string | R1 | conversation identifier |
| `generation_id` | string | R1 | generation identifier |
| `model` | string | R1 | active model |
| `model_id` | string | R1 | optional |
| `model_params` | `[{id, value}]` | R1 | optional |
| `hook_event_name` | string | R1 | the firing event name (camelCase) |
| `cursor_version` | string | R1 | Cursor version |
| `workspace_roots` | string[] | R1 | workspace root paths |
| `user_email` | string \| null | R1 | logged-in user email |
| `transcript_path` | string \| null | R1 | session transcript path |

Input is delivered as snake_case JSON on stdin. `tool_input` (where present) is an object.

---

## sessionStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `session_id` | string | R1 | session id |
| `is_background_agent` | boolean | R1 | background-agent session |
| `composer_mode` | string | R1 | optional — `"agent"` \| `"ask"` \| `"edit"` |

### Output (R1)

```json
{ "env": { "<key>": "<value>" }, "additional_context": "context text" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `additional_context` | string | R1 | optional; injected into the conversation |
| `env` | object | R1 | optional; session-scoped environment variables |

---

## preToolUse (generic)

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | `Shell`, `Read`, `Write`, `Task`, `MCP:<toolName>` |
| `tool_input` | object | R1 | tool-specific parameters |
| `tool_use_id` | string | R1 | tool-call id |
| `cwd` | string | R1 | working directory |
| `agent_message` | string | R1 | agent's message preceding the tool call |

### Output (R1)

```json
{ "permission": "deny", "user_message": "shown to user", "agent_message": "fed to agent", "updated_input": { } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` | R1 | **(!) `"ask"` is accepted by the schema but NOT enforced for `preToolUse` today** |
| `user_message` | string | R1 | optional; **(!) shown to the USER when denied — NOT seen by the model** |
| `agent_message` | string | R1 | optional; **(!) fed to the AGENT/model when denied — use this for a model-facing reason** |
| `updated_input` | object | R1 | optional; replaces the tool input before execution |

---

## postToolUse (generic)

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | tool type |
| `tool_input` | object | R1 | tool parameters |
| `tool_output` | string | R1 | JSON-stringified tool result |
| `tool_use_id` | string | R1 | tool-call id |
| `cwd` | string | R1 | working directory |
| `duration` | number | R1 | milliseconds |

### Output (R1)

```json
{ "additional_context": "context text", "updated_mcp_tool_output": { } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `additional_context` | string | R1 | optional; injected into the conversation AFTER the tool result |
| `updated_mcp_tool_output` | object | R1 | optional; **MCP tools only** — replaces the tool output the model sees |

---

## beforeShellExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `command` | string | R1 | the shell command |
| `cwd` | string | R1 | working directory |
| `sandbox` | boolean | R1 | sandboxed execution |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` \| `"ask"` | R1 | `"ask"` IS enforced here |
| `user_message` | string | R1 | optional; shown to the user on deny |
| `agent_message` | string | R1 | optional; fed to the agent on deny |

---

## afterShellExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `command` | string | R1 | the shell command |
| `output` | string | R1 | command output |
| `duration` | number | R1 | milliseconds |
| `sandbox` | boolean | R1 | sandboxed execution |

### Output (R1)

Fire-and-forget — responses are logged but not enforced. No output fields.

---

## beforeMCPExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | MCP tool name |
| `tool_input` | string | R1 | JSON params |
| `url` | string | R1 | optional — URL-based servers |
| `command` | string | R1 | optional — command-based servers |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` \| `"ask"` | R1 | `"ask"` IS enforced here |
| `user_message` | string | R1 | optional; shown to the user on deny |
| `agent_message` | string | R1 | optional; fed to the agent on deny |

---

## afterMCPExecution

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | MCP tool name |
| `tool_input` | string | R1 | JSON params |
| `result_json` | string | R1 | MCP result |
| `duration` | number | R1 | milliseconds |

### Output (R1)

Fire-and-forget. No output fields.

---

## beforeReadFile

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `file_path` | string | R1 | file being read |
| `content` | string | R1 | file content |
| `attachments` | `[{type:"file"\|"rule", file_path}]` | R1 | attached files/rules |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` | R1 | allow/deny only (no `ask`) |
| `user_message` | string | R1 | optional; shown to the user on deny |

---

## afterFileEdit

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `file_path` | string | R1 | edited file |
| `edits` | `[{old_string, new_string}]` | R1 | applied edits |

### Output (R1)

No output fields.

---

## subagentStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `subagent_id` | string | R1 | subagent id |
| `subagent_type` | string | R1 | e.g. `generalPurpose`, `explore`, `shell` |
| `task` | string | R1 | assigned task |
| `parent_conversation_id` | string | R1 | parent conversation |
| `tool_call_id` | string | R1 | tool-call id |
| `subagent_model` | string | R1 | subagent model |
| `is_parallel_worker` | boolean | R1 | parallel-worker subagent |
| `git_branch` | string | R1 | optional |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `permission` | `"allow"` \| `"deny"` | R1 | gate subagent start |
| `user_message` | string | R1 | optional; shown to the user on deny |

---

## subagentStop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `subagent_type` | string | R1 | subagent type |
| `status` | `"completed"` \| `"error"` \| `"aborted"` | R1 | terminal status |
| `task` | string | R1 | assigned task |
| `description` | string | R1 | description |
| `summary` | string | R1 | run summary |
| `duration_ms` | number | R1 | duration |
| `message_count` | number | R1 | messages |
| `tool_call_count` | number | R1 | tool calls |
| `loop_count` | number | R1 | loops |
| `modified_files` | string[] | R1 | files changed |
| `agent_transcript_path` | string \| null | R1 | subagent transcript |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `followup_message` | string | R1 | optional; **consumed only when `status="completed"`** — auto-submits as the next message |

---

## stop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `status` | `"completed"` \| `"aborted"` \| `"error"` | R1 | turn terminal status |
| `loop_count` | number | R1 | loop count |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `followup_message` | string | R1 | optional; auto-submits as the next user message |

---

## sessionEnd

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `session_id` | string | R1 | session id |
| `reason` | `"completed"`\|`"aborted"`\|`"error"`\|`"window_close"`\|`"user_close"` | R1 | end reason |
| `duration_ms` | number | R1 | session duration |
| `is_background_agent` | boolean | R1 | background-agent session |
| `final_status` | string | R1 | final status |
| `error_message` | string | R1 | optional |

### Output (R1)

Fire-and-forget. No output fields.

---

## beforeSubmitPrompt

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `prompt` | string | R1 | the prompt about to be submitted |
| `attachments` | `[{type:"file"\|"rule", file_path}]` | R1 | attachments |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `continue` | boolean | R1 | whether to allow submission |
| `user_message` | string | R1 | optional |

---

## preCompact

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `trigger` | `"auto"` \| `"manual"` | R1 | compaction trigger |
| `context_usage_percent` | number | R1 | context usage |
| `context_tokens` | number | R1 | context tokens |
| `context_window_size` | number | R1 | window size |
| `message_count` | number | R1 | messages |
| `messages_to_compact` | number | R1 | messages to compact |
| `is_first_compaction` | boolean | R1 | first compaction this session |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `user_message` | string | R1 | optional |

---

## Other documented events (out of Rosetta scope)

| Event | Class | Input (key fields) | Output | Ref |
|---|---|---|---|---|
| `postToolUseFailure` | agent | `tool_name`, `tool_input`, `tool_use_id`, `cwd`, `error_message`, `failure_type` (`timeout`\|`error`\|`permission_denied`), `duration`, `is_interrupt` | none | R1 |
| `afterAgentResponse` | agent | `text` | fire-and-forget | R1 |
| `afterAgentThought` | agent | `text`, `duration_ms` (opt) | fire-and-forget | R1 |
| `beforeTabFileRead` | Tab | `file_path`, `content` | `permission: allow\|deny` | R1 |
| `afterTabFileEdit` | Tab | `file_path`, `edits[{old_string,new_string,range,old_line,new_line}]` | none | R1 |
| `workspaceOpen` | app | `hook_event_name`, `cursor_version`, `workspace_roots`, `user_email` | `pluginPaths: string[]` (opt) | R1 |

---

## Exit Codes (command-based hooks)

| Code | Meaning | Ref |
|---|---|---|
| `0` | Success; stdout JSON parsed | R1 |
| `2` | Block the action — equivalent to `permission: "deny"` | R1 |
| other non-zero | Hook failed; action proceeds (**fail-open** unless `failClosed:true`) | R1 |

---

## Appendix — Observed Wire Examples

**Pending live-hook verification (step 3).** To be filled with real captures from `docs/hooks/tester.js` → `~/.rosetta/hooks.log` once Cursor is run with `docs/hooks/cursor/hooks.json`. Until then this spec is DRAFT and the `Observed`/`✅` evidence does not exist.
