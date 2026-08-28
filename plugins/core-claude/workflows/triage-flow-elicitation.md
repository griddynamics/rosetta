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

<idempotency_check step="2.1" subagent="requirements-engineer" role="Requirements elicitation against one existing ticket" subagent_required_model="claude-opus-5">

1. Read `last_agent_comment_id` from `<TICKET-KEY>-TRIAGE-FLOW-STATE.md`'s Idempotency section (absent on tick 1 — treat as "no prior agent comment").
2. Compare it against the newest comment ID in this tick's redacted snapshot (phase 1's output — `data-collection` already redacted it before intake returned).
3. Equal → nothing new since the agent's own last post. Report this to the orchestrator as a no-op (for the Poll Tick / Event Log) and hand control straight to `completion_check` (phase 3) with the current Requirements.md unchanged — do NOT invoke `requirements-authoring` this tick.
4. Different (or `last_agent_comment_id` absent) → a genuine new requester reply (or first-ever intake) exists; proceed to step 2.2.
5. Never compare by comment author. This exact rule was validated against a real production bug: author-based detection produces a false "new reply" or false "no-op" whenever the agent and a human share one Jira identity.

</idempotency_check>

<run_iteration step="2.2" subagent="requirements-engineer">

1. USE SKILL `subagent-directives`.
2. Check whether `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` already exists (`artifacts_dir` from `agents/jira-triage.config.json`, default `agents/TEMP`).
3. USE SKILL `requirements-authoring` directly (intent_capture → draft → validate only): on tick 1, run from-scratch against the redacted ticket description; on a later tick, run in update mode against the existing Requirements.md plus the redacted new comment text found in step 2.1.
4. Requirements.md updates in place — same `<req>` IDs, `changed` dates bumped, no new file version.
5. Output: updated Requirements.md with current `<req>` unit statuses and an Open Questions list.

</run_iteration>

<update_state step="2.3" subagent="requirements-engineer">

1. Report to the orchestrator: iteration number, Open Questions count, per-`<req>` Draft/Approved tally. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.
2. Do NOT report a `last_agent_comment_id` value here — that field is only ever set after phase 4 (`publish_questions`) successfully posts a comment.

</update_state>

<validation_checklist>
- Idempotency check ran before any `requirements-authoring` invocation, and compared IDs, not authors.
- A no-op tick left Requirements.md unchanged and reported no `last_agent_comment_id` update.
- A genuine-new-reply tick fed the redacted (not raw) comment text into `requirements-engineer`.
- Requirements.md kept its existing `<req>` IDs across iterations.
</validation_checklist>

<pitfalls>
- Comparing comment author instead of comment ID — this is the exact bug the POC found and fixed.
- Running `requirements-authoring-flow.md`'s full 9 phases instead of invoking the skill directly.
- Re-running `sensitive-data` here — phase 1's `data-collection` fetch already redacted this content; do not duplicate the screening.
</pitfalls>

</triage_flow_elicitation>
