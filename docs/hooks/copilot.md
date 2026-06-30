# Copilot Hooks Contract

Target agent: **GitHub Copilot** (VS Code IDE + GitHub Copilot CLI)

Status: **COMPLETE — empirically verified (Runs 1–8, VS Code + Copilot CLI) and approved 2026-06-26**

---

## Practical Conclusions — Using Hooks In Both Runtimes (empirical, 4 runs 2026-06-26)

Derived from real captures: **VS Code Copilot** (gpt-5.4) and **Copilot CLI** (Sonnet 4.6). Applies to the runtimes/versions tested — not generalized further. Verbatim captures: see Appendix.

1. **Register PascalCase keys only** (`SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`). VS Code fires ONLY PascalCase (single-fire). Copilot CLI fires BOTH conventions if both are registered ⇒ **double-fire** per event; its PascalCase fire works fine. PascalCase-only serves both and avoids the double-fire. Use `Stop`, not `agentStop`.
2. **Parse both input shapes.** PascalCase keys deliver **snake_case** (`tool_name`, `tool_input` = object, `session_id`, `timestamp` = ISO string, `hook_event_name`). CLI camelCase keys deliver **camelCase** (`toolName`, `toolArgs` = **JSON string → parse**, `toolResult` = object, `sessionId`, `timestamp` = **number ms**). Normalize: `tool_name ?? toolName`; args = `tool_input` else `JSON.parse(toolArgs)`; `session_id ?? sessionId`.
3. **Tool-result field varies** — `toolResult`{resultType,textResultForLlm} (CLI camel) / `tool_result`{result_type,text_result_for_llm} (CLI snake) / `tool_response` = **string** (VS Code). Handle all three.
4. **Inject `additionalContext` at BOTH placements.** VS Code reads **nested** `hookSpecificOutput.additionalContext`; CLI reads **top-level** `additionalContext`. Each ignores the other harmlessly. Plain-text stdout does NOT inject — must be JSON.
5. **Deny works in both via JSON + exit 0.** PreToolUse `permissionDecision:"deny"` + `permissionDecisionReason` (emitted top-level AND nested) blocked the tool in both runtimes, the reason reached the model, and the model continued. Exit code 2 was NOT needed/tested.
6. **Matchers: self-guard inside the hook.** Tool names differ by runtime (`bash`/`Bash`/`run_in_terminal`/`view`/`read_file`/`glob`/`Glob`…). Per R2, VS Code ignores matcher values. Gate in code, not via matcher. File path lives at `tool_input.filePath` (VS Code `read_file`), `tool_input.command` (terminal), or parsed `toolArgs` (CLI).
7. **Runtime detection:** env `COPILOT_CLI=1` ⇒ CLI; env `VSCODE_*` ⇒ VS Code.
8. **Arg/result rewrite:** PreToolUse `modifiedArgs`/`updatedInput` (rewrite tool args before execution) works in **both** runtimes. PostToolUse `modifiedResult` (replace the result the model sees) works in **CLI only** (VS Code ignores it).
9. **PostToolUse `additionalContext`:** reaches the model in **both** — VS Code via **nested** (`hookSpecificOutput.additionalContext`, delivered wrapped in a `<PostToolUse-context>` block), CLI via **top-level**. Emit both placements (same rule as SessionStart). Note: the model may NOT volunteer PostToolUse-injected context under a generic prompt — it is present; ask directly. `systemMessage` is user-facing only (shown in the IDE, not model context).
10. **Compaction:** only **`PreCompact` fires, CLI only** (both key casings; fields `trigger`, `custom_instructions`/`customInstructions`). No `PostCompact` observed anywhere; VS Code fires no compaction hook. Any compaction-time guard is therefore CLI-only and pre-compaction-only.

**Empirical capability matrix (Runs 1–6):**

| Behavior | VS Code | Copilot CLI |
|---|---|---|
| Keys fired | PascalCase only (single-fire) | both (double-fire) |
| SessionStart `additionalContext` | nested only | top-level only |
| PostToolUse `additionalContext` | **nested** (✓, `<PostToolUse-context>`) | top-level |
| PreToolUse `deny` + reason | ✓ | ✓ |
| PreToolUse `modifiedArgs`/`updatedInput` | ✓ | ✓ |
| PostToolUse `modifiedResult` | ✗ | ✓ |
| Stop `decision:"block"` (once) | ✓ | ✓ |
| Compaction hook | ✗ none | `PreCompact` only (no PostCompact) |
| Exit code used | 0 (JSON) | 0 (JSON) |

