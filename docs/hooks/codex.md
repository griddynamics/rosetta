# Codex Hooks Contract

Target agent: **Codex (OpenAI)** — Codex CLI + IDE extension (shared `.codex/config.toml`).

Exact input/output contract for Codex lifecycle hooks. Facts only, sourced from OpenAI.

**Status: COMPLETE** — grounded in OpenAI's hooks reference (R1), empirically verified by live-hook runs (Codex CLI), and approved 2026-06-26. The hook protocol is **model-independent** — verified behaviors are contract facts, not model quirks.

---

## Practical Conclusions (Codex)

Findings NOT obvious from the per-event tables below:

1. **(!) Strict schema validation — EXACT fields, NO additional fields.** Codex validates each hook's stdout against that event's schema. Any extra field, or a documented field in the wrong place, invalidates the WHOLE output (`hook returned invalid <event> JSON output`); the hook is marked FAILED and runs **unhooked** (deny/rewrite/block do NOT apply). Emit only the documented per-event shape — no optional extras, no duplicating a field across placements.
2. **(!) `systemMessage` is a USER warning, NOT model context.** It surfaces in the UI (as a `warning:`) and never enters the model's context — use `additionalContext` when the model needs to see the text.
3. **(!) Catching file reads takes extra work — Codex has no read tool with a clear path (guidance / opinion).** Where other agents expose a dedicated read tool that hands a hook a structured `tool_input.file_path`, Codex reads files through the **shell** — typically `cat`/`sed`, but it may fall back to any shell command (`head`, `tail`, `awk`, `less`, …). So a read arrives only as the opaque `Bash` `command` string, and the hook must parse that string itself to recover the path.

   How hard to parse depends on the cost of a MISS for your goal:
   - **Miss is cheap (e.g. de-duplicating reads) → stay lenient / fail-open.** Match only dead-simple single-file readers and skip anything with shell metacharacters (pipes, redirects, `;`/`&&`, subshells, substitutions): better to let an ambiguous command through than to misclassify it. (`read-once.ts` takes exactly this approach — an example, not the contract.)
   - **Miss is costly (e.g. blocking a dangerous action) → you CANNOT skip complex commands**, because that is precisely where the target hides. Such a hook MAY need to fully tokenize/parse the entire shell command rather than bail out on complexity — its safe default flips from "let it through" to "inspect harder / deny."

   **(!) Do NOT treat MCP calls as reads.** There is no Codex MCP read path in any doc, and an MCP tool is never a passive read — it performs an action. Classifying an `mcp__…read…` call as a "read" would let a read hook dedupe or block a real side-effecting call and silently break it. Reads on Codex are shell-only.

## Capability Matrix (Codex)

Verification status per hook capability. ✅ = confirmed by live-hook run; 📄 = documented (R1), not yet exercised.

| Capability | Status |
|---|---|
| Strict per-event schema validation (invalid output → hook fails, runs unhooked) | ✅ |
| SessionStart — inject `additionalContext` (nested) | ✅ accepted |
| SubagentStart — inject `additionalContext` | 📄 |
| PreToolUse — `permissionDecision:"deny"` + reason (blocks tool) | ✅ exit 0; reason → model |
| PreToolUse — `updatedInput` rewrite (args replaced before exec) | ✅ |
| PreToolUse — `additionalContext` advise (no block) | 📄 |
| PermissionRequest — `decision.behavior` allow/deny | 📄 |
| PostToolUse — inject `additionalContext` (nested) | ✅ accepted |
| PostToolUse — `decision:"block"` | 📄 |
| UserPromptSubmit — inject `additionalContext` | ✅ accepted |
| UserPromptSubmit — `decision:"block"` | 📄 |
| Stop — `decision:"block"` + reason | ✅ block-once; reason → model |
| SubagentStop — `decision:"block"` + reason | 📄 |
| `systemMessage` → user UI warning (not model context) | ✅ |
| PreCompact / PostCompact | ✅ both fire (manual compaction; `trigger:"manual"`) |

---

## Events of Interest (Rosetta)

Rosetta wires hooks for these **5** Codex events; the rest are documented for completeness.

