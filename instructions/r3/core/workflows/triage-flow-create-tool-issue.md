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
Compose, directly per `triage-flow.md`'s `<write_artifact_contract>`, the write artifacts that will create the corresponding Story in the configured target project for a ticket that has just completed triage, and that will link it back to the source ticket as an action item — the flow's final action. Everything in the new issue is copied, or lightly restated, from artifacts phases 1-5 already produced; this phase decides no content. It is a phase of its own rather than a step of phase 5 because it composes the flow's only irreversible write: the binding has no delete, so a duplicate create artifact executed later is permanent, and it needs its own idempotency check, not a share of phase 5's. This phase never performs a live write — it composes a JSON artifact and reports its path; no created key, URL, or link ID exists until a future, out-of-scope execution step runs the artifact against real Jira.
</description_and_purpose>

<workflow_context>
Phase 6 of `triage-flow`, the flow's final phase — runs immediately after phase 5 (`assess`) composes its assessment-comment artifact, on the same tick, never on an IN_PROGRESS tick. Mandatory `executor`: the work is mechanical (copy fields, restate requirement statements, compose the artifacts directly per `<write_artifact_contract>`); the judgment happened in phases 2 and 5. Two-state idempotency, now artifact-based rather than key-based: `<TICKET-KEY>-TRIAGE-FLOW-STATE.md`'s `## Tool Issue` section can legitimately be half-populated (create artifact composed, link artifact not yet composable), and this phase resumes into the missing half instead of restarting. **The link half cannot be composed in the same tick as the create half**, because the `link_issues` payload requires a real target-project issue key (`inward_key`), and no real key exists until a future, out-of-scope execution step actually runs the create artifact against real Jira and that result is fed back into a later tick's `ticket_details` input — this is the "expected resumable state, not a hard failure" that `<write_artifact_contract>`'s "Gate cadence for phase 6's create-then-link pair" clause already documents for this exact pair. This phase never comments on, reassigns, or transitions the source ticket — the link is the only mark it leaves there, once it becomes composable.
</workflow_context>

<phase_steps>
1. Read state; decide compose-create, attempt-link, or skip
2. Probe source ticket for an existing link
3. Compose the description from finalized requirements
4. Assemble the payload and compose the create-issue artifact
5. Attempt to compose the link artifact (composable only once a real target-project key is known)
6. Report artifact path(s) to orchestrator
</phase_steps>

<resume_check step="6.1" subagent="executor" role="Bounded cross-project issue creator and linker" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5">

