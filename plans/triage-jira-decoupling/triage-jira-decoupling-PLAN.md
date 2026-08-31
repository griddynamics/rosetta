<CRITICAL ATTRIBUTION="DO NOT COMPACT/OPTIMIZE/SUMMARIZE/REPHRASE, PASS AS-IS">

# Execution Plan — decouple triage-flow from live Jira connectivity (HOW / sequenced)

Companion: `triage-jira-decoupling-SPECS.md` (WHAT, contracts). Background: `discovery-notes.md`. Contracts are not restated here — reference SPECS §.

</CRITICAL>

## Read first
- `triage-jira-decoupling-SPECS.md` (this plan's WHAT)
- `discovery-notes.md` (why — real caller, gap, decisions already made)
- `instructions/r3/core/workflows/triage-flow.md` + its 6 phase files
- `instructions/r3/core/skills/jira-write/SKILL.md` + `references/jira-write-vendor-binding.md`
- `instructions/r3/core/skills/data-collection/SKILL.md` + `references/issue-vendor-binding.md`

## Governing rules
- Scope is rosetta repo only (`tools-harness-intake/triage.yml` not touched) — SPECS header.
- `data-collection` changes are additive only — SPECS §FR-2 note; other callers (aqa-flow, testgen-flow, qa-knowledge, requirements-authoring) must be unaffected.
- After any `instructions/r3/*` edit: regenerate plugins (`npx -y rosettify-plugins@latest` at repo root) before considering a session done — `docs/ARCHITECTURE.md` Development section.

## Outcomes/findings recorded in
`HANDOFF.md` (status, blockers, decisions) + per-session handoff files.

## File ownership (prevents collisions)
- S1: `.mcp.json`, `agents/jira-mcp-auth-header.sh`, `.gitignore`, `agents/jira-triage.config.json`
- S2: `instructions/r3/core/skills/jira-write/**`
- S3: `instructions/r3/core/skills/data-collection/SKILL.md`, `references/issue-vendor-binding.md`
- S4: `instructions/r3/core/workflows/triage-flow.md` + its 6 `triage-flow-*.md` phase files
No two sessions touch the same file — S2/S3/S4 are parallelizable; S1 has no content dependency on the others but should land first since S4's phase-file edits reference the config it touches.

| # | Session | Depends on | Parallel with |
|---|---|---|---|
| S1 | Delete MCP artifacts + config edits | — | S2, S3, S4 |
| S2 | Rewrite `jira-write` (compose-not-execute) | — | S1, S3, S4 |
| S3 | Extend `data-collection` (file-sourced branch) | — | S1, S2, S4 |
| S4 | Rewrite `triage-flow.md` phases 1/4/5/6 + state | S2, S3 (consumes their new contracts) | none — runs alone, last |
| S5 | Plugin regen + cross-file consistency pass | S1-S4 | none — runs alone, last |

Unlisted pairs are sequential. S4 must run alone after S2/S3 land — it consumes both their contracts and would conflict on the shared understanding of `jira-write`'s new return shape and `data-collection`'s new input shape if run concurrently with either. S5 must run alone, last, after every content edit.

---

## S1 — Delete MCP connection artifacts + config fixes
Depends on: none.

### Do
1. Delete `.mcp.json`, `agents/jira-mcp-auth-header.sh` (SPECS §FR-1).
2. Remove the `agents/jira-triage.secrets.json` line from `.gitignore` (SPECS §FR-1).
3. Edit `agents/jira-triage.config.json`: reword `jql` note, `orchestrator_model_policy.required_tier` → `sonnet`, `on_violation` → `STOP_AND_REPORT` (SPECS §FR-6). Leave `confirmation_gate_override`, `tool_issue_target` unchanged.

### Subagents
- `rosetta:engineer` (short-term) — mechanical deletion + config edit.

### Done when
- `.mcp.json` and `agents/jira-mcp-auth-header.sh` no longer exist; `git grep -i jira-service-account` returns nothing.
- `jira-triage.config.json` parses as valid JSON with the three fields updated.

### Checklist
- [ ] Implemented (SPECS §FR-1, §FR-6)
- [ ] No other file references the deleted paths (`git grep` clean)
- [ ] `jira-triage.config.json` still valid JSON
- [ ] Documents updated (this session's handoff)

---

## S2 — Rewrite `jira-write`: compose-and-write-artifact, not execute
Depends on: none. Parallel with S1, S3.

### Do
1. Rewrite `<operations>` table: every "resolves to" cell ends at composing `<NNN>-<op>.json`, per SPECS §FR-3's shape (SPECS §FR-3).
2. Rewrite `<process>`: drop "read current identity" step; identity language per SPECS §FR-5.
3. Reword `<dangerous_actions_gate>`: compose-not-write framing, keep `create issue` duplicate-prevention evidence requirement verbatim in substance (SPECS §FR-4).
4. Add pitfall entry for the field/link-type validation regression (SPECS §FR-3).
5. Update `references/jira-write-vendor-binding.md` to match — operations produce artifacts, no live capability calls, drop "read current identity"/"read create field options"/"read available link types" as things THIS binding runs (note they move downstream).
6. Update `<identity_note>` in SKILL.md per SPECS §FR-5.

### Subagents
- `rosetta:engineer` (long-running) — this is the largest single content rewrite in the plan; both SKILL.md and the vendor-binding reference change substantially.

### Rules
- Do not remove the duplicate-prevention-evidence requirement for `create issue` — it is still real and still enforced at compose time (SPECS §FR-4).
- Do not silently drop the field/link-type validation concern — document it as moved, not solved.

### Done when
- No sentence in `jira-write/SKILL.md` or its vendor-binding claims a live capability call, a captured comment ID, a created key, or a link ID.
- Every write path ends at "artifact written, path reported."

### Checklist
- [ ] Implemented (SPECS §FR-3, §FR-4, §FR-5)
- [ ] `<operations>` table fully rewritten, no stale "resolves to (configured integration)" language
- [ ] `<dangerous_actions_gate>` reworded, duplicate-prevention requirement intact
- [ ] `<identity_note>` reworded, no live identity resolution implied
- [ ] Vendor-binding reference consistent with SKILL.md (no contradiction)
- [ ] Field/link-type validation regression documented in `<pitfalls>`
- [ ] Documents updated (session handoff)

---

## S3 — Extend `data-collection` with a file-sourced Issue Tracker branch
Depends on: none. Parallel with S1, S2.

### Do
1. Add the additive resolution branch to `SKILL.md` step 1 per SPECS §FR-2's note — caller-supplied snapshot file path short-circuits the live-integration resolution for that role, this invocation only.
2. Add the snapshot-file field map addendum to `references/issue-vendor-binding.md` (SPECS §FR-2's JSON shape), alongside — not replacing — the existing live-call field map.
3. Preserve step 4 (`sensitive-data` redaction) unchanged — applies identically to file-sourced content.

### Subagents
- `rosetta:engineer` (short-term).

### Rules
- MUST NOT change behavior for any caller that does not supply a snapshot file — verify by re-reading `aqa-flow`, `testgen-flow`, `qa-knowledge` callers of `data-collection` for any assumption this branch could violate.

### Done when
- `data-collection` correctly resolves Issue Tracker content from a SPECS §FR-2-shaped file when supplied, and behaves exactly as before when not.

### Checklist
- [ ] Implemented (SPECS §FR-2)
- [ ] Additive only — existing live-resolution path untouched
- [ ] Snapshot-file field map documented in `issue-vendor-binding.md`
- [ ] Missing required field → stop+report, no silent partial output
- [ ] Other `data-collection` callers re-checked for regressions
- [ ] Documents updated (session handoff)

---

## S4 — Rewrite `triage-flow.md` phases 1/4/5/6 + state/idempotency sections
Depends on: S2, S3 (consumes their contracts). Runs alone.

### Do
1. Phase 1 (intake): replace live JQL+fetch with snapshot-file read via `data-collection` (S3's new branch) + local eligibility check against config `jql` (SPECS §FR-2, §FR-6).
2. Phases 4/5/6: `jira-write` calls now return artifact paths; update each phase's Output/Control text accordingly (SPECS §FR-3, §FR-7).
3. State-file section: `last_agent_comment_id`, `assessment_comment_id`, `tool_issue_key`/`url`, `link_id` recorded as `"pending — see <artifact path>"` at tick-end (SPECS §FR-7).
4. `<idempotency>` section: add the note that a `pending` id with no new comment author is a valid, non-corrupt state (SPECS §FR-7).
5. `<subagent_policy>`, `<state_and_resumption>`, `<validation_checklist>`: strip remaining live-call/MCP language.
6. `<out_of_scope>`: add the one line naming artifact-execution + feedback-into-next-snapshot as future, cross-repo, not built here (SPECS §FR-7).

### Subagents
- `rosetta:engineer` (long-running) — touches the orchestrator file + all 4 affected phase files; must read S2/S3's actual delivered contracts first, not SPECS alone, in case either drifted during implementation.

### Rules
- Do not touch `<elicitation>` (phase 2) or `<completion_check>` (phase 3) — both are already connectivity-agnostic (pure content/state logic), out of this session's file-ownership.
- `<validation_checklist>` items claiming a captured ID/key as a done-check must be reworded to check for the artifact path instead — a stale checklist item would silently mis-validate every future run.

### Done when
- No phase file claims a captured comment ID, transition result, created key, or link ID as its own output — every write-bearing phase's output is an artifact path plus a `pending` state-file marker.
- Phase 1 never issues a live search/fetch.

### Checklist
- [ ] Implemented (SPECS §FR-2, §FR-3, §FR-7)
- [ ] Phase 1 rewritten, local eligibility check replaces live JQL
- [ ] Phases 4/5/6 rewritten, artifact-path outputs only
- [ ] State-file section + `<idempotency>` updated, `pending` state documented as valid
- [ ] `<out_of_scope>` gains the execution-feedback-loop line
- [ ] `<validation_checklist>` rewritten, no stale live-capture assertions
- [ ] Phases 2/3 untouched (verify via diff)
- [ ] Documents updated (session handoff)

---

## S5 — Plugin regeneration + cross-file consistency pass
Depends on: S1, S2, S3, S4. Runs alone, last.

### Do
1. Run `npx -y rosettify-plugins@latest` at repo root (or `venv/bin/python scripts/pre_commit.py`) to regenerate `plugins/*` from the edited `instructions/r3/core/*` (ARCHITECTURE.md Development section).
2. Full-branch re-read: `jira-write` ↔ `triage-flow.md` ↔ `data-collection` for any remaining contradiction (e.g. a phase file still naming an MCP tool, a stale "read current identity" reference anywhere).
3. Confirm `git status` shows only the intended deletions/edits — no stray regenerated-plugin drift unrelated to this change.

### Subagents
- `rosetta:executor` (short-term) — mechanical regen + grep-based consistency check.

### Done when
- `plugins/*` regenerated and match the edited `instructions/r3/*` content.
- No remaining "MCP"/"live"/"configured Issue Tracker integration (call)" language anywhere in the touched skill/workflow files.

### Checklist
- [ ] Implemented (regen ran clean)
- [ ] Cross-file consistency verified (no contradiction between S2/S3/S4 deliverables)
- [ ] `git status` reviewed, no unexpected files
- [ ] Documents updated (`agents/IMPLEMENTATION.md` entry per project convention)
