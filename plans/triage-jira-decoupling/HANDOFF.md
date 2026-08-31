# Handoff — triage-jira-decoupling

## Status: IMPLEMENTED, then CORRECTED twice post-implementation — see "Post-implementation correction" and "Second correction" below. Not committed (no commit requested yet).

## Second correction: no snapshot file, no config file — ticket details as plain text input

After the first correction (below), the user asked why `agents/jira-triage.config.json` was still needed, then said: "we dont need that ticket details will be provided in form of text, no need to read anything from jira." Confirmed via 4 targeted questions before executing: (1) ticket content now arrives as plain text directly in the invocation, no file, no JSON shape; (2) phase 1's local `jql` eligibility check is dropped entirely — this flow trusts the caller/upstream trigger completely; (3) the comment thread still arrives as part of that text, so idempotency still needs a "did anything change since last tick" check; (4) `agents/jira-triage.config.json` is removed entirely, its settings folded into the invocation input (`artifacts_dir`) or hardcoded (`tool_issue_target`, `orchestrator_model_policy`, the `POC-SCOPE-OVERRIDE` confirmation policy).

Changes:
- **`agents/jira-triage.config.json` deleted.** No deployment config file exists in this build at all.
- **`<intake_contract>` (`triage-flow.md`) input shape**: `{ ticket_key, reason?, ticket_details: string, artifacts_dir?: string }`. `ticket_details` is free text the caller composes with whatever it has (no fixed schema). `artifacts_dir` is now an invocation input (default `agents/TEMP`), not read from config.
- **Phase 1 (`triage-flow-intake.md`)** fully rewritten: no file read, no eligibility check (`<eligibility_check>` step removed entirely, steps renumbered), just validate `ticket_key`/`ticket_details` are non-empty and redact `ticket_details` via `sensitive-data`.
- **Idempotency mechanism changed**: `<idempotency>` (`triage-flow.md`) and phase 2's `<idempotency_check>` now compare a SHA-256 content hash of this tick's redacted `ticket_details` against `last_processed_ticket_details_hash` in flow state, replacing the old comment-ID comparison (`newest_comment_id_seen` state field removed) — free text carries no comment IDs or authors to diff, so this is a coarser, deliberately-simpler check: any change to `ticket_details` (not just a new comment) triggers a re-run. Documented as an acceptable tradeoff, not a silent behavior change.
- **Phase 6 (`triage-flow-create-tool-issue.md`)** step 6.4: `tool_issue_target` values (`project_key: TOOL`, `issue_type: Story`, `carry_fields: [TSSM: Tool, TSSM: Project]`, `link_type: Action item`, `link_inward: new_issue`) are now hardcoded constants instead of read from config.
- **Every "phase 1's snapshot" / "input snapshot" reference** across `triage-flow.md` and all phase files updated to "phase 1's `ticket_details` text" / "this tick's `ticket_details` input".
- **Prerequisites (`triage-flow.md` step 3/4)**: no config read; `orchestrator_model_policy` requirement (sonnet-tier, `STOP_AND_REPORT`) hardcoded directly in prose.
- `agents/IMPLEMENTATION.md`'s `triage-flow` entry rewritten to match.