1. USE SKILL `subagent-directives`.
2. Read `## Tool Issue` from `<artifacts_dir>/<ticket_key>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md` and branch on exactly two fields — each recorded, when present, as `"pending — see <artifact path>"` rather than a real value (see `triage-flow.md`'s `<state_and_resumption>`):
   - `tool_issue_key` absent → **case A**: run steps 6.2 through 6.6 in full — compose the create artifact, then attempt the link.
   - `tool_issue_key` present (i.e. `"pending — see <create-artifact-path>"`), `link_id` absent → **case B**: skip steps 6.2-6.4 entirely (never recompose a second create artifact, however a prior tick's report reads) and resume at step 6.5, attempting the link.
   - both present → **case C**: this ticket is done as far as this flow can take it. Report a no-op and end the phase; read nothing else, compose nothing at all.
3. Absent means missing or empty. A field carrying a value — even the `"pending — see <path>"` sentinel — is trusted and never re-derived or re-composed: this step does not "check whether the composed artifact still looks right", because recomposing a second create artifact risks a second permanent issue once both are eventually executed, and verifying is not this phase's job.

</resume_check>

<link_probe step="6.2" subagent="executor">

1. Case A only. Check phase 1's already-redacted `ticket_details` text (carried in flow state, no new read — this flow has no shared read skill and no live connection to issue the check any other way) for the source ticket's existing issue links. This build's `ticket_details` free text carries no guaranteed issue-links content, so this probe will typically find nothing to adopt unless the caller happens to mention an existing link in the text; that is a known limitation of the current free-text input, not a bug in this step, and requiring the caller to always state existing links is out of scope here (see `triage-flow.md`'s `<out_of_scope>`).
2. A link of the configured link type already pointing from the source ticket to an issue in the configured target project → adopt it: record that issue's key and URL and the link's ID, and skip to step 6.6. A prior run completed this work (via a since-executed artifact) and its state entry was lost.
3. This is a backstop for a lost state file, not the primary check — step 6.1 is. It detects only a fully-completed and already-executed prior run; it cannot see a create artifact composed but never yet executed or linked, because there is nothing live to find in that state. That residual case is covered by step 6.4's report-on-receipt rule and by case B's deferred link attempt.
4. Probe read fails → stop and report; do not compose a create artifact on an unverified probe. A failed probe is unknown, not clear, and the next tick can try again — whereas a duplicate create artifact, once executed, cannot be undone.

</link_probe>

<compose_description step="6.3" subagent="executor">

1. Read the finalized `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` — all `<req>` units are `Approved`, flipped by phase 3.
2. Write the description as exactly three parts, nothing else:
   - **One or two sentences** naming what the feature is, in plain language, derived only from the source ticket's Summary and the `<req>` unit titles. No new facts, no scope the requirements do not carry, no restating the assessment's levels.
   - **A flat list of the requirement statements** — one line per `<req>` unit, that unit's title/statement verbatim. No acceptance criteria, no rationale, no elaboration, no per-unit commentary. A long statement is still copied, not summarized.
   - **One back-reference line**, `Source ticket: <ticket_key>`. It is what a human uses to trace the pair if the link write never lands.
3. Carry the description into the `create_issue` payload (step 6.4) as plain text, one item per line. Never hand-author rich-document markup (ADF or equivalent) here — converting plain text into whatever body format the configured integration requires belongs to the future, out-of-scope execution step, not to this phase file.
4. If a future execution step ever reports back that a created issue's description came through empty or mangled, that is a formatting defect on an issue that already exists by the time anyone can observe it — this phase has no way to detect it at compose time, since it never sees the result of a create it composes. Never compose a second create artifact over it.
5. This is the phase's only composed content; everything else is copied. Aim at what a planning agent needs to recognize the item, not a re-derivation of the requirements doc.

</compose_description>

<create_issue step="6.4" subagent="executor">

1. Case A only. Use this build's fixed target-project settings — hardcoded here, not read from any config (this build has none): target project key `TOOL`, issue type `Story`, custom-field labels to carry across (`carry_fields`) `TSSM: Tool` and `TSSM: Project`, link type name `Action item`, link direction `link_inward = new_issue` (the created `TOOL` ticket is the inward issue, rendering "`<new TOOL ticket>` is action item from `<source ticket>`"). These are constants for this deployment; do not invent or vary them.
2. Assemble the payload from phase 1's `ticket_details` text plus step 6.3's description:
   - **Summary** — the source ticket's Summary, verbatim. Missing or empty → **stop and report**; never synthesize a title.
   - **`TSSM: Tool`** — the source value; it is a cascading option, so carry the parent and, when present, its child. Never invent a child for a parent that has none, never drop a child that exists.
   - **`TSSM: Project`** — the source value as-is.
   - **Assignee** — the source ticket's assignee account ID. Only an exact account ID is usable: a display name, a masked or redacted value, and `None -- unassigned` all count as absent. Never resolve a name to an ID, and never fall back to the connected write identity.
   - **Description** — from step 6.3.
3. **Degradation rule, applied directly.** Summary missing → stop, compose nothing. Any other field missing at source → omit that one field, compose the create artifact anyway, and record the omission as a gap in `field_gaps`. Never substitute a nearby option value. Per `<write_artifact_contract>`'s "Documented regression, not solved here" clause, this phase has no live connection to pre-validate a custom-field option value against real Jira state before writing the artifact — an invalid or nonexistent option value in the payload will compose successfully and will not surface until a future execution step attempts the real write. That is a residual, documented regression, not something this phase can close: the eventual execution step MUST re-validate before sending. This phase still applies its own degradation rule for fields missing at the source. Reason, stated once: none of these fields is required by the target project, each is a one-click human fix afterward, and blocking the flow's only durable deliverable on a metadata classification is worse than shipping it with a named gap. Summary is the exception because it is the issue's identity and a mis-titled issue cannot be deleted.
4. **Gate, then compose, per `<write_artifact_contract>`.** USE SKILL `dangerous-actions` directly, immediately before composing: assess blast radius (a live, shared Issue Tracker ticket, and a brand-new cross-project issue that, once created, keeps its key forever), consider the opposite (what if this composed request is wrong), consider safer alternatives. `create_issue` is the one exception `<write_artifact_contract>`'s `POC-SCOPE-OVERRIDE` does not fully cover: composing this artifact does not make the eventual write safe or revertible — there is no delete, and a wrongly-created issue keeps its key forever once a future step executes it. This phase MUST therefore state, as part of its own compose, which duplicate-prevention check it ran and what it found — the case that fired at step 6.1 and the probe result from step 6.2. That evidence is REQUIRED at compose time, not deferrable (a future execution step cannot re-derive it): refuse to compose without it. `POC-SCOPE-OVERRIDE:` beyond that exception, this compose proceeds without a human-confirmation prompt, per `<write_artifact_contract>`.
5. **Determine `NNN` and write.** List `<artifacts_dir>/<TICKET-KEY>/jira-writes/` (create the directory if absent); take the highest existing three-digit sequence number in that directory and use the next one, zero-padded — `001` if the directory is empty or absent. Never reuse or guess a number. Compose exactly `{"op": "create_issue", "target_issue_key": "<source ticket key>", "payload": {"project": ..., "issue_type": ..., "summary": ..., "description": ..., "custom_fields": {...}, "assignee_account_id": <optional>}, "composed_at": "<ISO8601>"}` from this step's own item 2 (assembled fields), step 6.3's description, and the duplicate-prevention evidence folded into the compose per the prior step, and write it to `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-create_issue.json`.
6. **Report-on-receipt.** Report that artifact's path — **never a created issue key, URL, or created-at timestamp**; none of those exist until a future, out-of-scope execution step runs the artifact against real Jira. The moment the artifact is written, its path becomes this phase's most important output. If step 6.5 then finds nothing composable, or this subagent runs short of room, or anything else goes wrong, the artifact path still goes into the report to the orchestrator, ahead of anything else. An unreported artifact path is a composed create nobody can find or resume from on the next tick.

</create_issue>

<link_issue step="6.5" subagent="executor">

1. Cases A and B. **This step cannot compose a valid link artifact until a real target-project issue key is known.** The `link_issues` payload requires `inward_key` (per this build's fixed `link_inward = new_issue`, the new target-project issue) as an exact key — and no real key exists in this build until a future, out-of-scope execution step has actually run the create artifact against real Jira and that result has been fed back into a later tick's `ticket_details` input. Check whether this tick's `ticket_details` text (or flow state) names a real, confirmed key for the issue created from the artifact recorded under `tool_issue_key`. In this build, no such feedback path is wired up yet (see `triage-flow.md`'s `<out_of_scope>`), so this check will not find one on any tick — that is expected, not an error.
2. Real key found → gate, then compose, per `<write_artifact_contract>`'s "Gate cadence for phase 6's create-then-link pair" clause: USE SKILL `dangerous-actions` again — a SEPARATE pass from step 6.4's, never shared with it — bounded to "does this composed edge connect the two keys named, in the direction named." Then determine the next `NNN` exactly as in step 6.4 (list `<artifacts_dir>/<TICKET-KEY>/jira-writes/`, take the highest existing sequence number, use the next one — a create composed earlier this same tick has already claimed one number, so the link takes the next consecutive one). Compose exactly `{"op": "link_issues", "target_issue_key": "<source ticket key>", "payload": {"link_type_name": ..., "inward_key": <confirmed target-project issue key>, "outward_key": <source ticket key>}, "composed_at": "<ISO8601>"}` in that order — `inward` = the confirmed target-project issue key, `outward` = the source ticket key, that direction is what makes the pair read "the new issue *is an action item from* the source ticket." Never re-order to make a phrase scan better — direction gives the relationship its meaning. Write it to `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-link_issues.json` and capture that artifact's path (never a link ID — none exists until executed).
3. Real key not found (the expected case in this build) → stop this step and report the create artifact's path alongside a note that the link remains uncomposable pending a confirmed key. This is an expected resumable state per `<write_artifact_contract>`'s own documented contract for a create-then-link pair, not a hard failure: the next invocation reads `tool_issue_key` present (as `"pending — see <path>"`) and `link_id` absent, re-enters case B, and re-checks for a confirmed key without recomposing create.
4. Never answer an uncomposable link by composing a second create artifact.

</link_issue>

<update_state step="6.6" subagent="executor">

1. Report to the orchestrator, for `## Tool Issue`: the create artifact's path (for `tool_issue_key`, `tool_issue_url`, `tool_issue_created_at`, each recorded as `"pending — see <create-artifact-path>"` — never a real key, URL, or timestamp), the link artifact's path when step 6.5 composed one (for `link_id`, recorded as `"pending — see <link-artifact-path>"`) or its absence when step 6.5 found no confirmed key to link against, and every field gap recorded under step 6.4's degradation rule. Do not report a `resolved_acting_identity` value — per `<write_artifact_contract>`'s "No identity resolution, ever" clause, this flow has no live connection and resolves no identity at compose time. This subagent never opens or writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly — the orchestrator performs the actual read-full-file-then-append write.
2. **A partial report is a valid report.** Create artifact composed and link not yet composable → report `tool_issue_key`/`tool_issue_url`/`tool_issue_created_at` as pending, pointing at the create artifact, with `link_id` absent and the reason ("no confirmed key yet"). This is the one report in this flow where an incomplete outcome still carries state the orchestrator MUST persist; reporting the outcome without the create artifact's path is the exact bug this phase's two-step shape exists to prevent.
3. Case C → report a no-op, so the orchestrator logs the tick without rewriting `## Tool Issue`.
4. Both `tool_issue_key` and `link_id` recorded (even as pending sentinels pointing at both composed artifacts) → report that flow status is now `COMPLETE` for this build's purposes — completion here means both artifacts are composed and awaiting execution, not that Jira has actually been updated; see `triage-flow.md`'s `<out_of_scope>`.

</update_state>

<validation_checklist>
- At most one create-issue artifact was composed per source ticket across all ticks, and the report names which check prevented a second one — the recorded pending sentinel, or the probe result.
- `## Tool Issue` carries `tool_issue_key` as `"pending — see <artifact path>"` on every tick where a create artifact was composed, including ticks whose link could not yet be composed.
- The reported (or attempted) link names both endpoints, so the direction is checkable and not merely asserted by an artifact path.
- Every field omitted from the create payload is named in the recorded gaps; an omission with no gap entry is indistinguishable from a field nobody meant to set.
- The description's requirement lines match the finalized Requirements.md statements word for word — a reader can diff them.
- Case B ran with no create compose at all; case C ran with no compose call at all.
- No phase output claims a captured created key, URL, created-at timestamp, or link ID — every one of those five fields is reported and persisted only as the `"pending — see <artifact path>"` sentinel.
</validation_checklist>

<pitfalls>
- Treating an uncomposable link as a reason to re-run the whole phase, or to recompose the create artifact, next tick — the create half is done (composed) and permanent once executed; only the link composition is outstanding, pending a confirmed key.
- Recomposing a create artifact because the recorded `tool_issue_key` pending sentinel "looks stale", or because the phase could not confirm a real issue exists yet. A recorded pending sentinel is trusted exactly like a recorded key used to be.
- Filling an unresolvable assignee with the connected write identity, so the new issue appears assigned to the agent's own account.
- Writing acceptance criteria, rationale, or the assessment's risk levels into the description — it carries the feature sentence and the requirement statements, nothing more.
- Commenting on either ticket. The link is the only signal this phase leaves on the source ticket, once composable.
- Running on a tick where phase 5 did not run, on the assumption that the requirements "look done".
- Fabricating, guessing, or inferring a target-project issue key to unblock the link composition — the link stays uncomposable until a genuine future feedback path (out of scope here) supplies one.
- Treating the missing live-Jira field/option validation as something this phase can close by extra care in step 6.4 — it is a documented, residual regression per `<write_artifact_contract>`'s "Documented regression, not solved here" clause, moved downstream to the eventual execution step, not solved here.
- Composing a `create_issue` artifact without stating which duplicate-prevention check ran (steps 6.1/6.2) and what it found — that evidence is required at compose time and is never deferrable to a later step.
</pitfalls>

</triage_flow_create_tool_issue>