**Confirmed firing:** `SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop` (both runtimes); `agentStop` + camelCase keys + `sessionEnd` (CLI only; `sessionEnd` on exit). **Not observed/tested:** `PreCompact`, `SubagentStart`, `UserPromptSubmit`, `errorOccurred`, `notification`, etc.; Stop/SubagentStop/PostToolUse *block* outputs; exit-code-2 path; `source` values other than `"new"`; `reason` values other than `"user_exit"`.

> **Observed column legend** (added to tables below): ✓**VC** = captured in VS Code (gpt-5.4); ✓**CLI-c** = CLI camelCase fire; ✓**CLI-s** = CLI/PascalCase snake_case fire; **—** = not observed in our runs (NOT a claim it is absent). Values are real captures (2026-06-26).

---

## References

| ID | System | URL / Path |
|---|---|---|
| R1 | GitHub Copilot CLI hooks reference | https://docs.github.com/en/copilot/reference/hooks-reference |
| R2 | VS Code agent customization hooks | https://code.visualstudio.com/docs/agent-customization/hooks |
| R3 | VS Code hooks reference | https://code.visualstudio.com/docs/agents/reference/hooks-reference |
| R4 | VS Code Copilot extension (internal) | `/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/copilot/assets/prompts/skills/agent-customization/references/hooks.md` |

---

## Hook Locations (R4)

| Path | Scope |
|---|---|
| `.github/hooks/*.json` | Workspace (team-shared) |
| `.claude/settings.local.json` | Workspace local (not committed) |
| `.claude/settings.json` | Workspace |
| `~/.claude/settings.json` | User profile |

---

## Hook Events

| Event name (exact) | Source | Trigger | Observed firing |
|---|---|---|---|
| `SessionStart` | R4 | First prompt of a new agent session | ✓ VC + CLI-s |
| `sessionStart` | R1 | New or resumed session begins | ✓ CLI-c |
| `UserPromptSubmit` | R4 | User submits a prompt | — |
| `PreToolUse` | R4 | Before tool invocation | ✓ VC + CLI-s |
| `preToolUse` | R1 | Before tool executes | ✓ CLI-c |
| `PostToolUse` | R4 | After successful tool invocation | ✓ VC + CLI-s |
| `postToolUse` | R1 | Tool completes successfully | ✓ CLI-c |
| `Stop` | R4 | Agent session ends | ✓ VC + CLI-s |
| `agentStop` | R1 | Main agent finishes turn | ✓ CLI-c |
| `SubagentStop` | R4 | Subagent ends | ✓ VC + CLI-s |
| `subagentStop` | R1 | Subagent completes | ✓ CLI-c |
| `sessionEnd` | R1 | Session terminates | ✓ CLI-c (on exit, `reason:"user_exit"`) |
| `PreCompact` | R4 | Before context compaction | ✓ CLI (both casings; `trigger`+`custom_instructions`); ✗ VC |
| `SubagentStart` | R4 | Subagent starts | — |

> No `PostCompact`/`postCompact` fired in either runtime (registered as candidates; never invoked) — CLI has a **pre-compaction hook only**.

Events used by Rosetta hooks: `SessionStart`/`sessionStart`, `PreToolUse`/`preToolUse`, `PostToolUse`/`postToolUse`, `Stop`/`agentStop`, `SubagentStop`/`subagentStop`, `sessionEnd`.

---

## Common Output Fields (ALL hook events)

| Field | Type | Ref | (!) Notes |
|---|---|---|---|
| `continue` | boolean | R4 | `false` = halt processing |
| `stopReason` | string | R4 | shown to user when `continue: false` |
| `systemMessage` | string | R4 | **(!) UX: displayed to the USER (IDE warning) regardless of all other output — always visible. NOT embedded into the model's context** — empirically (Run 7) Copilot SHOWED `systemMessage` in the IDE but the model never had it in context. User-facing only; do NOT use it to pass guidance to the model (use `additionalContext`). |

---

## SessionStart / sessionStart

### Input

