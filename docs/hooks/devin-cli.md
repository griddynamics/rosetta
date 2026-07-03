# Devin CLI (`.devin/hooks.v1.json`) Hooks Contract

> # ℹ️ DEVIN CLI ONLY — NOT Devin Desktop.
> This documents the **Devin CLI** (terminal agent) hooks file **`.devin/hooks.v1.json`** (Claude-Code-style format, **no `"hooks"` wrapper** — see below). **Devin Desktop / Cascade does NOT read this file** — verified: `.devin/hooks.v1.json` produced **0 hook invocations** in Devin Desktop in **both** the no-wrapper and the `"hooks"`-wrapper variants (2026-06-29/30). Devin Desktop uses the **flat Cascade** schema at `.devin/hooks.json` → **[`windsurf.md`](./windsurf.md)**.

Target agent: **Devin CLI** (terminal agent). NOT Devin Desktop/Cascade.

Status: **DRAFT — NOT VALIDATED.** Doc-grounded only (Devin CLI hooks reference R1, R2); the Devin CLI itself has **not** been live-tested — left non-validated by decision. Separately CONFIRMED live: Devin **Desktop** does **not** consume this file. Validating the Devin CLI is out of scope unless/until Rosetta targets it.

> **(!) This is a DIFFERENT contract from `windsurf.md`.** `.devin/hooks.v1.json` is the **Claude-Code-style** model — generic `PreToolUse`/`PostToolUse`, PascalCase, **stdout-JSON parsed**, `additionalContext` injection — NOT the legacy Cascade `pre_read_code` / exit-code-only model. Do not carry assumptions across the two files.

---

## References

| ID | Source | What it proves / documents | URL |
|---|---|---|---|
| R1 | Devin hooks — **Overview** | Config paths; **`.devin/hooks.v1.json` has NO `"hooks"` wrapper** (other locations do); the 8 event names; `matcher`+nested `hooks:[{type,command,timeout}]` shape; input model; output model (`decision`/`reason`, `hookSpecificOutput.additionalContext`); exit codes `0`/`2`/other. | https://docs.devin.ai/cli/extensibility/hooks/overview |
| R2 | Devin hooks — **Lifecycle Hooks** | Per-event stdin fields, output contract, can-block, matcher availability. | https://docs.devin.ai/cli/extensibility/hooks/lifecycle-hooks |
| R3 | Devin Desktop changelog (**2026.3.20-2**, **2026.4.1-0**) | *Claims* Devin Desktop reads `.devin/hooks.v1.json` ("same format as Claude Code hooks"). **(!) Contradicted by our live test** — Desktop fired **0** invocations from this file (both wrapper variants); the claim does not hold for the tested Desktop build. | https://docs.devin.ai/desktop/changelog |
| R4 | Devin extensibility overview | `.devin/` directory layout: `hooks.v1.json`, `skills/`, `agents/`, `config.json` / `config.local.json`. | https://docs.devin.ai/cli/extensibility |

> Anything not in a cited source is marked `unknown` — never invented. Fields below cite R1/R2; the Devin-Desktop empirical run (LR, step 2) will fold into `Observed`.

---

## Practical Conclusions

1. **(!) Claude-Code-style model — NOT Cascade.** Events are generic + PascalCase (`PreToolUse`/`PostToolUse`/`SessionStart`/`Stop`/…), not the legacy split `pre_read_code`/`pre_run_command`. Legacy contract: [`windsurf.md`](./windsurf.md).
2. **(!) `.devin/hooks.v1.json` has NO top-level `"hooks"` wrapper (R1).** The file *is* the `{ "<Event>": [ … ] }` object directly. EVERY other location (`.devin/config.json`, `.claude/settings.json`, `~/.config/devin/config.json`, `~/.claude.json`, …) nests the same object under a `"hooks"` key. Wrap `hooks.v1.json` and it won't load.
3. **(!) stdout JSON IS parsed — context injection WORKS (R1/R2).** `hookSpecificOutput.additionalContext` reaches the agent; `decision`/`reason` control allow/block. This is the **opposite** of legacy Windsurf (stdout ignored, no injection).
4. **Matcher = regex on `tool_name`, only for `PreToolUse`/`PostToolUse`/`PermissionRequest` (R2).** Other events have no matcher (use `""` or omit).
5. **Exit codes (R1): `0` = allow/success, `2` = block, other = error (logged, does NOT block).** PreToolUse can block via exit 2; whether it ALSO accepts `decision:"block"` in stdout is to be confirmed (step 2).

### Mapping — Rosetta target events → Devin events

| Rosetta target event | Devin event (R1/R2) |
|---|---|
| `SessionStart` | `SessionStart` |
| `SessionStop` | `SessionEnd` |
| `AgentStop` / `SubagentStop` | `Stop` (no separate Subagent variant documented) |
| `PreToolUse` | `PreToolUse` |
| `PostToolUse` | `PostToolUse` |

---

## Config Locations (R1)

`.devin/hooks.v1.json` is the **standalone, recommended** file — its content is the bare hooks object. All other locations carry the same object under a `"hooks"` key.

| Scope | Path | Wrapper? | Ref |
|---|---|---|---|
| Project (recommended) | `.devin/hooks.v1.json` | **NO** — file is the hooks object | R1 |
| Project | `.devin/config.json` / `.devin/config.local.json` (`hooks` key) | yes | R1 |
| Project | `.claude/settings.json` / `.claude/settings.local.json` (`hooks` key) | yes | R1 |
| User/global | `~/.config/devin/config.json` (Windows `%APPDATA%\devin\config.json`) (`hooks` key) | yes | R1 |
| User/global | `~/.claude.json`, `~/.claude/settings.json`, `~/.claude/settings.local.json` (`hooks` key) | yes | R1 |

