# Hooks Output Format Verification

Terse, factual findings. Grounded in public docs and codebase inspection.
Started 2026-06-24.

**Status (current, see per-IDE table + Change-phase findings + Actions for detail):** Specs for Copilot, Codex, Claude Code, Cursor, Devin Desktop (`windsurf.md`) are **VERIFIED/COMPLETE**. Devin CLI (`devin-cli.md`) is a **doc-grounded DRAFT, not validated** (by decision — Devin Desktop confirmed not to read it). Change-phase (code/requirements/configure) is **DONE** for Claude Code, Cursor, Copilot, Codex, and **Windsurf/Devin Desktop (Action 9 done 2026-07-01)**. **No open change-phase items remain.** (`SubagentStop` is intentionally documented-only, no mapping needed — see User Decisions.)

> **Companion file:** raw per-run narratives + wire captures live in `docs/hooks-verify-run-logs.md` (APPEND-ONLY; `grep`, do not read wholesale). Verified contracts live in the per-IDE specs `docs/hooks/<ide>.md`. **This file = protocol, standing rules, change-phase findings, and methodology only** — NOT per-IDE contracts (those are in the specs) and NOT raw run evidence (that is in the run-log).

---

## Core Principle — NOTHING IS APPROVED UNTIL VERIFIED

**The goal of this effort is a VERIFIED SOURCE OF TRUTH for hook contracts.** Build order is one-directional:

> **doc-grounded spec (DRAFT / hypothesis) → empirical live-hook test → VERIFIED truth → only then: code / requirements / configure changes.**

- A spec grounded only in manufacturer docs is a **hypothesis**, never truth. Docs can be wrong, stale, or runtime-dependent.
- **Nothing is "approved" or "confirmed" until it is empirically verified** against the real agent via the live-hook test (`tester.js` + `~/.rosetta/hooks.log`). The hook protocol is model-independent — verify the contract once; the model does not change it.
- HITL approval of a DRAFT spec means only "**this hypothesis is worth testing**" — it does NOT make the spec truth.
- Verified facts (the `Observed` columns) are the source of truth. Code, requirements, and configure guides are reconciled TO that truth — never the reverse, and never ahead of it.
- All code changes are first presented, then applied only on clear EXPLICIT approval, no assumptions

---

## User Intent

Verify all hook output formats used in Rosetta hooks. Check public docs per IDE/agent one at a time.
Check usage in `docs/requirements`, `rosettify-plugins`, and `instructions` (r2 + r3).

---

## Working Protocol (per agent, explicit — MUST follow)

For each IDE/agent, in this exact order:

1. **Spec doc**: Create/update `docs/hooks/<ide>.md` — EXACT contract: input model, output model, field-by-field meaning, constraints, direct links to official docs. No prose. Specs only.
2. **HITL — spec review (DRAFT, NOT truth)**: Present the doc-grounded spec. Resolve all uncertainties. Wait for **explicit approval to PROCEED TO VERIFICATION** — this approves the spec only as a *hypothesis worth testing*, NOT as a confirmed contract. The spec stays **DRAFT** until step 3.
3. **Empirical live-hook verification (collaborative — THIS is what produces the source of truth).** A doc-grounded spec is NOT confirmed until proven against the real agent. Build `docs/hooks/<ide>/hooks.json` wiring every event to `docs/hooks/tester.js`; the **user runs it in the real agent** and captures `~/.rosetta/hooks.log`. (The hook protocol is model-independent — one run verifies the contract; the model does not change it.) **The assistant guides the user** (setup + which probe prompt to paste + what to report), then **verifies against the logs, not the model's word** (see "Verification Process" — the canonical how-to). Fold confirmed results into the spec's `Observed` columns; only now is the spec VERIFIED truth. **HITL gate:** present empirical results; wait for **explicit approval** before any code work.
4. Check `src/hooks` (grep/search — no full reads)
5. Check `docs/REQUIREMENTS` (grep; reset requirement status to `Draft` AFTER implementation, not before)
6. Check `src/rosettify-plugins` (grep for all affected usages)
7. Check `instructions/r*/configure/*.md` (grep; both r2 + r3). **[GENERAL — applies to every IDE's change phase] Scope check (added 2026-06-30, discovered on Cursor but not Cursor-specific):** these guides document the GENERATED PLUGIN's wire contract for END USERS — not `src/hooks`-internal authoring APIs. A field like `_exitCode` (an emergency escape hatch for people writing hooks in `src/hooks`) belongs in code comments / `hooks-verify.md`, never here. Also: `docs/requirements/plugin-generator` explicitly excludes `src/hooks` runtime internals (`SCOPE.md`, AC-3) — don't go hunting for a plugin-generator FR to update when the change is purely `src/hooks` runtime behavior (see OI-4).
8. **HITL gate**: present all findings — wait for **explicit approval** before touching code or docs
9. Update `hooks-verify.md` with confirmed decisions
10. Make changes across all areas
11. Update `hooks-verify.md` with post-change summary

**Constraint:** ONE agent at a time. No jumping ahead.
**HITL is mandatory at every gate (steps 2, 3, 8).** Do NOT proceed past a gate — and do NOT touch code, requirements, plugins, or configure guides — without the user's explicit approval. The live-hook test (step 3) is the proof step: never mark a spec "confirmed" from docs alone.

### Spec file role — `docs/hooks/<ide>.md` (READ THIS before creating/editing one)

**What it is:** the single **authoritative, manufacturer-grounded hook contract** for ONE IDE/agent — `docs/hooks/copilot.md`, `docs/hooks/claude-code.md`, `docs/hooks/cursor.md`, `docs/hooks/codex.md`, `docs/hooks/windsurf.md`, `docs/hooks/devin-cli.md`. One file per IDE.

**Role in the flow:** it is the **output of step 1** and the artifact the rest of the protocol (empirical test → code/requirements/configure changes) is verified *against*. Created **before any code work** on that IDE. The spec is the source of truth for what the manufacturer guarantees; code and configure guides must conform to it, never the reverse.

**SPECS ONLY — FACTS ONLY.** The spec contains ONLY the contract: exact input JSON model, exact output JSON model, field-by-field types/meanings/constraints (with a `Ref` column citing the manufacturer source per field), matchers + wiring, exit codes, direct links to official docs. **NO change log. NO reasoning/justification. NO decision history. NO speculation.** Just the facts as the manufacturer documents them. Obey the **Spec Authoring Rules** below.

**What it is NOT:**
- **NOT a copy of another IDE's spec.** Every name/field/shape comes DIRECTLY from that manufacturer's docs — never inferred from another IDE (e.g. Codex ≠ Copilot). Do not import another IDE's quirks (merged-emit, double-fire, casing variants) unless that manufacturer documents them.
- **NOT a scratchpad.** Cross-references to internal files, adapter analysis, decisions, open items, and run logs live HERE in `hooks-verify.md`, not in the spec. The spec stays a clean, self-contained contract (it may name Rosetta and its own test config, since the spec serves Rosetta).
- **NOT "confirmed" from docs alone.** It starts doc-grounded (DRAFT); empirical live-hook results (step 3) get folded into its `Observed` columns and only then is it sealed COMPLETE (see `copilot.md` for the finished shape).

**Authority vs configure guides:** per INT-IDE-0002 the `instructions/*/configure/*.md` guides are authoritative for hook output format in *generated plugins*; the `docs/hooks/<ide>.md` spec is the verification reference those guides are reconciled against during the changes phase.

**Target hook events (all IDEs):** `SessionStart`, `SessionStop`, `AgentStop`/`SubagentStop`, `PreToolUse`, `PostToolUse` — only these five (documented under each manufacturer's EXACT event names). Each spec covers: exact input JSON model, exact output JSON model, field-by-field types/meanings/constraints, direct doc links. No prose.
**Matchers:** Document per-IDE matchers and wiring inside the respective `docs/hooks/<ide>.md`.

### THINKING MODEL — what each spec section may contain (READ before adding/keeping ANY non-table section)

Added 2026-06-26 after repeated mis-authoring on Codex. **Every spec section must be GENUINE FOR THIS IDE — never ported from another IDE's spec just because it exists there.** Before writing a section, classify the content:

1. **Manufacturer I/O contract?** (events, input fields, output fields, exit codes, matchers) → belongs ONLY in the per-event TABLES (with `Ref`). Never restate it elsewhere.
2. **A "Practical Conclusion"?** A practical conclusion is ONLY one of:
   - a behavior that genuinely SURPRISES a careful reader of the I/O tables (e.g. Codex: *any* extra/misplaced field invalidates the WHOLE output → the hook runs unhooked), or
   - a high-impact, easy-to-miss gotcha with SILENT-FAILURE consequences (e.g. `systemMessage` is user-only and never enters model context — put model guidance there and the model silently never sees it).
   It is NOT field placement, which events exist, registration, tool interception, or exit-code values — those are already pinned in the tables. **If you can derive it from the tables, it is NOT a conclusion.** Keep conclusions to the few that are genuinely earned.
3. **A section that only makes sense because of ANOTHER IDE's complexity?** Then it may not belong here, or belongs in a smaller form. Copilot earned a capability MATRIX and a wire-example APPENDIX because it spans **3 input standards × 2 runtimes** with opposite behaviors. An IDE with ONE standard / ONE runtime may need neither — or a different version (e.g. a matrix that tracks verification STATUS, not runtime divergence). Include a matrix/appendix ONLY if it carries information the tables cannot.
4. **Raw run evidence or test methodology, not the contract?** → does NOT go in the spec as prose. Wire captures, env signatures, which events fired, per-run pass/fail → `hooks-verify-run-logs.md`. How to probe, prompt wording, UI-display caveats, model-recall quirks → `hooks-verify.md`. **The model used does NOT change the protocol — never gate the contract on a model.**

**Failure modes this prevents (all committed 2026-06-26 on Codex):** copying Copilot's merged-emit / double-fire / both-placements framing into a single-standard IDE; writing "practical conclusions" that merely restate the tables; jamming Practical Conclusions + matrix + wire dump + env signatures into one cross-linked blob; deleting a genuine section in overcorrection; gating verification on "all models" when the protocol is model-independent.

---

## User Decisions (HITL answers)

| Issue | Decision |
|---|---|
| Bug 1 — exit code never matches hook result | **Fix for all IDEs. Process exit code MUST match what hook returned. NOT Windsurf-only.** |
| Bug 2 — Copilot `additionalContext` placement | **Emit BOTH: top-level `additionalContext` AND inside `hookSpecificOutput.additionalContext`. Both contracts satisfied, nothing breaks. Do NOT switch between formats — merge them.** |
| Bug 2 — Copilot `additionalContext` on PreToolUse / PostToolUse | **RESOLVED (OI-1, 2026-06-25): use the dedicated field per purpose — PreToolUse deny → `permissionDecisionReason`; PostToolUse advisory + SessionStart context → `additionalContext`. "Do NOT use `additionalContext`" applies ONLY to deny-reasons, NOT as a blanket ban.** |
| Gap 3 — `cursor.md` and `codex.md` missing Output Contract sections | **Yes, add. Re-verify whether all hooks follow same format OR some differ. Include proof links.** |
| Gap 4/5 — `suppressOutput` dead, `ask` unsupported in Codex | **Not a gap — fields defined for future support. No change.** |
| Windsurf is now Devin | **Rosetta never released hooks → no backward-compat burden. Devin Desktop = renamed Windsurf (flat Cascade at `.devin/hooks.json`); the Claude-format `.devin/hooks.v1.json` is Devin CLI, NOT Desktop. `windsurf.md` = Devin Desktop contract; `devin-cli.md` = Devin CLI (left non-validated).** |
| `SubagentStop` registry gap (not mapped in `ide-registry.ts` for any IDE) | **Document only — no registry/runtime mapping needed. Out of scope.** |

---

## Internal Pipeline

```
HookResult (hook logic) → toCanonical() (run-hook.ts) → CanonicalOutput → adapter.formatOutput(canonical, ide) (adapter.ts) → IDE-specific wire JSON → stdout
```
- `CanonicalOutput` (`src/hooks/src/types.ts`) **IS the Claude Code wire shape** (canonical) — full contract in `docs/hooks/claude-code.md`. `HookResult` kinds: `advise` (→ `additionalContext`), `allow`, `deny` (→ `permissionDecision:'deny'` + `continue:false`), `side-effect` (no stdout), `null` (no stdout).
- `run-hook.ts` always exits 0 on success today (**Bug 1** — see below); exit 1 on error.

---

## Per-IDE — spec pointers + change-phase findings

Contracts (events, I/O models, exit codes, matchers) live in the per-IDE specs — **NOT duplicated here**. This section keeps only the pointer/status and the **change-phase findings that are NOT in the spec** (to address in Steps 4–11, after the Step-8 HITL gate).

| IDE / agent | Spec | Status | Adapter |
|---|---|---|---|
| Claude Code | `docs/hooks/claude-code.md` | COMPLETE (canonical: `CanonicalOutput` == wire; adapter identity); **change-phase DONE 2026-06-30** (configure-guide Hooks section added) | `adapters/claude-code.ts` |
| Codex (OpenAI) | `docs/hooks/codex.md` | **RE-SEALED 2026-07-01** (after Action 8 fix) — spec VERIFIED/COMPLETE; change-phase DONE (Action 4 rewrite + Action 7 Input model + Action 8 MCP-as-read removal). Fully matching across tmpl (`"hooks"` key; read-once matcher now `Bash\|shell`, fictional `Read/View/view` dropped), `src/hooks` code (adapter no longer promotes MCP→read; `ide-rows` incl. `Stop`; tsc clean, 718/718), and the generator (nested `additionalContext`; artifacts in sync). Reads on Codex are shell-only — no read tool, no MCP read path. Only intentional non-match: `SubagentStop` unmapped (by decision, documented-only). | `adapters/codex.ts` (identity) + `ide-rows/codex.ts` |
| Cursor | `docs/hooks/cursor.md` | COMPLETE; **change-phase DONE 2026-06-30** (Actions 2/3/5) | `adapters/cursor.ts` (→ flat snake_case; no `exitCode` override, by decision) |
| GitHub Copilot | `docs/hooks/copilot.md` | COMPLETE; **change-phase DONE 2026-06-30** (Bug 2 + routing-bug fix + OI-3 + configure guide + FR-HOOK.md) | `adapters/copilot.ts` (now handles BOTH wire shapes) + `ide-rows/copilot.ts` |
| Devin Desktop (Windsurf) | `docs/hooks/windsurf.md` | **SEALED 2026-07-01** — spec VERIFIED/COMPLETE; change-phase DONE (Action 9: deny reason routed to stderr via `IdeAdapter.stderrMessage`; `formatOutput`→`{}`; configure-guide Hooks section added r2+r3). Flat Cascade; `.devin/hooks.json` current, `.windsurf/` legacy alias. Only intentional non-match: no session-lifecycle events exist (documented-absent, not a gap). | `adapters/windsurf.ts` |
| Devin CLI | `docs/hooks/devin-cli.md` | DRAFT — NOT validated (out of scope unless Rosetta targets the CLI) | — |

### Change-phase findings (NOT in the specs)

**Copilot — change-phase DONE (2026-06-30).** Re-verification of steps 4–7 (triggered because the original write-up below predated the shared `Stop`-registry and Cursor/Claude-Code turns) surfaced a routing bug NOT previously documented, which changed the scope of the already-planned Bug 2 / OI-3 fixes. Summary of what shipped, in dependency order:

**NEW FINDING — VS Code Copilot traffic was silently misrouted to the `claude-code` adapter, breaking `toolKind` resolution for every real hook.** `adapter.ts`'s `DETECTION_ORDER` (`codex, cursor, claude-code, windsurf, copilot`) and the SHIPPED `entrypoints/adapter-copilot.ts` (production bundle, aliased in at build time — see `scripts/build-bundles.mjs`) both detected VS Code Copilot's snake_case payload (`hook_event_name` + `session_id` + `tool_input`) as `claude-code`, because that shape is structurally a subset of Claude Code's own wire shape — `entrypoints/adapter-copilot.ts` did this **deliberately** (comment: "VS Code may send either Copilot-specific format or Claude-compatible format... the fallback handles both"), not by accident. The consequence: once routed to `claude-code`, `toolKind` was resolved via **`ide-rows/claude-code.ts`'s own tool-name table** (`Bash`/`Read`/`Edit`/`Write`/`MultiEdit`) against VS Code Copilot's ACTUAL tool names (`run_in_terminal`, `read_file`, `list_dir`, `runSubagent`) — none matched (only `create_file`, aliased into Claude's table specifically for this fallback, happened to work). Every one of Rosetta's 6 real hooks hard-gates on `toolKinds` in `run-hook.ts` — a `null` toolKind means the hook's `run()` never executes. **On VS Code Copilot, none of Rosetta's real hooks (dangerous-actions, lint-format-advisory, loose-files, md-file-advisory, read-once, codemap-refresh) fired.** Not caught by the empirical Runs 1–8 verification because `tester.js` is wired directly per-event and bypasses this adapter/toolKind pipeline entirely (it validates the wire protocol, not Rosetta's internal routing); zero test coverage existed for this path (`adapter.copilot.test.ts` only fixtured the camelCase CLI shape through `detectIDE`).
- **Fix (user-directed design: env-first, shape-fallback last, applied per IDE):** `ide-rows/copilot.ts`'s `TOOL_KINDS`/`getFilePath` extended for VS Code's own tool vocabulary (`run_in_terminal`→bash, `read_file`→read; `tool_input` object handling). `adapters/copilot.ts`'s `normalize()` extended to parse BOTH wire shapes (closes OI-3, now genuinely load-bearing — see below). `entrypoints/adapter-copilot.ts` (the actual shipped bundle) — **claude-code fallback removed entirely**; always routes through the copilot adapter now that it's shape-complete. `adapter.ts` (never shipped — direct/unbundled use only, e.g. `runHook()`-based unit tests) gained an env-based detection tier (`ENV_DETECTION_ORDER`: `CURSOR_VERSION`→cursor, `CLAUDECODE=1`→claude-code, `CODEX_MANAGED_*`→codex, `COPILOT_CLI=1`→copilot, `CODEIUM_*`/`WINDSURF_*`→windsurf, generic `VSCODE_*`→copilot catch-all) checked BEFORE the existing shape-based `DETECTION_ORDER`, per the spec's own already-documented (but previously unimplemented) runtime-detection guidance (`copilot.md`, Practical Conclusion 7). Devin CLI excluded (non-validated, not in `IdeName`). Default `env = {}` on every call site so existing/host-shell env (e.g. this very session's own `CLAUDECODE=1`) cannot leak into detection and break unrelated tests — confirmed this leakage risk is real by testing it directly.

