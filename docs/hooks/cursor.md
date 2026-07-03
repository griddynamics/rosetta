# Cursor Hooks Contract

Target agent: **Cursor** (Agent / Cmd-K chat + Tab inline completions; shared `hooks.json`).

Exact input/output contract for Cursor lifecycle hooks. Facts only, sourced from Cursor's hooks reference.

**Status: COMPLETE** — grounded in Cursor's hooks reference (R1) AND empirically verified by live-hook runs (Cursor 3.9.16, Runs 1–4, 2026-06-29/30; cleaned excerpts `docs/hooks/cursor-logs.txt` [Runs 1–2], `docs/hooks/cursor-run3-logs.txt` [Run 3], `docs/hooks/cursor-run4-logs.txt` [Run 4]), sealed 2026-06-30. Run 2 (fresh conversation) added `sessionStart`. Run 3 (`beforeShellExecution` deny isolated from `preToolUse` via a distinct match string) confirmed the `agent_message` deny channel across a SECOND independent mechanism and surfaced several previously-undocumented fields/behaviors (see Practical Conclusions 4, 6, 7, 8). Run 4 (targeted exit-code/`ask`/`failClosed`/subagent/file-edit/`env` probes) promoted most remaining 📄 items to ✅ — see Practical Conclusions 9–12. The hook protocol is **model-independent** — verified behaviors are contract facts, not model quirks. Still 📄 (no MCP server / session-close available in the test harness): `beforeMCPExecution`/`afterMCPExecution`, `updated_mcp_tool_output`, `sessionEnd` (input shape only — fired once incidentally, Run 4, but its content wasn't targeted), `beforeReadFile` deny.

---

## Practical Conclusions (Cursor)

Findings NOT obvious from the per-event tables below — and where Cursor genuinely diverges from Claude / Codex / Copilot:

1. **(!) Output is FLAT snake_case — NO `hookSpecificOutput` wrapper.** Unlike Claude / Codex / Copilot-VS-Code (nested `hookSpecificOutput.*`), Cursor reads fields at the TOP LEVEL: `permission`, `additional_context`, `user_message`, `agent_message`, `updated_input`, `continue`, `env`, `followup_message`. Emitting a `hookSpecificOutput` wrapper does NOT work on Cursor.
2. **(!) Two layers of tool hooks — generic AND granular.** Cursor exposes BOTH a generic `preToolUse`/`postToolUse` pair (fires for every tool) AND granular per-tool-class hooks (`beforeShellExecution`/`afterShellExecution`, `beforeMCPExecution`/`afterMCPExecution`, `beforeReadFile`, `afterFileEdit`). A tool call can fire both the generic and the granular hook. Choose the layer deliberately — wiring a Bash guard on `beforeShellExecution` AND `preToolUse` double-fires it.
3. **(!) Fail-OPEN by default.** A hook crash / timeout / invalid-JSON lets the action through (the opposite of Copilot's fail-closed `preToolUse`). To make a deny-hook block on failure, set `"failClosed": true` on that hook entry in `hooks.json`. A deny guard wired without `failClosed` silently degrades to allow on any error.
4. **(!) Deny reason — OBSERVED behavior CONTRADICTS the doc's audience split (Runs 1 + 3, TWO independent mechanisms).** R1 documents `user_message` = "shown to the user", `agent_message` = "fed to the agent". Empirically, on a deny carrying BOTH fields, **the model received the `user_message` text, NOT `agent_message`** — confirmed via `preToolUse` deny (Run 1) AND, independently, via `beforeShellExecution` deny (Run 3, isolated from `preToolUse` by using a distinct match string so only the granular hook denied). The mechanism: a denied tool produces a follow-up **`postToolUseFailure`** event whose **`error_message` carries the deny's `user_message`** — that is the channel the model reads. `agent_message` was emitted in both runs but in NEITHER was it observed reaching the model (Run 3 had the model explicitly search its full context AND grep the filesystem for the marker — found only in the hook script's source, never live). **Implication for Rosetta:** the adapter's existing mapping (deny reason → `user_message` only, no `agent_message`) is CORRECT and reaches the model; no code change needed for this channel. `agent_message`'s delivery path remains unobserved (not exercised via `beforeMCPExecution`).
   - **(!) The `error_message` WRAPPER differs by which hook denied (Run 1 vs Run 3) — NOT a fixed template.** `preToolUse` deny → `error_message` = `user_message` **verbatim, no wrapper**. `beforeShellExecution` deny → `error_message` = `"Command execution was blocked by a hook: " + user_message + "\n\nTo view or modify configured hooks, go to Cursor Settings > Hooks.\n\nAgent note: Do not suggest workarounds to the blocked tool."` (Run 3, observed verbatim in the log). Both deliver the same underlying `user_message` text to the model — only the surrounding template differs. Separately, the UI (not `error_message`) prefixes a blocked **Shell** command's displayed message with `"Rejected: "` (Run 1) — a third, display-only wrapper layer that is NOT in the field the model reads.
   - Cursor also **appends its own line** to a blocked tool's message: *"Agent note: Do not suggest workarounds to the blocked tool."* (not emitted by the hook; present in both wrapper forms above).
5. **(!) `permission: "ask"` is NOT universal.** Accepted (and enforced) on `beforeShellExecution` / `beforeMCPExecution`. On `preToolUse` it is *"accepted by the schema but not enforced today"* — only `allow`/`deny` act. `beforeReadFile` is `allow`/`deny` only.
6. **Tool names are Cursor-specific.** Matchers/`tool_name` use `Shell`, `Read`, `Write`, `Grep`, `Task`, `MCP:<toolName>` (and Tab variants `TabRead`/`TabWrite`) — NOT Claude/Codex names (`Bash`, `apply_patch`). `Grep` confirmed in Run 3 (`tool_input:{pattern, file_path}`; `tool_output` JSON string `{pattern, success}`). Wiring that assumes `Bash` will never match.
7. **(!) `tool_use_id` format differs by tool, not a single uniform shape.** Observed (Runs 1 + 3): **`Shell`** → raw UUID (e.g. `d024a132-85b4-4c79-80f0-6b2e2fffc1fe`). **`Read`/`Grep`** → `tool_`-prefixed id (e.g. `tool_3b7c03f6-…`). Do not assume one format when correlating `tool_use_id` across events.
8. **(!) `model` reflects the user's CURRENTLY-SELECTED Cursor model, not a fixed per-event-phase value.** Run 1 observed `"composer-2.5-fast"` on `beforeSubmitPrompt`/`stop` and `"default"` on tool events; Run 3 (different model selected in the IDE) observed `"default"` on **every** event including `beforeSubmitPrompt`/`stop`. The field is session/user-config-dependent — it is NOT determined by which hook event fired. Do not treat the Run 1 phase-mapping as a guaranteed contract.
9. **(!) Pairing exit code 2 WITH a JSON body does NOT get JSON-parsed — the raw stdout text is dumped VERBATIM as the block reason, bypassing field-selective delivery (Run 4).** At exit 0, Cursor parses stdout and delivers ONLY `user_message` to the model (via `postToolUseFailure.error_message`; Practical Conclusion 4). At exit 2 with the SAME `{"permission":"deny","user_message":"...","agent_message":"..."}` body, the model's reported rejection text was the **entire raw JSON string, unparsed** — including `agent_message`, which the exit-0 path never delivers. **Implication for Rosetta:** combining exit-code-2 with the existing JSON-deny output (as a literal interpretation of Bug 1 for Cursor) would trade the confirmed-clean, field-selective exit-0 delivery for a worse, unparsed raw-JSON dump — for no functional gain, since exit-0+JSON deny already works. A bare exit-code-2 with NO body (no JSON at all) DOES still block cleanly (Practical Conclusion 10) — the issue is specifically pairing exit-2 with text.
10. **(!) Exit code 2 ALONE (empty stdout, no JSON) blocks the action — CONFIRMED (Run 4).** A `beforeShellExecution` handler that emits ONLY a non-zero/2 exit code (no `--output`, no JSON) blocked the tool with no reason shown ("blocked this action (exit code 2) but provided no reason"). Promotes the Exit Codes table's `2 = block` row from 📄 to ✅, independent of the JSON-deny path.
11. **(!) `permission:"ask"` showed NO interactive approval UI to either the agent or the human — it behaved indistinguishably from `deny` (Run 4).** R1 documents `ask` as "accepted AND enforced" on `beforeShellExecution`. Empirically: the tool was blocked outright, the `user_message` text was shown the same way a deny's `user_message` is shown, and the human user (separately confirmed) saw no popup/confirmation dialog to click Allow/Deny. In this build, `ask` on `beforeShellExecution` does not provide an interactive gate distinguishable from `deny` — treat it as deny-equivalent, not as a pause-for-approval mechanism, until a build/version is found where it differs.
12. **(!) `failClosed:true` blocks on ANY non-decisive response, not just a literal crash — a `failClosed` handler MUST emit an explicit decision on every invocation, including non-matching ones, or it blocks every action on that event (Run 4).** First exercise of this flag emitted nothing (empty stdout, exit 0) on non-matching calls; Cursor treated the empty response itself as a hook failure ("returned no output") and blocked under `failClosed`, indistinguishable from an actual crash. Fixed by having the handler always emit `{"permission":"allow"}` and only fail (via crash) on its own match. A/B confirmed: the SAME crash (uncaught throw, exit 1, no output) is fail-OPEN (action proceeds) when `failClosed` is unset, and fail-CLOSED (action blocked) when `failClosed:true` — and on the literal-crash block, Cursor surfaces the **full Node stack trace** verbatim to the agent (not just the thrown message).
13. **`sessionStart`'s `env` output propagates to subsequent HOOK SCRIPT invocations' process environment for the rest of the session — but NOT to the agent's own shell/tool executions (Run 4).** Every later hook invocation in the same session carried `ROSETTA_SS_ENV_TEST=cursor-env-CSE9` in its own process env; the agent running `echo $ROSETTA_SS_ENV_TEST` in its Shell tool got `UNSET`. `env` is a hook-process-scoped channel, not a way to inject variables into the agent's terminal.
14. **`subagentStart`/`subagentStop` and `afterFileEdit` confirmed firing, with two shape nuances (Run 4):** `subagent_type` observed as `"general-purpose"` (hyphenated) — not the `generalPurpose`/`explore`/`shell` examples this doc previously speculated from R1. `subagentStop`'s `modified_files` and `summary` fields were ABSENT (not merely empty) on a `status:"completed"` subagent that did no file work — treat both as conditionally-present, not guaranteed. `afterFileEdit.edits` came back `[]` for a brand-new file (no prior content to diff against) — `edits` is populated only for edits to existing content.

---

## Capability Matrix (Cursor)

Verification status per hook capability. ✅ = confirmed by live-hook run (Run 1); 📄 = documented (R1), not yet exercised.

| Capability | Status |
|---|---|
| Flat snake_case output (no `hookSpecificOutput` wrapper), parsed at exit 0 | ✅ deny/rewrite/`additional_context`/`followup_message` all honored flat |
| Two-layer tool hooks — generic `preToolUse` AND granular `beforeShellExecution` both fire for one Shell call | ✅ both fired per `echo` |
| `preToolUse` — `permission:"deny"` blocks the tool (exit 0 + JSON) | ✅ blocked `Read` and Shell `cat` |
| Deny reason reaches model via `user_message` (as `postToolUseFailure.error_message`); `agent_message` NOT observed reaching model | ✅ CONFIRMED across 2 independent mechanisms — `preToolUse` (Run 1) AND `beforeShellExecution` (Run 3); `error_message` wrapper template differs by which hook denied (see Practical Conclusion 4) |
| `preToolUse` — `updated_input` rewrite (args replaced before exec) | ✅ `echo` rewritten before exec |
| `preToolUse` — `permission:"ask"` (schema-accepted, NOT enforced) | 📄 |
| `postToolUse` — inject `additional_context` (reaches model) | ✅ recalled (CURSOR-PTU-9f2a / CPT2) |
| `postToolUse` — `updated_mcp_tool_output` (MCP only) | 📄 (no MCP server in test harness) |
| `postToolUseFailure` — fires on deny (`failure_type:"permission_denied"`, `error_message`) | ✅ fired for denies via BOTH `preToolUse` (Run 1) and `beforeShellExecution` (Run 3); `error_message` wrapper text differs by denying hook (see Practical Conclusion 4) |
| `stop` — `followup_message` auto-submits as next turn (once-guarded) | ✅ model replied STOP-FOLLOWUP-RECEIVED |
| `beforeShellExecution` — fires (input `command`/`cwd`/`sandbox`); deny path | ✅ fires; ✅ deny CONFIRMED (Run 3, isolated from `preToolUse` via a distinct match string) |
| `beforeSubmitPrompt` — fires (input `prompt`/`attachments`); `continue` block | ✅ fires / 📄 block (not exercised; nothing in Rosetta's usage needs to block prompt submission) |
| `afterShellExecution` / `afterAgentResponse` / `afterAgentThought` — fire (fire-and-forget) | ✅ fired |
| `preCompact` — fires (`trigger:"manual"` + context stats) | ✅ fired (Cursor "summarize") |
| `sessionStart` — inject `additional_context` (reaches model) | ✅ recalled (CURSOR-SS-3c4d / CSS1), Run 2 fresh conversation |
| `sessionStart` — set session `env` vars | ✅ propagates to later HOOK SCRIPT invocations' env (Run 4); does NOT reach the agent's own shell (Practical Conclusion 13) |
| `beforeReadFile` — fires (input `file_path`/`content`/`attachments`) | ✅ fires (Run 3 — confirmed alongside `preToolUse` for the same Read call) |
| `beforeReadFile` — `permission` allow/deny | 📄 fires, but no deny triggered yet (Run 3's Read didn't match the deny target) |
| `beforeMCPExecution` / `afterMCPExecution` — `permission` + messages | 📄 (no MCP server in test harness) |
| `subagentStart` / `subagentStop` (`followup_message`) | ✅ fired (Run 4); `subagent_type:"general-purpose"` observed; `modified_files`/`summary` absent on this run (Practical Conclusion 14). `followup_message` itself not exercised (📄) |
| `afterFileEdit` | ✅ fired (Run 4); `edits:[]` for a brand-new file (Practical Conclusion 14) |
| `sessionEnd` | 📄 fired once incidentally (Run 4, a stale conversation closing) — input shape not targeted/verified |
| Exit code 2 ≡ `permission:"deny"`, NO body | ✅ CONFIRMED (Run 4) — blocks with no reason shown |
| Exit code 2 PAIRED WITH a JSON deny body | ✅ blocks, but dumps the RAW unparsed JSON text as the reason — worse than the exit-0 path (Practical Conclusion 9) |
| `permission:"ask"` on `beforeShellExecution` | ✅ exercised (Run 4) — blocked outright, NO interactive UI shown to agent OR human (Practical Conclusion 11) |
| `failClosed:true` blocks on hook failure (else fail-open) | ✅ CONFIRMED both directions (Run 4) — same crash fails open without the flag, fails closed with it (Practical Conclusion 12); ALSO blocks on a non-matching/empty response, not just a crash |

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

> **Observed (Run 1):** `session_id` is present on every event and **equals `conversation_id`**. `transcript_path` is a `…/agent-transcripts/<id>.jsonl` path (but `null` on `beforeSubmitPrompt` until the session has a transcript).
>
> **(!) `model` reflects the user's currently-selected Cursor model — NOT a fixed per-event mapping (corrected, Run 3).** Run 1 (model selection: fast mode) observed `"composer-2.5-fast"` (+ `model_id`/`model_params`) on `beforeSubmitPrompt`/`stop`, `"default"` on tool events, `"gpt-4.1-mini"` on `preCompact`. Run 3 (different model selected in the IDE) observed `"default"` on **every** event, including `beforeSubmitPrompt`/`stop`. The value tracks the active IDE model selection, not the hook event type — do not treat Run 1's phase-mapping as a guaranteed contract.
>
> **(!) Undocumented token-usage fields (Run 3, NOT in R1):** `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens` (numbers) appear on `afterAgentResponse` and the following `stop`/`beforeSubmitPrompt` once a generation has occurred (absent before the first generation). NOT observed on tool events (`preToolUse`/`postToolUse`/`beforeShellExecution`/etc.) or `afterAgentThought`. Observed-only — no R1 citation.

---

## sessionStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | **Observed (Run 2): `generation_id:""` (empty at session start); `transcript_path:null`; `model`/`model_id` `"default"`.** |
| `session_id` | string | R1 | session id. **Observed = `conversation_id` (Run 2).** |
| `is_background_agent` | boolean | R1 | background-agent session. **Observed `false` (Run 2).** |
| `composer_mode` | string | R1 | optional — `"agent"` \| `"ask"` \| `"edit"`. **Observed `"agent"` (Run 2).** |

> **Observed (Run 2):** no `source` field (unlike Claude/Codex `SessionStart`). `sessionStart` fires only at conversation start — it did NOT fire in Run 1 because hooks were registered mid-session.

### Output (R1)

```json
{ "env": { "<key>": "<value>" }, "additional_context": "context text" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `additional_context` | string | R1 | optional; injected into the conversation. **✅ Observed (Run 2): reaches the model (recalled CURSOR-SS-3c4d / CSS1); emit exit 0, textLen 71.** |
| `env` | object | R1 | optional; session-scoped environment variables. **✅ Observed (Run 4): every later hook SCRIPT invocation in the session carried the var in its own process env (`ROSETTA_SS_ENV_TEST=cursor-env-CSE9`). Does NOT reach the agent's own shell — `echo $ROSETTA_SS_ENV_TEST` in a Shell tool call came back `UNSET` (Practical Conclusion 13).** |

---

## preToolUse (generic)

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `tool_name` | string | R1 | `Shell`, `Read`, `Write`, `Grep`, `Task`, `MCP:<toolName>`. **Observed `Shell`, `Read` (Run 1); `Grep` (Run 3).** |
| `tool_input` | object | R1 | tool-specific parameters. **Observed: Shell → `{command, cwd, timeout}`; Read → `{file_path}` (Run 1); Grep → `{pattern, file_path}` (Run 3, `file_path` here is the search scope, not a single file).** |
| `tool_use_id` | string | R1 | tool-call id. **(!) Format differs by tool (Runs 1+3): Shell → raw UUID; Read/Grep → `tool_`-prefixed id.** |
| `cwd` | string | R1 | working directory. **Observed empty `""` (Run 1).** |
| `agent_message` | string | R1 | agent's message preceding the tool call. **Observed ABSENT from preToolUse input (Run 1).** |
| `model` | string | R1 | **Observed `"default"` on preToolUse (Run 1); varies per phase — see Common note.** |

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
| `tool_output` | string | R1 | JSON-stringified tool result; **shape is TOOL-SPECIFIC.** Observed: **Shell** (Run 1) → `"{\"output\":\"…\\n\",\"exitCode\":0}"`; **Read** (Run 3) → `"{\"file_path\":\"…\",\"content_length\":2636}"`; **Grep** (Run 3) → `"{\"pattern\":\"…\",\"success\":true}"`. |
| `tool_use_id` | string | R1 | tool-call id. **Observed (Run 1).** |
| `cwd` | string | R1 | working directory. **Observed `""` (Run 1).** |
| `duration` | number | R1 | milliseconds. **Observed float (e.g. `728.221`) (Run 1).** |

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
| `permission` | `"allow"` \| `"deny"` \| `"ask"` | R1 | `"ask"` IS enforced here. **✅ Observed (Run 4): enforced as a BLOCK, but with no interactive approval UI to the agent or the human — behaviorally indistinguishable from `"deny"` in this build (Practical Conclusion 11).** |
| `user_message` | string | R1 | optional; shown to the user on deny. **✅ Observed (Run 4): a bare exit-2 with NO body still blocks, with no reason shown (Practical Conclusion 10); a JSON body paired with exit-2 is dumped RAW/unparsed as the reason, including `agent_message` (Practical Conclusion 9).** |
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
| `file_path` | string | R1 | file being read. **Observed (Run 3): full absolute path.** |
| `content` | string | R1 | file content. **Observed (Run 3): full file content as a string.** |
| `attachments` | `[{type:"file"\|"rule", file_path}]` | R1 | attached files/rules. **Observed (Run 3): `[]` when none.** |

> **(!) Observed (Run 3): FIRES — confirmed alongside `preToolUse` for the same Read call** (same generic+granular double-fire pattern as Shell, Practical Conclusion 2). Deny path NOT yet exercised (this run's Read didn't match the deny target).

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
| `edits` | `[{old_string, new_string}]` | R1 | applied edits. **✅ Observed (Run 4): `[]` for a brand-new file (no prior content to diff against) — populated only for edits to existing content (Practical Conclusion 14).** |

### Output (R1)

No output fields.

---

## subagentStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `subagent_id` | string | R1 | subagent id |
| `subagent_type` | string | R1 | R1 examples: `generalPurpose`, `explore`, `shell`. **✅ Observed (Run 4): `"general-purpose"` (hyphenated) for the Task tool's default subagent — differs from R1's example casing.** |
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
| `description` | string | R1 | description. **Observed (Run 4): `"Reply with DONE"` — present.** |
| `summary` | string | R1 | run summary. **Observed (Run 4): ABSENT (not present, not just empty) — conditionally present, not guaranteed (see `modified_files` note above).** |
| `duration_ms` | number | R1 | duration |
| `message_count` | number | R1 | messages |
| `tool_call_count` | number | R1 | tool calls |
| `loop_count` | number | R1 | loops |
| `modified_files` | string[] | R1 | files changed. **Observed (Run 4): ABSENT (not present, not just empty) on a `status:"completed"` subagent that did no file work — conditionally present, not guaranteed.** |
| `agent_transcript_path` | string \| null | R1 | subagent transcript. **Observed (Run 4): `null`.** |

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
| `input_tokens` / `output_tokens` / `cache_read_tokens` / `cache_write_tokens` | number | Observed only (Run 3, not in R1) | present on every `stop` observed (Run 3) — `stop` only fires after a generation completes |

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

> **(!) Observed (Runs 1 + 3):** a deny — via EITHER `preToolUse` (Run 1) OR `beforeShellExecution` (Run 3) — produces a follow-up `postToolUseFailure` with `failure_type:"permission_denied"`, `duration:0`, `is_interrupt:false`, and an **`error_message` carrying the deny's `user_message`**. The wrapper differs by denying hook: `preToolUse` → verbatim, no wrapper (Run 1); `beforeShellExecution` → `"Command execution was blocked by a hook: " + user_message + "\n\nTo view or modify configured hooks, go to Cursor Settings > Hooks.\n\nAgent note: Do not suggest workarounds to the blocked tool."` (Run 3). Either way, this is the channel by which the deny reason reached the model — `agent_message` did not (see Practical Conclusion 4).
| `afterAgentResponse` | agent | `text`; **+ `input_tokens`/`output_tokens`/`cache_read_tokens`/`cache_write_tokens` (Observed only, Run 3, not in R1)** | fire-and-forget | R1 |
| `afterAgentThought` | agent | `text`, `duration_ms` (opt) | fire-and-forget | R1 |
| `beforeTabFileRead` | Tab | `file_path`, `content` | `permission: allow\|deny` | R1 |
| `afterTabFileEdit` | Tab | `file_path`, `edits[{old_string,new_string,range,old_line,new_line}]` | none | R1 |
| `workspaceOpen` | app | `hook_event_name`, `cursor_version`, `workspace_roots`, `user_email` | `pluginPaths: string[]` (opt) | R1 |

---

## Exit Codes (command-based hooks)

| Code | Meaning | Ref |
|---|---|---|
| `0` | Success; stdout JSON parsed | R1 |
| `2` | Block the action — equivalent to `permission: "deny"`. **✅ Observed (Run 4): a bare exit-2 with NO stdout body blocks with no reason shown. Pairing exit-2 WITH a JSON body does NOT get it parsed — the raw text is dumped verbatim as the reason (Practical Conclusion 9).** | R1 |
| other non-zero | Hook failed; action proceeds (**fail-open** unless `failClosed:true`) | R1 — **✅ Observed (Run 4): A/B confirmed both directions on the SAME crash (uncaught throw, no output) — fails open (proceeds) without `failClosed`, fails closed (blocked, full Node stack trace shown to the agent) with `failClosed:true`. Also: a `failClosed:true` handler that returns an EMPTY response on a non-matching call (not a crash) is ALSO treated as a failure and blocks — see Practical Conclusion 12.** |

---

## Appendix — Observed Wire Examples (Cursor live-hook Runs 1–3)

Real captures via `docs/hooks/tester.js` → `~/.rosetta/hooks.log`; run repo `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`; Cursor **3.9.16**. Runs 1–2: one session (`conversation_id` = `session_id` = `74676b03-…` / `3cf8e158-…`). Run 3: session `614ce89f-…`, targeted at isolating the `beforeShellExecution` deny path from `preToolUse` (distinct match strings: `HOOK-DENY-PROBE` for `preToolUse`, `SHELL-DENY-PROBE` for `beforeShellExecution`). Illustrative, not exhaustive. Long values trimmed with `…`; planted test markers only, no real secrets.

**Cleaned logs:** `docs/hooks/cursor-logs.txt` (Runs 1–2, 23 invocation blocks) and `docs/hooks/cursor-run3-logs.txt` (Run 3, 22 invocation blocks), both filtered by `session_id`, de-interleaved by pid, zero credential-shaped values. ⚠️ **Do NOT read whole** — `grep` (e.g. `grep -nE 'hook_event_name|RESULT:|PROCESSOR:' docs/hooks/cursor-run3-logs.txt`).

**Runtime env signature (Cursor):** `CURSOR_EXTENSION_HOST_ROLE=agent-exec`, `CURSOR_LAYOUT=unifiedAgent`, `CURSOR_VERSION=3.9.16`, `CURSOR_PROJECT_DIR`, `CURSOR_TRANSCRIPT_PATH`, `CURSOR_USER_EMAIL`, `CURSOR_WORKSPACE_LABEL`, `CURSOR_RIPGREP_PATH`, plus VS-Code-base vars (`VSCODE_PID`, `VSCODE_IPC_HOOK`, `VSCODE_PROCESS_TITLE=extension-host (agent-exec) …`) and the `CLAUDE_PROJECT_DIR` alias. (Cursor is a VS Code fork — both `CURSOR_*` and `VSCODE_*` are present.)

**How Cursor surfaces hook output in the UI** (NOT proof of model ingestion): a denied tool shows the `user_message` in the client, and Cursor appends *"Agent note: Do not suggest workarounds to the blocked tool."* The `cat`/Shell deny via `preToolUse` prefixes the UI display with `Rejected: ` (Run 1) — but this prefix is NOT present in the `error_message` field the model actually reads (see Practical Conclusion 4 for what IS in that field, and how it differs for a `beforeShellExecution` deny).

**Events that fired (Run 1):** `beforeSubmitPrompt`, `stop`, `preToolUse`, `beforeShellExecution`, `postToolUse`, `postToolUseFailure`, `afterShellExecution`, `afterAgentThought`, `afterAgentResponse`, `preCompact`. **Run 2 (fresh conversation `3cf8e158-…`)** added `sessionStart`. **Run 3** added `beforeReadFile` (confirmed fires) and the `Grep` tool kind; confirmed `beforeShellExecution` deny in isolation. **Did NOT fire (any run):** `sessionEnd`, `before/afterMCPExecution`, `afterFileEdit`, `subagentStart/Stop`.

### Captured INPUT payloads (snake_case; flat)

```json
// sessionStart (Run 2, fresh conversation) — generation_id empty, transcript_path null, no `source`; output additional_context reached the model
{"conversation_id":"3cf8e158-…","generation_id":"","model":"default","model_id":"default","is_background_agent":false,"composer_mode":"agent","session_id":"3cf8e158-…","hook_event_name":"sessionStart","cursor_version":"3.9.16","workspace_roots":["…/spring-boot-react-mysql"],"user_email":"…","transcript_path":null}
// preToolUse — Shell tool (tool_input object: command/cwd/timeout)
{"conversation_id":"74676b03-…","generation_id":"f7746f6e-…","model":"default","tool_name":"Shell","tool_input":{"command":"echo rosetta-hook-probe","cwd":"","timeout":30000},"tool_use_id":"09dca0a5-…","cwd":"","session_id":"74676b03-…","hook_event_name":"preToolUse","cursor_version":"3.9.16","workspace_roots":["…/spring-boot-react-mysql"],"user_email":"…","transcript_path":"…/agent-transcripts/74676b03-….jsonl"}
// preToolUse — Read tool (tool_input.file_path)
{…,"tool_name":"Read","tool_input":{"file_path":"…/docs/hooks/HOOK-DENY-PROBE.txt"},"tool_use_id":"tool_ce44…","hook_event_name":"preToolUse"}
// postToolUse — tool_output is a JSON STRING; duration float
{…,"tool_name":"Shell","tool_input":{"command":"echo rosetta-hook-probe",…},"tool_output":"{\"output\":\"rosetta-hook-probe\\n\",\"exitCode\":0}","duration":728.221,"tool_use_id":"09dca0a5-…","hook_event_name":"postToolUse"}
// postToolUseFailure — from a deny; error_message = the deny's user_message
{…,"tool_name":"Read","tool_input":{"file_path":"…HOOK-DENY-PROBE.txt"},"error_message":"HOOK TEST (Rosetta diagnostic): user-facing deny channel marker CURSOR-DENY-USER (shown in the Cursor UI).","failure_type":"permission_denied","duration":0,"tool_use_id":"tool_ce44…","is_interrupt":false,"hook_event_name":"postToolUseFailure"}
// beforeShellExecution — flat command/cwd/sandbox (no tool_input wrapper)
{…,"model":"default","command":"echo rosetta-hook-probe","cwd":"","sandbox":false,"hook_event_name":"beforeShellExecution"}
// afterShellExecution — command/output/duration/sandbox
{…,"command":"echo rosetta-hook-probe","output":"rosetta-hook-probe\n","duration":728.221,"sandbox":false,"hook_event_name":"afterShellExecution"}
// beforeSubmitPrompt — prompt + attachments (active rules); model composer-2.5-fast; transcript_path null
{…,"model":"composer-2.5-fast","model_id":"composer-2.5","model_params":[{"id":"fast","value":"true"}],"composer_mode":"agent","prompt":"…","attachments":[{"type":"rule","file_path":"graphify.mdc"},{"type":"rule","file_path":"CLAUDE.md"}],"hook_event_name":"beforeSubmitPrompt","transcript_path":null}
// stop — status + loop_count (observed status:"error" on a failed turn)
{…,"model":"composer-2.5-fast","status":"error","loop_count":0,"hook_event_name":"stop"}
// preCompact — trigger + context stats (fired on Cursor "summarize")
{…,"model":"gpt-4.1-mini","trigger":"manual","context_usage_percent":9.2085,"context_tokens":18417,"context_window_size":200000,"message_count":13,"messages_to_compact":11,"is_first_compaction":true,"hook_event_name":"preCompact"}
```

### Emitted OUTPUT that Cursor ACCEPTED (flat snake_case, exit 0)

```json
// sessionStart context (Run 2) — flat additional_context; reached the model (recalled CURSOR-SS-3c4d / CSS1)
{"additional_context":"Diagnostic secret CURSOR-SS-3c4d. Report CSS1."}
// preToolUse deny — flat; blocked the tool. user_message reached the model (as postToolUseFailure.error_message); agent_message did NOT.
{"permission":"deny","user_message":"…CURSOR-DENY-USER…","agent_message":"…CURSOR-DENY-AGENT; Report DA1"}
// preToolUse rewrite — flat allow + updated_input; command substituted before exec (output was PRETOOLUSE-HOOK-REWROTE-THIS)
{"permission":"allow","updated_input":{"command":"echo PRETOOLUSE-HOOK-REWROTE-THIS"}}
// postToolUse context — flat additional_context; reached the model (recalled CURSOR-PTU-9f2a / CPT2)
{"additional_context":"Diagnostic secret CURSOR-PTU-9f2a. Report CPT2."}
// stop continuation — flat followup_message; auto-submitted once (model replied STOP-FOLLOWUP-RECEIVED CURSOR-STOP-1)
{"followup_message":"HOOK TEST … STOP-FOLLOWUP-RECEIVED CURSOR-STOP-1 …"}
```

### Run 3 — `beforeShellExecution` deny isolation + new fields/tools

```json
// beforeShellExecution — denied in ISOLATION (preToolUse's match string did not hit this command)
{"conversation_id":"614ce89f-…","model":"default","command":"echo SHELL-DENY-PROBE-test-marker","cwd":"","sandbox":false,"hook_event_name":"beforeShellExecution"}
// emitted output — flat deny, both reason channels set
{"permission":"deny","user_message":"…CURSOR-DENY-USER (shown in the Cursor UI).","agent_message":"…CURSOR-DENY-AGENT; Report DA1"}
// postToolUseFailure — error_message WRAPPED (differs from Run 1's verbatim form)
{…,"tool_name":"Shell","error_message":"Command execution was blocked by a hook: HOOK TEST (Rosetta diagnostic): user-facing deny channel marker CURSOR-DENY-USER (shown in the Cursor UI).\n\nTo view or modify configured hooks, go to Cursor Settings > Hooks.\n\nAgent note: Do not suggest workarounds to the blocked tool.","failure_type":"permission_denied","duration":0,"is_interrupt":false,"hook_event_name":"postToolUseFailure"}
// beforeReadFile — FIRES (new this run); content is the full file text; attachments empty
{…,"model":"default","content":"…(full file content)…","file_path":"…/docs/hooks/tester.js","attachments":[],"hook_event_name":"beforeReadFile"}
// preToolUse — Grep tool (NEW tool_name; tool_input.file_path is the search scope, not a single file)
{…,"tool_name":"Grep","tool_input":{"pattern":"CURSOR-DENY-AGENT","file_path":"…/spring-boot-react-mysql"},"tool_use_id":"tool_dde35b50-…","hook_event_name":"preToolUse"}
// postToolUse — Grep's tool_output shape (differs from Shell's and Read's)
{…,"tool_name":"Grep","tool_output":"{\"pattern\":\"CURSOR-DENY-AGENT\",\"success\":true}","duration":250.98,"hook_event_name":"postToolUse"}
// postToolUse — Read's tool_output shape (differs from Shell's and Grep's)
{…,"tool_name":"Read","tool_output":"{\"file_path\":\"…/tester.js\",\"content_length\":2636}","duration":10.218,"hook_event_name":"postToolUse"}
// afterAgentResponse — undocumented token-usage fields (not in R1), also present on the following stop
{…,"model":"default","text":"…","input_tokens":31527,"output_tokens":615,"cache_read_tokens":22112,"cache_write_tokens":0,"hook_event_name":"afterAgentResponse"}
// stop — model is "default" here too (Run 1 showed "composer-2.5-fast" on stop — confirms model is user-selection-dependent, not phase-fixed)
{…,"model":"default","status":"completed","loop_count":0,"input_tokens":31527,"output_tokens":615,"cache_read_tokens":22112,"cache_write_tokens":0,"hook_event_name":"stop"}
```

**Model verification (Run 3):** asked to report `CURSOR-DENY-USER`/`CURSOR-DENY-AGENT` presence separately after the `beforeShellExecution` deny — answered YES (`CURSOR-DENY-USER`, found in the rejection message) / NO (`CURSOR-DENY-AGENT`). A follow-up turn asked it to locate `CURSOR-DENY-AGENT` "anywhere"; the model searched its context AND grepped the filesystem, finding the marker only inside `tester.js`'s source (the hook script itself) — never in any live context. Confirms `agent_message` was not delivered via this path either.

### Run 4 — exit-code/`ask`/`failClosed`/subagent/file-edit/`env` probes (session `78d9aebd-5573-4e6b-b018-832b56991975`)

Targeted the remaining 📄 items reachable without an MCP server. Two `beforeShellExecution` handlers registered (multiple handlers per event array IS supported — both fired independently in parallel). Cleaned log: `docs/hooks/cursor-run4-logs.txt` (55 invocation blocks).

```json
// beforeShellExecution — bare exit-code-2, NO body (Practical Conclusion 10)
// handler emits nothing but exitCode=2 when matched; UI showed: "blocked this action (exit code 2) but provided no reason"

// beforeShellExecution — exit-2 PAIRED with a JSON deny body (Practical Conclusion 9)
{"permission":"deny","user_message":"...CURSOR-EXIT2-USER...","agent_message":"...CURSOR-EXIT2-AGENT; Report DE1..."}
// ⇒ surfaced to the agent VERBATIM AS RAW JSON TEXT (not parsed/templated) — unlike the exit-0 path,
// which would have shown only user_message via postToolUseFailure.error_message.

// beforeShellExecution — permission:"ask" (Practical Conclusion 11)
{"permission":"ask","user_message":"...requires explicit approval (permission:\"ask\")...CURSOR-ASK-1."}
// ⇒ blocked outright; no approval UI shown to agent or human.

// beforeShellExecution — failClosed:true handler, NON-matching call (Practical Conclusion 12)
// handler returns empty stdout, exit 0 (no decision) → Cursor still blocks:
// "Tool blocked because this hook is configured to fail closed (block when it fails).
//  Hook \"...\" returned no output."

// beforeShellExecution — failClosed:true handler, literal crash (Practical Conclusion 12)
// handler throws (uncaught), exit 1 → blocked, FULL Node stack trace shown to the agent verbatim.

// beforeShellExecution — SAME crash, failClosed NOT set → fails OPEN, action proceeds normally
// (afterShellExecution/postToolUse fired afterward with the real command output).

// sessionStart — env propagation (Practical Conclusion 13)
// every later hook SCRIPT invocation in this session carried in its OWN process env:
ROSETTA_SS_ENV_TEST=cursor-env-CSE9
// but the agent's own `echo $ROSETTA_SS_ENV_TEST` (Shell tool) returned UNSET.

// subagentStart (Practical Conclusion 14)
{"subagent_id":"tool_57cce371-...","subagent_type":"general-purpose","task":"Reply with the single word DONE", ...}
// subagentStop — modified_files and summary ABSENT (not empty, not present):
{"subagent_id":"tool_57cce371-...","subagent_type":"general-purpose","status":"completed","duration_ms":4356,"message_count":0,"tool_call_count":0,"loop_count":0,"task":"...","description":"Reply with DONE", ...}

// afterFileEdit — brand-new file, edits is empty (Practical Conclusion 14)
{"file_path":".../docs/hooks/_run4-scratch.txt","edits":[]}
```

**Provisioning note:** Run 4 initially produced ZERO log entries on the first attempt — `.cursor-disabled/` had been renamed to `.cursor/` (with edited `hooks.json`) while Cursor was already running against that workspace; a fresh conversation's `sessionStart`/`sessionEnd` pair (a different, incidental session closing) was the first sign hooks were live again. Lesson: editing/activating `hooks.json` for an already-open Cursor workspace may need a new session before the runtime re-reads it — don't trust an apparently-clean "nothing blocked" report without checking `~/.rosetta/hooks.log` first.

**Test-design note:** an early draft of this run's `failClosed` probe returned an EMPTY response (no explicit `permission`) on every non-matching call, which — per Practical Conclusion 12 — caused `failClosed:true` to block ALL `beforeShellExecution` calls regardless of which other probe was under test. Fixed by always emitting an explicit `{"permission":"allow"}` on the non-match path. Anyone authoring a `failClosed:true` hook must do the same.