| Field | Type | Required | Ref | Notes | Observed |
|---|---|---|---|---|---|
| `sessionId` | string | yes | R1 | camelCase shape | ✓ CLI-c |
| `session_id` | string | yes | R3 | snake_case / VS Code shape | ✓ VC + CLI-s |
| `timestamp` | number (unix ms) | yes | R1 | camelCase shape | ✓ CLI-c (e.g. `1782496829229`) |
| `timestamp` | string (ISO 8601) | yes | R3 | snake_case shape; same key, different type | ✓ VC + CLI-s (e.g. `"2026-06-26T18:18:04.865Z"`) |
| `cwd` | string | yes | R1, R3 | | ✓ all |
| `source` | `"startup"\|"resume"\|"new"` | yes | R1 | R3 documents `source`; NOT always `"new"` (R4 has no SessionStart input schema) | ✓ `"new"` (fresh) and `"resume"` (resumed CLI session) observed |
| `initialPrompt` | string | no | R1 | camelCase | ✓ CLI-c |
| `initial_prompt` | string | no | R1 | snake_case | ✓ CLI-s (absent in VC) |
| `hook_event_name` | `"SessionStart"` | yes | R3 | absent in R1 camelCase shape | ✓ VC + CLI-s |
| `model` | string | — | obs | **(!) Observed VS Code only; not in R1–R4 docs** | ✓ VC (`"gpt-5.4"`); absent in CLI |
| `transcript_path` | string | — | obs | Observed in VS Code SessionStart (snake_case) | ✓ VC |

### Output

| Field | Type | Ref | Notes | Observed |
|---|---|---|---|---|
| `additionalContext` | string | R1 | top-level (R1/CLI form; not in R3/R4 output schema) | ✓ **CLI** reaches model context (top-level honored); **VC** ignored top-level |
| `hookSpecificOutput.hookEventName` | `"SessionStart"` | R3 | nested | (emitted; not separately verified) |
| `hookSpecificOutput.additionalContext` | string | R3 | nested; same content as top-level field | ✓ **VC** reaches model context (nested honored); **CLI** ignored nested |

**Merged emit:** `additionalContext` at top-level (R1) AND inside `hookSpecificOutput` (R3). **Empirically required:** VC honors nested only, CLI honors top-level only — emit BOTH. Confirmed: only JSON injects (plain stdout does not).

---

## sessionEnd

### Input

| Field | Type | Required | Ref | Notes | Observed |
|---|---|---|---|---|---|
| `sessionId` | string | yes | R1 | | ✓ CLI-c |
| `timestamp` | number (unix ms) | yes | R1 | | ✓ CLI-c (e.g. `1782496767646`) |
| `cwd` | string | yes | R1 | | ✓ CLI-c |
| `reason` | `"complete"\|"error"\|"abort"\|"timeout"\|"user_exit"` | yes | R1 | | ✓ CLI-c — only `"user_exit"` seen |

> sessionEnd observed firing in **Copilot CLI only** (camelCase `sessionEnd`), at session exit. Not observed in VS Code.

### Output

**Notification only — no output processed. (R1)**

---

## Stop (R4) / agentStop (R1)

Two SEPARATE events, documented exactly as each manufacturer defines — no merging. `Stop` is a standard VS Code event (R4); `agentStop` is a Copilot-CLI event (R1). Empirically: VS Code fires `Stop` (snake_case); Copilot CLI fires both `Stop` (snake_case) and `agentStop` (camelCase).

### Input

| Field | Type | Required | Ref | Notes | Observed |
|---|---|---|---|---|---|
| `sessionId` | string | yes | R1 | camelCase | ✓ CLI-c (`agentStop`) |
| `session_id` | string | yes | R3 | snake_case | ✓ VC + CLI-s (`Stop`) |
| `timestamp` | number / string | yes | R1, R3 | | ✓ number (CLI-c) / ISO (VC + CLI-s) |
| `cwd` | string | yes | R1 | | ✓ all |
| `transcriptPath` | string | yes | R1 | camelCase | ✓ CLI-c (empty or real path) |
| `transcript_path` | string | yes | R3 | snake_case | ✓ VC + CLI-s |
| `stopReason` | `"end_turn"` | yes | R1 | camelCase | ✓ CLI-c (`"end_turn"`) |
| `stop_reason` | `"end_turn"` | yes | R3 | snake_case | ✓ **CLI-s** (`"end_turn"`); **absent in VC `Stop`** |
| `hook_event_name` | `"Stop"` | yes | R3 | R4 event name | ✓ VC + CLI-s |
| `stop_hook_active` | boolean | yes | R3 | whether agent continues from previous stop hook invocation | ✓ **VC** (`false`); **absent in CLI** captures |

### Output

| Field | Type | Ref | Notes | Observed |
|---|---|---|---|---|
| `decision` | `"block"\|"allow"` | R1 | top-level; omit = allow | ✓ **BOTH** — `"block"` halted the turn-stop; model received the reason and continued |
| `reason` | string | R1 | top-level; **(!) REQUIRED when `decision` is `"block"`**; used as next prompt | ✓ **BOTH** — reason reached the model verbatim |
| `hookSpecificOutput.hookEventName` | `"Stop"` | R3 | nested | (emitted) |
| `hookSpecificOutput.decision` | `"block"` | R3 | nested | ✓ emitted alongside top-level (cannot attribute which placement) |
| `hookSpecificOutput.reason` | string | R3 | nested; **(!) REQUIRED when `decision` is `"block"`** | ✓ emitted alongside top-level |

