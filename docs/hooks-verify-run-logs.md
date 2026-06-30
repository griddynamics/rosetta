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
