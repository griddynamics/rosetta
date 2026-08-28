<triage_flow_assess>

<description_and_purpose>
Produce the triage assessment (blind spots, potentially affected tools, issue size) for a ticket phase 3 has just marked toward completion, and post it as one Jira comment. Phase 6 (APPLY SKILL FILE `phases/triage-flow-create-tool-issue.md`) then runs on the same tick and performs the flow's final action; this comment is the last write this flow makes on the source ticket itself. This phase's assessment logic is relocated from what was previously step 4.3 of APPLY SKILL FILE `phases/triage-flow-completion-check.md` — the assessment *output* it produces (`<TICKET-KEY>-TRIAGE-ASSESSMENT.md`) is unchanged in shape and content. There is no risk-based branching: every ticket reaching this phase gets the same treatment regardless of the levels found.
</description_and_purpose>

<workflow_context>
Phase 5 of `triage-flow`, and its last judgment-heavy one; phase 6 (APPLY SKILL FILE `phases/triage-flow-create-tool-issue.md`) follows on the same tick and is now the flow's final phase. Runs only immediately after phase 3 (`completion_check`) routed here on its empty-Open-Questions branch this tick — never on an IN_PROGRESS tick, never re-run for a ticket already recorded as assessed from a prior tick (check `<TICKET-KEY>-TRIAGE-FLOW-STATE.md`'s `## Assessment` section first; if `assessment_file` is already recorded for this ticket, do not re-run). This phase never reassigns the ticket or transitions its status — its only Jira write is the one assessment comment; the target-project issue and its link are phase 6's, not this phase's.
</workflow_context>

<phase_steps>
1. Read the finalized Requirements.md and ticket fields
2. Produce the three assessment blocks and write the assessment file
3. Compose and post the assessment comment
4. Report outcome to the orchestrator
</phase_steps>

<produce_assessment step="5.1" subagent="reviewer" role="Bounded triage-assessment synthesizer" subagent_required_model="inherit">

1. USE SKILL `subagent-directives`.
2. Read the finalized `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` (all `<req>` units, now `Approved`) and the ticket's `TSSM: Tool` / `TSSM: Project` custom-field values from phase 1's redacted snapshot (carried in flow state since phase 1) — these two fields name the tool and the project this feature is being built for/in, the starting point for step 5.2 below, not an incidental attribute.
3. Produce three assessment blocks, each independently scannable:
   - **Blind spots**: bullet the specific gaps a planning/coding agent could hit later (the requirements are complete and business-confirmed, but not yet planning-ready — do not over-dramatize; most tickets carry ordinary, easily-absorbed gaps). Roll up to one **Overall Risk Level**: `Critical` (huge gaps/contradictions in the elicited requirements), `High` (major gaps/contradictions that could trouble planning or coding agents), `Medium` (one or two non-minor gaps a planning/coding agent with project + codebase access can still handle), `Low` (only minor gaps, or none). State the level with a one-line justification.
   - **Potentially affected tools**: starting from the `TSSM: Tool`/`TSSM: Project` target, reason from the completed requirements to name other Grid Dynamics tools with plausible integration exposure, one line of reason each. Roll up to one **Overall Impact Level**: `Critical` (huge impact on an existing integration point, or an unpredictable new one), `High` (high impact on an existing point, or a new point whose effect is predictable but has major uncertainties), `Medium` (some medium effect on an existing point, or a minor new point — any nonzero risk lands here at minimum), `Low` (no integration effect detected — reserved strictly for that case, never a catch-all for "didn't look").
   - **Issue size**: one t-shirt size, `XL`/`L`/`M`/`S`, with a 1–2 sentence justification grounded in the requirements' scope (unit count, dependency depth, new integration points).
4. Write the three blocks to a new file `<artifacts_dir>/<ticket_key>/<ticket_key>-TRIAGE-ASSESSMENT.md`, alongside the ticket's Requirements.md, structured as three clearly headed sections in the order above, each restating its rubric once at the top rather than re-deriving it per read.

</produce_assessment>

<compose_and_post_comment step="5.2" subagent="reviewer">

1. Compose the assessment comment body: the three overall levels/size from step 5.1, stated plainly — no framing that implies escalation, urgency, or a required next action tied to the levels found; just the results. This comment is the last thing this flow writes on the source ticket, so state that plainly (requirements and assessment artifacts are available at the ticket's `artifacts_dir` path for downstream review). Do not name or promise the target-project issue phase 6 creates — it does not exist when this comment is composed, and citing a key that may never be created is worse than saying nothing.
2. USE SKILL `jira-write` (post comment) with the composed body.

</compose_and_post_comment>

<update_state step="5.3" subagent="reviewer">

1. Report to the orchestrator: `assessment_file` path, the three levels/size, `assessment_comment_id` (from step 5.2's post), and that phase 5 is done; flow status stays `IN_PROGRESS` until phase 6 records both `tool_issue_key` and `link_id`. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.

</update_state>

<validation_checklist>
- This step ran exactly once per ticket that reached the empty-Open-Questions branch — never on an IN_PROGRESS tick, never duplicated on a later tick for the same already-assessed ticket.
- The assessment file's three sections are each present and independently readable, even when a block's answer is "no gaps found" / "no integration effect" / a small size — a thin result is still a written result, never an omitted section.
- No reassignment or transition was made — this phase's only Jira write is the one assessment comment.
- The comment was posted exactly once, and its body states results plainly without escalation/urgency framing tied to the levels found.
</validation_checklist>

<pitfalls>
- Reintroducing a risk-based branch (reassignment, transition, or differently-worded comments per level) — this phase treats every ticket the same regardless of the levels found.
- Defaulting to `Low` on the affected-tools block out of uncertainty rather than genuinely finding no integration exposure — uncertainty belongs in `Medium` or above.
- Reading `TSSM: Tool`/`TSSM: Project` as arbitrary metadata instead of as the target tool/project the feature is being delivered into, which is what step 5.1's reasoning anchors on.
- Posting the comment before the assessment file is fully written, or omitting a section instead of writing a thin one.
</pitfalls>

</triage_flow_assess>
