---
name: triage-flow-assess
description: "Phase 5 Assess of triage-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<triage_flow_assess>

<description_and_purpose>
Produce the triage assessment (blind spots, potentially affected tools, issue size) for a ticket phase 3 has just marked toward completion, and compose it into one Jira comment write artifact, per `triage-flow.md`'s `<write_artifact_contract>`. Phase 6 (`triage-flow-create-tool-issue.md`) then runs on the same tick and performs the flow's final action; this composed comment artifact is the last write this flow makes on the source ticket itself — this phase never posts it live, it only composes a JSON artifact and reports its path, per `<write_artifact_contract>`. This phase's assessment logic is relocated from what was previously step 4.3 of `triage-flow-completion-check.md` — the assessment *output* it produces (`<TICKET-KEY>-TRIAGE-ASSESSMENT.md`) is unchanged in shape and content. There is no risk-based branching: every ticket reaching this phase gets the same treatment regardless of the levels found.
</description_and_purpose>

<workflow_context>
Phase 5 of `triage-flow`, and its last judgment-heavy one; phase 6 (`triage-flow-create-tool-issue.md`) follows on the same tick and is now the flow's final phase. Runs only immediately after phase 3 (`completion_check`) routed here on its empty-Open-Questions branch this tick — never on an IN_PROGRESS tick, never re-run for a ticket already recorded as assessed from a prior tick (check `<TICKET-KEY>-TRIAGE-FLOW-STATE.md`'s `## Assessment` section first; if `assessment_file` is already recorded for this ticket, do not re-run). This phase never reassigns the ticket or transitions its status — its only Jira write is the one composed assessment-comment artifact; the target-project issue and its link are phase 6's, not this phase's.
</workflow_context>

<phase_steps>
1. Read the finalized Requirements.md and ticket fields
2. Produce the three assessment blocks and write the assessment file
3. Gate with `dangerous-actions`, determine the next `NNN`, compose the assessment comment artifact, and write it to disk
4. Report outcome to the orchestrator
</phase_steps>

<produce_assessment step="5.1" subagent="reviewer" role="Bounded triage-assessment synthesizer" subagent_required_model="claude-opus-5, gpt-5.6-sol-high, gemini-3.7-flash-high">

1. USE SKILL `subagent-directives`.
2. Read the finalized `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` (all `<req>` units, now `Approved`) and locate the ticket's `TSSM: Tool` / `TSSM: Project` custom-field values directly within phase 1's redacted `ticket_details` text (carried in flow state since phase 1) — these two fields name the tool and the project this feature is being built for/in, the starting point for step 5.2 below, not an incidental attribute. Not stated clearly in that text → gap, do not guess.
3. Produce three assessment blocks, each independently scannable:
   - **Blind spots**: bullet the specific gaps a planning/coding agent could hit later (the requirements are complete and business-confirmed, but not yet planning-ready — do not over-dramatize; most tickets carry ordinary, easily-absorbed gaps). Roll up to one **Overall Risk Level**: `Critical` (huge gaps/contradictions in the elicited requirements), `High` (major gaps/contradictions that could trouble planning or coding agents), `Medium` (one or two non-minor gaps a planning/coding agent with project + codebase access can still handle), `Low` (only minor gaps, or none). State the level with a one-line justification.
   - **Potentially affected tools**: starting from the `TSSM: Tool`/`TSSM: Project` target, reason from the completed requirements to name other Grid Dynamics tools with plausible integration exposure, one line of reason each. Roll up to one **Overall Impact Level**: `Critical` (huge impact on an existing integration point, or an unpredictable new one), `High` (high impact on an existing point, or a new point whose effect is predictable but has major uncertainties), `Medium` (some medium effect on an existing point, or a minor new point — any nonzero risk lands here at minimum), `Low` (no integration effect detected — reserved strictly for that case, never a catch-all for "didn't look").
   - **Issue size**: one t-shirt size, `XL`/`L`/`M`/`S`, with a 1–2 sentence justification grounded in the requirements' scope (unit count, dependency depth, new integration points).
