# Antigravity Hooks Contract

Target agent: **Google Antigravity** — one combined adapter (`antigravity`) covering three surfaces: **Antigravity 2.0** (2.3.1), **Antigravity CLI** (1.1.5), **Antigravity IDE** (2.1.1). Google's **Gemini CLI** (deprecated) is out of scope; "Gemini" here is only the config namespace (`~/.gemini/…`).

Status: **VERIFIED / COMPLETE** — contract confirmed identical across all three surfaces. Run evidence (per-surface logs, models, session ids) lives in `hooks-verify.md` + `docs/hooks/agy-{cli,ide,2.0}-logs.txt`; it is NOT restated here.

Ref legend: **R1** general hooks · **R2** IDE hooks · **R3** CLI plugins · **R4** tool vocabulary · **V** empirically verified (all three surfaces).

---

## Practical Conclusions

1. **(!) Strict per-event schema.** Antigravity validates output against the exact documented schema for the event; extra/misplaced fields cause the whole output to be dropped (e.g. `additionalContext`/`hookSpecificOutput` on `PreInvocation` — which documents only `injectSteps` — is ignored). Emit ONLY the documented fields for that event. (V)
2. **(!) The only context-injection channel is `injectSteps.userMessage`** (via `PreInvocation`/`PostInvocation`). It reaches the model as a `<USER_REQUEST>` block and persists. `ephemeralMessage` is transient (visible only within the invocation it is injected, never persisted). `additionalContext` (any placement) is NOT honored. `PreToolUse` `reason` on an `allow` does NOT inject. (V)
3. **(!) `PostToolUse` cannot drive per-tool logic.** Its output is `{}` (ignored — no channel). Its input's `toolCall` is **unreliable** — populated for tool-execution steps, `null` for others — so even when tool identity is present, no advisory/context delivery is possible on `PostToolUse` regardless. (V)
4. **(!) `PreInvocation`/`PostInvocation` carry no tool identity** — they fire per model call, not per tool. `invocationNum` is 0-indexed (session start = 0). (V)
5. **Deny is native** `{decision:"deny", reason}` (NOT Copilot `permissionDecision`, NOT exit-2). `Stop` continuation is `{decision:"continue", reason}`; both deliver `reason` to the model. (V)
6. **Config uses two shapes** — tool events wrap handlers in `{matcher, hooks:[…]}`; non-tool events list handlers flat. See Registration. (R2, V)
7. **Tool `args` field names are PascalCase** (`TargetFile`, `CodeContent`, `CommandLine`, …) — unique to Antigravity; unmapped names silently no-op every hook. (V)

---

## References

| ID | System | URL |
|---|---|---|
| R1 | Antigravity hooks (general) | https://antigravity.google/docs/hooks |
| R2 | Antigravity IDE hooks | https://antigravity.google/docs/ide/hooks |
| R3 | Antigravity CLI plugins — managing hooks | https://antigravity.google/docs/cli/plugins#managing-hooks |
| R4 | Antigravity tool vocabulary | https://antigravity.google/docs/hooks |

---

## Events

| Antigravity event | Ref | Rosetta mapping |
|---|---|---|
| `PreToolUse` | R1,R2,V | `PreToolUse` — gating (deny/ask). |
| `PostToolUse` | R1,R2,V | `PostToolUse` — no tool identity, output ignored (unusable for per-tool logic). |
| `PreInvocation` | R1,R2,V | Session/context injection (`invocationNum:0` = session start). |
| `PostInvocation` | R1,R2,V | Context injection. |
| `Stop` | R1,R2,V | `Stop` — blockable via `decision:"continue"`. |

`SessionStart` is NOT a valid Antigravity event (absent from R1–R3; CLI rewrites a registered `SessionStart` to `null`). Its analog is `PreInvocation` @ `invocationNum:0`. `SubagentStop` — no such hook (subagent *tools* exist; no lifecycle hook).

---

## Hook Configuration & Locations

