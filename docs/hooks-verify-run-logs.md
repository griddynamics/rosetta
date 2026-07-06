# Hooks Verification — Run Logs (APPEND-ONLY)

Empirical live-hook run narratives for the hooks-verification effort. **Companion to `docs/hooks-verify.md`** — protocol, contracts, and methodology live there; raw per-run results live here.

## (!) APPEND-ONLY — DO NOT READ WHOLESALE

This file grows without bound and WILL overflow an LLM context window. Rules:

- **Never read the whole file.** `grep`/`tail` for the specific run or event you need — e.g. `grep -nE "Run [0-9]" docs/hooks-verify-run-logs.md`, `grep -n "Codex Run" …`, `grep -A30 "Run 7" …`.
- **New runs are APPENDED to the END**, newest last. One block per run, headed `### Results — <IDE> Run N (date, runtime, model, session)`.
- **Do NOT rewrite, re-summarize, or reflow prior runs.** A correction is a NEW dated block that references the run it corrects (see Copilot Run 7 correcting Run 5).
- **Confirmed conclusions do NOT live here** — they are folded into the per-IDE specs (`docs/hooks/<ide>.md` Observed columns) and the methodology/contracts in `hooks-verify.md`. This file is the raw evidence trail only.

---

## Copilot run logs (Runs 1–8, 2026-06-26)

### Results — Run 1 (2026-06-26, user-run — **VS Code Copilot**, model gpt-5.4, session `e946202d…`)

> Scope note: all findings below are observations of THIS single run. NOT generalized to all VS Code Copilot, all models, or Copilot CLI (untested).

Model's answer (context-only, no tool/read/search):
- Recited tokens: `ROSETTA-PROBE-NESTED-e5f6a7b8` (Mode A **nested**), `DEF2` (Mode B **nested**), plus two NOT-ours: `ced35933ee83cc0935e6c700865b2ad4`, `e946202d-1afd-4ae7-9876-b7cfd1b60a6c`.
- "Were you asked to report anything?" → "**Yes: Report DEF2.**"

**Finding — placement (SessionStart `additionalContext`):**
- ✅ **NESTED** `hookSpecificOutput.additionalContext` reaches context AND is adopted as a live instruction (`DEF2` recited + acted on as a report request).
- ❌ **TOP-LEVEL** `additionalContext` does NOT reach context — neither `ROSETTA-PROBE-TOPLEVEL-a1b2c3d4` nor `Report ABC1` appeared; model said it was asked to report only `DEF2`, not `ABC1`. Model listed 4 tokens (thorough), so top-level is genuinely absent.
- ⇒ In THIS run: nested reached context; top-level did not. (This run only. CLI not tested — do not generalize.)

