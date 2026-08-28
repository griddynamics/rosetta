---
name: triage-flow-create-tool-issue
description: "Phase 6 Create-tool-issue of triage-flow"
disable-model-invocation: true
user-invocable: false
alwaysApply: false
tags: ["workflow-phase"]
baseSchema: docs/schemas/phase.md
---

<triage_flow_create_tool_issue>

<description_and_purpose>
Create the corresponding Story in the configured target project for a ticket that has just completed triage, and link it back to the source ticket as an action item — the flow's final action. Everything in the new issue is copied, or lightly restated, from artifacts phases 1-5 already produced; this phase decides no content. It is a phase of its own rather than a step of phase 5 because it is the flow's only irreversible write: the binding has no delete, so a duplicate created here is permanent and it needs its own idempotency check, not a share of phase 5's.
</description_and_purpose>

<workflow_context>
Phase 6 of `triage-flow`, the flow's final phase — runs immediately after phase 5 (`assess`) posts its assessment comment, on the same tick, never on an IN_PROGRESS tick. Mandatory `executor`: the work is mechanical (copy fields, restate requirement statements, two `jira-write` calls); the judgment happened in phases 2 and 5. Two-state idempotency: `<TICKET-KEY>-TRIAGE-FLOW-STATE.md`'s `## Tool Issue` section can legitimately be half-populated (issue created, link not yet made), and this phase resumes into the missing half instead of restarting. This phase never comments on, reassigns, or transitions the source ticket — the link is the only mark it leaves there.
</workflow_context>

<phase_steps>
1. Read state; decide create, link, or skip
2. Probe source ticket for an existing link
3. Compose the description from finalized requirements
4. Assemble the payload and create the Story
5. Link the new Story to the source ticket
6. Report key, URL, link ID to orchestrator
</phase_steps>

<resume_check step="6.1" subagent="executor" role="Bounded cross-project issue creator and linker" subagent_required_model="Claude Haiku 4.5, GPT-5.6 Terra, Gemini 3.7 Flash, GPT-5.6 Luna">

1. USE SKILL `subagent-directives`.
2. Read `## Tool Issue` from `<artifacts_dir>/<ticket_key>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md` and branch on exactly two fields:
   - `tool_issue_key` absent → **case A**: run steps 6.2 through 6.6 in full.
   - `tool_issue_key` present, `link_id` absent → **case B**: skip steps 6.2-6.4 entirely and resume at step 6.5, linking the issue already recorded. Never create a second issue in this case, however a prior tick's report reads.
   - both present → **case C**: this ticket is done. Report a no-op and end the phase; read nothing else, write nothing at all.
3. Absent means missing or empty. A field carrying a value is trusted and never re-derived — this step does not "check whether the recorded issue still looks right", because re-creating on a failed check is unrecoverable and verifying is not this phase's job.

</resume_check>

<link_probe step="6.2" subagent="executor">

1. Case A only. USE SKILL `data-collection` (issue role) to read the source ticket's existing issue links.
2. A link of the configured link type already pointing from the source ticket to an issue in the configured target project → adopt it: record that issue's key and URL and the link's ID, and skip to step 6.6. A prior run completed this work and its state entry was lost.
3. This is a backstop for a lost state file, not the primary check — step 6.1 is. It detects only a fully-completed prior run; it cannot see an issue created but never linked, because there is no link to find. That residual case is covered by step 6.4's report-on-receipt rule.
4. Probe read fails → stop and report; do not create on an unverified probe. A failed probe is unknown, not clear, and the next tick can try again — whereas a duplicate cannot be undone.

</link_probe>

<compose_description step="6.3" subagent="executor">

1. Read the finalized `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` — all `<req>` units are `Approved`, flipped by phase 3.
2. Write the description as exactly three parts, nothing else:
   - **One or two sentences** naming what the feature is, in plain language, derived only from the source ticket's Summary and the `<req>` unit titles. No new facts, no scope the requirements do not carry, no restating the assessment's levels.
   - **A flat list of the requirement statements** — one line per `<req>` unit, that unit's title/statement verbatim. No acceptance criteria, no rationale, no elaboration, no per-unit commentary. A long statement is still copied, not summarized.
   - **One back-reference line**, `Source ticket: <ticket_key>`. It is what a human uses to trace the pair if the link write never lands.
3. Hand the description to `jira-write` as plain text, one item per line. Never hand-author rich-document markup (ADF or equivalent) here — converting plain text into whatever body format the configured integration requires belongs to the binding, not to a phase file.
4. Create succeeded but the response shows the description empty or mangled → that is a formatting defect on an issue that already exists. Report it; never create a second issue over it.
5. This is the phase's only composed content; everything else is copied. Aim at what a planning agent needs to recognize the item, not a re-derivation of the requirements doc.

</compose_description>

<create_issue step="6.4" subagent="executor">

