<triage_flow_completion_check>

<description_and_purpose>
Decide, once per tick, whether Open Questions is empty — the routing decision that determines whether this tick's Jira write is `publish_questions` (phase 4, non-empty branch) or the flip toward `assess` (phase 5, empty branch). This evaluation runs BEFORE any Jira write is made this tick, so that whichever write eventually happens is always the tick's last action — nothing else runs after it.
</description_and_purpose>

<workflow_context>
Phase 3 of `triage-flow`. Mandatory `executor` throughout — the judgment-heavy assessment work (formerly step 4.3 of this file) now lives in its own phase, APPLY SKILL FILE `phases/triage-flow-assess.md` (phase 5), which declares its own higher model tier. `POC-SCOPE-OVERRIDE:` this build's completion rule (Open Questions empty ⇒ approved) substitutes for `hitl`'s normal explicit-approval-sentence requirement — see below. This phase does not evaluate the `requirements-authoring` validation rubric as a gate; the rubric still runs inside that skill and stays recorded in Requirements.md as reporting, but it no longer blocks progression here.
</workflow_context>

<phase_steps>
1. Read current Requirements.md state
2. Evaluate Open Questions
3. Non-empty → route to `publish_questions` (phase 4). Empty → flip req units to Approved and route to `assess` (phase 5).
</phase_steps>

<evaluate step="3.1" subagent="executor" role="Bounded requirements-completion evaluator" subagent_required_model="inherit">

1. USE SKILL `subagent-directives`.
2. Read `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md`'s Open Questions section and each `<req>` unit's `status`.
3. Open Questions non-empty → this tick is IN_PROGRESS; report to the orchestrator for the "Next Tick Should" note, and hand control to `publish_questions` (phase 4) — do NOT proceed to step 3.2.
4. Open Questions empty → proceed to step 3.2. No rubric-pass check gates this step in this build (see `<workflow_context>`).

</evaluate>

<complete step="3.2" subagent="executor">

1. `POC-SCOPE-OVERRIDE:` flip both `<req>` units from `Draft` to `Approved` in Requirements.md — this build treats "Open Questions empty" alone as sufficient, in place of `hitl`'s normal explicit affirmative-sentence approval. This is a deliberate, flagged POC-scope simplification, not a rediscovered Rosetta rule.
2. Hand control to `assess` (phase 5, APPLY SKILL FILE `phases/triage-flow-assess.md`), which is followed on the same tick by `create_tool_issue` (phase 6) — the flow's final phase.

</complete>

<update_state step="3.3" subagent="executor">

1. Report to the orchestrator: on the non-empty branch, the "Next Tick Should" note; on the empty branch, the `<req>` unit flip and that flow status should move toward `COMPLETE` (pending phases 5 and 6). This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.

</update_state>

<validation_checklist>
- `publish_questions` (phase 4) never ran while Open Questions was empty; `assess` (phase 5) never ran while Open Questions was non-empty.
- Both `<req>` units carry the same status (both Approved or both still Draft) — never a mixed state.
- The `POC-SCOPE-OVERRIDE:` marker remains intact and legible in this file for future removal.
- Flipping `<req>` status happened only after confirming Open Questions is actually empty on the current tick's data, not a stale cached count.
</validation_checklist>

<pitfalls>
- Flipping `<req>` status before confirming Open Questions is actually empty on the current tick's data, not a stale cached count.
- Silently treating this override as permanent production behavior instead of the flagged, revisitable decision it is.
- Re-introducing a rubric-pass requirement here — that check was deliberately removed from this build's completion gate; the rubric still runs and is still recorded, it just does not gate.
- Routing anywhere other than `assess` (phase 5) on the empty-Open-Questions branch.
</pitfalls>

</triage_flow_completion_check>