4. Write the three blocks to a new file `<artifacts_dir>/<ticket_key>/<ticket_key>-TRIAGE-ASSESSMENT.md`, alongside the ticket's Requirements.md, structured as three clearly headed sections in the order above, each restating its rubric once at the top rather than re-deriving it per read.

</produce_assessment>

<compose_and_post_comment step="5.2" subagent="reviewer">

1. Compose the assessment comment body: the three overall levels/size from step 5.1, stated plainly — no framing that implies escalation, urgency, or a required next action tied to the levels found; just the results. This comment is the last thing this flow writes on the source ticket, so state that plainly (requirements and assessment artifacts are available at the ticket's `artifacts_dir` path for downstream review). Do not name or promise the target-project issue phase 6 creates — it does not exist when this comment is composed, and citing a key that may never be created is worse than saying nothing.
2. USE SKILL `dangerous-actions` directly, immediately before composing: assess blast radius (a live, shared Issue Tracker ticket is exactly the "touches a shared/live system" class this gate exists to catch, even though composing an artifact here never itself touches it), consider the opposite (what if this composed comment is wrong), consider safer alternatives. `POC-SCOPE-OVERRIDE:` per `<write_artifact_contract>`, this build skips `dangerous-actions` step 5 ("MUST REQUIRE EXPLICIT user approval") and `hitl`'s "dangerous actions ALWAYS require explicit approval" rule for this compose — unattended/autonomous at compose time by design, matching this flow's overall unattended-CI posture.
3. Determine `NNN`: list `<artifacts_dir>/<TICKET-KEY>/jira-writes/` (create the directory if it doesn't exist yet), take the highest existing three-digit sequence number, use the next one, zero-padded, starting at `001` if the directory is empty/absent. Never reuse or guess a number.
4. Compose exactly `{"op": "add_comment", "target_issue_key": "<key>", "payload": {"body": "<composed body>"}, "composed_at": "<ISO8601>"}` and write it to `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-add_comment.json`. This flow has no live connection to the Issue Tracker: this is the artifact's path — **never a comment ID**; no comment ID exists until a future, out-of-scope execution step runs the artifact against real Jira. Capture the artifact's path.

</compose_and_post_comment>

<update_state step="5.3" subagent="reviewer">

1. Report to the orchestrator: `assessment_file` path, the three levels/size, and the composed comment artifact's path (for `assessment_comment_id`, recorded as `"pending — see <artifact path>"` — never a real comment ID), and that phase 5 is done; flow status stays `IN_PROGRESS` until phase 6 records both `tool_issue_key` and `link_id`. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.

</update_state>

<validation_checklist>
- This step ran exactly once per ticket that reached the empty-Open-Questions branch — never on an IN_PROGRESS tick, never duplicated on a later tick for the same already-assessed ticket.
- The assessment file's three sections are each present and independently readable, even when a block's answer is "no gaps found" / "no integration effect" / a small size — a thin result is still a written result, never an omitted section.
- No reassignment or transition was made — this phase's only Jira write is the one composed assessment-comment artifact.
- The comment artifact was composed exactly once, its body states results plainly without escalation/urgency framing, and `assessment_comment_id` is reported as `"pending — see <artifact path>"`, never a fabricated or assumed real comment ID.
</validation_checklist>

<pitfalls>
- Reintroducing a risk-based branch (reassignment, transition, or differently-worded comments per level) — this phase treats every ticket the same regardless of the levels found.
- Defaulting to `Low` on the affected-tools block out of uncertainty rather than genuinely finding no integration exposure — uncertainty belongs in `Medium` or above.
- Reading `TSSM: Tool`/`TSSM: Project` as arbitrary metadata instead of as the target tool/project the feature is being delivered into, which is what step 5.1's reasoning anchors on.
- Composing the comment artifact before the assessment file is fully written, or omitting a section instead of writing a thin one.
- Reporting `assessment_comment_id` as a real comment ID instead of the `"pending — see <artifact path>"` sentinel — no comment ID exists until a future, out-of-scope execution step runs the artifact.
</pitfalls>

</triage_flow_assess>