| Rosetta purpose | Codex event |
|---|---|
| Session context injection | `SessionStart` |
| Pre-tool guard (deny / rewrite / advise) | `PreToolUse` |
| Post-tool advisory | `PostToolUse` |
| Subagent end | `SubagentStop` |
| Turn stop | `Stop` |

Codex supports a project hooks file (`.codex/hooks.json`) and an inline `config.toml` equivalent, gated by `[features] hooks = true` — see *Hook Configuration & Locations*.

---

## References

| ID | System | URL |
|---|---|---|
| R1 | OpenAI Codex — Hooks reference | https://developers.openai.com/codex/hooks |

All fields cite **R1** unless a row is marked otherwise.

---

## Hook Configuration & Locations

| Item | Value | Ref |
|---|---|---|
| Project hooks file | `.codex/hooks.json` | R1 |
| Inline equivalent | `[[hooks.<EventName>]]` blocks in `.codex/config.toml` | R1 |
| Feature flag (required) | `[features]` → `hooks = true` in `config.toml` | R1 |
| Managed hooks | `requirements.toml` (`allow_managed_hooks_only`, `[hooks].managed_dir` / `windows_managed_dir`) | R1 |
| Plugin-bundled | manifest `"hooks": "./hooks/hooks.json"` | R1 |
| Trust | each hook trusted per content hash; new/changed hooks reviewed via `/hooks` before running | R1 |