**Post-implementation adversarial review (2026-06-30) — 2 parallel independent agents (one docs-consistency audit, one goal-driven code review told the TARGETS not the implementation, so it verified the logic itself rather than validating assumptions) found real issues in the first pass. All CONFIRMED findings fixed same-day:**
- **[CONFIRMED, real regression] `ide-rows/copilot.ts` `TOOL_KINDS.bash` was missing PascalCase `'Bash'`** — Copilot CLI's OWN PascalCase fire sends `tool_name: "Bash"` (distinct from VS Code, which never sends this literal name). Before the routing-bug fix this resolved correctly ONLY BY ACCIDENT, via the misrouted claude-code fallback (whose table happens to also have `'Bash'`). Routing traffic through copilot's own table (the fix above) regressed this specific case to `toolKind: null` until `'Bash'` was added explicitly. Found empirically (direct execution against the built adapter) while investigating a user report of "tool names null/empty in pre/post tool calls" — the field `tool_name` itself was never null in any traced case; `toolKind` classification was. Fixed in `ide-rows/copilot.ts` and the parallel (test-only, not on the production path) `runtime/ide-registry.ts` TOOL_KINDS table. Test: `ide-rows.test.ts`.
- **[CONFIRMED, real logic bug] `adapters/copilot.ts`'s `inferEvent` mislabeled a COMPLETED read (PostToolUse, result already present) as `PreRead`.** The `toolKind === 'read'` check fired unconditionally before checking whether the call was actually Pre or Post, so `read-once.ts` (gated on `event: ['PreRead','PreToolUse']`) fired a SECOND, spurious time after a real VS Code (or Copilot CLI) file read had already completed — corrupting its stateful read-tracking bookkeeping. This exact code shape pre-existed for Copilot CLI's camelCase `view` tool, but was unreachable for VS Code before the routing-bug fix (VS Code's `read_file` PostToolUse went to the claude-code adapter, which doesn't classify `read_file` as a read kind at all, so the mislabeling bug never triggered). Fixed: `inferEvent` now determines Pre/Post FIRST, only promoting to `PreRead` on the pre-side (matches `claude-code.ts`'s own pattern, which was already correct). Tests added for both wire shapes in `adapter.copilot.test.ts`.
- **[CONFIRMED, real gap] The env-detection tier added to `adapter.ts` was reachable only by direct calls to that module — `run-hook.ts`'s actual CLI entrypoint (`runAsCli`) never passed `env`, so `detectIDE`/`normalize` always defaulted to `env: {}` and fell through to shape-based detection even in the one place the env tier could have mattered for real (a hypothetical future non-bundled/"universal" entrypoint).** Fixed: `run-hook.ts`'s `executeHook` gained an `env` opt (default `{}` — safe for tests, no host-shell leakage); `runAsCli` now explicitly passes `{ env: process.env }`. `runHook()` (test-facing) still defaults to `{}` unless a test opts in. This doesn't change behavior for any of the 5 shipped bundles (bundle-pinning already disambiguates them, independent of env), but makes the capability genuinely reachable end-to-end rather than a documented-but-inert reference implementation.
- **[CONFIRMED, coverage gap] `bundle-isolation.test.ts`'s `HOOK_FILES` list checked only 5 of the 8 actual bundled hook files — `dangerous-actions.js` (the deny path — arguably the most safety-critical file), `lint-format-advisory.js`, and `read-once-shared.js` were never scanned for foreign-IDE string leakage in any plugin.** Pre-existing gap (not introduced by this change), but directly relevant to this effort's cross-IDE isolation guarantee. Fixed: all 8 hook files now checked; confirmed no actual leakage in the 3 previously-unchecked files (113/113 pass).
- **[DOCUMENTED, not code-fixed — dormant/low-risk] `formatOutput` is not event-aware and would apply the merged top-level+nested emit even to a hypothetical `SubagentStop` result, whose R3 contract is top-level-only (no `hookSpecificOutput` wrapper at all, per `copilot.md`).** No current Rosetta hook targets `SubagentStop` with an `additionalContext`/deny-shaped result (confirmed against the "Output Shape by Hook Type" table below), so this is unreachable today, and likely harmless even if reached (an extra unrecognized JSON field is unlikely to be fatal) — but not proven safe, so a code comment now flags it for whoever adds the first `SubagentStop`-targeting hook, rather than building unused event-gating machinery now for zero current callers.
- **[DOCUMENTED, guide fixed] `github-copilot.md` (r2+r3) conflated `Stop` and `SubagentStop` into one output row implying both need the nested `hookSpecificOutput` form** — `copilot.md` explicitly documents `SubagentStop` as top-level-only. Split into two rows; also corrected "VS Code cloud agent treats `ask` as `deny`" → "Copilot's cloud agent..." (the spec attributes this to R1/cloud-agent, not VS Code — an invented association in the prior wording).
- **[INVESTIGATED, not changed] FR-HOOK-0005's `<status>` reset to `Draft`.** A reviewer flagged this as a possible regression (CHANGES.md records it reaching `Approved` via a prior formal reconciliation pass). Checked `docs/requirements/plugin-generator/CHANGES.md`: this project's own established convention (RECONCILIATION-5) is exactly this — enriching a requirement's acceptance criteria resets it to `Draft` pending a subsequent, separate reconciliation-review pass (RECONCILIATION-10 later re-approved it that way). This matches `hooks-verify.md`'s own stated protocol ("reset requirement status to Draft AFTER implementation"). Left as `Draft` — correct per precedent, not a regression; a future formal reconciliation pass (out of this effort's scope) would re-approve it.
- **[RETRACTED — not an error] `docs/hooks/copilot.md`'s own "Hook Locations (R4)" table lists `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`.** Previously flagged here as a likely copy-paste error from Claude Code's spec. **Correction (user, 2026-07-01): this is real — Copilot supports Claude-compatible config/hooks, so these paths are genuinely valid Copilot hook locations, not a mistake.** The sealed spec is correct as-is; no re-verification or spec-reopening needed. (The end-user configure guide's narrower list — `.github/hooks/*.json` + plugin `hooks.json` — isn't wrong either; it just doesn't additionally document the Claude-compat paths, which is a completeness question for a future guide pass, not a correctness bug.)

**Platform-level `dedupKey` mechanism REMOVED entirely (2026-06-30, user-confirmed empirically).** During the review above, this file described the platform dedup as guarding "Copilot CLI's camelCase-vs-PascalCase double-fire when both are registered" — **that framing was wrong, corrected per the user.** Tracing the original commit that introduced it (`13a3c101`, April 2026) confirms what it actually guarded against: **Copilot CLI invoking a SINGLE registered hook TWICE for one real event** — a Copilot-side runtime bug, independent of registration casing (the dedup key is built only from the camelCase fire's fields, and its own original comment already said the other shape needs no dedup — i.e. it was never a fix for dual-casing registration in the first place; confirmed separately that the non-camelCase fire's `dedupKey` always returned `null` and was never deduped by this mechanism regardless). **The user has since observed empirically that this bug is fixed by GitHub** — with hooks registered under one common PascalCase key (which the current `hooks.json.tmpl` already does, and which both VS Code and Copilot CLI honor), a single registration now fires exactly once. This is a **separate, unrelated fact** from the dedup mechanism: registering the SAME hook under two DIFFERENT keys (e.g. both `preToolUse` and `PreToolUse`) is just two distinct matching config entries and will always fire twice, dedup or not — that's config hygiene, not a bug, and was never what dedup protected against.
- Removed: `IdeAdapter.dedupKey` from `types.ts`; the `dedupKey` function + its use in `adapters/copilot.ts`; the `dedupKey` export from `adapter.ts` and all 5 `entrypoints/adapter-*.ts` files; the platform-dedup gate (`dedupKey(raw, def.name, env)` + `acquireOnce(platformKey)`) in `run-hook.ts`. `throttle.dedupBy`/`makeDedupKey` (a separate, hook-author-configurable mechanism, unrelated to IDE double-fire) is untouched.
- Updated: `define-hook.ts`'s pipeline-order comment now documents the removal and the corrected distinction (single-registration bug, now fixed, vs. dual-registration config hygiene) so it isn't silently reintroduced.
- Tests updated to assert the NEW expected behavior (duplicate raw payloads now fire twice, same as every other IDE) rather than deleting coverage: `run-hook.test.ts`, `loose-files.test.ts`. Tests that only existed to exercise the removed mechanism were deleted: `adapter.test.ts`'s `dedupKey` block, `entrypoints/adapter-copilot.test.ts`'s `dedupKey` tests, the `dedupKey` mock entry in `run-hook-debug-log.test.ts`, and `loose-files.test.ts`'s `lockPathFor` helper.

**Copilot — BUG 2, DONE (2026-06-30)** (`additionalContext`/`permissionDecision`/`permissionDecisionReason` emitted at BOTH top-level AND nested, per user decision AND the spec's own "Merged emit" notes for SessionStart/PreToolUse/PostToolUse):

| Layer | File | Fix |
|---|---|---|
| Runtime hook adapter | `src/hooks/src/adapters/copilot.ts` | `formatOutput()` now emits `additionalContext`, `permissionDecision`, `permissionDecisionReason` at BOTH top-level and nested `hookSpecificOutput` |
| Bootstrap generator | `src/rosettify-plugins/src/escaping/json-string.ts` | added `buildCopilotHookPayloadJson` (merged shape); `plugin-assemble-copilot-bootstrap.ts` switched to it |
| Bootstrap manifest | `src/rosettify-plugins/src/spec/bootstrap-manifest.ts` | `COPILOT_PLUGIN_ROOT_BASH`/`_POWERSHELL` now emit merged shape |
| Lock comment | `src/rosettify-plugins/src/bootstrap/copilot-lock.ts` | comment updated to reference the merged format |

**NFR-0004 size-check basis — FIXED (2026-07-01).** Previously noted here as a caveat: `assembleBootstrapPayload` measured `buildHookPayloadJson(rewrittenContext).length` (the Claude-shaped, single-copy wrapped/escaped payload) as a generic proxy for the 10,000-char soft-error check, shared across all IDEs — under-estimating Copilot's real entry size (merged top-level+nested duplicates the content) and, more generally, measuring JSON-wrapping/escaping overhead rather than the actual bootstrap document content the limit is meant to budget. **Corrected per user direction: the limit is about the ORIGINAL content only.** `assembleBootstrapPayload` now checks `rewrittenContext.length` (the raw additionalContext body, post-prefix/post-folder-rewrite, pre-JSON-wrapping) directly — IDE-shape-independent, so the same document gets the same verdict regardless of which IDE it's being assembled for. The now-unused `jsonPayload` parameter was removed from `EntryBuilderFn` (every IDE-specific assembler already rebuilt its own payload internally and ignored the passed one). `NFR-0004` (`docs/requirements/plugin-generator/NFR.md`) updated to state this explicitly and reset to `Draft`. Test added (`plugin-assemble-copilot-bootstrap.test.ts`): a newline-heavy body (typical of real markdown) at 9,180 raw chars — under budget — whose old Claude-shaped-escaped measurement was 13,761 chars (over budget); confirms no false-positive under the corrected check.

**Codex — adapter gap (CX-2):** `ide-rows/codex.ts` maps `PostToolUse`/`PreToolUse`/`SessionStart`/`PreCompact`/`PostCompact`/`UserPromptSubmit` — but **`Stop` was NOT mapped, RESOLVED 2026-06-30** (see "Shared registry — `Stop` semantic event" below). `SubagentStop` is not mapped for any IDE's registry — by decision, documented-only, not mapped (see User Decisions).

**Shared registry — `Stop` semantic event added (2026-06-30, all IDEs except Devin CLI):** discovered while doing Claude Code's change-phase turn: grepping all of `src/hooks/src` for `Stop`/`SubagentStop` returned zero matches — the shared `SemanticEvent` registry (`ide-registry.ts`) had neither event for *any* IDE, not just Codex (CX-2 under-described the root cause as Codex-row-specific). Per user decision, added shared plumbing for `Stop` only (the blockable turn-stop, prevents the agent from stopping at the very end) — **not** `SubagentStop`, and **not** any hook business logic; this is registry/normalization support for future use, no current Rosetta hook targets it. Windsurf excluded (Devin Desktop spec confirms **no session-level lifecycle events at all** — no `SessionStart`/`SessionEnd`/`Stop`/`AgentStop`/`SubagentStop`). Devin CLI excluded per user instruction (not in `IdeName` anyway; non-validated). Raw event name per IDE (grepped from each spec, not re-derived): claude-code `Stop`, codex `Stop`, cursor `stop` (lowercase), copilot `Stop` (PascalCase only — copilot.md's registration guidance: PascalCase serves both VS Code and CLI without the CLI's camelCase-`agentStop` double-fire).
- `src/hooks/src/runtime/ide-registry.ts` — added `Stop` row to `EVENTS`
- `src/hooks/src/runtime/ide-rows/{claude-code,codex,cursor,copilot}.ts` — added `Stop` to each local `EVENTS` map (windsurf unchanged — unsupported)
- Tests: `src/hooks/tests/runtime/ide-registry.test.ts` + `ide-rows.test.ts` — `Stop` lookups per IDE incl. windsurf's explicit null and copilot's unregistered-camelCase-`agentStop` → null. Full suite green (646/646), `tsc --noEmit` clean.
- **Verified (read-only subagent, 2026-06-30) against the per-IDE specs that the mapped raw name is semantically the right "final checkpoint gate" event** (fires at turn end, not mid-turn/per-subagent, and can actually force continuation — not just observe): Claude Code/Codex/Copilot block via top-level `decision:"block"` + required `reason`. **(!) Cursor's `stop` gates differently — via `followup_message` (auto-submits a corrective next turn), NOT `decision:"block"`.** A future hook targeting Cursor's `stop` for this pattern must use `followup_message`, not `decision:"block"` — the latter is a silent no-op there. Windsurf's omission reconfirmed correct: spec states no session-level lifecycle events exist at all; its only turn-end analog (`post_cascade_response`) is a post-hook and cannot block.

**Cursor — DONE (2026-06-30):** deny-reason channel CONFIRMED across 2 mechanisms — the adapter's `permissionDecisionReason → user_message` mapping is correct, **no change needed**. `exitCode()` deny→2 (Action 2) was investigated empirically (Run 4) and **deliberately NOT implemented** — see Bug 1's correction note; Cursor keeps the default exit code 0. Configure-guide Hooks section (Action 3, expanded scope) **added** to `instructions/r2+r3/core/configure/cursor.md`. `src/rosettify-plugins`/`docs/REQUIREMENTS` already correctly specified Cursor's payload shape — no gap found, no change needed there.

**Claude Code — change-phase DONE (2026-06-30):** `src/hooks/src/adapters/claude-code.ts` (identity pass-through), `src/rosettify-plugins` (`buildHookPayloadJson` nested-only `additionalContext`, `buildClaudeBootstrapEntry`, `CLAUDE_PLUGIN_ROOT_ENTRY`'s `${CLAUDE_PLUGIN_ROOT}`) and `docs/REQUIREMENTS/plugin-generator/FR-HOOK.md` all already matched the verified spec — no gaps, no changes needed. **Only gap found:** `instructions/r2+r3/core/configure/claude-code.md` had ZERO hooks documentation (no Locations/registration/events/output/exit-codes/matchers). **Added** a compressed Hooks section (r2+r3, byte-identical) modeled on `cursor.md`'s: Hook Locations, Registration Format, Supported Events, Output (nested `hookSpecificOutput`), Exit Codes, Matchers.

**Windsurf (Devin Desktop) — BUG 1, exit-code portion DONE (2026-06-30):** `adapters/windsurf.ts` no longer emits the dead `_exitCode` JSON field; blocking now goes through the **exit-code mechanism** (`exitCode()` → 2 on deny, read by `run-hook.ts`'s decision tree). NOTE: this was implemented alongside Cursor's Action 2 work as a shared plumbing change (decision tree + `IdeAdapter.exitCode` + per-bundle entrypoints), ahead of Windsurf's own dedicated verification turn — Windsurf's spec (`windsurf.md`) was already VERIFIED/COMPLETE with this exact mechanism confirmed (Run 1: "Deny via exit-2 + stderr CONFIRMED"), so this isn't new hypothesis, just completing an already-verified fix.

**Windsurf (Devin Desktop) — deny reason text delivery: DONE (2026-07-01, Action 9).** The *protocol* was already verified (`windsurf.md`: Cascade delivers a `pre_*` hook's stderr to the agent verbatim on exit 2, appending `: action blocked by hook`; Run 1: "Deny via exit-2 + stderr CONFIRMED"). The gap was that **Rosetta's shipped code did not use that channel** — `adapters/windsurf.ts`'s `formatOutput` put the deny reason into `additionalContext` → serialized to **stdout**, which Windsurf never parses (Run 1: "9× exit 0, textLen 0/stderrLen 0"). So a real hook blocked the action (exit 2 worked) but the agent never saw why. **Fixed:** added an adapter `stderrMessage(canonical)` method (symmetric to `exitCode`) + `stderrMessageFor` dispatcher; Windsurf's returns the `permissionDecisionReason` on deny (verbatim, no trailing newline); `run-hook.ts` now carries it on the `HookExecutionReport` and both `runAsCli` and `runHook` write it to `process.stderr`. Windsurf's `formatOutput` now returns `{}` (stdout carries nothing — the dead `additionalContext` path removed). See Action 9.

**Configure-guide Output Contract gaps (INT-IDE-0002):** `codex.md` (r2+r3) **DONE (2026-07-01)** — Hooks section rewritten (Action 4). `cursor.md` (r2+r3) **DONE** — full Hooks section added (Action 3, expanded beyond just Output Contract). `claude-code.md` (r2+r3) **DONE (2026-06-30)** — full Hooks section added (Action 6). `github-copilot.md` (r2+r3) **DONE (2026-06-30)** — Hooks section rewritten (Action 1): corrected per-runtime input shape table, merged-emit output contract (both placements for every field), dropped the wrong "one `hookSpecificOutput` wrapper for everything" framing. See Requirements / Instructions Alignment + Actions.

---

## Hooks — Output Shape by Hook Type

| Hook | Result kinds | Notes |
|---|---|---|
| `dangerous-actions.js` | `deny`, `null` | Uses `deny(reason)` on pattern match; null if safe or marker allows |
| `lint-format-advisory.js` | `advise` | Always `advise(message)` on trigger |
| `loose-files.js` | `advise`, `null` | `advise` if loose file; null if within module |
| `md-file-advisory.js` | `advise` | Always `advise(message)` |
| `codemap-refresh.js` | `side-effect` | No stdout; agent must NOT see this hook |
| `read-once.js` | `advise`, `deny`, `null` | `deny` only in `READ_ONCE_MODE=deny` |
| `read-once-reset.js` | `side-effect` | No stdout |

All advisory hooks (`advise`) set `additionalContext` — relevant to Bug 2 for Copilot PostToolUse.
All deny hooks set `continue: false` + `permissionDecision: 'deny'` — relevant to Bug 1 (exit code).

---

## Bug 1 — Exit Code Never Matches Hook Result

**STATUS: FIXED (2026-06-30)** for the decision-tree plumbing + Windsurf + Cursor. Codex/Copilot/Claude Code adapters were already correct by default (exitCode unset → 0) and needed no change.

**File:** `src/hooks/src/runtime/run-hook.ts` (was lines 397–403; logic now in `resolveExitCode`, exported for tests).

Was: all success paths returned `exitCode: 0` unconditionally. Now: `resolveExitCode(result, canonical, ide)` implements the decision tree below; its result is used in both the side-effect and main return paths.

Per-IDE expected exit code for deny (full exit-code contract is in each spec's Exit Codes section):
- Claude Code: `0` · Codex: `0` · Copilot: `0` (deny via JSON) · **Cursor: `0`** (deliberate — see correction below) · Windsurf: `2` (exit code is the ONLY mechanism; stdout not parsed).

**(!) Correction vs the original plan (Cursor Run 4, 2026-06-30):** the original fix design called for `exitCode()→2` on BOTH Windsurf and Cursor. Empirical testing showed pairing exit-2 with Cursor's JSON deny body does NOT get parsed — Cursor dumps the raw, unparsed JSON text (including `agent_message`, which the working exit-0 path never exposes) as the block reason. Since Cursor's exit-0 + `permission:"deny"` JSON deny is already confirmed working and field-selective (Runs 1+3), adding the exit-code override would trade a clean, verified mechanism for a worse one with no functional gain. **Decision (user, 2026-06-30): Cursor keeps the default `exitCode` (0) — no override implemented.** `adapters/cursor.ts` and `entrypoints/adapter-cursor.ts` both carry a comment explaining this so a future maintainer doesn't "fix" it by adding one. Windsurf's portion proceeded as originally planned (its only mechanism IS the exit code; no JSON-parsing path exists to prefer).

**Implemented:** `exitCode?(canonical: CanonicalOutput): number` added to `IdeAdapter` (`src/hooks/src/types.ts`) and to each slim per-IDE bundle entrypoint (`src/hooks/src/entrypoints/adapter-*.ts`, each bundle aliases `../adapter` to its own entrypoint — see `scripts/build-bundles.mjs`). `adapter.ts` exports `exitCodeFor()`. Windsurf's adapter implements `exitCode` → 2 on deny; the dead `_exitCode` JSON field (never parsed by Windsurf) was removed from its `formatOutput`. Cursor implements no override (see correction above).

**Exit code decision tree (`resolveExitCode`, implemented 2026-06-30):**
```
try {
  _exitCode is not null  → return _exitCode   // emergency override; MUST document: DO NOT use unless EXTREMELY necessary
  deny                   → return IDE-specific exit code (adapter.exitCode(), default 0)
  default                → return 0
} catch {
  return 1000
}
```

`_exitCode` override: optional field on every `HookResult` variant (`src/hooks/src/runtime/types.ts`); if non-null, it bypasses both deny-logic and default. Documented inline as a last-resort escape hatch, not for normal hook use — **scope correction**: this is an internal `src/hooks`-authoring API, not something `instructions/*/configure/*.md` end-user guides should document (those describe the generated plugin's wire contract, not Rosetta's internal hook-writing API).

**Tests:** `src/hooks/tests/runtime/run-hook.test.ts` (`resolveExitCode` decision tree — deny per IDE, `_exitCode` override on deny and on allow, unknown-ide default, throw→1000) and `src/hooks/tests/adapter.windsurf.test.ts` (updated: `_exitCode` no longer in the JSON body; `exitCodeFor` returns 2 on deny, 0 otherwise).

---

## Matchers and Hook Trigger Wiring

Matchers are internal TypeScript predicates that determine whether a hook fires for a given tool call.

**Regex convention:** `^(?:PATTERN)$` — anchored, non-capturing group wrapping alternatives. Example from `dangerous-actions/patterns.ts`:
```typescript
{ id: 'ssh-private-key', re: /^(?:id_rsa|id_ed25519|id_ecdsa|id_dsa)$/, ... }
```

**Wiring in `run-hook.ts`:**
- `FilePathPredicate` → checked at `evalFilePath()` — matches `ctx.filePath` against basename/extension/notContainsAny rules
- `ToolInputPredicate.commandMatchWhen` → checked at `evalToolInput()` — matches `ctx.toolInput.command` against `re.test(command)`; only fires when `ctx.toolName` is in the `tools` array AND the command matches the regex

**Per-hook wiring:**

| Hook | Matcher type | Pattern | Notes |
|---|---|---|---|
| `dangerous-actions` | `DANGEROUS_BASH[].re` | Various regex on bash commands | Applied to `ctx.toolInput.command` |
| `dangerous-actions` | `DANGEROUS_PATHS[].re` | `^(?:PATTERN)$` on file paths | Applied to `ctx.toolInput.file_path` |
| `dangerous-actions` | `DANGEROUS_CONTENT[].re` | Pattern on file content | Applied at write/edit time |
| `loose-files` | `commandMatchWhen.re` | `/^\*\*\* (?:Add\|Create) File:/m` | Only for `apply_patch` tool |
| `lint-format-advisory` | no commandMatchWhen | — | Fires on all write/edit tool calls |
| `md-file-advisory` | no commandMatchWhen | — | Fires on `.md` extension |

Document per-IDE matchers and wiring when working on each IDE's configure guide.

---

## Requirements / Instructions Alignment

| Source | Finding |
|---|---|
| `docs/requirements/plugin-generator/FR-HOOK.md` | ✅ DONE (2026-06-30) — FR-HOOK-0005 and FR-HOOK-0007 each gained an explicit acceptance criterion for Copilot's merged `{"additionalContext":"...","hookSpecificOutput":{...}}` shape (doc entries + plugin-root entry); `implementationNotes` updated; FR-HOOK-0005 status reset to `Draft` (implementation landed, needs re-approval). Per-IDE entry shapes otherwise correct: Claude (`once:true`), Codex (`statusMessage+timeout`), Copilot (`bash+powershell`+lock), Cursor (plain command). |
| `docs/requirements/plugin-generator/FR-VAR.md` | ✅ Cursor `additional_context` (FR-VAR-0020) required explicitly |
| `docs/requirements/plugin-generator/REFERENCES.md` | INT-IDE-0002 designates configure guides as authoritative for hook output format |
| `instructions/*/configure/github-copilot.md` | ✅ DONE (2026-06-30) — Hooks section rewritten (r2+r3, byte-identical): corrected per-runtime input shape table (camelCase CLI vs snake_case VS Code/CLI-PascalCase), merged-emit output contract (every field at both placements), dropped the wrong "one `hookSpecificOutput` wrapper for everything" framing |
| `instructions/*/configure/cursor.md` | ✅ DONE (2026-06-30) — full Hooks section added (r2+r3): Locations, Registration Format, Supported Events, Output, Exit Codes, Matchers, plus the `failClosed`/`ask`/exit-2-vs-JSON gotchas. **`### Input` model added (Action 7, 2026-07-01); Skills `disable-model-invocation` note synced r2/r3 + `- revalidate`.** |
| `instructions/*/configure/claude-code.md` | ✅ DONE (2026-06-30) — full Hooks section added (r2+r3, byte-identical): Locations, Registration Format, Supported Events, Output (nested `hookSpecificOutput`), Exit Codes, Matchers. **`### Input` model added (Action 7, 2026-07-01).** |
| `instructions/*/configure/windsurf.md` | ✅ DONE (2026-07-01, Action 9) — full Hooks section added (r2+r3, byte-identical): Locations (`.devin/` + `.windsurf/` alias), flat-Cascade Registration (no `matcher`), Supported Events (per-operation split, pre-only blocking, no session-lifecycle events), `### Input` (windsurf-native), Output (exit-code + stderr only, NO stdout JSON), Exit Codes, Matchers. Sourced from `docs/hooks/windsurf.md`; regenerated into 6 plugin targets. |
| `instructions/*/configure/codex.md` | ✅ DONE (2026-07-01) — Hooks section rewritten (r2+r3, byte-identical): corrected registration key (`hooks` not `handlers`), PreToolUse matcher (Bash/apply_patch/MCP), `Stop`/`UserPromptSubmit` status; added `hookSpecificOutput` Output Contract (nested context/deny/rewrite + top-level block), `permissionDecision:"ask"` unsupported, strict-schema + `systemMessage` gotchas, corrected exit codes. **`### Input` model added + example matcher aligned to template + PostToolUse output wording softened + `PLUGIN_ROOT`/`PLUGIN_DATA` flagged `- revalidate` (Action 7, 2026-07-01).** |
| `src/rosettify-plugins/src/escaping/json-string.ts` | ✅ DONE (2026-06-30) — added `buildCopilotHookPayloadJson` → `{"additionalContext":"...","hookSpecificOutput":{...}}` (merged, not a replacement of the nested form) |
| `src/rosettify-plugins/src/spec/bootstrap-manifest.ts` | ✅ DONE (2026-06-30) — `COPILOT_PLUGIN_ROOT_BASH`/`_POWERSHELL` now emit the merged shape |
| `src/rosettify-plugins/src/bootstrap/copilot-lock.ts` | ✅ DONE (2026-06-30) — comment updated to reference the merged format |
| `src/rosettify-plugins/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts` | ✅ DONE (2026-06-30) — switched to `buildCopilotHookPayloadJson` |
| `src/hooks/src/adapter.ts` + `entrypoints/adapter-copilot.ts` + `runtime/ide-rows/copilot.ts` | ✅ DONE (2026-06-30) — routing-bug fix: see "Copilot — change-phase DONE" above |

**Note on requirement status reset:** FR-HOOK.md status fields are reset to `Draft` AFTER changes are approved AND implemented — not during discovery or check phase.

---

## Spec Authoring Rules (Mandatory — apply to every spec doc)

These are standing rules. Violations are NOT acceptable and must be caught before HITL approval.

1. **Ref column on every field table.** Every field table MUST have a `Ref` column citing which reference (R1/R2/R3/R4/etc.) defines each field. No field without a source. No exceptions.
2. **UX-destructive behaviors must be actively flagged.** Behaviors like "`systemMessage` is shown to the user regardless of all other output" are NOT plain field notes — they destroy UX if missed. Mark with `(!) UX: ...` and make it impossible to overlook. Manufacturer guidance must NEVER be downgraded.
3. **Hook names must be EXACT as defined by the manufacturer.** No invented names (e.g., `SessionStop`, `SessionEnd` that appear in no reference). No suggestions. No thinking. FACTS ONLY. If a name exists in R1 and a different name exists in R4, document both separately under their exact names.
4. **Merge by identity, never split, never guess.** Two SEPARATELY-NAMED hooks are TWO hooks — each its own section under its exact manufacturer name (`Stop` vs `agentStop` = separate; `agentStop` vs `subagentStop` = separate). When the ONLY difference is letter-case or model shape of the SAME hook name (`SessionStart`/`sessionStart`, `PreToolUse`/`preToolUse`), it is ONE hook with different field shapes — MERGE into a single section and document the per-shape fields (with `Ref` per field). Never split a single hook into multiple; never invent structure.
5. **Input normalization gaps ARE required work.** Where our adapters in `src/hooks` handle input only partially (e.g., camelCase only, not snake_case), those gaps must be documented as required changes — not deferred silently.
6. **`permissionDecisionReason` constraint must never be simplified.** Correct form: `(!) REQUIRED when permissionDecision is "deny" OR when decision is "block"`. Writing "required when deny" or any shorter form is a violation.
7. **Merged output contract must be explicit.** When a field is emitted at both top-level AND inside `hookSpecificOutput`, that must be stated explicitly — not implied by listing the field twice without explanation.
8. **Document EXACTLY as the manufacturer defines — zero improvements.** No speculation, no editorializing, no "may represent the same lifecycle moment," no inferred unification, no narrating reasoning. State only what the manufacturer documents. If two things are documented separately, keep them separate; if a behavior is unknown, say "unknown / not documented" — never invent a bridge between facts.
9. **Use the dedicated field per purpose — `additionalContext` is not a catch-all.** Map each output to the field the manufacturer designates: deny reason → `permissionDecisionReason`; context injection (SessionStart, PostToolUse advisory) → `additionalContext`. Never use `additionalContext` to carry a deny reason, and never default everything to `additionalContext`.
10. **Scope reasonably — no extremes.** Support the real input/output shapes (CLI camelCase + VS Code snake_case) sensibly; platforms are largely case-tolerant. Don't over-engineer for every theoretical variant, and don't under-handle real ones. When a behavior is uncertain, CONFIRM it empirically (build/install a throwaway probe and observe) rather than guess or speculate in the doc.

---

## Open Items — TBD Before Implementation

- **OI-1, OI-2 — ✅ RESOLVED (2026-06-25):** dedicated-field-per-purpose (`additionalContext` for context, `permissionDecisionReason` for deny); `Stop` (VS Code standard) and `agentStop` (Copilot-custom) are SEPARATE events, documented each exactly as defined. Folded into User Decisions + the specs.
- **OI-3 — ✅ RESOLVED (2026-06-30):** Copilot input-normalization now supports BOTH Copilot CLI (R1 camelCase) AND VS Code (R3 snake_case) in `adapters/copilot.ts`'s `normalize()`. Turned out to be load-bearing, not just a nicety — see the routing-bug finding above (VS Code traffic was previously never reaching this code path at all, routed to `claude-code`'s adapter instead). NOTE (R2): VS Code IGNORES matcher values — hooks fire on ALL tools, self-guard internally (unchanged, still true).
- **OI-4 — [GENERAL, all IDEs — not Cursor-specific] 🚫 OUT OF SCOPE (user, 2026-07-02) — deferred, not decided.** The question (should `src/hooks`'s runtime contract get its own requirements doc?) is explicitly parked out of scope for now. `docs/requirements/plugin-generator` deliberately excludes `src/hooks` runtime internals — `SCOPE.md:18` ("compiling TypeScript hook sources is a separate concern") and `ASSUMPTIONS.md:7` AC-3 ("Hook bundles are an external input") — so the per-IDE exit-code contract, adapter `formatOutput`/`exitCode`/`stderrMessage` behavior, and the `_exitCode` escape hatch continue to live ONLY in `docs/hooks/<ide>.md` (verification specs) + code comments, with no FR-style requirements doc. No new doc is created; revisit only if a future effort explicitly re-opens it.
- **OI-5 — ✅ RESOLVED (2026-07-02) — Design B implemented (single adapter object).** Was: every one of the 5 slim entrypoints AND `adapter.ts` had to re-export the FULL named API surface, so any new adapter method (e.g. `stderrMessage`→`stderrMessageFor`, 2026-07-01) required editing 6 files in lockstep. **Fix (user-approved direction):** `run-hook.ts` now imports a single `{ adapter }` object (`AdapterApi`, `types.ts`) from `../adapter` instead of 6 named functions. New `entrypoints/make-entrypoint.ts` builds that object from one `IdeAdapter` (`makeEntrypoint(adapter)`); each of the 5 `entrypoints/adapter-<ide>.ts` collapsed to 2 lines (`import { <ide> }` + `export const adapter = makeEntrypoint(<ide>)`); `adapter.ts` gained `export const adapter: AdapterApi = {…}` (named exports kept for direct test imports). `build-bundles.mjs` alias unchanged. **A new adapter method is now a 1–2-file change** (`make-entrypoint.ts` + `adapter.ts`'s object literal), never the entrypoints. tsc clean, 726/726, 40 bundles build; `bundle-isolation.test.ts` still green.
  - **DCE follow-up (user asked; answered — separate item, NOT done here):** *Can `tsc` / the bundler strip the other IDEs' "dead" adapter code so we could go further (one generic entrypoint importing all 5, selecting at build time)?* **`tsc`: no** — no cross-module tree-shaking; it keeps all value imports (elides type-only), and it's used here only for `--noEmit`, not for the shipped bundles. **`esbuild`: yes, it tree-shakes** — but relying on it for cross-IDE isolation would make a security-relevant guarantee depend on the optimizer and require a compile-time-constant IDE selection (`define`). The current + Design-B design keeps isolation **structural** (each entrypoint imports exactly one adapter; the other four are never in the import graph, so esbuild never sees them) — strictly more robust than DCE. **Recommendation: do NOT rely on DCE.** Collapsing the 5 two-line entrypoints into one generic entrypoint is still possible without DCE (per-bundle alias to the selected adapter, needs uniform adapter exports) — tracked as **OI-7** below; not pursued now (the 2-line entrypoints are already cheap and keep the per-IDE test seams).
- **OI-6 — ✅ RESOLVED (2026-07-02) — option (b): keep `runHook`, extract the shared stderr write.** `runHook` stays the documented in-process test seam (8 test files depend on it; folding it into `executeHook` would churn them for no gain). The duplicated `if (report.stderrMessage) …write(…)` in `runAsCli` (`run-hook.ts:44`) and `runHook` (`:248`) is now a single `writeStderrMessage(report, stderr = process.stderr)` helper used by both. No behavior change; existing `run-hook.test.ts` stderr assertions cover it. (Dead `runHook` import in `read-once.ts` already removed 2026-07-01.)
- **OI-8 — ✅ RESOLVED (2026-07-02) — canonical-completeness bug hunt via the log-driven E2E suite. 5 real bugs found & FIXED (incl. a safety bug); tests now assert the CORRECT behavior.** Driven by the user's rule: *the internal canonical model + its functions must always be fully mapped; a field may be empty only if genuinely absent from the input AND not derivable.* Every null/undefined/empty assertion in all 5 e2e suites was grounded against the real log + spec. Adapters were fixed where a value was present/derivable but dropped; tests flipped to assert the corrected value (with a downstream-proof test where it has runtime impact). Full suite 860/860, tsc clean, hermetic.
  - **(!) SAFETY — Windsurf `pre_write_code`/`post_write_code` were mapped to `Write` and `buildToolInput` DROPPED `edits`.** Real payload is `tool_info={edits:[{old_string,new_string}], file_path}` — the MultiEdit shape. Because it was `Write`/`toolKind:write`, `dangerous-actions.evalWrite` scanned `content` (never present on Windsurf) → **all content Cascade wrote (PEM/AWS keys, `DROP TABLE`, …) bypassed the dangerous-content patterns entirely.** Fix: `adapters/windsurf.ts` → `tool_name:'MultiEdit'` + `buildToolInput:{file_path,edits}`; `ide-rows/windsurf.ts` TOOL_KINDS += `'multi-edit':['MultiEdit']`. Now `evalMultiEdit` scans `edits[].new_string`. Downstream-proof test added (PEM key in `edits` → deny, exit 2 + stderr). Also fixed the enshrined-bug assertions in `tests/adapter.windsurf.test.ts` + `tests/adapter.test.ts`.
  - **Cursor `beforeReadFile`/`beforeTabFileRead`** — `getFilePath` read only `tool_input.*` but these carry `file_path` at TOP LEVEL; toolKind/tool_name were null. Fix: top-level fallback in `getFilePath`; `getToolName` derives `Read`/`TabRead` from the event (grounded: `tool_name:"Read"` 8× in `cursor-logs.txt`); TOOL_KINDS += `TabRead`/`TabWrite`. read-once now dedupes Cursor's native read (proven by a new test).
  - **Cursor `beforeShellExecution`/`afterShellExecution`** — `toolKind`/`tool_name` were null though these are the granular hooks for Cursor's `Shell` tool. Fix: `getToolName` derives `Shell` → `toolKind:bash`. `event` stays null BY DESIGN (no Rosetta semantic event; mapping to PreToolUse would double-fire with the generic `preToolUse` — cursor.md PC2), so no routing change — a pure canonical-completeness fix.
  - **Copilot CLI `view`** — `getFilePath` didn't read the `path` key (`toolArgs={"path":…}`) → empty file_path → read-once couldn't track `view` reads. Fix: `getFilePath` now reads `path` (both wire shapes). (VS Code `list_dir` also gains a resolved path as a side effect — harmless, event is PreToolUse not PreRead.)
  - **Copilot `Stop`** — `event:null` though the registry maps `Stop→'Stop'` (44 real payloads). Fix: `inferEvent` falls back to `lookupEvent(explicit)` for any registry-known explicit event. `SubagentStop` stays null BY DESIGN (intentionally unmapped — documented-only decision).
  - **Grounded TRULY-ABSENT (no bug), confirmed against the real `SemanticKind` set `{write,edit,multi-edit,patch,create,replace,bash,read,mcp-call}`:** `Agent`/`task`/`runSubagent` (subagent spawn) and `list_dir` (directory list) map to NO kind → `toolKind:null` is correct (deliberate scope boundary). Codex shell reads (`cat`/`sed`) legitimately have no structured `file_path` (the path lives in `tool_input.command`, which IS mapped and recovered downstream by read-once). Claude (identity adapter) had zero drops. All such assertions now carry a one-line grounding cite.
  - **Per-IDE tally:** Claude 0 · Codex 0 · Copilot 2 (view path, Stop) · Cursor 2 (read event, shell hooks) · Windsurf 1 (write-edits safety). All fixes grounded in the real log or spec — no invented values.
- **OI-7 — ⏳ [TODO, optional; spun off from OI-5's DCE follow-up] Collapse the 5 two-line entrypoints into one generic entrypoint.** After Design B, `entrypoints/adapter-<ide>.ts` are each 2 lines (`import { <ide> }` + `export const adapter = makeEntrypoint(<ide>)`). A single `entrypoints/adapter-generic.ts` that imports the selected adapter through a per-bundle build alias (a 2nd `onResolve` in `build-bundles.mjs`) would remove even those — **preserving structural isolation, NOT relying on DCE** (see OI-5's DCE note). **Cost:** needs a uniform adapter export (add `export default <adapter>` to each `adapters/<ide>.ts`, one-time) or per-IDE selector shims, and the per-IDE entrypoint test (`tests/entrypoints/adapter-copilot.test.ts`) would test `makeEntrypoint(copilot)` directly instead of importing the entrypoint. Low value vs. the 2-line status quo — do only if entrypoint count becomes a real maintenance drag. Not a bug.

---

## Log-Driven E2E / Integration Tests — ✅ DONE (2026-07-02)

**Result: 132 e2e tests across all 5 IDEs, replaying REAL captured wire payloads through the real pipeline. Full package suite 858/858, `tsc` clean, deterministic (5× per IDE), hermetic (real `~/.rosetta/state` md5 identical before/after — see below).**

- **Harness:** `src/hooks/tests/e2e/helpers.ts` — `runReal(hookDef, rawWireString, env?)` drives the FULL pipeline with NO adapter mocks (readStdin→detectIDE→normalize→gates→run→toCanonical→formatOutput→resolveExitCode→stderrMessageFor), returning `{stdout, report}`. `rawFixture` reads the EXACT wire bytes so `readStdin`'s parse is exercised end-to-end. `normalize`/`detectIDE` take PARSED objects (only readStdin parses the string).
- **Per IDE** (`tests/e2e/<ide>.e2e.test.ts` + verbatim `fixtures/<ide>/*.json` from that IDE's `docs/hooks/<ide>-logs.txt`, zero cross-IDE contamination): **claude-code 20, codex 21, cursor 30, windsurf 24, copilot 37.** Each covers **detection** (real ENV signature via env-tier + payload-shape), **normalization** (every distinct captured event/tool → exact field values), and **each Rosetta hook** that has a real input (output wire shape + exit code + stderr, per that IDE's contract).
- **Per-IDE contracts asserted against reality** (all verified by the lead against the adapter source): claude-code canonical nested; codex nested `hookSpecificOutput`; cursor FLAT snake_case (`permission`/`user_message`/`additional_context`), deny exit 0; copilot MERGED emit (top-level + nested), no top-level `continue`; windsurf `formatOutput`→`{}`, deny via exit 2 + stderr reason (advise text dropped — no non-blocking channel).
- **Statefulness handled correctly:** read-once/read-once-reset persist to `$HOME/.rosetta/state` via a module-level `STATE_ROOT` bound at IMPORT (a temp-`HOME` override does NOT isolate). Every e2e file swaps ONLY the persistence backend for an in-memory `vi.mock('../../src/runtime/state-store', …)` (pipeline/adapters/real `fs.statSync` stay real) → hermetic + deterministic. Stateful advise/deny driven via each IDE's real read wire SHAPE pointed at a temp file (a verbatim single read can't pin fs+state).
- **Honest, documented gaps (NOT fabricated):** no session captured Write/Edit or a genuinely dangerous command, so dangerous-actions deny + write/edit-triggered hooks (lint-format-advisory/md-file-advisory/loose-files/codemap-refresh) have no real input in these logs — covered by unit tests; noted in each file header. Windsurf has no session-lifecycle/compact events (read-once-reset gate-out only). Codex/Copilot: tool_input-less events shape-detect as claude-code (leaner signature) → env tier is load-bearing; suite passes real env to force the right IDE.
- **The suite is a BUG HUNT, not a behavior snapshot (corrected 2026-07-02).** Initial framing wrongly told the tests to "assert whatever the code emits," which ENSHRINED bugs. Corrected principle: **the canonical `NormalizedInput` must be FULLY MAPPED — a field may be null/empty ONLY if the value is genuinely absent from the raw input AND not derivable** from the event name, another field, or the manufacturer's documented vocabulary. Every null/undefined/empty assertion across all 5 suites was re-audited against the real log + spec; each is now either a grounded TRULY-ABSENT (with a cite comment) or a FIXED bug. See "Bugs found & fixed" in OI-8.

### Original plan (kept for provenance)

**Goal: prove the hook pipeline works FOR SURE, end-to-end, against REAL captured traffic — not just unit mocks.** Now that all per-IDE specs are VERIFIED and the captured live-run logs exist, build integration/e2e tests that replay the real recorded inputs through the actual `run-hook` pipeline and assert the EXACT outputs. This is the empirical safety net that turns "verified once by hand" into "continuously verified in CI".

**Scope (do AFTER OI-5/OI-6 — those are done):**
- **Source of truth = the captured logs, per IDE, per option/event.** Use the cleaned per-IDE logs (`docs/hooks/<ide>-logs.txt`) + the `Appendix — Observed Wire Examples` in each `docs/hooks/<ide>.md` (real INPUT payloads per event; ACCEPTED OUTPUT shapes). These are real recorded `session_id`/`trajectory_id` traffic, not synthetic fixtures.
- **For every (IDE × event × option)** — SessionStart, PreToolUse, PostToolUse, Stop, deny/advise/rewrite/side-effect — assert against the real input:
  - **parsing/normalization**: `detectIDE` picks the right IDE; `normalize` maps every field correctly (event, toolKind, tool_name, file_path, cwd, session/agent/turn ids, tool_input, tool_response) with the EXACT expected values;
  - **output wire shape**: `formatOutput` emits the EXACT bytes the manufacturer accepts (e.g. Copilot merged top-level + nested; Codex nested-only; Windsurf `{}`), field-by-field;
  - **exit code**: `resolveExitCode`/`exitCodeFor` returns the per-IDE contract value (Windsurf 2 on deny; others 0);
  - **stderr channel**: `stderrMessageFor` delivers the deny reason where and only where it should (Windsurf yes; all others undefined).
- **Drive the REAL pipeline** (`executeHook`/`runHook` + the real adapters), not per-adapter units — this is the layer the earlier `tester.js` live runs deliberately bypassed (it wired events directly and validated only the wire protocol, not Rosetta's routing/toolKind/gate pipeline). This closes exactly the gap that let the VS Code Copilot routing bug ship undetected (see Change-phase findings).
- **Consider** a small fixture-extractor that pulls the real input/output blocks out of `<ide>-logs.txt` by `session_id` (reuse `split-logs.js` conventions) into committed fixtures, so tests are deterministic and don't depend on `~/.rosetta/hooks.log`.
- **Isolation discipline** (per Spec Authoring / Testing rules): keep each IDE's fixtures + expectations sourced ONLY from that IDE's own spec/log — zero cross-IDE contamination.

**Deliverable:** a committed `tests/e2e/` (or `tests/integration/`) suite, per-IDE, green in CI, plus committed real-traffic fixtures. Definition of done: every verified `Observed` row in every spec has a corresponding replay assertion.

---

## Actions (implementation record; all actions complete as of 2026-07-01)

### Action 1 — Fix Bug 2 + the routing bug: Copilot merged-emit + VS Code toolKind fix — ✅ DONE (2026-06-30, scope expanded)
- `src/hooks/src/adapters/copilot.ts:93` — `formatOutput()` now emits `additionalContext`/`permissionDecision`/`permissionDecisionReason` at BOTH top-level AND nested `hookSpecificOutput` (merge, NOT a replacement of the nested form)
- `src/rosettify-plugins/src/escaping/json-string.ts` — added `buildCopilotHookPayloadJson` → `{"additionalContext":"...","hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"..."}}`
- `src/rosettify-plugins/src/plugin-processors/plugin-assemble-copilot-bootstrap.ts` — switched to `buildCopilotHookPayloadJson`
- `src/rosettify-plugins/src/spec/bootstrap-manifest.ts` — `COPILOT_PLUGIN_ROOT_BASH`/`_POWERSHELL` now emit the merged shape
- `src/rosettify-plugins/src/bootstrap/copilot-lock.ts` — comment updated
- `instructions/r2+r3/core/configure/github-copilot.md` — Hooks section rewritten: corrected per-runtime input shape table, merged-emit output contract per field, dropped the wrong uniform-`hookSpecificOutput`-for-everything framing
- `docs/REQUIREMENTS/plugin-generator/FR-HOOK.md` — FR-HOOK-0005 + FR-HOOK-0007 gained explicit merged-shape acceptance criteria; FR-HOOK-0005 status reset to `Draft`
- **Scope expanded beyond the original plan** (see "NEW FINDING" in Change-phase findings above): `ide-rows/copilot.ts` (VS Code tool-name vocabulary + `tool_input`-object `getFilePath`), `adapters/copilot.ts normalize()` (OI-3, both wire shapes), `entrypoints/adapter-copilot.ts` (claude-code fallback removed — the actual shipped-bundle fix), `adapter.ts` (env-based detection tier, never shipped but used by direct/unbundled tests)
- Tests: `src/hooks/tests/adapter.copilot.test.ts` (VS Code snake_case normalize + merged-emit formatOutput + PreRead/PostToolUse regression), `adapter.test.ts` (env-priority detection), `runtime/ide-rows.test.ts` (`run_in_terminal`/`read_file`/PascalCase-`Bash` toolKind), new `tests/entrypoints/adapter-copilot.test.ts` (proves the shipped bundle, not just the general dispatcher), `bundle-isolation.test.ts` (claude-code now enforced ABSENT from core-copilot; all 8 bundled hook files checked, not just 5), `rosettify-plugins` tests for `buildCopilotHookPayloadJson` + the assembled bootstrap payload. Post-implementation adversarial review (2 parallel independent agents, findings + fixes above) folded in same-day. Full suite green both packages (`src/hooks`: 724/724; `src/rosettify-plugins`: 443/443), `tsc --noEmit` clean on both.

### Action 2 — Fix Bug 1: exit code decision tree — ✅ DONE (2026-06-30, scope corrected for Cursor)
- `src/hooks/src/types.ts` — added `exitCode?(canonical: CanonicalOutput): number` to `IdeAdapter`
- `src/hooks/src/adapters/windsurf.ts` — implemented `exitCode`: return 2 on deny; removed dead `_exitCode` from `formatOutput`
- `src/hooks/src/adapters/cursor.ts` — **NOT implemented, by decision** (Run 4 empirically showed exit-2 + Cursor's JSON body gets dumped raw/unparsed — strictly worse than the already-working exit-0 path); left at default (0), with an explanatory code comment
- `src/hooks/src/entrypoints/adapter-*.ts` (all 5) — each slim per-IDE bundle entrypoint needed its own `exitCodeFor` export too (bundler aliases `../adapter` per-bundle, see `scripts/build-bundles.mjs`) — not anticipated in the original plan, discovered via a build failure
- `src/hooks/src/runtime/run-hook.ts` — applied decision tree as `resolveExitCode` (exported for tests): `_exitCode not null → use it; deny → adapter.exitCode(); default → 0; catch → 1000`
- `_exitCode` override documented inline in `runtime/types.ts` (NOT in configure docs — scope correction: it's an internal `src/hooks`-authoring API, not part of the generated plugin's wire contract that `instructions/*/configure/*.md` guides describe)
- Windsurf's deny REASON TEXT still has no working delivery channel (stdout is never parsed, stderr routing not added in this pass) — flagged as a known gap for Windsurf's own dedicated turn, not fixed here (out of Cursor's scope). **[RESOLVED 2026-07-01 in Action 9 — see below.]**

### Action 3 — Add Hooks section to `cursor.md` configure guides (r2 + r3) — ✅ DONE (2026-06-30, scope expanded)
- Expanded beyond the original "Output Contract only" framing — guides had ZERO hooks documentation (no Locations/registration/events either), so added the full section: Hook Locations, Registration Format, Supported Events, Output (flat fields), Exit Codes, Matchers — compressed, modeled on the verified `docs/hooks/cursor.md`. Proof: https://cursor.com/docs/reference/hooks

### Action 4 — Add Output Contract to `codex.md` configure guides (r2 + r3) — ✅ DONE (2026-07-01, scope expanded)
- `src/hooks` (codex adapter identity pass-through + `ide-rows/codex.ts` + registry with `Stop`), `src/rosettify-plugins` (codex bootstrap → nested `additionalContext`), and `docs/requirements/.../FR-HOOK.md` (codex entry `statusMessage`+`timeout`, no `once`) all checked against `docs/hooks/codex.md` (VERIFIED spec) — already aligned, no code/requirements/plugin changes needed.
- **Expanded beyond the original "Output Contract only" framing** — the existing `## Hooks` section not only lacked the output contract, it CONTRADICTED the generated plugin + verified spec. Rewrote the full section (r2+r3, byte-identical), modeled on `cursor.md`/`claude-code.md`. Fixes applied:
  - **Registration key bug:** guide used `"handlers"` for the inner array → corrected to `"hooks"` (the shipped `core-codex/.codex-plugin/hooks.json.tmpl` and the spec both nest under `"hooks"`; the old example would not have registered).
  - **PreToolUse matcher "Bash only" → corrected** to `Bash`, `apply_patch` (`Edit`/`Write`), MCP (`mcp__…`); added the partial-interception gotcha.
  - **`Stop`/`UserPromptSubmit` "Unsupported" → corrected:** only the *matcher* is ignored; `Stop` output (`decision:"block"`+`reason`) IS supported and is a mapped Rosetta semantic event. Table now lists the 5 Rosetta events (SessionStart/PreToolUse/PostToolUse/SubagentStop/Stop).
  - **Added the Output Contract** (`hookSpecificOutput` nested for context/deny/rewrite; top-level `decision:"block"`) with the two genuinely-earned gotchas: strict per-event schema validation (any extra/misplaced field → whole output invalid → hook runs unhooked; never duplicate a field across placements) and `systemMessage` = user UI warning, never model context.
  - **`permissionDecision:"ask"` NOT supported** documented (plus legacy `approve` / `continue` / `stopReason` / `suppressOutput` on PreToolUse).
  - **Exit codes corrected:** exit 2 is the per-event block/continue mechanism (reason from stderr), not a generic "failure"; other non-zero = failure. Added `commandWindows` handler field.
- Proof: https://developers.openai.com/codex/hooks. Verified r2 == r3 remains byte-identical post-edit.

### Action 5 — Update tests: exit code assertions per IDE for deny — ✅ DONE for Cursor/Windsurf/Claude Code/Codex/Copilot (2026-06-30)
- `src/hooks/tests/runtime/run-hook.test.ts` — new `resolveExitCode` describe block: deny→2 (Windsurf), deny→0 (Cursor/Claude Code/Codex/Copilot), `_exitCode` override (on deny and on allow), unknown-ide default, throw→1000
- `src/hooks/tests/adapter.windsurf.test.ts` — updated: `_exitCode` no longer in the JSON body; added `exitCodeFor` assertions (2 on deny, 0 otherwise)

### Action 6 — Add Hooks section to `claude-code.md` configure guides (r2 + r3) — ✅ DONE (2026-06-30)
- `src/hooks`, `src/rosettify-plugins`, `docs/REQUIREMENTS/plugin-generator/FR-HOOK.md` all checked against `docs/hooks/claude-code.md` (VERIFIED spec) — already fully aligned, no code/requirements changes needed.
- Added compressed Hooks section (r2+r3, byte-identical): Hook Locations, Registration Format, Supported Events, Output (nested `hookSpecificOutput`, incl. the two-block-mechanism gotcha and the `systemMessage`/`continue`/`stopReason` UX notes), Exit Codes, Matchers. Modeled on `cursor.md`'s section. Proof: https://code.claude.com/docs/en/hooks

### Action 7 — Standard input model in all configure guides + revalidation flags — ✅ DONE (2026-07-01)
- **Input model added** to `instructions/{r2,r3}/core/configure/{codex,claude-code,cursor}.md` — a compact `### Input` section per guide, each sourced from that IDE's OWN spec (`docs/hooks/<ide>.md` Common Input Fields + per-event tables), placed after "Supported Events". Worked ONE IDE at a time (read spec → edit its two files) to keep each change isolated / no cross-IDE contamination. `github-copilot.md` already carried its two-runtime "Input shape" table (Action 1) — left unchanged. r2==r3 verified per guide.
- **`docs/hooks/codex.md` — Practical Conclusion #3 added** (explicitly labeled guidance/opinion): how to catch file reads on Codex — Codex has no read tool with a clear path; reads go through the shell (`cat`/`sed`, fallback to any shell command), so a hook must parse the opaque `Bash` `command` string. Cost-of-miss tradeoff: lenient/fail-open when a miss is cheap (e.g. read-once) vs. full shell parse when a miss is costly (e.g. dangerous-actions). Includes an explicit **(!) do NOT treat MCP calls as reads** warning (see MCP-read removal below).
- **`- revalidate` flags (doc-grounded, NOT empirically confirmed):**
  - Codex `PLUGIN_ROOT`/`PLUGIN_DATA` plugin-env vars — R1-only; NOT present in the Codex live logs (`docs/hooks/codex-logs.txt`) because the live test wired `tester.js` directly, not as a plugin-bundled hook (plugin-env vars only inject for bundled hooks). Flagged in the spec (`docs/hooks/codex.md`) AND both r2/r3 configure guides.
  - Cursor `disable-model-invocation` "plugin-delivered skill uninvocable (Cursor bug)" note — synced across r2/r3 (was r3-only) and flagged for revalidation.
- **Grounded adversarial-review fixes (2 background subagents; findings treated as recommendations, then each verified against spec/template/code before applying):** (1) codex Output Contract "Choose ONE path per hook" softened — PostToolUse may combine top-level `decision:"block"`+`reason` with nested `additionalContext` (spec-confirmed, `codex.md:305-308`); (2) codex Registration example matcher aligned to the shipped template (`Bash|Write|Edit|apply_patch|functions.apply_patch|mcp__.*`); (3) stale test comment fixed (`plugin-assemble-copilot-bootstrap.test.ts:1` — dropped "per-entry session locks"). Second subagent's last-3-commits review: PASS (tsc clean, 719/719 + 444/444 tests, committed artifacts in sync).
- **Plugins regenerated** from workspace root (`tsx src/rosettify-plugins/src/cli.ts`, r2/core): 18 configure files updated across 6 targets (claude-code/codex/cursor guides; copilot guide unchanged; no non-configure artifacts touched).

### Action 8 — Remove the fictional Codex "MCP-as-read" path (real correctness/safety bug) — ✅ DONE (2026-07-01)
- **Root cause:** `src/hooks/src/adapters/codex.ts` had `READ_LIKE_MCP_RE` + `isReadLikeMcpTool`, which promoted any `mcp__…` tool whose NAME looked read-ish (`read`/`read_file`/`get_file`/…) into `toolKind:'read'` + `event:'PreRead'`. **No manufacturer doc describes an MCP read path on Codex** — it was an assumption baked into the adapter that then propagated into every Codex doc pass (the removed conclusion-#3 MCP note, matcher examples). This "kept popping up" because docs were written FROM the code.
- **Why it's a real bug, not cosmetics (user):** an MCP tool is never a passive read — it DOES something. Classifying an MCP call as a read let `read-once` **dedupe it, or (in `READ_ONCE_MODE=deny`) BLOCK it** — silently breaking a real side-effecting MCP action. Reads on Codex are shell-only (`cat`/`sed`, caught via read-once's `bash` path).
- **Fix:** removed `READ_LIKE_MCP_RE`/`isReadLikeMcpTool` and the PreRead promotion from `adapters/codex.ts` (now: `event = lookupEvent`, `toolKind = lookupToolKind`, with a comment forbidding reintroduction). MCP calls now normalize to `toolKind:'mcp-call'` (unchanged general interception for dangerous-actions), never `read`.
- **Also fixed:** the read-once matcher in `core-codex/.codex-plugin/hooks.json.tmpl` was `Bash|shell|Read|View|view` (the `Read|View|view` were fictional — Codex has no such tools) → now `Bash|shell`. Doc echoes removed: conclusion-#3 MCP note replaced with a "do NOT treat MCP as reads" warning; spec matcher example `mcp__filesystem__read_file` → neutral `mcp__server__tool`.
- **Tests:** deleted the fixture `codex-pre-tool-use-mcp-read.json` and the two tests that asserted the unsafe behavior (`adapter.codex.test.ts` "MCP filesystem read upgrades to PreRead"; `read-once.test.ts` "codex MCP filesystem read goes through the same runtime path"); added a guard test asserting an `mcp__…read_file` call normalizes to `mcp-call` (NOT `read`) with `event` unchanged. `src/hooks` 718/718, `rosettify-plugins` 444/444, tsc clean both; plugins regenerated (matcher propagated; zero `Read|View|view` remain).
- **Correction to the earlier "SEALED" claim:** the 2026-07-01 seal said code was "fully matching" — that was premature; this adapter bug was live at seal time. Re-sealed after this fix.

### Action 9 — Windsurf (Devin Desktop): route deny reason to stderr + add configure-guide Hooks section — ✅ DONE (2026-07-01)

Closes the last open change-phase item (the deny-reason-text delivery channel). HITL-approved scope: fix + configure guide; `formatOutput` → `{}`.

- **New adapter channel (symmetric with `exitCode`):** `src/hooks/src/types.ts` — added optional `stderrMessage?(canonical): string | undefined` to `IdeAdapter` (only for IDEs whose sole hook→model text channel is stderr — verified Windsurf; unset for all others). `src/hooks/src/adapter.ts` — added `stderrMessageFor(canonical, ide)` dispatcher.
- **Windsurf adapter (`src/hooks/src/adapters/windsurf.ts`):** implemented `stderrMessage` → returns `permissionDecisionReason` on deny (verbatim, no trailing newline so Cascade's `: action blocked by hook` suffix reads cleanly), else undefined. `formatOutput` now returns `{}` always — Windsurf never parses stdout, so the old `additionalContext` path (the dead deny→stdout route) was removed.
- **Runtime (`src/hooks/src/runtime/run-hook.ts`):** `executeHook` computes `stderrMessageFor(canonicalOutput, ide)` on the completed path and carries it on the `HookExecutionReport`; `runAsCli` already wrote `report.stderrMessage` to `process.stderr`, and `runHook` was extended to do the same (new `stderr` opt, default `process.stderr`) so non-CLI/test consumers observe identical behavior. `stdout.write` still emits the (now `{}`) body — harmless, Windsurf ignores stdout.
- **All 5 `entrypoints/adapter-*.ts`:** each slim per-IDE bundle aliases `../adapter` to itself (see `scripts/build-bundles.mjs`), so every entrypoint had to export `stderrMessageFor` or its bundle build breaks — windsurf delegates to `windsurf.stderrMessage`; the other 4 return `undefined`. Confirmed: `node scripts/build-bundles.mjs` builds all 40 bundles clean.
- **Configure guide (`instructions/{r2,r3}/core/configure/windsurf.md`):** the guide previously had ZERO hooks documentation. Added a full Hooks section (r2==r3 byte-identical, verified), modeled on `cursor.md`'s format but sourced strictly from `docs/hooks/windsurf.md` (isolated — zero cross-IDE field leakage): Hook Locations (`.devin/` current + `.windsurf/` legacy alias + user/system paths), Registration Format (flat Cascade, no `matcher`), Supported Events (per-operation split, pre-only blocking, no session-lifecycle events), `### Input` (windsurf-native stdin fields + per-event `tool_info`), Output (exit-code + stderr only, NO stdout JSON contract), Exit Codes, Matchers (none — gate in-script). Regenerated into all 6 plugin targets (`plugins/*/configure/windsurf.md`) via `tsx src/rosettify-plugins/src/cli.ts --release r2 --domain core` — only the 6 windsurf configure copies changed, no other artifacts.
- **`docs/requirements` / `src/rosettify-plugins`:** no change needed — per OI-4 / `SCOPE.md` AC-3, `src/hooks` runtime internals are out of the plugin-generator requirements; and rosettify-plugins has no Windsurf hook-output builder (only a `.windsurf/` path-rewrite reference), so the stderr channel doesn't touch it.
- **Tests:** `src/hooks/tests/adapter.windsurf.test.ts` — `formatOutput` → `{}` for advisory & deny; new `stderrMessage` describe (deny→reason, allow→undefined, deny-without-reason→undefined, other IDEs→undefined). `src/hooks/tests/runtime/run-hook.test.ts` — end-to-end: a Windsurf `pre_run_command` deny writes the reason to stderr, emits `{}` on stdout, exits 2; a non-deny writes nothing to stderr. `run-hook-debug-log.test.ts` — its `../../src/adapter` mock gained `stderrMessageFor` (the new unconditional call would otherwise throw). Full suite green both packages (`src/hooks` 724/724, `rosettify-plugins` 444/444), `tsc --noEmit` clean, bundles build.

### Action 10 — Internal cleanups OI-5 + OI-6 (adapter API surface + stderr-write DRY) — ✅ DONE (2026-07-02)

Both are internal `src/hooks` refactors, no wire/behavior change, no requirements/plugins/configure impact (per OI-4 / `SCOPE.md` AC-3). HITL-approved: OI-6 option (b); OI-5 Design B.

- **OI-6 — shared stderr-write helper.** `src/hooks/src/runtime/run-hook.ts` — extracted `writeStderrMessage(report, stderr = process.stderr)`; `runAsCli` (was `:44`) and `runHook` (was `:248`) both call it instead of duplicating `if (report.stderrMessage) …write(…)`. `runHook` kept as the in-process test seam (8 test files depend on it).
- **OI-5 — single `adapter` object (Design B).** `run-hook.ts` now imports `{ adapter }` (type `AdapterApi`) from `../adapter` and calls `adapter.readStdin`/`detectIDE`/`normalize`/`formatOutput`/`exitCodeFor`/`stderrMessageFor` instead of 6 named imports. New `src/hooks/src/entrypoints/make-entrypoint.ts` exposes `makeEntrypoint(adapter: IdeAdapter): AdapterApi` (+ the shared `readStdin`); each `entrypoints/adapter-<ide>.ts` collapsed from ~31 lines to 2 (`import { <ide> }` + `export const adapter = makeEntrypoint(<ide>)`). `adapter.ts` gained `export const adapter: AdapterApi = {…}` (its named exports kept — direct test imports still use them). `types.ts` gained `AdapterApi` + `AdapterEnv`. `build-bundles.mjs` alias unchanged; **bundle isolation stays structural** (each entrypoint imports exactly one adapter — not DCE; see OI-5 DCE note). Net effect: a new adapter method is now a 1–2-file change, not a 6-file lockstep edit.
- **Tests touched:** the 3 files that mock `../adapter`'s `readStdin` at module scope (`tests/runtime/run-hook.test.ts`, `tests/codemap-refresh.test.ts`, `tests/read-once.test.ts`) now stub `adapter.readStdin` too (same fn reference) — run-hook calls the object method, so mocking only the named export would hang on real stdin (caught + fixed: 93 timeouts → 0). `tests/runtime/run-hook-debug-log.test.ts` mock returns `{ adapter: {…} }` (added `exitCodeFor`). `tests/entrypoints/adapter-copilot.test.ts` imports `{ adapter }` and destructures. **Full suite green: `src/hooks` 726/726, `tsc --noEmit` clean, all 40 bundles build.**
- **Follow-ups recorded (not done here):** OI-7 (optionally collapse the 5 two-line entrypoints into one generic entrypoint — without DCE) and the log-driven E2E/integration suite (see "Planned Work" above).

---

## Live Hook Tests (per-IDE) — configs + status

The **repeatable methodology** is in "Verification Process" (below); the **probe/recall techniques** in "Testing Methodology Lessons". Per-IDE wiring is committed at **`docs/hooks/<ide>/hooks.json`**; the universal harness is `docs/hooks/tester.js` (output shape per `--mode <ide>`). **All IDE runs are DONE** — per-run narratives + wire captures are in `docs/hooks-verify-run-logs.md` (`grep "<IDE> Run"`); confirmed contracts are folded into each spec's `Observed` columns + Appendix, and cleaned log excerpts are `docs/hooks/<ide>-logs.txt`.

| IDE | Live-test config | `--mode` | Runs | Cleaned log |
|---|---|---|---|---|
| GitHub Copilot | `docs/hooks/copilot/hooks.json` | copilot | 1–8 | `vs-copilot-logs.txt`, `copilot-cli-logs.txt` |
| Codex | `docs/hooks/codex/hooks.json` | codex | 1–3 | `codex-logs.txt` |
| Claude Code | `docs/hooks/claude/hooks.json` | claude | 1 (+`/compact`) | `claude-logs.txt` |
| Cursor | `docs/hooks/cursor/hooks.json` | cursor | 1–4 | `cursor-logs.txt`, `cursor-run3-logs.txt`, `cursor-run4-logs.txt` |
| Devin Desktop (Windsurf) | `docs/hooks/windsurf/hooks.json` (also placed at `.devin/hooks.json`) | windsurf | 1–4 | `windsurf-logs.txt` |
| Devin CLI | `docs/hooks/devin/hooks.v1.json` (no-wrapper) | devin | not run | — |

**Generic sanctioned-test prompt** (frame as a self-authored diagnostic so the model doesn't treat it as prompt-injection; adapt steps per IDE): (1) run `echo rosetta-hook-probe`; (2) read/`cat` `docs/hooks/HOOK-DENY-PROBE.txt` — the PreToolUse/`pre_*` deny should block it; quote the block verbatim and continue; (3) for injection-capable IDEs, ask **per-token YES/NO** recall of the planted markers (+ trailing `Report` code) — never "list/quote" (triggers a secret-refusal); (4) if a Stop-block is wired, run that prompt FIRST so its one-time block doesn't interrupt later steps. **Verify against the LOG, not the model's word.**

> **Devin Desktop note:** `.devin/hooks.json` (flat Cascade) and `.windsurf/hooks.json` are equivalent (Runs 1–2). `.devin/hooks.v1.json` (Claude-Code format) is **NOT read by Devin Desktop** (Runs 3–4) — it's the Devin CLI's file (`devin-cli.md`, non-validated).

---

## Verification Process (repeatable empirical methodology)

How hooks are verified end-to-end. Reusable for every IDE/agent.

1. **Generic diagnostic hook** — `docs/hooks/tester.js`: dumps the full invocation (ms-timestamp, pid, invocation string, argv, cwd, script dir, raw stdin, env) to `~/.rosetta/hooks.log`, then runs flag-selected mutating processors: `--output`, `--exit-code`, `--tag`, `--deny-on-match`, `--rewrite-command`, `--block-stop-once` (atomic per-session marker, can't loop), `--copilot-rewrite-result`. Shape-divergent commands (deny/rewrite/stop) take a `--mode <ide>` parameter and emit that IDE's EXACT shape.
2. **Register every target event** in `docs/hooks/<ide>/hooks.json`, each wired to `tester.js` with a distinct `--tag` (and both capitalizations where a runtime has them, so the log reveals which key actually fired — input `hook_event_name` alone can't tell you).
3. **Probe design — distinct planted markers per (event × placement × key):** presence (secret recall) + instruction (nudge `Report XX`) via `additionalContext`; prevention via `--deny-on-match`; arg/result rewrite via `--rewrite-command`/`--copilot-rewrite-result`; Stop block ONCE via `--block-stop-once`; compaction by registering Pre/Post events.
4. **Run MANUALLY in each runtime** — paste the probe prompt into a real session. Frame it as a sanctioned self-authored test (planted markers, nothing untrusted) to avoid prompt-injection refusals. Run the Stop-block prompt FIRST (it consumes the one-time block).
5. **Verify against the LOG, not the model's word** — confirm each hook EMITTED (RESULT `textLen`/`stderrLen`) and cross-check `tool_input`/`tool_response`; the model's recall tells which placement REACHED it. Trust = emit (log) + delivery (model), both checked.
6. **Probe WORDING matters** — ask "do you see X ANYWHERE (your context, system context, injected/ambient `<...-context>` blocks), without loading?" per specific marker. "In your context" + a generic "list secrets" UNDER-REPORTS → false negatives.
7. **Record per run** (Run N: runtime / model / session id) in the run-log → correct false negatives → fold confirmed results into the spec's `Observed` columns.
8. **Export logs** — `docs/hooks/split-logs.js <session_id> <src-log> <out-file>` (committed, canonical): de-interleaves by pid; keeps only blocks whose input carries `<session_id>` (or `trajectory_id` for Windsurf/Devin); redacts ONLY true secrets (name OR value-format, `isPathOrSimple` guard — the full env otherwise STAYS); trims oversized conversational fields; asserts no unredacted credential survived. Then clean run-state markers (`rm ~/.rosetta/.block-stop-once-*`).

---

## Testing Methodology Lessons (this effort)

1. **Probe injected context by asking "ANYWHERE" + per-marker — "in YOUR context" UNDER-REPORTS.** "Is X in YOUR context?" makes the model EXCLUDE hook-injected / system / ambient blocks (e.g. a `<PostToolUse-context>` wrapper) and answer "no" — a FALSE NEGATIVE. Ask "Do you have X ANYWHERE — your context, the system/conversation context, any injected/ambient block — WITHOUT loading/reading/searching?" per specific marker. Treat a narrow-scope "none" as inconclusive, never proof of absence. (Incident: VS Code PostToolUse `additionalContext` wrongly recorded as not-reaching, Run 5; per-marker re-ask in Run 7 confirmed it DOES reach.)

2. **Ask recall as per-token YES/NO — "list/quote the markers" triggers a secret-refusal.** When `additionalContext` is injected as developer/system context, "list verbatim any planted markers" makes the model treat them as secrets and REFUSE — a FALSE NEGATIVE even though the hook fired. Ask presence per token instead: *"Did you see this token — YES/NO: `CODEX-SS-NEST-3c4d`?"* (+ "if YES, give the trailing Report code"). (Incident: Codex Run 2.) **Corollary (Devin Run 4):** do NOT put the marker token itself in the recall question — the model will answer YES from the prompt alone (false positive). The real signal is the **Report code** (DS1/…), which exists only in the injected context.

3. **(!) Clean the log BY session key — do NOT over-complicate with timestamps/pids.** `~/.rosetta/hooks.log` is shared/append-only and mixes runs. The ONE robust filter is the run's `session_id` (or `trajectory_id` for Windsurf/Devin). `split-logs.js` keeps only invocation blocks carrying it. (Incident: Claude Run 1 — timestamp filtering was a fragile over-complication.)

4. **(!) Redact ONLY TRUE SECRETS — everything else MUST stay.** `split-logs.js` redacts iff (a) the env-var NAME means a credential (`*API_KEY*`, `*_TOKEN*`, `*SECRET*`, `*PASSWORD*`, `*CREDENTIAL*`, `*PRIVATE*`, `BEARER`, `*COOKIE*`, `_KEY`/`KEY`, …) **and** the value isn't a path/short/number/bool (`isPathOrSimple`), OR (b) the VALUE matches a known credential FORMAT (JWT `eyJ…`, `gh*_…`/`github_pat_…`, `AKIA…`, `sk-…`, `xox*-…`, `AIza…`, PEM). Keeps first 5 chars + `…[REDACTED]`; asserts none survived. **Do NOT redact** `PATH`/`HOME`/`JAVA_HOME`/`SSH_AUTH_SOCK`/`CLAUDE_*`/`AI_AGENT`/`TERM`/… — the full env IS the runtime signature. (Incident: Claude Run 1 over-redacted to a 7-var allowlist.)

5. **(!) Pre-run hygiene, EVERY run:** (a) archive the old log (rename); (b) `rm ~/.rosetta/.block-stop-once-*` so the Stop test fires; (c) PARK every OTHER agent's hook config in the test repo (`.cursor/`, `.codex/`, `.github/`, `.windsurf/`/`.devin/` → `*-disabled`) — else they fire and contaminate the log. Only ONE agent's config active at a time.

6. **[GENERAL — applies to every IDE, not Cursor-specific] (!) A confident, detailed model report of "nothing was blocked, everything ran fine" can mean hooks never fired AT ALL — not that they allowed the action.** (Incident: Cursor Run 4, first attempt — but the underlying risk, a hook config silently not registering, can happen on any IDE.) The model has no way to distinguish "hook fired and allowed" from "hook never fired" — it just sees its tool call succeed either way. **Before trusting ANY behavioral report, first confirm `~/.rosetta/hooks.log` has ANY entries at all for that `session_id`** (e.g. even the routine, unconditional `preToolUse`/`postToolUse` that fired in every prior run) — a report describing detailed step-by-step success is not partial evidence of "hooks ran and allowed," it is ZERO evidence either way until the log confirms invocation.

7. **[CURSOR-CONFIRMED; unverified on other IDEs] (!) Editing/renaming a hook config file for an ALREADY-OPEN IDE session may not take effect until a new session starts.** (Cursor Run 4: renaming `.cursor-disabled/` → `.cursor/` and editing `hooks.json` produced zero log entries in the live conversation; a fresh conversation's `sessionStart` was the first evidence the runtime had re-read the file.) Confirmed mechanism is Cursor-specific (session-scoped hook registration); WHETHER Codex/Copilot/Windsurf cache the same way is unverified — treat "start a new session after editing config for an already-open workspace" as a precaution for every IDE until disproven for that IDE, not an established fact for all of them.

8. **[GENERAL — a testing-tool discipline, not an IDE fact] (!) Dry-run new `tester.js` flag combinations against a synthetic payload BEFORE wiring them into `hooks.json` and spending a live IDE run.** (Incident: Cursor Run 4 — paired the UNCONDITIONAL `--exit-code <n>` flag with the CONDITIONAL `--deny-on-match`, so it would have forced exit-2 on every call, not just matched ones — caught only by re-reading the processor code after a confusing live result, not before.) `echo '{"...fixture..."}' | node docs/hooks/tester.js <flags>` locally catches flag-composition bugs for free, before they cost a live run, regardless of which IDE the flags target.

9. **[CURSOR-SPECIFIC — `failClosed` is a Cursor-only field; no other IDE spec documents it] (!) A `failClosed:true` handler that returns EMPTY output on non-matching calls contaminates every OTHER probe registered on the same event.** (Cursor Run 4: one `failClosed` handler on `beforeShellExecution` blocked all 6 shell probes on the first attempt, because Cursor treats its own empty/no-decision response as a failure under `failClosed` — masking whatever the OTHER handler on that event actually did.) When testing `failClosed` alongside other conditional probes on the same event, the `failClosed` handler MUST emit an explicit decision (e.g. `{"permission":"allow"}`) on its own non-match path, or every other probe's result becomes unattributable. Re-apply this lesson only if/when another IDE is found to have an equivalent fail-closed-style flag.

---

## Spec + Live-Test Deliverables Checklist (MANDATORY — produce ALL without being asked)

Every IDE/agent verification MUST produce ALL of the following before it is "done". (Reference shape: `codex.md` + `codex-logs.txt`.)

**A. Spec doc `docs/hooks/<ide>.md`** — every field table has a `Ref` column:
- Status line (DRAFT → VERIFIED/COMPLETE); Practical Conclusions (only genuinely-earned ones); Capability Matrix (✅ confirmed / 📄 documented-not-run / ❓ unknown).
- Events of Interest (Rosetta); References table; Hook Configuration & Locations + registration format.
- Hook Events table (matcher basis per event); Common Input Fields; Common Output Fields.
- Per-event Input + Output tables (the Rosetta target events, in full).
- Exit Codes (+ per-event table where the manufacturer has one).
- **Appendix — Observed Wire Examples** (filled from the live run): captured INPUT payloads (per event); ACCEPTED OUTPUT shapes; **Runtime env signature** = full inherited shell env (in the excerpt) + the injected detection-signature vars (with version var); **UI-surfacing note** (how the IDE shows hook output — NOT proof of model ingestion); link to the cleaned log.

**B. Live-test artifacts:**
- `docs/hooks/<ide>/hooks.json` — wires every target event to `tester.js` (correct `--mode <ide>`, distinct `--tag` per event, injection via `--output`).
- `tester.js` `--mode <ide>` branch if output shapes diverge (extend the switch; never fork the file).
- `docs/hooks/<ide>-logs.txt` — cleaned excerpt via `split-logs.js <session_id>`. Provenance header on top.
- Run-log entry appended to `docs/hooks-verify-run-logs.md` (runtime/model/session id; per-capability ✅/✗; input-field resolutions; env signature; caveats).
- Status flipped in this file's per-IDE table + the run-status line.

---

## Key Source Files

### Live-hook diagnostics tooling (committed, canonical)
- `docs/hooks/tester.js` — universal dump-first hook tester (logs full invocation to `~/.rosetta/hooks.log`; flag-selected processors; output shape per `--mode <ide>`).
- `docs/hooks/split-logs.js` — log cleaner: clean by `session_id`/`trajectory_id`, de-interleave by pid, redact only true secrets, assert no unredacted credential survived. Usage: `node docs/hooks/split-logs.js <session_id> <src-log> <out-file>`.
- `docs/hooks/<ide>/hooks.json` — per-IDE live-test wiring.

### Product source
- `src/hooks/src/runtime/run-hook.ts` — hook executor, exit code decision
- `src/hooks/src/types.ts` — `CanonicalOutput`, `IdeAdapter` interface
- `src/hooks/src/adapter.ts` — `formatOutput` dispatcher
- `src/hooks/src/adapters/*.ts` — per-IDE formatOutput implementations
- `src/rosettify-plugins/src/escaping/json-string.ts` — bootstrap payload builders
- `src/rosettify-plugins/src/bootstrap/payload.ts` — per-IDE entry shape builders
- `docs/requirements/plugin-generator/FR-HOOK.md` — authoritative entry shapes
- `docs/requirements/plugin-generator/FR-VAR.md` — Cursor `additional_context` requirement
- `instructions/r2/core/configure/github-copilot.md` — Output Contract reference (lines 529-556)