**Log facts (`~/.rosetta/hooks.log`, this session):**
- Input **shape = snake_case**: `hook_event_name`, `session_id`, `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `transcript_path`. `tool_input` is an **object** (not a JSON string); `tool_response` is a **string**; `timestamp` is an **ISO string**.
- Events that **fired** (input `hook_event_name`, all PascalCase): `SessionStart`, `PreToolUse`, `PostToolUse`, `SubagentStop`, `Stop`. `sessionEnd` did NOT fire in this run.
- `SessionStart` fired exactly **2×** — the two entries of ONE capitalization key. So only one of the two registered keys (`sessionStart` / `SessionStart`) was honored; WHICH one is not determinable here (both keys hold identical payloads). To disambiguate next time, give the two keys distinct payloads.
- Subagent step (mandatory-step prompt, SAME original session): AI delegated to the **Explore** subagent (`tool_name: runSubagent`) → **`SubagentStop` fired** (`agent_id`, `agent_type: Explore`, `stop_hook_active`). The subagent's returned text was a "What's new in context on this turn" block — `Last Command: echo rosetta-hook-probe`, `Cwd: …/spring-boot-react-mysql`, `Exit Code: 0`, plus "two zsh entries instead of one". This is VS Code-native subagent context, NOT from our hooks (our `SubagentStop` entry is dump-only; no `SubagentStart` hook registered).
- Tool names are VS Code-specific: `run_in_terminal`, `runSubagent`, `list_dir` (not `Bash`/`Read`) — relevant to matchers.

**Fields seen in input but NOT in `copilot.md` (this run only):** `SessionStart` carried `model` (`"gpt-5.4"`). `SubagentStop` carried `agent_id`/`agent_type`/`stop_hook_active` but NO `agent_name`/`stop_reason`. `Stop` carried `stop_hook_active` but NO `stop_reason`.

**The two "unknown" tokens are identified (not injected by us):** `e946202d-1afd-4ae7-9876-b7cfd1b60a6c` = `session_id`; `ced35933ee83cc0935e6c700865b2ad4` = the VS Code `workspaceStorage` id (from `transcript_path`). The model had these in its own context independently of our hooks.

**Setup confirmed:** run executed in `…/5-min-demo/spring-boot-react-mysql` (hooks copied there); relative `docs/hooks/tester.js` resolved (cwd = that repo root).

**Still open (not covered by this run):** which SessionStart capitalization key fired; `sessionEnd`; Copilot **CLI** behavior.

### Results — Run 2 (2026-06-26, user-run — **JetBrains IDEA, Copilot CLI mode**, session `feb65716…`)

> Scope: observations of this single run/setup. NOT generalized to all Copilot CLI or all setups.

**Headline — the hooks did NOT fire; `~/.rosetta/hooks.log` has ZERO entries for this run.** The run's session id `feb65716-f062-4542-ab26-560db1762cf6` appears 0× in the log; the log's last entry is an unrelated validation test; and the new tagged SessionStart config (`--tag sessionStart`/`SessionStart`, `CAMEL*`/`PASCAL*`) has never fired in any real run.

**All model output is consistent with hooks-not-running:**
- echo, subagent listing, and the file read all completed normally — no dump, no deny.
- Mode C: the read of `HOOK-DENY-PROBE.txt` was NOT blocked; the model showed the file contents → the PreToolUse deny never executed.
- "Secret tokens in context" = only `feb65716-…`, which is the Copilot **session id** (native to context). NONE of the injected `CAMEL*`/`PASCAL*` secrets are present → SessionStart injection never ran.
- "Asked to report → the block" = parroted from the CONTENT of `HOOK-DENY-PROBE.txt` (its text says "report the block"), read in step 3 — NOT from an injected `Report` nudge.

**Interpretation (hypothesis, NOT a conclusion):** the JetBrains Copilot **CLI** did not load/execute `hooks.json` from where it was placed. This is NOT evidence that Copilot CLI lacks hook support — only that no hook ran in this setup. Per R1, Copilot CLI hook locations differ from the IDE (e.g. `~/.copilot/hooks/`, `.github/hooks/*.json`, policy paths); the config likely needs to live in the CLI's expected location.

**Next step:** confirm the exact hook-config path Copilot CLI reads (Copilot CLI docs / `~/.copilot/`), place the config there, re-run, and re-check the log for entries from the new session.

### Results — Run 3 (2026-06-26, user-run — **Copilot CLI direct** (`copilot-cli`), model Sonnet 4.6, session `8abb87fa…`)

Run folder: `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. Hooks DID fire (Run 2's miss was JetBrains config-loading, not a CLI limitation). **Verbatim wire captures + env signatures + tool names are now in the spec: `docs/hooks/copilot.md` → "Appendix — Observed Wire Examples".**

Findings (this run):
- **Double-fire + dual-shape:** every event fired TWICE — camelCase key → R1 camelCase payload (`toolArgs` JSON string, `toolResult` object); PascalCase key → R3 snake_case payload (`tool_input` object). Registering both conventions ⇒ duplicate fires.
- **Runtime is env-detectable:** CLI sets `COPILOT_CLI=1` (no `VSCODE_*`); VS Code sets `VSCODE_*` (no `COPILOT_CLI`).
- **Mode C deny WORKED:** camelCase `preToolUse` fire for tool `view` reading `HOOK-DENY-PROBE.txt` emitted deny (textLen 821); CLI blocked the read; model quoted the reason and continued. Block + reason-delivery + instruction-follow all confirmed.
- **Placement OPPOSITE of VS Code:** model surfaced `PASCALTOP-5d3e` + `PT2` = TOP-LEVEL additionalContext (snake_case SessionStart fire); nested did NOT surface. CLI top-level works; VS Code nested works (Run 1). Two runtimes, opposite placement ⇒ supports emitting BOTH (merged emit). (2 data points — not generalized further.)
- **All target events fired**, incl. `sessionEnd` (camelCase, `reason: user_exit`).
- **Field contrasts (both snake_case but differ):** CLI PostToolUse `tool_result`{result_type,text_result_for_llm} object vs VS Code `tool_response` string; CLI SubagentStop `agent_name`/`agent_display_name`/`stop_reason` vs VS Code `agent_id`/`agent_type`/`stop_hook_active`; CLI SessionStart no `model`, VS Code has `model`. `timestamp` is unix-ms number in camelCase shape, ISO string in snake_case shape.
- **Security:** Sonnet 4.6 flagged the earlier step-3 wording ("follow its instructions exactly") as prompt injection; complied but cautioned. Prompt reworded (sanctioned-test framing, planted-markers, quote-don't-obey).

### Results — Run 4 (2026-06-26, user-run — **VS Code Copilot**, NEW config + reworded prompt, model gpt-5.4, session `f46082a6…`)

Run folder: `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. Clean run with the per-capitalization config (Run 1 used the old config).

- **VS Code fires ONLY PascalCase keys — single-fire, no double-fire.** Log shows only `--tag SessionStart`, `--tag PreToolUse`, `--tag PostToolUse`, `--tag SubagentStop`, `--tag Stop`. The camelCase keys (`sessionStart`/`preToolUse`/…) did NOT fire at all. (Contrast Run 3 CLI: fired BOTH conventions, double-fire.) Resolves Run 1's open question: VS Code honors PascalCase keys.
- **SessionStart injection: NESTED reached context; top-level did not.** Model surfaced `PASCALNEST-9f6a` + `PN7` (nested string), NOT `PASCALTOP`/`PT2`. Confirms Run 1, now pinned to PascalCase-key + nested placement.
- **Mode C deny WORKED.** `PreToolUse` for `read_file` (`tool_input.filePath` = `…/HOOK-DENY-PROBE.txt`, with `startLine`/`endLine`) → deny emitted (textLen 821); model reported the read was blocked and quoted the reason. (Note: VS Code `read_file` uses a camelCase `filePath` key INSIDE the snake_case `tool_input` object.)
- **Subagent → SubagentStop fired** (`agent_id`/`agent_type: Explore`/`stop_hook_active`). snake_case throughout; `model: gpt-5.4`; fired `Stop` (not `agentStop`); no `sessionEnd` (session continued).

**Cross-run synthesis (4 runs):** VS Code Copilot = PascalCase keys only, snake_case payloads, **nested** additionalContext reaches context. Copilot CLI = fires BOTH conventions (double-fire), camelCase→R1 + PascalCase→R3 payloads, **top-level** additionalContext reaches context. ⇒ Implication (for the implementation decision, HITL): registering **PascalCase keys only** serves both runtimes (VS Code honors them; CLI's PascalCase fire works) and avoids CLI double-fire; emitting **both** additionalContext placements (top-level + nested) remains required since the two runtimes honor opposite placements. Mode C deny works in both runtimes.

### Results — Run 5 (2026-06-26, user-run — **VS Code Copilot**, follow-up probes, session `f46082a6…`)

Confirmed against log (RESULT textLen + tool_input/tool_response + model report):
- **Stop `decision:"block"` WORKS; block-once confirmed.** 1st Stop emitted block (textLen 605); model quoted the reason verbatim and finished; 2nd Stop allowed (textLen 0, marker present). No loop.
- **PreToolUse `modifiedArgs`/`updatedInput` WORKS.** Hook rewrote `echo REWRITE_ME_PRETOOLUSE` → the command actually executed was `echo PRETOOLUSE-HOOK-REWROTE-THIS` (the following PostToolUse `tool_input.command` + `tool_response` both show the rewritten string). Hook textLen 179.
- **PostToolUse `additionalContext` — recorded here as "not reaching", but ⚠️ SUPERSEDED by Run 7 (this was a FALSE NEGATIVE).** The model did not volunteer `PT*` under the generic "list secrets" prompt; Run 7 (direct per-marker question) proved nested PostToolUse additionalContext DOES reach the model in VS Code (wrapped in `<PostToolUse-context>`).
- **PostToolUse `modifiedResult` does NOT work.** Hook emitted modifiedResult (textLen 268, matched `REWRITE_RESULT_POST`) but the model saw the original result. ⇒ VS Code ignores modifiedResult (consistent with R1/CLI-only field).
- **Compaction hooks did NOT fire.** User compacted the conversation; ZERO `PreCompact`/`preCompact`/`PostCompact`/`postCompact` entries logged. ⇒ VS Code did not invoke our compaction hooks (event names may differ, or unsupported in this build).

**VS Code capability summary (confirmed):** SessionStart additionalContext (nested) ✓ · PreToolUse deny ✓ · PreToolUse modifiedArgs ✓ · Stop block ✓ · PostToolUse additionalContext (nested) ✓ **[corrected in Run 7 — was false-negative here]** · PostToolUse modifiedResult ✗ · compaction hooks ✗.

### Results — Run 6 (2026-06-26, user-run — **Copilot CLI** (`copilot-cli`), follow-up probes, session `8abb87fa…`)

Confirmed against log:
- **PreToolUse `modifiedArgs`/`updatedInput` WORKS.** `echo REWRITE_ME_PRETOOLUSE` executed as `PRETOOLUSE-HOOK-REWROTE-THIS` (model + log). Hook textLen 179 on the matching fire.
- **PostToolUse `additionalContext` WORKS — top-level.** Model recalled `PTCAMELTOP-3a9f` + `PTPASCALTOP-5d1b` (both TOP-LEVEL, camelCase + PascalCase fires); nested (`PT*NEST`) did NOT surface. Mirrors SessionStart (CLI honors top-level). (VS Code honors **nested** instead — see Run 7.)
- **PostToolUse `modifiedResult` WORKS.** Model saw `POSTTOOLUSE-HOOK-REWROTE-RESULT` (not original); hook textLen 266/268 on matching fires. Contrast VS Code (✗).
- **Stop/agentStop `decision:"block"` fires + block-once works.** Block (textLen 605) when marker absent, allow (textLen 0) when present; `agentStop` fires just before `Stop` and sets the shared per-session marker, so the pair blocks once total. ("S failed" was operational — stale config + marker cleared between attempts — not a hook failure; model-side handling not captured for CLI.)
- **Compaction: `PreCompact` FIRES (both capitalizations); `PostCompact` does NOT.** `preCompact` (camelCase: `sessionId`, `transcriptPath`, `trigger:"manual"`, `customInstructions`) and `PreCompact` (snake_case: `hook_event_name`, `session_id`, `transcript_path`, `trigger:"manual"`, `custom_instructions`) both fired on manual compaction. No `PostCompact`/`postCompact` entries. ⇒ CLI has a pre-compaction hook only; NEW input fields `trigger` + `customInstructions`/`custom_instructions`; no post-compaction event under our candidate names.

### Cross-runtime capability matrix (Runs 1–6, empirical 2026-06-26)

| Behavior | VS Code Copilot (gpt-5.4) | Copilot CLI (Sonnet 4.6) |
|---|---|---|
| Keys fired | PascalCase only, single-fire | both conventions, **double-fire** |
| Input shape | snake_case | camelCase (camel keys) + snake_case (Pascal keys) |
| SessionStart `additionalContext` | ✅ **nested** only | ✅ **top-level** only |
| PostToolUse `additionalContext` | ✅ **nested** (Run 7; wrapped `<PostToolUse-context>`) | ✅ **top-level** (both keys) |
| PreToolUse `deny` + reason | ✅ | ✅ |
| PreToolUse `modifiedArgs`/`updatedInput` | ✅ | ✅ |
| PostToolUse `modifiedResult` | ❌ ignored | ✅ |
| Stop `decision:"block"` (once) | ✅ | ✅ (`Stop`+`agentStop`, shared marker) |
| Compaction hook | ❌ none fired | ✅ `PreCompact` only (no PostCompact); `trigger`+`custom_instructions` |
| Exit code used | 0 (JSON) | 0 (JSON) |

Implication: emit `additionalContext` at BOTH placements (VC=nested, CLI=top-level), for BOTH SessionStart and PostToolUse. `modifiedResult` only helps CLI. Compaction guard is CLI-only via `PreCompact`; there is no observed post-compaction hook.

### Results — Run 7 (2026-06-26, user-run — **VS Code Copilot**, PostToolUse all-options probe, session `f46082a6…`) — CORRECTS Run 5

Log confirms VS Code (PascalCase `--tag PostToolUse`, snake_case), combined payload emitted (textLen 299: systemMessage + top-level + nested additionalContext).

- ✅ **VS Code PostToolUse NESTED `additionalContext` REACHES the model.** On a DIRECT per-marker question the model reported `PTU-NESTED-PASCAL`, stating it came from a `<PostToolUse-context>` block injected after the tool result. ⇒ PostToolUse context-injection WORKS in VS Code via nested placement. **This corrects Run 5's "✗"** — a false negative caused by the generic "list secrets" prompt (model first answered "none", then confirmed the marker on direct ask).
- ❌ **Top-level `additionalContext` does NOT reach the model** in VS Code (`PTU-TOPLEVEL-PASCAL` not seen).
- ✅ **`systemMessage` is shown to the USER but NOT embedded into the model's context.** Copilot DID display `PTU-SYSMSG-PASCAL` as an IDE warning (user saw it), yet the model never had it in context (didn't recite it even on direct ask). So: Copilot *saw/showed* systemMessage, but did NOT merge it into model context — user-facing only.
- Stop block fired once again this turn (textLen 605), expected (marker had been cleared).

**Net (corrected): VS Code PostToolUse → nested additionalContext ✓ (model, via `<PostToolUse-context>`), top-level ✗, systemMessage = user only.** Combined with CLI (top-level ✓): emitting BOTH placements covers both runtimes for PostToolUse too — same rule as SessionStart.

**Method lesson:** context-injection recall must ask DIRECTLY about each specific marker; a generic "list any secrets" prompt UNDER-REPORTS injected context (the model treats a `<PostToolUse-context>` block as ambient, not a "secret to list"). See "Testing Methodology Lessons" below.

### Results — Run 8 (2026-06-26, user-run — **Copilot CLI**, PostToolUse all-options probe, session `8abb87fa…`, `source:"resume"`)

Log confirms: CLI, both keys fired the combined payload (`postToolUse` textLen 296, `PostToolUse` textLen 299: systemMessage + top-level + nested).
- ✅ **CLI PostToolUse TOP-LEVEL `additionalContext` reaches the model.** Model recalled `PTU-TOPLEVEL-CAMEL` + `PTU-TOPLEVEL-PASCAL`, quoting the injection: *"Additional guidance from postToolUse hooks: …"*. (Both keys, double-fire.)
- ❌ Nested (`PTU-NESTED-*`) did NOT reach the model; ❌ `systemMessage` (`PTU-SYSMSG-*`) not in model context.
- **New observation:** SessionStart fired with `source:"resume"` (session was resumed) — first non-`"new"` value seen.

**PostToolUse `additionalContext` — FULLY RESOLVED both runtimes:** VS Code = **nested** (`<PostToolUse-context>`, Run 7); Copilot CLI = **top-level** ("Additional guidance from postToolUse hooks", Run 8). Same opposite-placement split as SessionStart ⇒ emit BOTH placements and PostToolUse context injects in both. `systemMessage` is user-facing only.

---

## Codex run logs

### Results — Codex Run 1 (2026-06-26, user-run; model unspecified — capture next time)

> Scope: single run. The harness (built for Copilot's permissive "emit both placements") emitted extra fields that broke several Codex hooks — see fix below. Still, the run produced a CRITICAL behavioral finding.

**HEADLINE — Codex validates hook output STRICTLY per-event. Any key outside that event's exact documented schema makes the WHOLE output invalid; Codex logs `hook returned invalid <event> JSON output`, marks the hook FAILED, and proceeds unhooked (deny/rewrite/block do NOT take effect). There is NO partial honor and NO ignoring of extras.** This is the opposite of Copilot (which ignored extra fields) and the reason merged-emit must NEVER be used for Codex.

Per-event (this run):
- ❌ **SessionStart — FAILED** (`invalid session start JSON output`). Payload carried **top-level `additionalContext`** (valid only nested for Codex) ⇒ invalid. SessionStart injection therefore UNVERIFIED this run.
- ✅ **UserPromptSubmit — COMPLETED, reached model context.** Nested-only `additionalContext` surfaced to the model as `hook context: …CODEX-UPS-NEST-7a8b. Report CUP5.` ⇒ nested `additionalContext` injection WORKS; delivered prefixed `hook context:`.
- ✅ **PostToolUse — COMPLETED.** Payload was nested `additionalContext` + top-level `systemMessage` (NO top-level additionalContext). Both surfaced: `warning: …CODEX-PTU-SYSMSG.` (systemMessage = **UI warning**) and `hook context: …CODEX-PTU-NEST. Report CPN4.` (nested additionalContext = **model context**). ⇒ confirms nested additionalContext reaches the model; `systemMessage` is user-facing. Fired once per tool call (seen on both echo + the read).
- ❌ **PreToolUse (rewrite) — FAILED** (`invalid pre-tool-use JSON output`); `echo REWRITE_ME_PRETOOLUSE` ran UNCHANGED. Payload had top-level `modifiedArgs` (not a Codex key) ⇒ invalid. (Codex wants `hookSpecificOutput.updatedInput` only.)
- ❌ **PreToolUse (deny) — FAILED; `cat HOOK-DENY-PROBE.txt` was NOT blocked**, file contents shown. Payload had top-level `permissionDecision`/`permissionDecisionReason` (Codex expects these nested) ⇒ invalid ⇒ deny never applied.
- ❌ **Stop — FAILED** (`invalid stop hook JSON output`). Payload added nested `hookSpecificOutput.decision/reason`; Codex `Stop` output schema is top-level `{decision,reason}` only ⇒ the extra nested object made it invalid.
- `systemMessage` top-level is VALID for PostToolUse (it's a documented common field) — only UNDOCUMENTED top-level keys (`additionalContext`, `modifiedArgs`, `permissionDecision`) are rejected.

**Confirmed for `codex.md` Observed:** nested `hookSpecificOutput.additionalContext` reaches model context (UserPromptSubmit + PostToolUse); `systemMessage` = UI warning, not model context; strict per-event schema validation.

**Harness fix applied before re-run (Codex output shape):** `tester.js` now emits Codex-EXACT shapes via the **`--mode codex`** parameter — nested-only deny/rewrite, top-level-only Stop; the codex config's SessionStart `--output` was made nested-only. (Default `--mode` stays `copilot`.) Re-run verifies SessionStart injection, PreToolUse deny + reason, `updatedInput` rewrite, and Stop block.

### Results — Codex Run 2 (2026-06-26, user-run — Codex CLI, model gpt-5.5, session `019f0634…`) — harness fixed (`--mode codex`)

> Re-run after the `--mode codex` harness fix, to verify what Run 1 could not (Run 1's Copilot-shaped output had FAILED). Log `~/.rosetta/hooks.log`: every RESULT exit 0, **ZERO `PARSE ERROR` / `invalid` lines** — all emitted outputs were valid Codex shapes.

**All four pending behaviors CONFIRMED (gpt-5.5):**
- ✅ **SessionStart** nested `additionalContext` — hook COMPLETED (was FAILED in Run 1). Codex surfaced `hook context: …CODEX-SS-NEST-3c4d. Report CSN2.` (emitted textLen 128, exit 0).
- ✅ **PreToolUse deny** — `cat HOOK-DENY-PROBE.txt` BLOCKED via nested `hookSpecificOutput.permissionDecision:"deny"` at **exit 0** (textLen 437). Codex showed `PreToolUse hook (blocked) feedback: <reason>`; the model quoted the reason verbatim and continued.
- ✅ **PreToolUse `updatedInput` rewrite** — `echo REWRITE_ME_PRETOOLUSE` rewritten to `echo PRETOOLUSE-HOOK-REWROTE-THIS` before execution (PreToolUse input.command = original; PostToolUse input.command = rewritten; model ran the rewritten one). Nested allow+updatedInput, textLen 145, exit 0.
- ✅ **Stop block** — turn-stop BLOCKED via top-level `{decision:"block",reason}` (textLen 280, exit 0); Codex showed `Stop hook (blocked) feedback: <reason>`; model quoted it; **block-once held** (2nd Stop allowed, textLen 0).
- ✅ **PostToolUse** — nested `additionalContext` + `systemMessage` accepted (textLen 218 ×2); `systemMessage` → `warning: …CODEX-PTU-SYSMSG.`, nested additionalContext → `hook context: …CODEX-PTU-NEST. Report CPN4.`
- ✅ **UserPromptSubmit** nested `additionalContext` (textLen 133) → `hook context: …CODEX-UPS-NEST-7a8b. Report CUP5.`

**(!) Codex UI shows hook activity regardless — NOT proof of model ingestion.** Codex prints every hook's effect: `(completed)` / `(blocked)`; nested `additionalContext` → `hook context:`; `systemMessage` → `warning:`; deny/Stop reason → `feedback:`. That is Codex's hook-activity display, not evidence the text entered the model's reasoning context. PROOF of reaching the model = the model acting on / quoting it: the **deny reason and Stop reason WERE quoted verbatim** (reach model ✓). For **`additionalContext`**, the model REACHED it — it referenced the "hidden system/developer-context diagnostic markers", which confirms the injected text WAS in its context. It only declined to QUOTE the values because the question asked it to "list secrets" (a wording artifact / secret-refusal, NOT absence). ⇒ additionalContext reaches model context; sharing was blocked by the question, not by Codex. Re-probe per-token YES/NO (Lesson 2) only to get an explicit echo of the value.

**Exit codes:** every hook exited 0; deny/block worked via JSON (nested `permissionDecision` / top-level `decision`) — exit-2 not needed. Confirms the codex.md exit-0 path.

**Events exercised:** SessionStart, UserPromptSubmit, PreToolUse (×3: plain, rewrite, deny), PostToolUse (×2), Stop (×2). **NOT exercised:** PermissionRequest, SubagentStart, SubagentStop, PreCompact, PostCompact.

**Still to do (protocol-level, model-independent):** `additionalContext` reaches model context (confirmed — model referenced the injected markers); a per-token YES/NO ask would only add an explicit value echo. Exercise the un-fired events: `PermissionRequest`, `SubagentStart`, `SubagentStop`, `PreCompact`, `PostCompact`.

### Results — Codex Run 3 (2026-06-26, user-run — Codex CLI, session `019f0634…`, manual compaction)

Triggered a manual compaction in the same session. Log confirms:

- ✅ **Both `PreCompact` AND `PostCompact` fire** (manual compaction). One invocation each (`--tag PreCompact`, `--tag PostCompact`). Codex has a pre- AND a post-compaction hook (contrast Copilot CLI, which fired `PreCompact` only).
- **Input payload (both events):** `session_id`, `turn_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`, `trigger:"manual"`. Matches the spec PreCompact/PostCompact input (common fields + `turn_id` + `trigger`). No `permission_mode` on these events.

Verbatim (PreCompact): `{"session_id":"019f0634-…","turn_id":"019f0660-…","transcript_path":"…/rollout-…jsonl","cwd":"…/spring-boot-react-mysql","hook_event_name":"PreCompact","model":"gpt-5.4","trigger":"manual"}`

⇒ Capability matrix in `docs/hooks/codex.md`: PreCompact/PostCompact upgraded 📄→✅.

---

## Claude Code Run 1 — Claude Code IDE (2026-06-29)

- **Runtime/model:** Claude Code IDE, `claude-opus-4-8[1m]`, session `6bd73c2b-…`, `permission_mode:"auto"`.
- **Test repo:** `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. Config: `.claude/settings.local.json` = `docs/hooks/claude/hooks.json`.
- **⚠️ Log contamination:** the same `~/.rosetta/hooks.log` also captured 5 entries from a separate Cursor session (~14:58, `--mode cursor`, camelCase tags `preToolUse`/`stop`, rewrite payload `echo X`). A leftover Cursor hook config is active in that test repo. My run is the `15:00+` entries (`--mode claude`, PascalCase tags). **Lesson: park OTHER agents' configs (`.cursor/` etc.) before a run** — the Codex conflict-avoidance rule applies here too.

**Results (verified against the log, not the model's word):**
- **Events fired:** SessionStart (×2: clean + strict), PreToolUse (×7 invocations — fired on Read AND Bash → tool interception is TOTAL), PostToolUse (×4), SubagentStop (×1), Stop (×3). PreCompact/PostCompact NOT fired (no `/compact`).
- **SessionStart `additionalContext` (nested) → model:** ✅ `CC-SS-CLEAN-7a1f` recited (CCS1).
- **Strict-schema probe → LENIENT:** strict-probe output (stray top-level `strayTopLevelField` + stray nested `strayNestedField`) was ACCEPTED at exit 0 (textLen=203); `CC-SS-STRICT-2b8c` reached the model (CCS2) while `CC-STRICT-STRAY` did NOT. ⇒ Claude ignores unknown fields, honors valid parts — **opposite of Codex strict validation.**
- **PreToolUse deny (nested, exit 0):** ✅ blocked `Read docs/hooks/HOOK-DENY-PROBE.txt`; reason quoted verbatim by the model.
- **PreToolUse `updatedInput` rewrite:** ✅ `echo REWRITE_ME_PRETOOLUSE` ran as `echo PRETOOLUSE-HOOK-REWROTE-THIS` (model reported the rewritten output).
- **PostToolUse `additionalContext` (nested):** ✅ `CC-PTU-NEST-5e6f` recited (CCP4); ALSO reached the SUBAGENT (its `last_assistant_message` was literally `"CCP4"`).
- **Stop `decision:"block"` (top-level, exit 0) + block-once:** ✅ first Stop blocked (textLen=280), reason quoted; subsequent Stops suppressed (marker file).
- **Input field resolutions:** PostToolUse output field = **`tool_response`** (object `{stdout,stderr,interrupted,isImage,noOutputExpected}`), NOT `tool_result`. Stop input = `stop_hook_active` + `last_assistant_message` (NOT `output`). SubagentStop adds `agent_id`/`agent_type`/`agent_transcript_path`/`last_assistant_message`. SessionStart has NO `permission_mode`. `effort:{level}` + `tool_use_id` present on tool events; PostToolUse adds `duration_ms`.

⇒ `docs/hooks/claude-code.md`: status DRAFT→VERIFIED; capability matrix rows upgraded 📄→✅ for the exercised capabilities; strict-validation ❓→✅(LENIENT); verify-flags resolved; Appendix wire examples added.

### Claude Code Run 1 — compaction addendum (manual `/compact`, 2026-06-29)

- **PreCompact + PostCompact both fired** (`completed successfully` in the `/compact` UI line); neither blocked (block path not exercised).
- **PreCompact input:** `{session_id, transcript_path, cwd, hook_event_name:"PreCompact", trigger:"manual", custom_instructions:null}`. NO `permission_mode`, NO `turn_id` (differs from Codex, which has `turn_id`).
- **PostCompact input:** `{…, hook_event_name:"PostCompact", trigger:"manual", compact_summary:"<analysis>…</analysis><summary>…</summary>"}` — carries the FULL compaction summary text (undocumented field).
- **Env signature (this run, launch-independent):** `CLAUDECODE=1`, `CLAUDE_CODE_ENTRYPOINT=cli`, `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION=1` (subagent), `CLAUDE_PROJECT_DIR`, `CLAUDE_ENV_FILE=…/session-env/<sid>/sessionstart-hook-N.sh` (SessionStart hooks can export env), `CLAUDE_EFFORT=high`. NOTE: `CLAUDE_CODE_EXECPATH`/`CLAUDE_CODE_DISABLE_AUTO_MEMORY` appeared ONLY in the contaminating session, not this one.
- **Artifacts added:** `docs/hooks/claude-logs.txt` (cleaned, de-contaminated, redacted excerpt — analogous to `codex-logs.txt`); env signature + UI-surfacing note + compaction wire examples folded into `docs/hooks/claude-code.md` Appendix; PreCompact/PostCompact rows 📄→✅ (firing + input shape).

---

## Cursor Run 1 — Cursor 3.9.16 (2026-06-29)

- **Runtime/model:** Cursor `3.9.16`, Agent (`composer_mode:"agent"`), model `composer-2.5-fast` (compaction used `gpt-4.1-mini`), session/conversation `74676b03-c5c8-4868-ace0-0099aafab72e`.
- **Test repo:** `/Users/isolomatov/Sources/5-min-demo/spring-boot-react-mysql`. Config: `.cursor/hooks.json` = `docs/hooks/cursor/hooks.json` (18 agent events → `tester.js`, `--mode cursor`). Pre-run hygiene done: log archived, stop-markers cleared, `.codex`/`.github`/`.claude/settings.local.json` parked. **Clean single-session log — no contamination** (cleaned → `docs/hooks/cursor-logs.txt`, 23 blocks, 0 secrets).
- **`tester.js` change:** added `--mode cursor` branch to the deny/rewrite/stop processors (flat snake_case: `permission`+`user_message`+`agent_message` deny; `permission:"allow"`+`updated_input` rewrite; `followup_message` stop). Non-breaking to existing modes; smoke-tested before the run.

**Results (verified against the log, not the model's word):**
- **Events fired:** `beforeSubmitPrompt` (×3), `stop` (×3), `preToolUse` (×4: Shell + Read), `beforeShellExecution` (×2), `postToolUse` (×2), `postToolUseFailure` (×2), `afterShellExecution` (×2), `afterAgentThought` (×3), `afterAgentResponse` (×1), `preCompact` (×1). **Did NOT fire:** `sessionStart`, `sessionEnd`, `beforeReadFile`, `before/afterMCPExecution`, `afterFileEdit`, `subagentStart/Stop`.
- **Output is FLAT snake_case, accepted at exit 0** (no `hookSpecificOutput` wrapper) — ✅ confirmed for deny, rewrite, `additional_context`, `followup_message`.
- **Two-layer tool hooks both fire:** a single Shell `echo` fired BOTH generic `preToolUse` AND granular `beforeShellExecution`. ✅
- **PreToolUse `permission:"deny"` blocks (exit 0 + JSON):** ✅ blocked `Read docs/hooks/HOOK-DENY-PROBE.txt` (tool `Read`, `tool_input.file_path`) AND `cat …HOOK-DENY-PROBE.txt` (tool `Shell`). Deny emit textLen=543 (both message fields). The `cat` was denied at `preToolUse` BEFORE `beforeShellExecution` could deny it (so beforeShellExecution deny path not exercised).
- **(!) Deny reason channel — CONTRADICTS the doc framing.** Doc: `agent_message`→model, `user_message`→user. **Observed: the model received `user_message` (recalled `CURSOR-DENY-USER`), NOT `agent_message` (`CURSOR-DENY-AGENT` recalled ABSENT).** Mechanism in the log: the deny spawned a `postToolUseFailure` whose **`error_message` = the deny's `user_message`** verbatim — that is what reached the model. ⇒ Rosetta's existing `deny→user_message` mapping DOES reach the model (not the silent-fail my DRAFT feared). `agent_message` delivery unverified (single run; deny only via `preToolUse`). Cursor also appends its own *"Agent note: Do not suggest workarounds to the blocked tool."*
- **PreToolUse `updated_input` rewrite:** ✅ `echo REWRITE_ME_PRETOOLUSE` ran as `echo PRETOOLUSE-HOOK-REWROTE-THIS` (model reported rewritten output; postToolUse showed the rewritten command). Emit textLen=86.
- **PostToolUse `additional_context` → model:** ✅ `CURSOR-PTU-9f2a` recited (CPT2). Flat top-level `additional_context`, emit textLen=72.
- **Stop `followup_message` (continuation):** ✅ first `stop` emitted textLen=245 → auto-submitted as a new turn; model replied `STOP-FOLLOWUP-RECEIVED CURSOR-STOP-1`. Block-once marker held (subsequent stops textLen=0). NOTE: first `stop` fired with `status:"error"`.
- **`preCompact` fired on Cursor "summarize":** `trigger:"manual"`, `is_first_compaction:true`, + context stats (`context_usage_percent`/`context_tokens`/`context_window_size`/`message_count`/`messages_to_compact`). ✅ (bonus)
- **`sessionStart` did NOT fire** → `CURSOR-SS-3c4d` correctly recalled ABSENT. Hooks were registered after the session started; `additional_context`/`env` injection remains 📄 (re-run with a FRESH conversation to capture).
- **Input field resolutions:** flat snake_case; `session_id` == `conversation_id`; `generation_id` per turn; `model` varies by phase (`composer-2.5-fast` / `default` / `gpt-4.1-mini`); `cwd:""` observed; Shell `tool_input`={command,cwd,timeout}, Read `tool_input`={file_path}; `agent_message` ABSENT from `preToolUse` input; `postToolUse.tool_output` is a JSON STRING `{"output":…,"exitCode":N}`; `duration` float ms; `beforeShellExecution` is flat `command`/`cwd`/`sandbox` (no `tool_input` wrapper); `beforeSubmitPrompt` carries `prompt`+`attachments` (active rules) and `transcript_path:null`.
- **Env signature (Cursor):** `CURSOR_EXTENSION_HOST_ROLE=agent-exec`, `CURSOR_LAYOUT=unifiedAgent`, `CURSOR_VERSION=3.9.16`, `CURSOR_PROJECT_DIR`/`CURSOR_TRANSCRIPT_PATH`/`CURSOR_USER_EMAIL`/`CURSOR_WORKSPACE_LABEL`/`CURSOR_RIPGREP_PATH`, VS-Code-base vars (`VSCODE_PID`, `VSCODE_IPC_HOOK`, `VSCODE_PROCESS_TITLE=extension-host (agent-exec) …`), `CLAUDE_PROJECT_DIR` alias. (Cursor = VS Code fork.)

⇒ `docs/hooks/cursor.md`: status DRAFT→VERIFIED; Practical Conclusion 4 corrected to observed deny-channel behavior; capability matrix rows upgraded 📄→✅ for exercised capabilities; Observed notes + Appendix wire examples added. Artifacts: `docs/hooks/cursor-logs.txt`, `docs/hooks/cursor/hooks.json`, `tester.js` `--mode cursor`.

### Cursor Run 2 — sessionStart probe (2026-06-29, fresh conversation `3cf8e158-…`)

Targeted re-run to capture `sessionStart` (Run 1 missed it — hooks registered mid-session). Pre-run: archived Run 1 log, cleared stop-markers. Started a NEW Cursor Agent chat, then a minimal per-token recall probe.
- **`sessionStart` FIRED** (`--tag sessionStart`); emitted flat `{"additional_context":"…CURSOR-SS-3c4d. Report CSS1."}` (exit 0, textLen 71).
- **✅ `additional_context` reaches the model:** model answered YES + `CSS1` for `CURSOR-SS-3c4d`.
- **Input shape:** `{conversation_id, generation_id:"" (empty at start), model:"default", model_id:"default", is_background_agent:false, composer_mode:"agent", session_id(=conversation_id), hook_event_name:"sessionStart", cursor_version, workspace_roots, user_email, transcript_path:null}`. **No `source` field** (differs from Claude/Codex SessionStart).
- **Bonus:** `stop` `followup_message` fired again (fresh session → fresh once-marker); model auto-replied `STOP-FOLLOWUP-RECEIVED CURSOR-STOP-1` — re-confirms the continuation path. Marker reset after the run.
⇒ `cursor.md`: `sessionStart` `additional_context` row 📄→✅; Status updated to Runs 1–2; `env` output remains 📄.

### Cursor Run 3 — `beforeShellExecution` deny isolation + property re-validation (2026-06-30, session `614ce89f-…`)

Goal: resolve whether `agent_message` reaches the model via a SECOND, independent deny mechanism (Run 1 only exercised `preToolUse`). Changed `docs/hooks/cursor/hooks.json`'s `beforeShellExecution` entry to deny on `SHELL-DENY-PROBE` (distinct from `preToolUse`'s `HOOK-DENY-PROBE`), so the granular hook denies without the generic hook pre-empting it (Run 1's `beforeShellExecution` deny was never actually exercised — `preToolUse` denied the same Shell call first). Pre-run: archived prior log, cleared stop-markers, restored `.cursor-disabled/` → `.cursor/` (other agents stayed parked). Prompt asked the model to run `echo SHELL-DENY-PROBE-test-marker` and report `CURSOR-DENY-USER`/`CURSOR-DENY-AGENT` presence separately.

- **`beforeShellExecution` deny CONFIRMED in isolation:** `preToolUse` fired and passed through (textLen 0, no match); `beforeShellExecution` fired and denied (textLen 543). Tool did not run.
- **`agent_message` CONFIRMED absent a second, independent way.** Model answered YES for `CURSOR-DENY-USER`, NO for `CURSOR-DENY-AGENT`. A follow-up prompt ("where do you see CURSOR-DENY-AGENT, anywhere?") made the model search its full context AND `Grep` the filesystem — it found the marker only inside `tester.js`'s own source (the hook script), never in any live context. Two independent deny mechanisms (Run 1 `preToolUse`, Run 3 `beforeShellExecution`) now agree: `user_message` reaches the model via `postToolUseFailure.error_message`; `agent_message` does not.
- **(!) `error_message` wrapper DIFFERS by denying hook — not a fixed template.** Run 1 (`preToolUse` deny): `error_message` = `user_message` verbatim. Run 3 (`beforeShellExecution` deny): `error_message` = `"Command execution was blocked by a hook: " + user_message + "\n\nTo view or modify configured hooks, go to Cursor Settings > Hooks.\n\nAgent note: Do not suggest workarounds to the blocked tool."` Both ultimately carry `user_message`'s content; only the surrounding template differs.
- **`beforeReadFile` FIRED** (previously never observed) — alongside `preToolUse`, for the same Read call (model read `tester.js`). Input: `{file_path, content (full file text), attachments:[]}`. No deny triggered (didn't match); deny path for this hook remains 📄.
- **New tool kind: `Grep`** — the model grepped the repo for `CURSOR-DENY-AGENT` while double-checking its own answer. `tool_input:{pattern, file_path}` (`file_path` = search scope here, not a single file); `tool_output` (postToolUse, JSON string) = `{pattern, success}`.
- **`tool_output` shape is tool-specific** (not just Shell's `{output,exitCode}`): Read → `{file_path, content_length}`; Grep → `{pattern, success}`.
- **`tool_use_id` format differs by tool:** Shell → raw UUID; Read/Grep → `tool_`-prefixed id. Consistent with Run 1.
- **Undocumented token-usage fields, NOT in R1:** `input_tokens`/`output_tokens`/`cache_read_tokens`/`cache_write_tokens` (numbers) on `afterAgentResponse` and the following `stop` — absent on tool events and `afterAgentThought`.
- **(!) `model` field correction:** Run 1 read as "varies by phase" (`composer-2.5-fast` on `beforeSubmitPrompt`/`stop`, `default` on tool events). Run 3 (different model selected in the IDE) shows `"default"` on EVERY event including `beforeSubmitPrompt`/`stop`. Conclusion: `model` tracks the user's active IDE model selection, not the firing event — Run 1's phase-mapping was a coincidence of that session's settings, not a contract.

⇒ `docs/hooks/cursor.md`: Practical Conclusion 4 rewritten (dual-mechanism confirmation + wrapper-template nuance); Practical Conclusion 6 (tool names) gained `Grep`; two new Practical Conclusions added (`tool_use_id` format, `model` field correction); Capability Matrix rows upgraded for `beforeShellExecution` deny and `beforeReadFile` fire; `tool_output`/`tool_use_id`/token-usage fields documented; Appendix gained a Run 3 wire-examples block. Artifacts: `docs/hooks/cursor-run3-logs.txt`, `docs/hooks/cursor/hooks.json` (updated match string).

### Cursor Run 4 — exit-code/`ask`/`failClosed`/subagent/file-edit/`env` probes (2026-06-30, session `78d9aebd-5573-4e6b-b018-832b56991975`)

Goal: clear the remaining 📄 capability-matrix items ahead of implementing Bug 1 (Action 2) for Cursor, per Core Principle (verify before code). Extended `tester.js` with `--exit-code-on-match`, `--cursor-ask-on-match`, `--cursor-crash-on-match`, `--cursor-deny-and-exit2-on-match`; added a second `beforeShellExecution` handler (`failClosed:true`) to `docs/hooks/cursor/hooks.json`. Pre-run hygiene: archived prior log, cleared stop-once markers, restored `.cursor-disabled/` → `.cursor/`.

- **False start:** first attempt produced ZERO log entries despite the model reporting all 8 probe steps "ran fine." Root cause: editing/renaming `hooks.json` for an already-open Cursor workspace doesn't get re-read until a new session starts — confirmed once an incidental `sessionStart`/`sessionEnd` pair appeared in the log a moment later. Lesson reinforced: **verify against the log, never the model's "nothing was blocked" report** — here the model wasn't lying, it genuinely executed plain shell commands with zero hook involvement.
- **Own bug found mid-run, fixed before re-test:** the `exit2json` probe paired the UNCONDITIONAL `--exit-code 2` flag with the CONDITIONAL `--deny-on-match` flag — `--exit-code` would have forced exit-2 on every `beforeShellExecution` call, not just matched ones. Replaced with a new conditional `--cursor-deny-and-exit2-on-match` flag. Also collapsed 6 separate handler objects down to 2 (only `failClosed` genuinely needs a separate handler) since no prior run had exercised more than one handler per event.
- **✅ Exit code 2 ALONE (no body) blocks, confirmed independent of the `failClosed` handler's own (buggy, later-fixed) blocking:** "blocked this action (exit code 2) but provided no reason."
- **✅ Exit code 2 PAIRED with a JSON deny body does NOT get parsed — raw text dumped verbatim**, including `agent_message` (never delivered via the exit-0 path, Runs 1+3). Significant: this is WORSE than the already-working exit-0+JSON mechanism — recommend NOT adding `exitCode()→2` to Cursor's adapter; the existing exit-0 deny is clean, confirmed, and already correct.
- **`permission:"ask"` on `beforeShellExecution`: blocked outright, no approval UI to agent OR human** (human confirmed: no popup). Behaviorally deny-equivalent in this build.
- **Design flaw discovered AND a genuine contract fact:** the `failClosed:true` handler returned EMPTY output (no explicit decision) on every non-matching call; Cursor treated that empty response itself as a "hook failure" and blocked under `failClosed` — masking steps 1–5 on the first attempt. Fixed by emitting an explicit `{"permission":"allow"}` on the non-match path. Re-test then cleanly A/B-confirmed: the SAME crash (uncaught throw) fails OPEN (proceeds) without `failClosed`, fails CLOSED (blocked, full Node stack trace shown to the agent) with `failClosed:true`.
- **`sessionStart`'s `env` propagates to later HOOK SCRIPT processes' own env for the rest of the session** (`ROSETTA_SS_ENV_TEST` present in every subsequent `tester.js` invocation's env dump) — but NOT into the agent's own shell (`echo $ROSETTA_SS_ENV_TEST` → `UNSET`).
- **`subagentStart`/`subagentStop` confirmed** (Task tool, trivial task): `subagent_type:"general-purpose"` (hyphenated — R1's examples are `generalPurpose`/`explore`/`shell`); `modified_files`/`summary` ABSENT (not empty) on this no-file-work run.
- **`afterFileEdit` confirmed**: brand-new file → `edits:[]` (no prior content to diff).
- Still 📄 (no MCP server / no targeted session-close in the harness): `beforeMCPExecution`/`afterMCPExecution`, `updated_mcp_tool_output`, `sessionEnd` input shape, `beforeReadFile` deny.

⇒ `docs/hooks/cursor.md`: Capability Matrix — promoted exit-code-2 (bare), `ask`, `failClosed` (both directions), `sessionStart env`, `subagentStart`/`subagentStop`, `afterFileEdit` from 📄 to ✅; four new Practical Conclusions (9–12) plus two shape-nuance additions (13–14); per-event tables annotated; Appendix gained a Run 4 wire-examples block + provisioning/test-design notes. Artifacts: `docs/hooks/cursor-run4-logs.txt`, `docs/hooks/tester.js` (4 new processors), `docs/hooks/cursor/hooks.json` (env field + second `beforeShellExecution` handler). **Decision needed from user:** confirm dropping the Cursor portion of Action 2 (no `exitCode()→2` for `cursor.ts`) given the raw-dump regression found above — Windsurf's portion of Action 2 is unaffected.

### Windsurf Run 1 — legacy `.windsurf/hooks.json`, exit-2 deny (2026-06-29, Devin Desktop, `SWE-1.6 Slow`, trajectory `64944513-…`)

Live run on the legacy `.windsurf/hooks.json` path (rename prompt declined). Config = `docs/hooks/windsurf/hooks.json` (12 events, `--mode windsurf`, per-event `--tag`; `pre_read_code`+`pre_run_command` carry `--deny-on-match HOOK-DENY-PROBE`). Verified against `~/.rosetta/hooks.log` → cleaned to `docs/hooks/windsurf-logs.txt` (11 blocks).
- **9/12 events fired:** `pre_user_prompt`, `pre_run_command`(×2), `post_run_command`, `pre_read_code`(×2), `post_read_code`, `pre_write_code`, `post_write_code`, `post_cascade_response`, `post_cascade_response_with_transcript`. **Not fired** (no such action): `pre_mcp_tool_use`, `post_mcp_tool_use`, `post_setup_worktree`.
- **Common fields confirmed:** `agent_action_name`, `trajectory_id`, `execution_id`, `timestamp` (ISO 8601 **with TZ offset** `…-04:00`), `model_name` (`"SWE-1.6 Slow"`), `tool_info`.
- **Real `tool_info` shapes:** read=`{file_path}` (absolute), run=`{command_line, cwd}`, write=`{edits:[{old_string,new_string}], file_path}`, prompt=`{user_prompt}`, response=`{response}`(markdown), transcript=`{transcript_path}` (`~/.windsurf/transcripts/<trajectory_id>.jsonl`).
- **✅ Deny via exit-2 + stderr CONFIRMED:** both `pre_read_code` (Read of `HOOK-DENY-PROBE.txt`) and `pre_run_command` (`cat …`) → tester emitted stderr (340 B) + exit 2; both blocked. The agent **quoted the stderr reason verbatim and continued**. **New:** Cascade appends **`: action blocked by hook`** to the hook's stderr.
- **✅ BUG 1 confirmed:** 9× exit 0 with textLen 0 / stderrLen 0 — stdout JSON is irrelevant; only the exit code acts.
- **Env signature:** `CODEIUM_EDITOR_APP_ROOT=/Applications/Devin.app/…` (proves Windsurf→Devin rebrand); `WINDSURF_CSRF_TOKEN` (redacted). Env still uses `CODEIUM_*`/`WINDSURF_*` prefixes.
⇒ `windsurf.md`: status DRAFT→**VERIFIED** (legacy path); matrix rows ✅; Practical Conclusion #7 added; Appendix filled. New `.devin/hooks.v1.json` schema split into `devin-cli.md` (was `devin.md`; see Runs 2–4 — Devin Desktop does NOT read it). `split-logs.js` extended to match `trajectory_id` (Windsurf/Devin session key).

### Windsurf/Devin Desktop Run 2 — `.devin/hooks.json` (flat Cascade) (2026-06-29, `SWE-1.6 Slow`)

Same flat Cascade config as Run 1, relocated to `.devin/hooks.json` (legacy `.windsurf/` parked). Verified against `~/.rosetta/hooks.log` (archived `hooks.log.archived-20260629T190412`).
- **9 invocations, identical event set to Run 1:** `pre_user_prompt`, `pre_read_code`(×2), `post_read_code`, `pre_run_command`(×2), `post_run_command`, `post_cascade_response`, `post_cascade_response_with_transcript`.
- **2× exit-2 + stderr (340 B) deny** blocked the HOOK-DENY-PROBE read + cat; agent quoted the message (+ Cascade's `: action blocked by hook` suffix) and continued.
- Env `CODEIUM_EDITOR_APP_ROOT=/Applications/Devin.app/…`.
⇒ **`.devin/hooks.json` ≡ `.windsurf/hooks.json`** (same flat schema, same events). Devin Desktop = renamed Windsurf. `windsurf.md` retitled Devin Desktop/Cascade; `.devin/hooks.json` = current path, `.windsurf/` = legacy alias.

### Devin Desktop Runs 3–4 — `.devin/hooks.v1.json` (Claude-format) → NOT READ (2026-06-29/30, `SWE-1.6 Slow`)

Tested whether Devin Desktop reads the Claude-Code-format `.devin/hooks.v1.json` (per the `/cli/extensibility/hooks/` docs + changelog claim). Two variants, each as the ONLY active config:
- **Run 3 — no-`"hooks"`-wrapper** (Devin overview's literal example): **0 invocations** (`~/.rosetta/hooks.log` absent). Probe deny didn't block; injected markers not recalled.
- **Run 4 — WITH `"hooks"` wrapper** (full Claude Code spec, `--mode claude`): **0 invocations** again. (Step-4 "YES" recall answers were FALSE POSITIVES — the prompt listed the tokens; the real signal, Report codes DS1/DU2/DP3, never appeared in any log.)
⇒ **Devin Desktop does NOT read `.devin/hooks.v1.json` in any format.** That Claude-format file is the **Devin CLI** product (`docs/hooks/devin-cli.md`); the changelog's "Desktop reads hooks.v1.json" claim is contradicted by this build. Desktop's contract = flat Cascade at `.devin/hooks.json` (`windsurf.md`).