> Block tested **once-per-session** (atomic marker) to prevent loops — confirmed: 1st stop blocked, 2nd allowed.

**Merged emit:** top-level `decision`/`reason` (R1) AND `hookSpecificOutput.decision`/`reason` (R3).

---

## SubagentStop / subagentStop

### Input

| Field | Type | Required | Ref | Notes | Observed |
|---|---|---|---|---|---|
| `sessionId` | string | yes | R1 | camelCase | ✓ CLI-c (`subagentStop`) |
| `session_id` | string | yes | R3 | snake_case | ✓ VC + CLI-s |
| `timestamp` | number / string | yes | R1, R3 | | ✓ number (CLI-c) / ISO (VC + CLI-s) |
| `cwd` | string | yes | R1 | | ✓ all |
| `agentName` | string | yes | R1 | camelCase | ✓ CLI-c (`"explore"`) |
| `agent_name` | string | yes | R3 | snake_case | ✓ **CLI-s** (`"explore"`); **absent in VC** |
| `agentDisplayName` | string | no | R1 | camelCase | ✓ CLI-c (`"Explore Agent"`) |
| `agent_display_name` | string | no | R3 | snake_case | ✓ **CLI-s** (`"Explore Agent"`); **absent in VC** |
| `stopReason` | `"end_turn"` | yes | R1 | camelCase | ✓ CLI-c (`"end_turn"`) |
| `stop_reason` | `"end_turn"` | yes | R3 | snake_case | ✓ **CLI-s**; **absent in VC** |
| `hook_event_name` | `"SubagentStop"` | yes | R3 | | ✓ VC + CLI-s |
| `agent_id` | string | yes | R3 | VS Code only | ✓ **VC** (`"call_…"`); **absent in CLI** |
| `agent_type` | string | yes | R3 | VS Code only | ✓ **VC** (`"Explore"`); **absent in CLI** |
| `stop_hook_active` | boolean | yes | R3 | | ✓ **VC** (`false`); absent in CLI |
| `transcriptPath` / `transcript_path` | string | yes | R1 | | ✓ all (CLI: `~/.copilot/session-state/<id>/events.jsonl`) |

### Output

| Field | Type | Ref | Notes |
|---|---|---|---|
| `decision` | `"block"\|"allow"` | R1, R3 | top-level; omit = allow |
| `reason` | string | R1, R3 | top-level; **(!) REQUIRED when `decision` is `"block"`** |

**Note:** R3 SubagentStop output is top-level only — no `hookSpecificOutput` wrapper.

---

## PreToolUse / preToolUse

### Input

| Field | Type | Required | Ref | Notes | Observed |
|---|---|---|---|---|---|
| `sessionId` | string | yes | R1 | camelCase | ✓ CLI-c |
| `session_id` | string | yes | R3 | snake_case | ✓ VC + CLI-s |
| `timestamp` | number / string | yes | R1, R3 | | ✓ number (CLI-c) / ISO (VC + CLI-s) |
| `cwd` | string | yes | R1 | | ✓ all |
| `toolName` | string | yes | R1 | camelCase; matched against optional matcher | ✓ CLI-c (`"bash"`,`"glob"`,`"view"`,`"task"` — lowercase) |
| `tool_name` | string | yes | R3 | snake_case | ✓ CLI-s (`"Bash"`,`"Glob"`,`"Agent"`); ✓ VC (`"run_in_terminal"`,`"list_dir"`,`"read_file"`,`"runSubagent"`) |
| `toolArgs` | string (JSON) | yes | R1 | **(!) JSON string — must be parsed, NOT an object** | ✓ CLI-c (confirmed JSON string) |
| `tool_input` | object | yes | R3 | already parsed object | ✓ VC + CLI-s (object); VC `read_file` uses `tool_input.filePath`+`startLine`/`endLine` |
| `tool_use_id` | string | yes | R3 | absent in R1 | ✓ **VC** (`"call_…__vscode-…"`); **absent in CLI** captures |
| `hook_event_name` | `"PreToolUse"` | yes | R3 | absent in R1 camelCase shape | ✓ VC + CLI-s |
| `transcript_path` | string | — | obs | observed in VC PreToolUse (not in original R-tables) | ✓ VC |

### Output