| Path | Scope | Ref |
|---|---|---|
| `.agents/hooks.json` | Workspace | R1,R2,V |
| `~/.gemini/config/hooks.json` | User | R1,R2 |
| `~/.gemini/antigravity-cli/plugins/<name>/hooks.json` | CLI plugin | R3 |
| `settings.json` | CLI global | R3 |

I/O: JSON via **stdin** → JSON via **stdout**; top-level input fields camelCase. TUI `/hooks` lists loaded hooks (R3).

### Registration — two shapes

**Tool events (`PreToolUse`, `PostToolUse`) — wrapped:**
```json
{ "<name>": { "enabled": true,
  "PreToolUse": [ { "matcher": "run_command|view_file", "hooks": [ { "type": "command", "command": "…", "timeout": 30 } ] } ] } }
```
**Non-tool events (`PreInvocation`, `PostInvocation`, `Stop`) — flat handler list, no `matcher`/`hooks` wrapper (R2: "a list of handlers directly under the event key"):**
```json
{ "<name>": { "PreInvocation": [ { "type": "command", "command": "…", "timeout": 30 } ] } }
```

| Field | Type | Ref | Notes |
|---|---|---|---|
| `<name>.enabled` | boolean | R2 | Group-level; `false` disables. |
| `matcher` | string | R2 | Tool events only; regex/`\|`-alternation/exact/`*`; ignored elsewhere. |
| handler `type` | string | R2 | Only `"command"` documented; default `"command"`. |
| handler `command` | string | R2 | Required. |
| handler `timeout` | integer (s) | R2 | Default `30`. |
| handler `prompt` | string | V | Undocumented; CLI injects `"prompt":""` on load (impl detail, do not author). |

---

## Common Input Fields (all events)

| Field | Type | Ref | Notes |
|---|---|---|---|
| `conversationId` | string (UUID) | R1,R2,V | → canonical `sessionId`. |
| `workspacePaths` | string[] | R1,R2,V | → canonical `cwd` (`[0]`). |
| `transcriptPath` | string (abs) | R1,R2,V | |
| `artifactDirectoryPath` | string (abs) | R1,R2,V | |
| `modelName` | string | V | Present on CLI + 2.0; **absent on IDE** — do not depend on it. |

---

## PreToolUse

**Input:** `toolCall:{name, args}` (Ref R1,R2,V) · `stepIdx` integer (R1,R2,V) · + common.

**Output:**

| Field | Type | Ref | Verified behavior |
|---|---|---|---|
| `decision` | `"allow"\|"deny"\|"ask"\|"force_ask"` | R1,R2,V | `deny` blocks the tool. `ask` prompts user; `force_ask` ignores cached perms. Omit = normal. |
| `reason` | string | R1,R2,V | **On `deny`: delivered to the model verbatim.** On `allow`: NOT injected. |
| `permissionOverrides` | string[] | R1,R2 | Optional grant overrides. |

No `additionalContext` on `PreToolUse` (not honored). (V)

---

## PostToolUse

**Input:** `stepIdx` integer (R1,R2,V) · `error` string optional (R1,R2,V) · `toolCall` — unreliable: populated for tool-execution steps, `null` otherwise (V) · + common.

**Output:** `{}` — no output honored. No `additionalContext`, no `decision`. (R1,R2,V) → unusable for Rosetta regardless of input tool identity. The adapter discards PostToolUse tool identity (harmless: no output channel exists).

---

## PreInvocation

**Input:** `invocationNum` integer (0-indexed; R1,R2,V) · `initialNumSteps` integer (R1,R2,V) · + common. No tool identity.

**Output:**

| Field | Type | Ref | Verified behavior |
|---|---|---|---|
| `injectSteps` | array | R1,R2,V | Only documented output field. Each element = exactly ONE of the keys below. |
| `injectSteps[].userMessage` | string | R1,R2,V | **Reaches the model as `<USER_REQUEST>`; persists.** ✅ |
| `injectSteps[].ephemeralMessage` | string | R1,R2,V | Transient — visible only within the injected invocation, never persisted. ✗ for durable context. |
| `injectSteps[].toolCall` | object | R1,R2 | Inject a tool call (not used by Rosetta). |

