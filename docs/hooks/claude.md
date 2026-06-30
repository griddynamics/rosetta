# Claude Code Hooks Contract

Target agent: **Claude Code (Anthropic)** — CLI + IDE extensions + claude.ai/code (shared `settings.json` hook config).

Exact input/output contract for Claude Code lifecycle hooks. Facts only, sourced from Anthropic.

**Status: DRAFT (doc-grounded hypothesis — NOT yet empirically verified).** Grounded in the Anthropic Claude Code hooks reference (R1). The `Observed` columns and the Capability Matrix `✅` marks are filled only after the live-hook run (`docs/hooks/claude/hooks.json` + `tester.js` → `~/.rosetta/hooks.log`). The hook protocol is **model-independent** — one run verifies the contract; the model does not change it.

---

## Practical Conclusions (Claude Code)

Findings NOT obvious from the per-event tables below:

1. **(!) Claude Code is the CANONICAL format for Rosetta.** Its wire JSON *is* `CanonicalOutput`; the Rosetta adapter (`src/hooks/src/adapters/claude-code.ts`) is identity pass-through — every other IDE adapter normalizes TO this shape. There is no field renaming, no nesting/un-nesting.
2. **(!) Two independent block mechanisms — pick ONE per hook, never both.** (a) **Exit 0 + JSON** structured control (`permissionDecision:"deny"` / `decision:"block"` / `continue:false`); JSON is parsed only on exit 0. (b) **Exit code 2** — a first-class, *primary* blocking mechanism (Claude Code's original signalling path): stdout/JSON is ignored, **stderr is fed to Claude as the reason**. Per R1: *"You must choose one approach per hook, not both."* Rosetta uses path (a) (exit 0 + JSON) → Rosetta deny for Claude Code = exit 0. **Exit 1 is a non-blocking error — the action proceeds.**
   - **(!) PostToolUse cannot block** via either path's "block" — the tool already ran; exit 2 / `decision:"block"` there only feeds stderr/reason back to Claude as context.
3. **(!) `systemMessage` is a USER-facing warning, NOT model context.** Put model-visible text in `additionalContext`; text placed only in `systemMessage` never enters the model's context.
4. **(!) `continue:false` overrides everything and `stopReason` is USER-only.** `continue:false` takes precedence over any event-specific decision field and stops Claude entirely; its companion `stopReason` is shown to the user, NOT to Claude.
5. **JSON is parsed only on exit 0.** On exit 0, stdout that is valid JSON is parsed as the output contract; stdout that is NOT valid JSON is treated as plain-text context. On exit 2, stdout is ignored entirely.

---

## Capability Matrix (Claude Code)

Verification status per capability. ✅ = confirmed by live-hook run; 📄 = documented (R1), not yet exercised. **All 📄 pending the DRAFT live-hook run.**

| Capability | Status |
|---|---|
| Identity pass-through (canonical = wire) | 📄 |
| SessionStart — inject `additionalContext` (nested) | 📄 |
| PreToolUse — `permissionDecision:"deny"` + reason (blocks tool) | 📄 |
| PreToolUse — `permissionDecision:"allow"` / `"ask"` / `"defer"` | 📄 |
| PreToolUse — `updatedInput` rewrite (args replaced before exec) | 📄 |
| PreToolUse — `additionalContext` advise (no block) | 📄 |
| PostToolUse — inject `additionalContext` (nested) | 📄 |
| PostToolUse — `decision:"block"` + reason | 📄 |
| PostToolUse — `updatedToolOutput` rewrite | 📄 |
| Stop — `decision:"block"` + reason (continue turn) | 📄 |
| SubagentStop — `decision:"block"` + reason (continue subagent) | 📄 |
| PreCompact — block via exit 2 / `continue:false` | 📄 |
| PostCompact — fires (side-effect only, cannot block) | 📄 |
| `systemMessage` → user UI warning (not model context) | 📄 |
| `continue:false` + `stopReason` (stops Claude; reason user-only) | 📄 |
| Exit 2 = first-class block, reason from stderr (PostToolUse cannot block) | 📄 |
| Strict schema validation (extra/misplaced field fails the hook)? | ❓ unknown — NOT documented; **do NOT assume** (Codex-only behavior). To probe. |

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
| `permission_mode` | string | R1 | `default`\|`plan`\|`acceptEdits`\|`auto`\|`dontAsk`\|`bypassPermissions`; not present on all events |
| `effort` | `{ level: string }` | R1 | `low`\|`medium`\|`high`\|`xhigh`\|`max`; only tool-use-context events (PreToolUse/PostToolUse/Stop/SubagentStop) and when the model supports effort |
| `agent_id` | string | R1 | optional; present only inside subagents |
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
| (common input fields) | — | R1 | `permission_mode` present |
| `source` | string | R1 | `"startup"` \| `"resume"` \| `"clear"` \| `"compact"` |
| `model` | string | R1 | optional; active model slug |

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
| (common input fields) | — | R1 | `effort` may be present |
| `tool_name` | string | R1 | e.g. `Bash`, `Edit`, `Write`, `Read`, `mcp__…` |
| `tool_input` | object | R1 | tool-specific input parameters (parsed object) |

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
| (common input fields) | — | R1 | `effort` may be present |
| `tool_name` | string | R1 | |
| `tool_input` | object | R1 | |
| `tool_response` | object \| string | R1 | tool output. **(verify in live run — fetch was inconclusive between `tool_response` and `tool_result`; canonical Rosetta/Codex use `tool_response`)** |

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
| (common input fields) | — | R1 | `effort` may be present |
| `agent_type` | string | R1 | subagent type / name |
| `stop_hook_active` | boolean | R1 | whether already continued **(verify in live run)** |
| `last_assistant_message` | string | R1 | latest subagent message **(verify in live run)** |

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
| (common input fields) | — | R1 | `effort` may be present |
| `output` | string | R1 | assistant's response. **(verify in live run; `stop_hook_active`/`last_assistant_message` may also be present)** |

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
| (common input fields) | — | R1 | |
| `trigger` | string | R1 | `"manual"` \| `"auto"` — what triggered compaction. **(verify in live run; compaction-specific fields not fully documented)** |

### Output (R1)

Blocks via **exit 2** OR JSON `{ "continue": false, "stopReason": "…" }`.

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
| (common input fields) | — | R1 | |
| `trigger` | string | R1 | `"manual"` \| `"auto"` **(verify in live run)** |

### Output (R1)

> **No decision control** — PostCompact cannot block; used for side effects (e.g. logging). No `hookSpecificOutput` / `decision` support documented. (R1)

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

## Appendix — Observed Wire Examples (live-hook run)

*Pending — to be filled after the Claude Code live-hook run (`docs/hooks/claude/hooks.json` + `tester.js` → `~/.rosetta/hooks.log`). Captured INPUT payloads, ACCEPTED OUTPUT shapes, runtime env signature, and tool names observed go here, mirroring `codex.md`'s appendix. Until then this spec is **DRAFT**.*