1. Case A only. Read the deployment config's `tool_issue_target` block: target project key, issue type, the custom-field labels to carry across (`carry_fields`), the link type name and direction (`link_inward`). Block missing → stop and report; never invent a project, an issue type, or a field name.
2. Assemble the payload from phase 1's snapshot plus step 6.3's description:
   - **Summary** — the source ticket's Summary, verbatim. Missing or empty → **stop and report**; never synthesize a title.
   - **`TSSM: Tool`** — the source value; it is a cascading option, so carry the parent and, when present, its child. Never invent a child for a parent that has none, never drop a child that exists.
   - **`TSSM: Project`** — the source value as-is.
   - **Assignee** — the source ticket's assignee account ID. Only an exact account ID is usable: a display name, a masked or redacted value, and `None -- unassigned` all count as absent. Never resolve a name to an ID, and never fall back to the connected write identity.
   - **Description** — from step 6.3.
3. **Degradation rule, stated to `jira-write` as part of the request.** Summary missing → stop, create nothing. Any other field missing at source, or rejected because its option value does not exist in the target project's field context → omit that one field, create anyway, and record the omission as a gap in `field_gaps`. Never substitute a nearby option value. Reason, stated once: none of these fields is required by the target project, each is a one-click human fix afterward, and blocking the flow's only durable deliverable on a metadata classification is worse than shipping it with a named gap. Summary is the exception because it is the issue's identity and a mis-titled issue cannot be deleted.
4. USE SKILL `jira-write` (create issue) with the payload, the degradation rule, and the duplicate-prevention evidence from steps 6.1 and 6.2 — which case fired and what the probe found. That skill refuses a create request arriving without it. `POC-SCOPE-OVERRIDE:` this write proceeds without a human-confirmation prompt, per the skill's documented override.
5. **Report-on-receipt.** The moment `jira-write` returns an issue key, it becomes this phase's most important output. If step 6.5 then fails, or this subagent runs short of room, or anything else goes wrong, the key and URL still go into the report to the orchestrator, ahead of the failure itself. An unreported key is an issue nobody can find on the next tick and nobody can delete ever.

</create_issue>

<link_issue step="6.5" subagent="executor">

1. Cases A and B. USE SKILL `jira-write` (link issues) with the configured link type name, `inward` = the new target-project issue key, `outward` = the source ticket key — that direction is what makes the pair read "the new issue *is an action item from* the source ticket". Never swap them to make a phrase scan better.
2. Capture the returned link ID.
3. Link fails → stop and report, with the created issue key and URL alongside the failure. This is a resumable state, not a lost tick: the next invocation reads `tool_issue_key` present and `link_id` absent, enters case B, and links the existing issue without touching create.
4. Never answer a link failure by creating anything.

</link_issue>

<update_state step="6.6" subagent="executor">

1. Report to the orchestrator, for `## Tool Issue`: `tool_issue_key`, `tool_issue_url`, `tool_issue_created_at`, `link_id`, and every field gap recorded under step 6.4's degradation rule. Also report `jira-write`'s resolved identity for `resolved_acting_identity`. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.
2. **A partial report is a valid report.** Create succeeded and link did not → report `tool_issue_key`, `tool_issue_url`, `tool_issue_created_at` with `link_id` absent and the link error stated. This is the one report in this flow where a failure still carries state the orchestrator MUST persist; reporting the failure without the key is the exact bug this phase's two-step shape exists to prevent.
3. Case C → report a no-op, so the orchestrator logs the tick without rewriting `## Tool Issue`.
4. Both `tool_issue_key` and `link_id` recorded → report that flow status is now `COMPLETE`.

</update_state>

<validation_checklist>
- Exactly one issue exists in the target project for this source ticket, and the report names which check prevented a second one — the recorded key, or the probe result.
- `## Tool Issue` carries a `tool_issue_key` on every tick where an issue was created, including ticks whose link write failed.
- The reported link names both endpoints, so the direction is checkable and not merely asserted by an ID.
- Every field omitted from the create is named in the recorded gaps; an omission with no gap entry is indistinguishable from a field nobody meant to set.
- The description's requirement lines match the finalized Requirements.md statements word for word — a reader can diff them.
- Case B ran with no create call at all; case C ran with no write call at all.
</validation_checklist>

<pitfalls>
- Treating a link failure as a reason to re-run the whole phase next tick — the create half is done and permanent; only the link is outstanding.
- Re-creating because the recorded `tool_issue_key` "looks stale", or because the phase could not confirm the issue still exists. A recorded key is trusted.
- Filling an unresolvable assignee with the connected write identity, so the new issue appears assigned to the agent's own account.
- Writing acceptance criteria, rationale, or the assessment's risk levels into the description — it carries the feature sentence and the requirement statements, nothing more.
- Commenting on either ticket. The link is the only signal this phase leaves on the source ticket.
- Running on a tick where phase 5 did not run, on the assumption that the requirements "look done".
</pitfalls>

</triage_flow_create_tool_issue>
