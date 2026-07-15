# Claude Code Hooks Contract

Target agent: **Claude Code (Anthropic)** — CLI + IDE extensions + claude.ai/code (shared `settings.json` hook config).

Exact input/output contract for Claude Code lifecycle hooks. Facts only, sourced from Anthropic.

**Status: COMPLETE** — grounded in the Anthropic Claude Code hooks reference (R1) AND empirically verified by a live-hook run (Claude Code IDE, 2026-06-29; incl. manual `/compact` exercising `PreCompact`/`PostCompact`), approved 2026-06-29. The hook protocol is **model-independent** — verified behaviors are contract facts, not model quirks. Capabilities still marked 📄 in the matrix are documented-but-not-exercised (optional follow-up, non-blocking).

---

## Practical Conclusions (Claude Code)

Findings NOT obvious from the per-event tables below:

1. **(!) Claude Code is the CANONICAL format for Rosetta.** Its wire JSON *is* `CanonicalOutput`; the Rosetta adapter (`src/hooks/src/adapters/claude-code.ts`) is identity pass-through — every other IDE adapter normalizes TO this shape. There is no field renaming, no nesting/un-nesting.
2. **(!) Two independent block mechanisms — pick ONE per hook, never both.** (a) **Exit 0 + JSON** structured control (`permissionDecision:"deny"` / `decision:"block"` / `continue:false`); JSON is parsed only on exit 0. (b) **Exit code 2** — a first-class, *primary* blocking mechanism (Claude Code's original signalling path): stdout/JSON is ignored, **stderr is fed to Claude as the reason**. Per R1: *"You must choose one approach per hook, not both."* Rosetta uses path (a) (exit 0 + JSON) → Rosetta deny for Claude Code = exit 0. **Exit 1 is a non-blocking error — the action proceeds.**
   - **(!) PostToolUse cannot block** via either path's "block" — the tool already ran; exit 2 / `decision:"block"` there only feeds stderr/reason back to Claude as context.
3. **(!) `systemMessage` is a USER-facing warning, NOT model context.** Put model-visible text in `additionalContext`; text placed only in `systemMessage` never enters the model's context.
4. **(!) `continue:false` overrides everything and `stopReason` is USER-only.** `continue:false` takes precedence over any event-specific decision field and stops Claude entirely; its companion `stopReason` is shown to the user, NOT to Claude.
5. **JSON is parsed only on exit 0.** On exit 0, stdout that is valid JSON is parsed as the output contract; stdout that is NOT valid JSON is treated as plain-text context. On exit 2, stdout is ignored entirely.
6. **(!) Validation is LENIENT.** Unknown/extra fields (top-level AND nested inside `hookSpecificOutput`) are silently IGNORED; the valid documented fields are still honored. A stray-field output still injects its `additionalContext`. Emit only documented fields — extras do nothing.

---

## Capability Matrix (Claude Code)

Verification status per capability. ✅ = confirmed by live-hook run (Run 1); 📄 = documented (R1), not yet exercised.

| Capability | Status |
|---|---|
| Identity pass-through (canonical = wire; nested deny/rewrite + top-level Stop accepted) | ✅ |
| SessionStart — inject `additionalContext` (nested) | ✅ reaches model (CC-SS-CLEAN) |
| PreToolUse — `permissionDecision:"deny"` + reason (blocks tool) | ✅ exit 0; blocked Read; reason → model |
| PreToolUse — `permissionDecision:"allow"` / `"ask"` / `"defer"` | 📄 (`allow` exercised via rewrite) |
| PreToolUse — `updatedInput` rewrite (args replaced before exec) | ✅ `echo` rewritten before exec |
| PreToolUse — `additionalContext` advise (no block) | 📄 |
| PostToolUse — inject `additionalContext` (nested) | ✅ reaches model + subagent (CC-PTU-NEST) |
| PostToolUse — `decision:"block"` + reason | 📄 |
| PostToolUse — `updatedToolOutput` rewrite | 📄 |
| Stop — `decision:"block"` + reason (continue turn) | ✅ block-once; reason → model |
| SubagentStop — fires; input shape captured | ✅ (block output 📄) |
| PreCompact — fires; input shape captured (`trigger`, `custom_instructions`) | ✅ fired (manual `/compact`); block output 📄 |
| PostCompact — fires; input carries `compact_summary` | ✅ fired; side-effect only |
| `systemMessage` → user UI warning (not model context) | 📄 |
| `continue:false` + `stopReason` (stops Claude; reason user-only) | 📄 |
| Exit 2 = first-class block, reason from stderr (PostToolUse cannot block) | 📄 (Rosetta uses exit 0) |
| **Strict schema validation?** → **NO — LENIENT.** Extra/misplaced fields ignored, valid parts honored | ✅ confirmed |

---

## Events of Interest (Rosetta)

Rosetta wires hooks for these **5** Claude Code events; the rest are documented for completeness in *Hook Events* below.

| Rosetta purpose | Claude Code event |
|---|---|
| Session context injection | `SessionStart` |
| Pre-tool guard (deny / rewrite / advise) | `PreToolUse` |
| Post-tool advisory | `PostToolUse` |
| Subagent end | `SubagentStop` |
| Turn stop | `Stop` |
| Before / after compaction | `PreCompact` / `PostCompact` |

---

## References

| ID | System | URL |
|---|---|---|
| R1 | Anthropic — Claude Code Hooks reference | https://code.claude.com/docs/en/hooks |

`docs.anthropic.com/en/docs/claude-code/hooks` 301-redirects to R1. All fields cite **R1** unless a row is marked otherwise.

---

## Hook Configuration & Locations

| Item | Value | Ref |
|---|---|---|
| Project hooks | `.claude/settings.json` (`hooks` key) | R1 |
| Project-local hooks | `.claude/settings.local.json` | R1 |
| User hooks | `~/.claude/settings.json` | R1 |
| Plugin-bundled | plugin `hooks/hooks.json` | R1 |
| Disable all | `"disableAllHooks": true` | R1 |
| Path placeholders (also env vars) | `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` | R1 |

### `settings.json` registration format (R1)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/script.sh",
            "if": "Bash(rm *)",
            "timeout": 5,
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
| `type` | `"command"` \| `"http"` \| `"mcp_tool"` \| `"prompt"` \| `"agent"` | Rosetta uses `command` | R1 |
| `command` | string | shell command / executable | R1 |
| `args` | string[] | optional; present → exec form, omitted → shell form | R1 |
| `if` | string | optional permission rule (e.g. `Bash(rm *)`) | R1 |
| `timeout` | number (seconds) | optional | R1 |
| `statusMessage` | string | optional UI status text | R1 |
| `once` | boolean | optional; skills/agents only | R1 |
| `async` / `asyncRewake` | boolean | optional; background run (`asyncRewake` wakes on exit 2) | R1 |
| `shell` | `"bash"` \| `"powershell"` | optional | R1 |

---

## Hook Events

Claude Code documents ~30 events (R1). The **matcher field** is what the per-event `matcher` regex is tested against. Rosetta target events are marked ★.

| Event name (exact) | Matcher filters on | Matcher values | Ref |
|---|---|---|---|
| ★ `SessionStart` | session source | `startup`, `resume`, `clear`, `compact` | R1 |
| ★ `PreToolUse` | tool name | `Bash`, `Edit`, `Write`, `Read`, `mcp__…`, … | R1 |
| ★ `PostToolUse` | tool name | (as PreToolUse) | R1 |
| ★ `SubagentStop` | agent type | `general-purpose`, `Explore`, `Plan`, custom names | R1 |
| ★ `Stop` | (no matcher — always fires) | — | R1 |
| ★ `PreCompact` / `PostCompact` | compaction trigger | `manual`, `auto` | R1 |
| `SessionEnd` | exit reason | `clear`, `resume`, `logout`, `prompt_input_exit`, … | R1 |
| `UserPromptSubmit` | (no matcher) | — | R1 |
| `SubagentStart` | agent type | (as SubagentStop) | R1 |
| `PostToolUseFailure` | tool name | (as PreToolUse) | R1 |
| `PermissionRequest` / `PermissionDenied` | tool name | (as PreToolUse) | R1 |
| `Notification` | notification type | `permission_prompt`, `auth_success`, `elicitation_dialog`, … | R1 |
| `PostToolBatch` | (no matcher) | — | R1 |
| `Setup`, `UserPromptExpansion`, `StopFailure`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`, `CwdChanged`, `FileChanged`, `ConfigChange`, `InstructionsLoaded`, `WorktreeCreate`, `WorktreeRemove`, `MessageDisplay`, `Elicitation`, `ElicitationResult` | (see R1) | — | R1 |

### Matcher pattern rules (R1)

| Pattern | Evaluation |
|---|---|
| `"*"`, `""`, omitted | match all |
| only `[a-zA-Z0-9_ ,\|]` | exact string or list (separated by `\|` or `,`), e.g. `"Edit\|Write"`, `"Edit, Write"` |
| any other character present | JavaScript regex, e.g. `"^Notebook"`, `"mcp__memory__.*"` |

---

## Common Input Fields (ALL events)

Delivered as snake_case JSON on stdin (command hooks). `tool_input` (where present) is an already-parsed JSON object.

| Field | Type | Ref | Notes |
|---|---|---|---|
| `session_id` | string | R1 | current session id |
| `transcript_path` | string | R1 | path to session transcript |
| `cwd` | string | R1 | session working directory |
| `hook_event_name` | string | R1 | the firing event name (PascalCase) |
| `permission_mode` | string | R1 | `default`\|`plan`\|`acceptEdits`\|`auto`\|`dontAsk`\|`bypassPermissions`. **Observed: present on PreToolUse/PostToolUse/Stop/SubagentStop; ABSENT on SessionStart (Run 1).** |
| `effort` | `{ level: string }` | R1 | `low`\|`medium`\|`high`\|`xhigh`\|`max`. **Observed present on PreToolUse/PostToolUse/Stop/SubagentStop (Run 1).** |
| `agent_id` | string | R1 | optional; present inside subagents. **Observed on SubagentStop (Run 1).** |
| `agent_type` | string | R1 | optional; present with `--agent` or inside subagents |

---

## Common Output Fields

Returned on **exit 0** as JSON on stdout (valid JSON → parsed as contract; non-JSON → plain-text context).

| Field | Type | Ref | Notes |
|---|---|---|---|
| `continue` | boolean | R1 | default `true`; `false` stops Claude entirely. **(!) Takes precedence over event-specific decision fields.** |
| `stopReason` | string | R1 | **(!) UX: shown to the USER when `continue:false`; NOT shown to Claude.** |
| `suppressOutput` | boolean | R1 | default `false`; hides stdout from transcript (still in debug log) |
| `systemMessage` | string | R1 | **(!) UX: warning shown to the USER; NOT model context.** |
| `terminalSequence` | string | R1 | terminal escape sequence (OSC `0`/`1`/`2`/`9`/`99`/`777` and BEL only) |
| `decision` | `"block"` | R1 | top-level; only value is `"block"`. Used by `UserPromptSubmit`, `UserPromptExpansion`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Stop`, `SubagentStop`, `ConfigChange`, `PreCompact` |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`**; explanation for the block |
| `hookSpecificOutput.hookEventName` | string | R1 | **REQUIRED whenever `hookSpecificOutput` is used** |

---

## SessionStart

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | **Observed: `permission_mode` ABSENT here (Run 1)** |
| `source` | string | R1 | `"startup"` \| `"resume"` \| `"clear"` \| `"compact"`. Observed `"startup"`. |
| `model` | string | R1 | active model slug. Observed `"claude-opus-4-8[1m]"`. |

### Output (R1)

```json
{ "hookSpecificOutput": { "hookEventName": "SessionStart", "additionalContext": "text" } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.hookEventName` | `"SessionStart"` | R1 | nested; required |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; added to Claude's context before the first prompt |
| `hookSpecificOutput.sessionTitle` | string | R1 | sets session title (same as `/rename`); applies only when `source` is `"startup"`/`"resume"` |
| `hookSpecificOutput.initialUserMessage` | string | R1 | first user message in non-interactive mode (`-p`); creates the turn |
| `hookSpecificOutput.watchPaths` | string[] | R1 | absolute paths to watch for `FileChanged` |
| `hookSpecificOutput.reloadSkills` | boolean | R1 | `true` → re-scan skill/command dirs after SessionStart hooks |
| (common output fields) | — | R1 | supported |

> Rosetta uses only nested `additionalContext` here. There is **no** top-level `additionalContext` for Claude Code (unlike Copilot CLI) — do NOT emit one.

---

## PreToolUse

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | `permission_mode` + `effort` observed |
| `tool_name` | string | R1 | e.g. `Bash`, `Edit`, `Write`, `Read`, `mcp__…`. Observed `Read`, `Bash`. |
| `tool_input` | object | R1 | tool-specific input parameters (parsed object). Bash also carries `description`. |
| `tool_use_id` | string | R1 | **Observed (Run 1)**; tool-call identifier (`toolu_…`) |

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

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.hookEventName` | `"PreToolUse"` | R1 | nested; required |
| `hookSpecificOutput.permissionDecision` | `"allow"` \| `"deny"` \| `"ask"` \| `"defer"` | R1 | `allow`=auto-approve; `deny`=block; `ask`=escalate to dialog; `defer`=normal flow |
| `hookSpecificOutput.permissionDecisionReason` | string | R1 | **(!) REQUIRED only when `permissionDecision` is `"deny"`**; optional otherwise |
| `hookSpecificOutput.updatedInput` | object | R1 | nested, directly under `hookSpecificOutput`; replaces tool args before execution |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; model-visible context without blocking |
| (common output fields) | — | R1 | supported |

---

## PostToolUse

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | `permission_mode` + `effort` observed |
| `tool_name` | string | R1 | Observed `Bash` |
| `tool_input` | object | R1 | parsed object; Bash carries `command` + `description` |
| `tool_response` | object \| string | R1 | **RESOLVED (Run 1): field name is `tool_response`** (NOT `tool_result`). Bash → object `{stdout, stderr, interrupted, isImage, noOutputExpected}`. |
| `tool_use_id` | string | R1 | **Observed (Run 1)** (`toolu_…`) |
| `duration_ms` | number | R1 | **Observed (Run 1)**; tool execution time |

### Output (R1)

```json
{ "hookSpecificOutput": { "hookEventName": "PostToolUse", "additionalContext": "context text" } }
```
or block:
```json
{ "decision": "block", "reason": "reason text" }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `hookSpecificOutput.hookEventName` | `"PostToolUse"` | R1 | nested; required |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; added as extra context |
| `hookSpecificOutput.updatedToolOutput` | object \| string | R1 | nested; replaces the tool result |
| `decision` | `"block"` | R1 | top-level; blocks/feeds back the tool result |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`** |
| (common output fields) | — | R1 | supported |

---

## SubagentStop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | `permission_mode` + `effort` observed |
| `agent_id` | string | R1 | **Observed (Run 1)**; subagent identifier |
| `agent_type` | string | R1 | subagent type / name. Observed `"general-purpose"`. |
| `stop_hook_active` | boolean | R1 | **Confirmed (Run 1)**; whether already continued |
| `agent_transcript_path` | string | R1 | **Observed (Run 1)**; path to subagent transcript |
| `last_assistant_message` | string | R1 | **Confirmed (Run 1)**; latest subagent message |
| `background_tasks` / `session_crons` | array | R1 | **Observed (Run 1)** |

### Output (R1)

```json
{ "decision": "block", "reason": "continuation reason",
  "hookSpecificOutput": { "hookEventName": "SubagentStop", "additionalContext": "context text" } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `decision` | `"block"` | R1 | top-level; prevents the subagent from stopping (continues it) |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`**; continuation reason |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; non-error feedback that continues without blocking |
| (common output fields) | — | R1 | supported |

---

## Stop

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | `permission_mode` + `effort` observed |
| `stop_hook_active` | boolean | R1 | **RESOLVED (Run 1)**; whether already continued |
| `last_assistant_message` | string | R1 | **RESOLVED (Run 1): Stop input carries `last_assistant_message`, NOT `output`** (the doc-fetch's `output` was a paraphrase) |
| `background_tasks` / `session_crons` | array | R1 | **Observed (Run 1)** |

### Output (R1)

```json
{ "decision": "block", "reason": "continuation reason",
  "hookSpecificOutput": { "hookEventName": "Stop", "additionalContext": "context text" } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `decision` | `"block"` | R1 | top-level; prevents Claude from stopping (continues the turn) |
| `reason` | string | R1 | **(!) REQUIRED when `decision` is `"block"`**; continuation reason |
| `hookSpecificOutput.additionalContext` | string | R1 | nested; non-error feedback that continues without blocking |
| (common output fields) | — | R1 | supported |

> Stop has **no matcher** — always fires. (R1)

---

## PreCompact

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | **Observed: NO `permission_mode`, NO `turn_id` (Run 1)** |
| `trigger` | string | R1 | **Confirmed (Run 1): `"manual"`** \| `"auto"` |
| `custom_instructions` | string \| null | R1 | **Observed (Run 1): `null`**; user compaction instructions |

### Output (R1)

Blocks via **exit 2** OR JSON `{ "continue": false, "stopReason": "…" }`. (Run 1 let compaction proceed — block path not exercised.)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `continue` | `false` | R1 | blocks compaction |
| `stopReason` | string | R1 | user-facing reason |
| `decision` | `"block"` | R1 | **(verify in live run — R1 fetch conflicted: common-output table lists PreCompact under `decision`, but the decision-control reference shows `continue:false` for PreCompact)** |

> PreCompact CAN block (exit 2 blocks compaction). (R1)

---

## PostCompact

### Input

| Field | Type | Ref | Notes |
|---|---|---|---|
| (common input fields) | — | R1 | **Observed: NO `permission_mode`/`turn_id` (Run 1)** |
| `trigger` | string | R1 | **Confirmed (Run 1): `"manual"`** \| `"auto"` |
| `compact_summary` | string | R1 | **Observed (Run 1): the full post-compaction summary text** (the `<analysis>…</analysis><summary>…</summary>` block) |

### Output (R1)

> **No decision control** — PostCompact cannot block; used for side effects (e.g. logging). No `hookSpecificOutput` / `decision` support documented. (R1) **Confirmed Run 1: fired, completed successfully, no effect on the session.**

---

## Exit Codes (all hooks)

Two signalling paths; **choose ONE per hook, never both** (R1). JSON is processed only on exit 0; exit 2 ignores stdout and feeds **stderr** to Claude.

| Code | Meaning | Ref |
|---|---|---|
| `0` | Success. stdout: valid JSON → parsed as the output contract; non-JSON → plain-text context. stderr → debug log only. **JSON output is processed only on exit 0.** | R1 |
| `2` | **Blocking error (first-class / primary mechanism).** stdout **ignored** (JSON not parsed); **stderr fed to Claude** as the reason. Effect is per-event (table below). | R1 |
| `1` / other non-zero | Non-blocking error. Action **proceeds**. stdout → debug log; stderr first line shown as `<hook name> hook error`. | R1 |

### Exit-2 behavior per event (R1)

| Event | Can block? | What happens on exit 2 |
|---|---|---|
| `PreToolUse` | Yes | Blocks the tool call |
| `PermissionRequest` | Yes | Denies the permission |
| `UserPromptSubmit` | Yes | Blocks prompt processing and erases the prompt |
| `UserPromptExpansion` | Yes | Blocks the expansion |
| `Stop` | Yes | Prevents Claude from stopping, continues the conversation |
| `SubagentStop` | Yes | Prevents the subagent from stopping |
| `PostToolBatch` | Yes | Stops the agentic loop before the next model call |
| `PreCompact` | Yes | Blocks compaction |
| **`PostToolUse`** | **No** | **Shows stderr to Claude (tool already ran)** |
| `PostToolUseFailure` | No | Shows stderr to Claude (tool already failed) |
| `StopFailure` | No | Output and exit code are ignored |

---

## Appendix — Observed Wire Examples (Claude Code live-hook Run 1)

Real captures via `docs/hooks/tester.js` → `~/.rosetta/hooks.log`; test repo `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`; model `claude-opus-4-8[1m]`; `permission_mode:"auto"`. Long values trimmed with `…`; planted test data only (no real secrets). Per-run narrative in `docs/hooks-verify-run-logs.md`.

**Events that fired (Run 1):** `SessionStart` (×2 entries), `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`, plus `PreCompact`/`PostCompact` (manual `/compact`). Tool interception is TOTAL: PreToolUse fired on both `Read` and `Bash`.

### Captured INPUT payloads (snake_case; `tool_input`/`tool_response` are objects)

```json
// SessionStart — source + model; NO permission_mode
{"session_id":"6bd73c2b-…","transcript_path":"…/6bd73c2b-….jsonl","cwd":"…/spring-boot-react-mysql","hook_event_name":"SessionStart","source":"startup","model":"claude-opus-4-8[1m]"}
// PreToolUse — permission_mode + effort, tool_input object, tool_use_id (deny target = Read)
{…,"permission_mode":"auto","effort":{"level":"high"},"hook_event_name":"PreToolUse","tool_name":"Read","tool_input":{"file_path":"…/docs/hooks/HOOK-DENY-PROBE.txt"},"tool_use_id":"toolu_…"}
// PostToolUse — tool_response is an OBJECT for Bash; adds tool_use_id + duration_ms
{…,"permission_mode":"auto","effort":{"level":"high"},"hook_event_name":"PostToolUse","tool_name":"Bash","tool_input":{"command":"echo rosetta-hook-probe","description":"…"},"tool_response":{"stdout":"rosetta-hook-probe","stderr":"","interrupted":false,"isImage":false,"noOutputExpected":false},"tool_use_id":"toolu_…","duration_ms":258}
// Stop — stop_hook_active + last_assistant_message (NOT "output"); background_tasks/session_crons
{…,"permission_mode":"auto","effort":{"level":"high"},"hook_event_name":"Stop","stop_hook_active":false,"last_assistant_message":"…","background_tasks":[],"session_crons":[]}
// SubagentStop — agent_id/agent_type/agent_transcript_path/last_assistant_message
{…,"permission_mode":"auto","agent_id":"a1cba4a1…","agent_type":"general-purpose","effort":{"level":"high"},"hook_event_name":"SubagentStop","stop_hook_active":false,"agent_transcript_path":"…/subagents/agent-….jsonl","last_assistant_message":"CCP4","background_tasks":[…],"session_crons":[]}
```

### Emitted OUTPUT that Claude Code ACCEPTED (exit 0)

```json
// SessionStart context — nested ONLY; reached the model
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…"}}
// SessionStart with extra fields — ACCEPTED; additionalContext honored, stray top-level + nested fields IGNORED (lenient)
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"…","strayNestedField":"…"},"strayTopLevelField":"…"}
// PreToolUse deny — nested ONLY; blocked the Read, reason reached the model
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"…"}}
// PreToolUse rewrite — nested allow + updatedInput; command ran rewritten
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","updatedInput":{"command":"echo PRETOOLUSE-HOOK-REWROTE-THIS"}}}
// PostToolUse context — nested ONLY; reached the main model AND the subagent
{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"…"}}
// Stop block — top-level ONLY; blocked once, then allowed
{"decision":"block","reason":"…"}
```

### Compaction inputs (manual `/compact`, Run 1)

```json
// PreCompact — trigger + custom_instructions; NO permission_mode / turn_id
{"session_id":"6bd73c2b-…","transcript_path":"…","cwd":"…/spring-boot-react-mysql","hook_event_name":"PreCompact","trigger":"manual","custom_instructions":null}
// PostCompact — trigger + compact_summary (full <analysis>/<summary> text, trimmed here)
{"session_id":"6bd73c2b-…","transcript_path":"…","cwd":"…","hook_event_name":"PostCompact","trigger":"manual","compact_summary":"<analysis>…</analysis><summary>…</summary>"}
```

### Runtime env signature (Claude Code IDE, Run 1)

Hook processes inherit the **full shell environment** (`PATH`, `HOME`, `JAVA_HOME`, `SSH_AUTH_SOCK`, `TERM`, `LANG`, `PWD`, …). On top of that, Claude Code injects this distinctive set (the detection signature):

| Var | Value (Run 1) | Note |
|---|---|---|
| `AI_AGENT` | `claude-code_2-1-195_harness` | **carries the agent + version (2.1.195)** |
| `CLAUDECODE` | `1` | present iff running under Claude Code |
| `CLAUDE_CODE_ENTRYPOINT` | `cli` | entrypoint |
| `CLAUDE_CODE_SESSION_ID` | `6bd73c2b-…` | matches input `session_id` |
| `CLAUDE_CODE_CHILD_SESSION` | `1` | observed `=1` on every hook process this run (main + subagent) |
| `CLAUDE_EFFORT` | `high` | mirrors input `effort.level` |
| `CLAUDE_PROJECT_DIR` | repo root | also the `${CLAUDE_PROJECT_DIR}` placeholder |
| `CLAUDE_ENV_FILE` | `…/.claude/session-env/<sid>/sessionstart-hook-N.sh` | **per-SessionStart-hook env script — a SessionStart hook can export env (one file per registered SessionStart hook, `-0`, `-1`, …)** |

> `CLAUDE_CODE_EXECPATH` / `CLAUDE_CODE_DISABLE_AUTO_MEMORY` not observed this run — do not rely on them.

### How Claude Code surfaces hook output in the UI (NOT proof of model ingestion)

Compaction hooks show in the `/compact` activity line as `PreCompact […] completed successfully` / `PostCompact […] completed successfully`. Deny / Stop block reasons surface to the model. (UI display is not proof of model ingestion.)

### Full log excerpt

`docs/hooks/claude-logs.txt` — cleaned hook-invocation excerpt of this run (full env shown). ⚠️ **Do NOT read wholesale** — `grep` what you need (e.g. `grep -nE 'hook_event_name|RESULT:|=' docs/hooks/claude-logs.txt`). Cleaning/redaction methodology: see `docs/hooks-verify.md`.