---

## PostInvocation

**Input:** `invocationNum` integer (R1,R2,V) · `initialNumSteps` integer (R1,R2,V) · + common. No tool identity.

**Output:**

| Field | Type | Ref | Verified behavior |
|---|---|---|---|
| `injectSteps` | array | R1,R2,V | Same element shape as PreInvocation. `userMessage` ✅ reaches model; `ephemeralMessage` ✗ transient. |
| `terminationBehavior` | `"force_continue"\|"terminate"\|""` | R1,R2 | Loop control (not used by Rosetta). |

---

## Stop

**Input:** `executionNum` integer (R1,R2,V) · `terminationReason` string (R1,R2,V) · `error` string optional (R1,R2) · `fullyIdle` boolean (R1,R2) · + common.

**Output:**

| Field | Type | Ref | Verified behavior |
|---|---|---|---|
| `decision` | `"continue"\|<other>` | R1,R2,V | `"continue"` re-enters the loop; other/omit allows termination. |
| `reason` | string | R1,R2,V | On `continue`: injected as a system message; delivered to the model. |

---

## Tool Vocabulary → SemanticKind

`toolCall.name` → `toolCall.args` (PascalCase field names). Rosetta gates on: `dangerous-actions` = `bash,write,edit,multi-edit,mcp-call`; advisories/`codemap` = `write,edit,multi-edit,patch,create,replace`; `loose-files` = `write`; `read-once` = `read,bash`.

| Tool | SemanticKind | Path field | Content field(s) | Ref |
|---|---|---|---|---|
| `run_command` | `bash` | `Cwd` | `CommandLine` (command) | V |
| `view_file` | `read` | `AbsolutePath` | — | V |
| `write_to_file` | `write`,`create` | `TargetFile` | `CodeContent` | V |
| `replace_file_content` | `edit`,`replace` | `TargetFile` | `ReplacementContent` (new), `TargetContent` (old) | V |
| `multi_replace_file_content` | `multi-edit` | `TargetFile` | `ReplacementChunks[].ReplacementContent` (new), `.TargetContent` (old) | V |
| `mcp__*` | `mcp-call` | — | — | R4 |
| `list_dir`, `find_by_name`, `grep_search`, `search_web`, `read_url_content`, `browser_*`, `invoke_subagent`/`define_subagent`/`manage_subagents`/`send_message`, `manage_task`, `schedule`, `list_permissions`, `ask_permission`, `ask_question`, `generate_image` | null | — | — | R4 |

---

## Exit Codes

Not documented (R1–R3). Effective channel is JSON on stdout; deny works via JSON at exit 0. No exit-2 mechanism required. (V)

---

## Runtime Detection

| Env var | Surface | Ref |
|---|---|---|
| `ANTIGRAVITY_CONVERSATION_ID` | all three (universal signal) | V |
| `ANTIGRAVITY_EDITOR_APP_ROOT` | IDE only | V |

Detection: presence of `ANTIGRAVITY_CONVERSATION_ID` ⇒ `antigravity`. Shape fallback: top-level `conversationId` + `workspacePaths` + (`toolCall`|`invocationNum`|`executionNum`).

---

## Adapter Mapping (canonical model)

- `sessionId` ← `conversationId` · `cwd` ← `workspacePaths[0]` (or `toolCall.args.Cwd` for `run_command`) · `toolName` ← `toolCall.name` · `toolInput` ← `toolCall.args` (extract per Tool Vocabulary; **scan `CodeContent`/`ReplacementContent`/`ReplacementChunks[].ReplacementContent` for dangerous content**).
- `deny` → `{decision:"deny", reason}` (PreToolUse). `Stop` block → `{decision:"continue", reason}`.
- Context/advise (session-level) → `PreInvocation` `{injectSteps:[{userMessage}]}` at `invocationNum:0`. `advise`/`side-effect`/`null` on PostToolUse → no stdout (no channel).
- One combined adapter; the three surfaces share one contract → input normalization only, no output merge needed.