| Field | Type | Ref | Notes | Observed |
|---|---|---|---|---|
| `permissionDecision` | `"allow"\|"deny"\|"ask"` | R1 | top-level; omit = normal flow; cloud agent: `"ask"` → treated as `"deny"` | ✓ `"deny"` **blocked the tool in BOTH VC + CLI** (emitted top-level + nested, exit 0) |
| `permissionDecisionReason` | string | R1 | top-level; **(!) REQUIRED when `permissionDecision` is `"deny"`** | ✓ reason **reached the model** in both; model quoted it and continued |
| `modifiedArgs` | object | R1 | top-level; substitutes tool arguments | ✓ **BOTH** — rewrote the command before execution (emitted with `updatedInput`) |
| `hookSpecificOutput.hookEventName` | `"PreToolUse"` | R3 | nested | — not separately verified |
| `hookSpecificOutput.permissionDecision` | `"allow"\|"deny"\|"ask"` | R3, R4 | nested | ✓ emitted alongside top-level; deny worked (cannot attribute to which placement) |
| `hookSpecificOutput.permissionDecisionReason` | string | R3 | nested; **(!) REQUIRED when `permissionDecision` is `"deny"`** | ✓ emitted alongside top-level |
| `hookSpecificOutput.updatedInput` | object | R3 | nested; VS Code equivalent of `modifiedArgs` | ✓ **BOTH** — emitted alongside `modifiedArgs`; rewrite took effect |
| `hookSpecificOutput.additionalContext` | string | R3 | nested; extra context for model | — (additionalContext only tested via SessionStart, not PreToolUse) |

**Merged emit:** top-level fields (R1) AND `hookSpecificOutput.*` (R3) — both sets emitted simultaneously.  
**Fail-closed (R1):** crash / non-zero exit / timeout = deny. (Not documented in R4.)

### Matcher (R1)

Pattern applied to `toolName` / `tool_name`. Format: `^(?:PATTERN)$` where PATTERN is the matcher content. (Not documented in R4.) **(!) R2: VS Code IGNORES matcher values — hooks fire on ALL tool invocations; gate inside the hook, not via matcher.**  
Omit matcher = fires on all tools.  
Claude Code matchers: `*` / `**` / empty = all; `|`-separated literals = alternation; other = case-sensitive regex.

---

## PostToolUse / postToolUse

### Input

| Field | Type | Required | Ref | Notes | Observed |
|---|---|---|---|---|---|
| `sessionId` | string | yes | R1 | camelCase | ✓ CLI-c |
| `session_id` | string | yes | R3 | snake_case | ✓ VC + CLI-s |
| `timestamp` | number / string | yes | R1, R3 | | ✓ number (CLI-c) / ISO (VC + CLI-s) |
| `cwd` | string | yes | R1 | | ✓ all |
| `toolName` | string | yes | R1 | camelCase | ✓ CLI-c (`"bash"`,`"glob"`,`"task"`) |
| `tool_name` | string | yes | R3 | snake_case | ✓ CLI-s (`"Bash"`,`"Glob"`,`"Agent"`); VC (`"run_in_terminal"`,`"list_dir"`,`"runSubagent"`) |
| `toolArgs` | string (JSON) | yes | R1 | **(!) JSON string — must be parsed** | ✓ CLI-c |
| `tool_input` | object | yes | R3 | already parsed | ✓ VC + CLI-s |
| `toolResult` | object `{resultType: "success", textResultForLlm: string}` | yes | R1 | | ✓ CLI-c (object) |
| `tool_result` | object `{result_type, text_result_for_llm}` | — | obs | **(!) Copilot CLI snake_case** — NOT in original R-tables; differs from VC `tool_response` | ✓ CLI-s (object) |
| `tool_response` | string | yes | R3 | plain string, not object | ✓ **VC** (string, e.g. `"rosetta-hook-probe\n…"`); CLI snake uses `tool_result` instead |
| `tool_use_id` | string | yes | R3 | absent in R1 | ✓ VC; absent in CLI captures |
| `hook_event_name` | `"PostToolUse"` | yes | R3 | absent in R1 camelCase shape | ✓ VC + CLI-s |

### Output

