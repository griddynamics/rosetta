<triage_flow_publish_questions>

<description_and_purpose>
Post the current Open Questions as one ticket comment, and persist the returned comment ID as the idempotency anchor for the next tick. Only ever reached via phase 3 (`completion_check`)'s non-empty branch — this phase never needs to check for itself whether Open Questions is empty, and posting the comment is always this tick's terminal action: nothing else runs afterward.
</description_and_purpose>

<workflow_context>
Phase 4 of `triage-flow`. Mandatory `executor`; the write itself runs unattended — `POC-SCOPE-OVERRIDE:` no human confirmation gate for this build, see `jira-write`'s `<dangerous_actions_gate>`.
</workflow_context>

<phase_steps>
1. Compose the comment from Open Questions
2. Post via jira-write and capture the comment ID
3. Persist last_agent_comment_id
</phase_steps>

<compose step="4.1" subagent="executor" role="Bounded Jira comment publisher" subagent_required_model="gpt-5.6-terra-low, gpt-5.6-luna">

1. USE SKILL `subagent-directives`.
2. Read Open Questions from phase 2's Requirements.md output — non-empty by construction, since phase 3 (`completion_check`) only routes here on that branch.
3. Compose a comment listing only the questions still open this tick (do not re-ask questions already resolved in a prior iteration).

</compose>

<post step="4.2" subagent="executor">

1. USE SKILL `jira-write` (post comment) with the composed body. `POC-SCOPE-OVERRIDE:` this write proceeds without a human-confirmation prompt, per the skill's documented override.
2. Capture the returned comment ID. If the write's failure path triggers instead, stop and report per that failure path — do not proceed to state update on an unconfirmed write.

</post>

<update_state step="4.3" subagent="executor">

1. Report to the orchestrator: the captured comment ID (for `last_agent_comment_id`), `jira-write`'s resolved identity (from its "read current identity" step, not an assumed value, for `resolved_acting_identity`), and that flow status remains IN_PROGRESS for this tick. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.

</update_state>

<validation_checklist>
- `last_agent_comment_id` reflects the ID actually returned by the write, never a guessed or reused value.
- Already-resolved questions were not re-asked in the composed comment.
- This write was the tick's terminal action — no further phase ran afterward.
</validation_checklist>

<pitfalls>
- Posting a comment that re-lists questions the requester already answered in a prior iteration.
- Reporting `last_agent_comment_id` before the post call actually confirms success.
</pitfalls>

</triage_flow_publish_questions>