### `hooks.json` registration format (R1)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "path/to/script",
            "commandWindows": "windows-specific command",
            "timeout": 600,
            "statusMessage": "optional UI message"
          }
        ]
      }
    ]
  }
}
```

| Handler field | Type | Notes | Ref |
|---|---|---|---|
| `type` | `"command"` | only command handlers documented | R1 |
| `command` | string | shell command; runs with session `cwd` as working dir | R1 |
| `commandWindows` | string | Windows-specific command override | R1 |
| `timeout` | number (seconds) | default **600** | R1 |
| `statusMessage` | string | optional UI status text | R1 |

Plugin command environment: `PLUGIN_ROOT`, `PLUGIN_DATA` (compatibility aliases `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`). (R1) - revalidate (doc-grounded only; not observed in live logs — plugin-env vars require a plugin-bundled hook)

---

## Hook Events

| Event name (exact) | Matcher filters on | Matcher values | Ref |
|---|---|---|---|
| `SessionStart` | start source | `startup`, `resume`, `clear`, `compact` | R1 |
| `SubagentStart` | agent type | subagent-type values | R1 |
| `PreToolUse` | tool name | `Bash`, `apply_patch` (aliases `Edit`, `Write`), MCP tools (`mcp__…`) | R1 |
| `PermissionRequest` | tool name | `Bash`, `apply_patch` (`Edit`, `Write`), MCP tools | R1 |
| `PostToolUse` | tool name | `Bash`, `apply_patch` (`Edit`, `Write`), MCP tools | R1 |
| `PreCompact` | trigger | `manual`, `auto` | R1 |
| `PostCompact` | trigger | `manual`, `auto` | R1 |
| `UserPromptSubmit` | (unsupported — ignored) | — | R1 |
| `SubagentStop` | agent type | subagent-type values | R1 |
| `Stop` | (unsupported — ignored) | — | R1 |

> **(!) Partial tool interception (R1):** `PreToolUse` / `PostToolUse` intercept **only** `Bash`, `apply_patch` (`Edit`/`Write`), and MCP tools — "This doesn't intercept all shell calls yet, only the simple ones." Other tool paths (e.g. WebSearch) are not intercepted.

---

## Common Input Fields (ALL events)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `session_id` | string | R1 | current session id |
| `transcript_path` | string \| null | R1 | path to session transcript |
| `cwd` | string | R1 | session working directory |
| `hook_event_name` | string | R1 | the firing event name (PascalCase) |
| `model` | string | R1 | active model slug |
| `permission_mode` | string | R1 | permission-mode context (select events) |
| `turn_id` | string | R1 | included on turn-scoped hooks only |

Input is delivered as snake_case JSON on stdin. `tool_input` (where present) is an already-parsed JSON object.

---

## Common Output Fields

Supported by: `SessionStart`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `SubagentStop`, `Stop`. (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `continue` | boolean | R1 | default `true`; `false` marks the hook run as stopped |
| `stopReason` | string | R1 | recorded reason for stopping |
| `systemMessage` | string | R1 | **(!) UX: surfaced as a UI warning** |
| `suppressOutput` | boolean | R1 | parsed but not yet implemented |

For `PreToolUse`, `PostToolUse`, `PermissionRequest`, and `SubagentStart`, these common fields are NOT in the supported set (see each event below). `systemMessage` is separately accepted by `PreToolUse` / `PostToolUse`.

---

## SessionStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | see Common Input Fields |
| `source` | string | R1 | `"startup"` \| `"resume"` \| `"clear"` \| `"compact"` |

### Output (R1)

```json
{ "hookSpecificOutput": { "hookEventName": "SessionStart", "additionalContext": "text" } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.hookEventName` | `"SessionStart"` | R1 | nested |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; added as extra developer context |
| (common output fields) | — | R1 | `continue`, `stopReason`, `systemMessage`, `suppressOutput` supported |

---

## SubagentStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `agent_id` | string | R1 | subagent identifier |
| `agent_type` | string | R1 | subagent type / profile |

### Output (R1)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.hookEventName` | `"SubagentStart"` | R1 | nested |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; added as extra developer context for the subagent |

---

## PreToolUse

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `tool_name` | string | R1 | `Bash`, `apply_patch`, or MCP name |
| `tool_use_id` | string | R1 | tool-call identifier |
| `tool_input` | JSON value | R1 | tool-specific input parameters (parsed object) |

### Output (R1) — choose ONE path

**Deny:**
```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "reason text" } }
```
**Allow + rewrite input:**
```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse", "permissionDecision": "allow", "updatedInput": { "command": "rewritten command" } } }
```
**Add context, no block:**
```json
{ "hookSpecificOutput": { "hookEventName": "PreToolUse", "additionalContext": "context text" } }
```
**Legacy block form:**
```json
{ "decision": "block", "reason": "reason text" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.hookEventName` | `"PreToolUse"` | R1 | nested |
| `hookSpecificOutput.permissionDecision` | `"allow"` \| `"deny"` | R1 | nested; `"ask"` not supported (see below) |
| `hookSpecificOutput.permissionDecisionReason` | string | R1 | nested; **(!) REQUIRED when `permissionDecision` is `"deny"` OR when decision is `"block"`** |
| `hookSpecificOutput.updatedInput` | object | R1 | nested; substitutes tool args. Bash/apply_patch → must include `command`; MCP → full args object |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; add model-visible context without blocking |
| `decision` | `"block"` | R1 | legacy block form (top-level), with `reason` |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`** |
| `systemMessage` | string | R1 | UI warning (supported for PreToolUse) |

> **(!) Parsed but NOT supported for PreToolUse (verbatim, R1):** *"`permissionDecision: "ask"`, legacy `decision: "approve"`, `continue: false`, `stopReason`, and `suppressOutput` are parsed but not supported yet. Codex marks the hook run as failed, reports the error, and continues the tool call."*

### Matcher (R1)

Regex string matched against `tool_name`. Use `"*"`, `""`, or omit to match all. Supported tools: `Bash`, `apply_patch` (aliases `Edit`, `Write`), MCP tools (e.g. `mcp__server__tool`).

---

## PermissionRequest

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `tool_name` | string | R1 | `Bash`, `apply_patch`, MCP |
| `tool_input` | JSON value | R1 | tool arguments |
| `tool_input.description` | string \| null | R1 | human-readable approval reason |

### Output (R1)

```json
{ "hookSpecificOutput": { "hookEventName": "PermissionRequest", "decision": { "behavior": "allow" } } }
```
```json
{ "hookSpecificOutput": { "hookEventName": "PermissionRequest", "decision": { "behavior": "deny", "message": "denial reason" } } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.hookEventName` | `"PermissionRequest"` | R1 | nested |
| `hookSpecificOutput.decision.behavior` | `"allow"` \| `"deny"` | R1 | nested |
| `hookSpecificOutput.decision.message` | string | R1 | **(!) denial reason; provided when `behavior` is `"deny"`** |

> `updatedInput` is NOT supported in PermissionRequest (parsed → hook run marked failed). (R1)

---

## PostToolUse

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `tool_name` | string | R1 | `Bash`, `apply_patch`, MCP |
| `tool_use_id` | string | R1 | tool-call identifier |
| `tool_input` | JSON value | R1 | tool input parameters |
| `tool_response` | JSON value | R1 | tool output / MCP result |

### Output (R1)

```json
{ "decision": "block", "reason": "reason text",
  "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": "context text" } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `decision` | `"block"` | R1 | top-level; does NOT undo the completed command — Codex records the feedback, **replaces the tool result** with it, and continues the model from that message |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`** |
| `continue` | `false` | R1 | top-level; stops normal processing of the original tool result and continues from the feedback/stop text. **(!) Supported on PostToolUse (contrast PreToolUse, where `continue:false` is unsupported and FAILS the hook)** |
| `hookSpecificOutput.hookEventName` | `"PostToolUse"` | R1 | nested |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; added as extra developer context |
| `systemMessage` | string | R1 | UI warning (supported for PostToolUse) |

> **(!) `permissionDecision` is NOT a PostToolUse field.** It is valid only on PreToolUse. Under strict validation, emitting `permissionDecision` in a PostToolUse output invalidates the whole output → the hook runs unhooked.

> **(!) Parsed but NOT supported for PostToolUse (verbatim, R1):** *"`updatedMCPToolOutput` and `suppressOutput` are parsed but not supported yet. Codex marks the hook run as failed, reports the error, and continues normal processing of the tool result."*

> **TODO(validate):** the PostToolUse `decision:"block"` / `continue:false` semantics (replaces result + continues from feedback; does not undo the command) and the "`permissionDecision` invalid on PostToolUse" note above were reconciled to the official OpenAI hooks reference (R1) but not yet re-confirmed by a live-hook run. Re-verify via `docs/hooks/tester.js` and remove this marker.

### Matcher (R1)

Regex on `tool_name`; same supported tools as PreToolUse. `"*"` / `""` / omit = all.

---

## PreCompact / PostCompact

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `trigger` | string | R1 | `"manual"` \| `"auto"` |

### Output (R1)

Common output fields (`continue`, `stopReason`, `systemMessage`, `suppressOutput`). No event-specific `hookSpecificOutput` shape documented.

---

## UserPromptSubmit

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `prompt` | string | R1 | the user prompt about to be sent |

### Output (R1)

```json
{ "hookSpecificOutput": { "hookEventName": "UserPromptSubmit", "additionalContext": "context text" } }
```
or block:
```json
{ "decision": "block", "reason": "blocking reason" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.additionalContext` | string | R1 | nested; added as extra developer context |
| `decision` | `"block"` | R1 | top-level |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`** |
| (common output fields) | — | R1 | supported |

> Matcher is unsupported / ignored for UserPromptSubmit. (R1)

---

## SubagentStop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `agent_id` | string | R1 | subagent identifier |
| `agent_type` | string | R1 | subagent type / profile |
| `agent_transcript_path` | string \| null | R1 | path to subagent transcript |
| `stop_hook_active` | boolean | R1 | whether already continued |
| `last_assistant_message` | string \| null | R1 | latest subagent message |

### Output (R1)

```json
{ "decision": "block", "reason": "continuation reason" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `decision` | `"block"` | R1 | top-level; continues the subagent |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`**; used as continuation reason |
| (common output fields) | — | R1 | supported |

---

## Stop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | |
| `turn_id` | string | R1 | active turn id |
| `stop_hook_active` | boolean | R1 | whether already continued |
| `last_assistant_message` | string \| null | R1 | latest assistant message |

### Output (R1)

```json
{ "decision": "block", "reason": "continuation reason" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `decision` | `"block"` | R1 | top-level; continues the turn |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`**; used as continuation reason |
| (common output fields) | — | R1 | supported |

> Matcher is unsupported / ignored for Stop. (R1)

---

## Exit Codes (all hooks)

| Code | Meaning | Ref |
|---|---|---|
| `0` | Success; continue normal processing (stdout JSON parsed) | R1 |
| `2` | Special per event — reason taken from **stderr**: PreToolUse = block tool call; PostToolUse = block tool result (feedback); UserPromptSubmit = block prompt; SubagentStop = continue subagent; Stop = continue turn | R1 |
| other non-zero | Failure; error reported, normal processing continues | R1 |

Verbatim (R1): PreToolUse — *"You can also use exit code 2 and write the blocking reason to stderr."*; PostToolUse — *"…write the feedback reason to stderr."*; SubagentStop / Stop — *"…write the continuation reason to stderr."*

---

## Appendix — Observed Wire Examples (Codex CLI live-hook run)

Real captures via `docs/hooks/tester.js` → `~/.rosetta/hooks.log`; run folder `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. Single run — illustrative, not exhaustive. Long values trimmed with `…`; no real secrets (planted test data only).

**Full cleaned log:** `docs/hooks/codex-logs.txt` — every hook invocation of the Codex run (one session; old/unrelated sessions removed; all env-var values redacted except the non-secret `CODEX_MANAGED_*` markers). ⚠️ **Do NOT read it whole** — `grep` what you need (e.g. `grep -nE 'hook_event_name|RESULT:|PROCESSOR:' docs/hooks/codex-logs.txt`).

**Raw session transcript:** `docs/hooks/codex-019f0634-transcript.jsonl` (~71 KB) — the full Codex session JSONL (session `019f0634`; original filename `rollout-2026-06-26T19-11-51-019f0634-…jsonl`, still the `transcript_path` recorded in the run log). ⚠️ **Large dump — do NOT read wholesale**; `grep` for what you need.

**Runtime env signature (Codex CLI):** `CODEX_MANAGED_BY_NPM=1`, `CODEX_MANAGED_PACKAGE_ROOT=/opt/homebrew/lib/node_modules/@openai/codex`. No `VSCODE_*`, no `COPILOT_CLI`.

**Tool names observed:** `Bash`. (PreToolUse/PostToolUse intercept `Bash`/`apply_patch`/MCP only.)

**How Codex surfaces hook output in the UI** (activity display — NOT proof of model ingestion): valid output → `<Event> hook (completed)`; deny/block → `<Event> hook (blocked)` + `feedback: <reason>`; nested `additionalContext` → `hook context: <text>`; `systemMessage` → `warning: <text>`.

### Captured INPUT payloads (snake_case; `tool_input` is an object)

```json
// SessionStart — source:"startup", model, permission_mode; no turn_id
{"session_id":"019f0634-…","transcript_path":"…/.codex/sessions/2026/06/26/rollout-…jsonl","cwd":"…/spring-boot-react-mysql","hook_event_name":"SessionStart","model":"gpt-5.5","permission_mode":"default","source":"startup"}
// UserPromptSubmit — adds turn_id + prompt
{"session_id":"019f0634-…","turn_id":"019f061e-…","transcript_path":"…","cwd":"…","hook_event_name":"UserPromptSubmit","model":"gpt-5.5","permission_mode":"default","prompt":"…"}
// PreToolUse — tool_name, tool_input object, tool_use_id
{"session_id":"019f0634-…","turn_id":"…","transcript_path":"…","cwd":"…","hook_event_name":"PreToolUse","model":"gpt-5.5","permission_mode":"default","tool_name":"Bash","tool_input":{"command":"echo rosetta-hook-probe"},"tool_use_id":"call_…"}
// PostToolUse — adds tool_response (string here)
{…,"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"echo rosetta-hook-probe"},"tool_response":"rosetta-hook-probe\n","tool_use_id":"call_…"}
// Stop — stop_hook_active + last_assistant_message; no turn-tool fields
{…,"hook_event_name":"Stop","permission_mode":"default","stop_hook_active":false,"last_assistant_message":"…"}
```

### Emitted OUTPUT that Codex ACCEPTED (valid shapes, exit 0)

```json
// PreToolUse deny — nested ONLY; blocked the tool, reason reached the model
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}
// PreToolUse rewrite — nested allow + updatedInput; command substituted before exec
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","updatedInput":{"command":"echo PRETOOLUSE-HOOK-REWROTE-THIS"}}}
// Stop block — top-level ONLY
{"decision":"block","reason":"…"}
// SessionStart / PostToolUse / UserPromptSubmit context — nested ONLY
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"…"}}
```