| Field | Type | Ref | Notes | Observed |
|---|---|---|---|---|
| `modifiedResult.resultType` | `"success"` | R1 | **(!) REQUIRED when `modifiedResult` present** | ✓ **CLI** (rewrote result model saw); ✗ **VC** ignored |
| `modifiedResult.textResultForLlm` | string | R1 | **(!) REQUIRED when `modifiedResult` present**; replaces tool result seen by model | ✓ **CLI** (`POSTTOOLUSE-HOOK-REWROTE-RESULT` reached model); ✗ VC |
| `additionalContext` | string | R1 | top-level; appended after tool result; max 10 KB across all hooks joined | ✓ **CLI** reaches model as "Additional guidance from postToolUse hooks" (`PTU-TOPLEVEL-*`, Run 8); ✗ **VC** top-level not reached (VC uses nested) |
| `decision` | `"block"` | R3, R4 | top-level; halts further processing | — not tested |
| `reason` | string | R3 | top-level; **(!) REQUIRED when `decision` is `"block"`** | — not tested |
| `hookSpecificOutput.hookEventName` | `"PostToolUse"` | R3 | nested | (emitted) |
| `hookSpecificOutput.additionalContext` | string | R3 | nested; injected into conversation | ✓ **VC reaches model** (wrapped `<PostToolUse-context>`; confirmed on direct ask, Run 7); CLI used top-level instead |

**Merged emit:** top-level `additionalContext` (R1) AND `hookSpecificOutput.additionalContext` (R3).  
**For block:** top-level `decision`/`reason` (R3, R4). No R1 equivalent for blocking on PostToolUse — R1 uses exit code 2.

### Matcher (R1)

Pattern: `^(?:PATTERN)$` on `toolName`. Omit = all tools.

---

## PreCompact / preCompact

Fires **before context compaction**. Observed in **Copilot CLI only** (both capitalizations → double-fire); NOT observed in VS Code. No `PostCompact`/`postCompact` fired anywhere (no post-compaction hook observed).

### Input

| Field | Type | Ref | Notes | Observed |
|---|---|---|---|---|
| `sessionId` | string | obs | camelCase fire | ✓ CLI-c |
| `session_id` | string | obs | snake_case fire | ✓ CLI-s |
| `timestamp` | number / string | obs | number (camel) / ISO (snake) | ✓ CLI |
| `cwd` | string | obs | | ✓ CLI |
| `transcriptPath` / `transcript_path` | string | obs | `~/.copilot/session-state/<id>/events.jsonl` | ✓ CLI |
| `hook_event_name` | `"PreCompact"` | obs | snake_case fire only | ✓ CLI-s |
| `trigger` | string | obs | what triggered compaction; only `"manual"` observed | ✓ CLI (`"manual"`) |
| `customInstructions` / `custom_instructions` | string | obs | compaction custom instructions; empty in capture | ✓ CLI (empty) |

Verbatim capture (snake_case fire): `{"hook_event_name":"PreCompact","session_id":"8abb87fa-…","timestamp":"2026-06-26T19:08:38.601Z","cwd":"…","transcript_path":"…/events.jsonl","trigger":"manual","custom_instructions":""}`

### Output

Not tested (registered dump-only). Whether `PreCompact` can emit `additionalContext` is UNVERIFIED.

---

## Exit Codes (all hooks)

| Code | Meaning | Ref | Observed |
|---|---|---|---|
| `0` | Success; stdout parsed as JSON | R1, R4 | ✓ used throughout; deny via JSON at exit 0 blocked tools in both runtimes |
| `2` | Blocking error (PreToolUse: deny; PostToolUse: warning or deny — context-dependent) | R1, R4 | — not tested (JSON deny at exit 0 sufficed) |
| other non-zero | Non-blocking warning; execution continues | R4 | — not tested |

---

**Open items:** see `docs/hooks-verify.md` — Open Items OI-1, OI-2, OI-3.

---

## Appendix — Observed Wire Examples (empirical captures, 2026-06-26)

Real captures via `docs/hooks/tester.js` → `~/.rosetta/hooks.log`. Run folder for all captures: `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql` (`cwd`/paths below reflect that). Both example sets use the SAME per-capitalization config + probe prompt: **VS Code Copilot** examples are from session `f46082a6…` (gpt-5.4); **Copilot CLI** examples from session `8abb87fa…` (Sonnet 4.6). These are single-run captures — illustrative, not exhaustive. Long values are trimmed with `…`; structurally important keys are verbatim. No real secrets are shown (payloads carry only session ids, paths, and planted test data).

**Full captured logs (cleaned exports of `~/.rosetta/hooks.log`):**
- `docs/hooks/vs-copilot-logs.txt` — every VS Code Copilot hook invocation (sessions `e946202d`, `f46082a6`).
- `docs/hooks/copilot-cli-logs.txt` — every Copilot CLI hook invocation (sessions `8abb87fa`, `41b6a7e4`).