Verified via `git grep`-style sweep: zero remaining "jira-triage.config", "jql", or "snapshot" references anywhere in `triage-flow*.md` except intentional negations (e.g. phase 1's pitfalls explicitly saying "this build has none").

## First correction: triage-flow made fully standalone (data-collection / jira-write removed)

After S1-S5 landed (see "Session outcomes" below, kept for history), the user reviewed the result and said: "It should've been a bit separate triage flow not integrated in existing issue binding or plugin skills, just like in pr standalone flow which can be called with slash command." This flagged real coupling: S3 had added a file-sourced branch to the shared `data-collection` skill (used by aqa-flow/testgen-flow/qa-knowledge), and S2 had introduced a new shared `jira-write` skill under `core/skills/` — both discoverable/usable outside `triage-flow`, which was never the intent for a POC-scoped, single-caller flow.

Correction applied directly (confirmed with the user via 3 targeted questions before executing):
- **`data-collection`** reverted via `git checkout HEAD` to its exact pre-triage-flow state — zero diff, no triage-flow awareness left in it at all.
- **`jira-write`** (`instructions/r3/core/skills/jira-write/`) deleted entirely — `git rm -r`, no trace on disk or in plugins.
- **`triage-flow.md`** gained two new self-contained sections mirroring the existing `<intake_contract>` pattern: `<intake_contract>` itself now describes a direct file read (no shared skill), and a new `<write_artifact_contract>` section centralizes the compose/gate/write rules (artifact shape, `NNN` sequence numbering, `dangerous-actions` gate framing, `POC-SCOPE-OVERRIDE`, `create_issue`'s duplicate-prevention requirement, create-then-link gate cadence, no-identity-resolution rule) that phases 4/5/6 now reference instead of `USE SKILL jira-write`.
- **Phase 1** (`triage-flow-intake.md`) reads and parses the snapshot file directly, validates its required fields, and redacts it itself via `sensitive-data` — no `data-collection` call anywhere.
- **Phases 4/5/6** (`triage-flow-publish-questions.md`, `triage-flow-assess.md`, `triage-flow-create-tool-issue.md`) each USE SKILL `dangerous-actions` directly and compose/write the JSON artifact themselves per `<write_artifact_contract>` — no `jira-write` call anywhere.
- **`dangerous-actions` and `sensitive-data` stay as dependencies** — confirmed with the user as acceptable, since they are generic cross-cutting guardrails (not Issue-Tracker/Jira-specific), unlike `data-collection`/`jira-write`.
- One leftover found and fixed during verification: `triage-flow-create-tool-issue.md`'s `<link_probe>` step (6.2) still called `USE SKILL data-collection` — the phase-6 rewrite task's scope had only covered steps 6.4/6.5; fixed directly by the orchestrator. Two more found in `triage-flow-elicitation.md` (phase 2, untouched by any rewrite task since it was correctly deemed connectivity-agnostic) — stale prose describing phase 1's fetch as going "via `data-collection`"; fixed directly.
- Final `git grep`-based sweep confirmed zero remaining `jira-write` or `data-collection` references anywhere in `triage-flow*.md`, and `data-collection`'s own files show zero diff from HEAD.
- Plugins regenerated again (`npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false`) to drop the stale `data-collection` branch and `jira-write` skill from all plugin variants and pick up the corrected `triage-flow` content.

**SPECS/PLAN status**: `triage-jira-decoupling-SPECS.md`'s FR-2 (the `data-collection` extension) and FR-3/FR-4/FR-5 (the `jira-write` skill) are **superseded** by this correction — the actual delivered behavior (snapshot read, write-artifact composition, gate framing, identity handling) matches those FRs' intent almost exactly, but the *mechanism* moved from "shared skill" to "inlined directly in `triage-flow`'s own files." `triage-jira-decoupling-PLAN.md`'s S2/S3 as written no longer describe real files. Neither doc has been rewritten in place — this HANDOFF is the authoritative record of the actual delivered architecture; a future reader should treat SPECS/PLAN as historical intent, not current contract, for the shared-skill points specifically.

**Final regen (post-correction) result**: `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false` ran clean (exit 0). Backstop greps confirmed: zero `jira-write` references anywhere under `plugins/` or `instructions/r3/core/workflows/triage-flow*.md`; zero `data-collection` references in `triage-flow*.md`; `instructions/r3/core/skills/data-collection/` shows zero diff from HEAD; `git grep -i jira-service-account` empty. `git status` shows exactly: the S1 deletions/edits, `jira-write`'s deletion, the 6 `triage-flow*.md` edits, `agents/IMPLEMENTATION.md`'s updated entry, the corresponding regenerated plugin diffs, and new `plugins/*/triage-flow*`/`plugins/*/skills/triage-flow/` files — no unexpected drift.

## Links
- `triage-jira-decoupling-SPECS.md` — contract (WHAT)
- `triage-jira-decoupling-PLAN.md` — sessions (HOW), S1-S5
- `discovery-notes.md` — grounding: real production caller, gaps, decisions already made

## Session outcomes
- **S1** — `.mcp.json` and `agents/jira-mcp-auth-header.sh` deleted; `.gitignore` secrets-line removed; `agents/jira-triage.config.json` updated (`orchestrator_model_policy.required_tier`: `opus`→`sonnet`, `on_violation`: `DEMAND_USER_SWITCH_MODEL`→`STOP_AND_REPORT`, `jql` reworded via new `jql_note`). Verified: valid JSON, `git grep -i jira-service-account` clean.
- **S2** — `jira-write/SKILL.md` + `references/jira-write-vendor-binding.md` rewritten compose-not-execute per FR-3/FR-4/FR-5. Verified by direct file read: `<operations>` all end at artifact composition, identity resolution removed, `create issue` duplicate-prevention requirement intact, field/link-type validation regression documented in `<pitfalls>` as moved-not-solved.
- **S3** — `data-collection/SKILL.md` + `references/issue-vendor-binding.md` extended with an additive, opt-in file-sourced Issue Tracker branch per FR-2. Verified by direct file read: live-resolution path untouched, snapshot-file field map added alongside (not replacing), missing-required-field stop-and-report behavior documented, existing callers (aqa-flow/testgen-flow/qa-knowledge) re-checked and confirmed unaffected.
- **S4** — `triage-flow.md` + phases 1/4/5/6 rewritten per FR-2/FR-3/FR-7. Verified by direct file read: phase 1 has no live search/fetch, phases 4/5/6 report artifact paths only, state-file fields recorded as `"pending — see <artifact path>"`, `<idempotency>` documents `pending` as a valid non-corrupt state, `<out_of_scope>` gained the artifact-execution-feedback-loop line, phases 2/3 confirmed byte-identical via `git diff --stat`. One cross-file inconsistency found and fixed by the orchestrator directly: `triage-flow.md`'s prerequisites section still referenced the pre-S1 `opus`/`DEMAND_USER_SWITCH_MODEL` values — corrected to `sonnet`/`STOP_AND_REPORT` to match S1's landed config.
- **S5** — `npx -y rosettify-plugins@latest --release r3 --deterministic-hooks false` run clean (exit 0, all 8 targets). Consistency greps (MCP/jira-service-account, "read current identity", stale DEMAND_USER_SWITCH_MODEL) all clean or expected-negation-only. `git status` reviewed — only the intended S1-S4 edits/deletions plus their regenerated `plugins/*` counterparts; no unexpected drift.

## Notable design consequence surfaced during implementation
Phase 6's create-then-link can no longer compose both artifacts in the same tick: `link_issues`' payload requires a real target-project issue key, which does not exist until a future execution step has actually run the create artifact and its result has been fed back into a later tick's snapshot. This is a necessary, documented consequence of S2's actual delivered `jira-write` contract (an expected resumable state per its own `<dangerous_actions_gate>`/vendor-binding text), not a scope change — `triage-flow-create-tool-issue.md` now treats it as an explicit two-tick case (create-only, then link-once-a-key-is-confirmed) rather than assuming same-tick completion.

## Active blockers
None. Implementation complete and internally verified. Not yet committed — awaiting user decision on committing/PR.

## Deferred decisions (explicitly out of scope, documented for whoever picks them up later)
- Wiring `tools-harness-intake/triage.yml` to actually call `/triage-flow` and execute the `jira-writes/*.json` artifacts against real Jira — cross-repo, separate task, done against this plan's SPECS contract.
- Field/link-type validation for `create_issue`/`link_issues` (currently a live pre-check in `jira-write`) has no home yet once `jira-write` can't run it — must land in whatever executes the artifacts.
- Today's actual `triage.yml` inputs (issue_key/tool/summary/description/url) are a strict subset of the SPECS §FR-2 snapshot shape (no comments, no full custom fields, no assignee) — the Action-side follow-up must close this gap; this plan's rosetta-side code fails closed rather than papering over it.

## Next-session pointer
S1, S2, S3 can start in parallel once approved (no shared files). S4 waits on S2+S3. S5 waits on all.

## Common issues / notes spanning sessions
- `data-collection` is shared by other workflows — every session touching it (S3) must stay additive-only (see SPECS §FR-2 note).
- Regenerate plugins (S5) is the last step for a reason — any earlier regen would need re-running anyway.
