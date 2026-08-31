---
name: triage-flow-publish-questions
description: "Phase 4 Publish-questions of triage-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<triage_flow_publish_questions>

<description_and_purpose>
Compose the current Open Questions into one ticket-comment write artifact, per `triage-flow.md`'s `<write_artifact_contract>`, and persist that artifact's path as the pending idempotency anchor for the next tick. Only ever reached via phase 3 (`completion_check`)'s non-empty branch — this phase never needs to check for itself whether Open Questions is empty, and composing the artifact is always this tick's terminal action: nothing else runs afterward. This phase never performs a live write — it composes a JSON artifact and reports its path; no comment ID exists until a future, out-of-scope execution step runs the artifact against real Jira.
</description_and_purpose>

<workflow_context>
Phase 4 of `triage-flow`. Mandatory `executor`; the compose itself runs unattended — `POC-SCOPE-OVERRIDE:` no human confirmation gate for this build, per `<write_artifact_contract>`. This flow has no live connection to the Issue Tracker; this phase's output is an artifact path, never a comment ID.
</workflow_context>

<phase_steps>
1. Compose the comment from Open Questions
2. Gate with `dangerous-actions`, determine the next `NNN`, compose the add_comment artifact, and write it to disk
3. Persist last_agent_comment_id as pending, pointing at that artifact
</phase_steps>

<compose step="4.1" subagent="executor" role="Bounded Jira comment publisher" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5">

1. USE SKILL `subagent-directives`.
2. Read Open Questions from phase 2's Requirements.md output — non-empty by construction, since phase 3 (`completion_check`) only routes here on that branch.
3. Compose a comment listing only the questions still open this tick (do not re-ask questions already resolved in a prior iteration).

</compose>

<post step="4.2" subagent="executor">

1. USE SKILL `dangerous-actions` directly, immediately before composing: assess blast radius (a live, shared Issue Tracker ticket is exactly the "touches a shared/live system" class this gate exists to catch, even though composing an artifact here never itself touches it), consider the opposite (what if this composed comment is wrong), consider safer alternatives. `POC-SCOPE-OVERRIDE:` per `<write_artifact_contract>`, this build skips `dangerous-actions` step 5 ("MUST REQUIRE EXPLICIT user approval") and `hitl`'s "dangerous actions ALWAYS require explicit approval" rule for this compose — unattended/autonomous at compose time by design, matching this flow's overall unattended-CI posture.
2. Determine `NNN`: list `<artifacts_dir>/<TICKET-KEY>/jira-writes/` (create the directory if it doesn't exist yet), take the highest existing three-digit sequence number, use the next one, zero-padded, starting at `001` if the directory is empty/absent. Never reuse or guess a number.
3. Compose exactly `{"op": "add_comment", "target_issue_key": "<key>", "payload": {"body": "<composed body>"}, "composed_at": "<ISO8601>"}` and write it to `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-add_comment.json`. This is the artifact's path — **never a comment ID**; no comment ID exists until a future, out-of-scope execution step runs the artifact against real Jira. Capture that artifact path.

</post>

<update_state step="4.3" subagent="executor">

1. Report to the orchestrator: the composed artifact's path (for `last_agent_comment_id`, recorded as `"pending — see <artifact path>"` — never a real comment ID, which does not exist yet), and that flow status remains IN_PROGRESS for this tick. Do not report a `resolved_acting_identity` value — this flow has no live connection and resolves no identity at compose time; see `<write_artifact_contract>`'s no-identity-resolution rule. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.

</update_state>

<validation_checklist>
- `last_agent_comment_id` is recorded as `"pending — see <artifact path>"` pointing at the artifact this phase actually composed this tick — never a guessed, reused, or fabricated comment ID.
- Already-resolved questions were not re-asked in the composed comment.
- This compose was the tick's terminal action — no further phase ran afterward.
- No phase output claims a captured comment ID; the artifact's path is the only thing reported as this phase's output.
</validation_checklist>

<pitfalls>
- Posting a comment that re-lists questions the requester already answered in a prior iteration.
- Reporting `last_agent_comment_id` as a real comment ID instead of the `"pending — see <artifact path>"` sentinel — no comment ID exists until a future, out-of-scope execution step runs the artifact.
- Reporting or assuming a `resolved_acting_identity` value from this compose step — this flow resolves no identity at compose time at all.
</pitfalls>

</triage_flow_publish_questions>