**Raw session transcripts** (the `transcript_path` captures). ⚠️ **Large JSONL dumps — do NOT read wholesale; `grep` what you need:**
- `docs/hooks/e946202d-1afd-4ae7-9876-b7cfd1b60a6c.jsonl` (~18 KB) — VS Code session `e946202d`.
- `docs/hooks/f46082a6-3b68-4dd7-8073-ac1cff42344d.jsonl` (~29 KB) — VS Code session `f46082a6`.
- `docs/hooks/copilot-cli-8abb87fa-events.jsonl` (~321 KB) — Copilot CLI session `8abb87fa` session-state events (originally `events.jsonl`).

⚠️ **These are LARGE files — do NOT read them whole.** Each hook invocation is one multi-line block (full env included; secret values redacted to first-5-chars + `[…REDACTED]`). **First read the top ~100 lines to learn the block structure**, then `grep`/search for what you need rather than loading the file — e.g. `grep -nE 'hook_event_name|INVOCATION:|RESULT:' <file>`, `grep -n 'PreCompact' <file>`, or `grep -A40 '===== hook invocation' <file>`. Read by line ranges; never dump the whole file into context.

### Runtime detection — env signatures

The hook receives the full user shell env; values omitted (may contain secrets). The runtime-identifying vars:

| Runtime | Identifying env vars (verbatim) |
|---|---|
| **Copilot CLI** | `COPILOT_CLI=1`, `COPILOT_CLI_BINARY_VERSION=1.0.65`, `COPILOT_LOADER_PID=<pid>`, `COPILOT_PROJECT_DIR=/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. No `VSCODE_*`. |
| **VS Code Copilot** | `VSCODE_PID`, `VSCODE_CWD`, `VSCODE_IPC_HOOK`, `VSCODE_NLS_CONFIG`, `VSCODE_ESM_ENTRYPOINT`, `VSCODE_CODE_CACHE_PATH`, `VSCODE_CRASH_REPORTER_PROCESS_TYPE`, `VSCODE_HANDLES_UNCAUGHT_ERRORS`, `VSCODE_L10N_BUNDLE_LOCATION`, `COPILOT_OTEL_FILE_EXPORTER_PATH`. No `COPILOT_CLI`. |

### Tool names (differ by runtime AND key convention — matchers must account for this)

| Source | Tool names observed |
|---|---|
| Copilot CLI — camelCase fires | `bash`, `glob`, `view`, `task` (lowercase) |
| Copilot CLI — PascalCase fires | `Bash`, `Glob`, `Agent` (capitalized) |
| VS Code — (snake_case) | `run_in_terminal`, `list_dir`, `read_file`, `runSubagent` |

### Double-fire (Copilot CLI)

When both capitalizations are registered, Copilot CLI fires EACH event **twice** — once for the camelCase key (camelCase/R1 payload) and once for the PascalCase key (snake_case/R3 payload). VS Code fired each event once (PascalCase key, snake_case payload).

### Shape A — camelCase payload (Copilot CLI, camelCase keys → R1)

```json
// sessionStart
{"sessionId":"8abb87fa-4187-49e0-ba62-ded536d9ba99","timestamp":1782496829229,"cwd":"…/spring-boot-react-mysql","source":"new","initialPrompt":"…(full pasted prompt)…"}
// preToolUse — toolArgs is a JSON STRING (must be parsed)
{"sessionId":"8abb87fa-…","timestamp":1782496844181,"cwd":"…","toolName":"bash","toolArgs":"{\"command\":\"echo rosetta-hook-probe\",\"description\":\"Step 1: echo command\"}"}
// postToolUse — toolResult is an OBJECT
{"sessionId":"8abb87fa-…","timestamp":1782496844466,"cwd":"…","toolName":"bash","toolArgs":"{…}","toolResult":{"resultType":"success","textResultForLlm":"rosetta-hook-probe\n<shellId: 0 completed with exit code 0>"}}
// agentStop
{"timestamp":1782496851101,"cwd":"…","sessionId":"8abb87fa-…","transcriptPath":"","stopReason":"end_turn"}
// subagentStop — has agentName / agentDisplayName
{"timestamp":1782496851232,"cwd":"…","sessionId":"8abb87fa-…","transcriptPath":"/Users/isolomatov/.copilot/session-state/8abb87fa-…/events.jsonl","agentName":"explore","agentDisplayName":"Explore Agent","stopReason":"end_turn"}
// sessionEnd — camelCase only; fires on exit
{"sessionId":"41b6a7e4-…","timestamp":1782496767646,"cwd":"…","reason":"user_exit"}
```

### Shape B — snake_case payload (PascalCase keys → R3)

```json
// SessionStart (Copilot CLI) — note initial_prompt; CLI has NO `model` field
{"hook_event_name":"SessionStart","session_id":"8abb87fa-…","timestamp":"2026-06-26T18:00:29.229Z","cwd":"…","source":"new","initial_prompt":"…(full pasted prompt)…"}
// SessionStart (VS Code) — note `model` present, no initial_prompt
{"timestamp":"2026-06-26T18:18:04.865Z","hook_event_name":"SessionStart","session_id":"f46082a6-…","transcript_path":"…/transcripts/f46082a6-….jsonl","source":"new","model":"gpt-5.4","cwd":"…"}
// PreToolUse (Copilot CLI) — tool_input is an OBJECT, tool_name "Bash"
{"hook_event_name":"PreToolUse","session_id":"8abb87fa-…","timestamp":"2026-06-26T18:00:44.330Z","cwd":"…","tool_name":"Bash","tool_input":{"command":"echo rosetta-hook-probe","description":"Step 1: echo command"}}
// PreToolUse (VS Code) — tool_name "run_in_terminal", has tool_use_id
{"timestamp":"2026-06-26T18:18:13.407Z","hook_event_name":"PreToolUse","session_id":"f46082a6-…","transcript_path":"…/transcripts/f46082a6-….jsonl","tool_name":"run_in_terminal","tool_input":{"command":"echo rosetta-hook-probe","explanation":"…","goal":"…","mode":"sync"},"tool_use_id":"call_…__vscode-…","cwd":"…"}
// PreToolUse (VS Code) — read_file = the Mode C deny target; note `filePath` (camelCase) INSIDE snake_case tool_input, plus startLine/endLine
{"timestamp":"2026-06-26T18:18:26.881Z","hook_event_name":"PreToolUse","session_id":"f46082a6-…","transcript_path":"…/transcripts/f46082a6-….jsonl","tool_name":"read_file","tool_input":{"filePath":"…/docs/hooks/HOOK-DENY-PROBE.txt","startLine":1,"endLine":50},"tool_use_id":"call_…__vscode-…","cwd":"…"}
// PostToolUse (Copilot CLI) — result field is `tool_result` OBJECT {result_type, text_result_for_llm}
{"hook_event_name":"PostToolUse","session_id":"8abb87fa-…","timestamp":"…","cwd":"…","tool_name":"Bash","tool_input":{…},"tool_result":{"result_type":"success","text_result_for_llm":"rosetta-hook-probe\n<shellId: 0 completed with exit code 0>"}}
// PostToolUse (VS Code) — result field is `tool_response` STRING (NOT tool_result object)
{…,"tool_name":"run_in_terminal","tool_input":{…},"tool_response":"rosetta-hook-probe\nisolomatov@C19430 spring-boot-react-mysql % ","tool_use_id":"call_…","cwd":"…"}
// Stop (Copilot CLI) — has stop_reason
{"hook_event_name":"Stop","session_id":"8abb87fa-…","timestamp":"…","cwd":"…","transcript_path":"…/.copilot/session-state/…/events.jsonl","stop_reason":"end_turn"}
// Stop (VS Code) — has stop_hook_active, NO stop_reason
{"hook_event_name":"Stop","session_id":"f46082a6-…","timestamp":"…","cwd":"…","transcript_path":"…","stop_hook_active":false}
// SubagentStop (Copilot CLI) — agent_name / agent_display_name / stop_reason
{"hook_event_name":"SubagentStop","session_id":"8abb87fa-…","timestamp":"…","cwd":"…","transcript_path":"…/events.jsonl","agent_name":"explore","agent_display_name":"Explore Agent","stop_reason":"end_turn"}
// SubagentStop (VS Code) — agent_id / agent_type / stop_hook_active (NO agent_name/stop_reason)
{"hook_event_name":"SubagentStop","session_id":"f46082a6-…","timestamp":"…","cwd":"…","agent_id":"call_…","agent_type":"Explore","stop_hook_active":false}
```

### Field-shape differences worth noting

- `timestamp`: camelCase shape = **unix ms number** (`1782496829229`); snake_case shape = **ISO string** (`"2026-06-26T18:00:29.229Z"`).
- PostToolUse result: CLI snake_case uses **`tool_result` object**; VS Code snake_case uses **`tool_response` string**. (Same `hook_event_name`, different field + type.)
- SubagentStop identity: CLI uses **`agent_name`/`agent_display_name`**; VS Code uses **`agent_id`/`agent_type`**.
- `SessionStart`: VS Code includes **`model`**; CLI does not (CLI snake_case carries `initial_prompt`).
