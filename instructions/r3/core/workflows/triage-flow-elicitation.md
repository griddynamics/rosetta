---
name: triage-flow-elicitation
description: "Phase 2 Elicitation of triage-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<triage_flow_elicitation>

<description_and_purpose>
Run one requirements-authoring iteration — create on tick 1, update on later ticks — against the already-redacted ticket content, but only when the idempotency check finds something genuinely new since the agent's own last comment.
</description_and_purpose>

<workflow_context>
Phase 2 of `triage-flow`. Mandatory `requirements-engineer`, invoked directly for intent-capture/draft/validate only — never the full 9-phase `requirements-authoring-flow.md`, whose outline/user_review/finalization gates don't map onto an async, comment-driven Q&A loop.
</workflow_context>

<phase_steps>
1. Run the idempotency check
2. Skip to completion-check if nothing new
3. Otherwise run one requirements-authoring iteration
4. Update flow state and Requirements.md
</phase_steps>

<idempotency_check step="2.1" subagent="requirements-engineer" role="Requirements elicitation against one existing ticket" subagent_required_model="claude-opus-5, gpt-5.6-sol-high, gemini-3.7-flash-high">

1. Read `last_processed_ticket_details_hash` from `<TICKET-KEY>-TRIAGE-FLOW-STATE.md`'s Idempotency section (absent on tick 1 — treat as "nothing processed yet").
2. Compute a content hash (SHA-256 hex) of this tick's redacted `ticket_details` text (phase 1's output — phase 1 already redacted it directly via `sensitive-data` before intake returned).
3. Equal, and `last_processed_ticket_details_hash` actually present → nothing about the ticket has changed since this flow last processed it. Report this to the orchestrator as a no-op (for the Poll Tick / Event Log) and hand control straight to `completion_check` (phase 3) with the current Requirements.md unchanged — do NOT invoke `requirements-authoring` this tick.
4. Different, or `last_processed_ticket_details_hash` absent → something changed since last time (a new comment, an edited field, or this is the ticket's first-ever tick); proceed to step 2.2. After step 2.2 runs, report this tick's `ticket_details` hash for the orchestrator to store as the new `last_processed_ticket_details_hash`.
5. This is a content-level comparison of the whole `ticket_details` text, not an author- or ID-based one — free text carries no structured comment IDs or authors to compare. See `triage-flow.md`'s `<idempotency>` for why this coarser check is an acceptable, deliberate simplification in this build.

</idempotency_check>

<run_iteration step="2.2" subagent="requirements-engineer">

1. USE SKILL `subagent-directives`.
2. Check whether `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` already exists (`artifacts_dir` from the caller-supplied invocation input, default `agents/TEMP`).
3. USE SKILL `requirements-authoring` directly (intent_capture → draft → validate only): on tick 1, run from-scratch against the redacted ticket description; on a later tick, run in update mode against the existing Requirements.md plus the redacted new comment text found in step 2.1.
4. Requirements.md updates in place — same `<req>` IDs, `changed` dates bumped, no new file version.
5. Output: updated Requirements.md with current `<req>` unit statuses and an Open Questions list.

</run_iteration>

<update_state step="2.3" subagent="requirements-engineer">

1. Report to the orchestrator: iteration number, Open Questions count, per-`<req>` Draft/Approved tally. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.
2. Do NOT report a `last_agent_comment_id` value here — that field is only ever set after phase 4 (`publish_questions`) successfully posts a comment.

</update_state>

<validation_checklist>
- Idempotency check ran before any `requirements-authoring` invocation, and compared this tick's `ticket_details` content hash against the stored one — never an author, and never a comment ID (neither exists in free text).
- A no-op tick left Requirements.md unchanged and reported no new `last_processed_ticket_details_hash`.
- A genuine-change tick fed the redacted (not raw) `ticket_details` text into `requirements-engineer`, then reported the new hash for the orchestrator to store.
- Requirements.md kept its existing `<req>` IDs across iterations.
</validation_checklist>

<pitfalls>
- Reintroducing an author- or comment-ID-based comparison here — this build compares whole-text content hashes precisely because free text carries neither concept; see `triage-flow.md`'s `<idempotency>` for why the original POC's author-based-detection bug does not apply to this mechanism.
- Running `requirements-authoring-flow.md`'s full 9 phases instead of invoking the skill directly.
- Re-running `sensitive-data` here — phase 1 already redacted this content directly; do not duplicate the screening.
</pitfalls>

</triage_flow_elicitation>