### Config format (R1)

`.devin/hooks.v1.json` (no wrapper):
```json
{
  "PreToolUse": [
    {
      "matcher": "exec",
      "hooks": [
        { "type": "command", "command": "./scripts/validate.sh", "timeout": 10 }
      ]
    }
  ]
}
```
Other locations wrap the identical object under `"hooks"`. Handler fields: `type` (`"command"`), `command` (string), `timeout` (seconds). `matcher` is a **regex** on `tool_name`.

---

## Hook Events (R1/R2)

| Event (exact) | Phase | Can block? | Matcher (regex on `tool_name`) | Ref |
|---|---|:--:|:--:|---|
| `PreToolUse` | before a tool runs | **yes** (exit 2) | yes | R1/R2 |
| `PostToolUse` | after a tool runs | no | yes | R1/R2 |
| `PermissionRequest` | on a permission decision | **yes** (via `decision`) | yes | R1/R2 |
| `UserPromptSubmit` | user submits a prompt | no | no | R1/R2 |
| `Stop` | agent about to stop | **yes** (via `decision`; ⚠ loop risk) | no | R1/R2 |
| `PostCompaction` | after context compaction | no | no | R2 |
| `SessionStart` | session begins | no (timeout only) | no | R1/R2 |
| `SessionEnd` | session ends | no | no | R1/R2 |

> R1's overview lists 7 (no `PostCompaction`); R2's lifecycle list includes `PostCompaction`. Treat `PostCompaction` as documented (R2), confirm firing in step 2.

---

## Per-event Input / Output (R2)

Common stdin field: `hook_event_name`. Stdout JSON is parsed on exit 0.

| Event | stdin `tool_info`/fields | Output (stdout JSON) |
|---|---|---|
| `PreToolUse` | `tool_name`, `tool_input` (object) | block via **exit 2**; or `hookSpecificOutput.additionalContext` to inject; (overview also shows generic `decision:"block"`+`reason` — confirm form in step 2) |
| `PostToolUse` | `tool_name`, `tool_input`, `tool_response` `{success:bool, output:str, error:str\|null}` | `hookSpecificOutput` (logging/follow-up); cannot block |
| `PermissionRequest` | `tool_name`, `tool_input` | `{"decision":"approve"\|"block","reason":…}` |
| `UserPromptSubmit` | `prompt` (string) | `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":…}}` |
| `Stop` | `stop_hook_active` (bool) | `{"decision":"block","reason":…}` to prevent stop (⚠ loop risk) |
| `PostCompaction` | `summary` (string\|null) | `hookSpecificOutput.additionalContext` (re-inject post-compaction) |
| `SessionStart` | `source` (string) | `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":…}}` |
| `SessionEnd` | `reason` (string) | none (cleanup/logging only) |

**Output fields (R1):** `decision` = `"approve"` \| `"block"`; `reason` (string); `hookSpecificOutput.hookEventName`; `hookSpecificOutput.additionalContext`. (Devin docs use `decision` — **not** `permissionDecision` — verify the PreToolUse deny form empirically.)

---

## Exit Codes (R1)

| Code | Meaning |
|---|---|
| `0` | success / allow (stdout JSON parsed) |
| `2` | block |
| other non-zero | error — logged, does **not** block |

> Whether stderr is surfaced to the agent (as on the legacy path) is **not specified** in R1/R2 — confirm in step 2.

---

## Capability Matrix

Legend: 📄 documented (R1/R2), not yet run · ❓ unknown · ✅ confirmed live.

| Capability | Status |
|---|---|
| `.devin/hooks.v1.json` read by **Devin Desktop** | ❌ **NO — verified** (0 invocations, both wrapper variants) |
| Claude-style events (`PreToolUse`/…) fire in **Devin CLI** | 📄 (R1/R2); ❓ CLI not yet run |
| stdout `hookSpecificOutput.additionalContext` injection (Devin CLI) | 📄 (R1/R2); ❓ CLI not yet run |
| `decision:"block"`+`reason` blocks (PermissionRequest/Stop) | 📄 (R1/R2); ❓ CLI not yet run |
| PreToolUse deny form (`decision` vs exit-2) | ❓ confirm against real Devin CLI |
| `matcher` (regex on `tool_name`) honored | 📄 (R2); ❓ CLI not yet run |
| stderr-to-agent on block | ❓ not specified |

---

## Verification status

- **Devin Desktop: DONE (negative).** `.devin/hooks.v1.json` is **NOT read by Devin Desktop** — 0 invocations in both wrapper variants (run narrative in `docs/hooks-verify-run-logs.md`). Desktop's verified contract is the flat Cascade schema → [`windsurf.md`](./windsurf.md).
- **Devin CLI: NOT YET RUN.** Verifying this contract requires running the actual **Devin CLI** against `.devin/hooks.v1.json` (no wrapper, per R1's example). Out of scope unless/until Rosetta targets the Devin CLI. If pursued: register the events to `tester.js` (the `--mode devin` branch exists — deny `{"decision":"block","reason":…}`, inject `{"hookSpecificOutput":{…,"additionalContext":…}}`), run the standard probe, read `~/.rosetta/hooks.log` to pin: event names, `tool_name`/`tool_input` shapes, whether `additionalContext` injection reaches the model, the PreToolUse deny form (`decision` vs exit-2), and stderr behavior.

---

**Cross-reference:** legacy `.windsurf/hooks.json` schema + the live-verified legacy Cascade behavior → [`windsurf.md`](./windsurf.md). Test methodology + run logs → `docs/hooks-verify.md`.
