---
name: tools-triage-flow
description: "Workflow for triaging one issue-tracker ticket: intake, elicitation, assessment, and linked issue creation."
---

<tools-triage-flow>

<description_and_purpose>

Turn one triggered wake-up — a caller's dispatch today, a cron tick or webhook event later — into a repeatable ticket triage cycle: take the ticket's details as caller-supplied text, run requirements elicitation through comment round-trips, post the assessment on completion, then create the corresponding Story in the target project linked back as an action item. No human answers an interactive prompt each tick, and the source ticket's status and assignee are never touched. The flow has no live connection to the Issue Tracker: it composes write artifacts for a separate executor. This build: caller-supplied `ticket_key` only, no scheduler, no write-confirmation gate — both deferred, see `<out_of_scope>`.

</description_and_purpose>

<workflow_phases>

1. Orchestrator must trust the system and skills; coordinate only sequence, artifacts, state, and approvals — never execute a phase's internals itself.
2. Phases run sequentially per invocation. Re-invocation resumes from state; it does not restart phase 1 unconditionally.
3. Load only what the current phase needs, just in time.

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. MUST USE SKILL `load-project-context`, `orchestration`, `hitl`.
3. Orchestrator and subagents MUST USE SKILL `tools-triage` — it owns this flow's input contract, write-artifact contract, state and idempotency semantics, assessment rubrics, and target-project binding.
4. No deployment config file exists — this flow has no external config to read. `artifacts_dir` comes from the caller-supplied invocation input, default `agents/TEMP`; the target-project settings phase 6 needs are fixed constants for this build. Both live in `tools-triage`.
5. This build requires the active orchestrator model to be `sonnet`-tier — a deliberate narrowing of `requirements-authoring-flow.md`'s broader "Fable/Opus/GPT-5.5+ class" rule down to a specific, hardcoded choice for this deployment, matching the actual unattended-CI invocation this flow runs under (`--model sonnet`). Not `sonnet`-tier → STOP_AND_REPORT; no human is present in unattended CI to act on a switch-model demand, so never silently proceed or downgrade.
6. MUST ALWAYS use todo tasks ledger.
7. Workflow state MUST be saved to `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`, with phase 2's requirements document alongside it in the same ticket-scoped folder — keeping every artifact this flow generates out of the target repo's real `docs/` tree. Every phase updates state before the next starts.

</prerequisites>

<subagent_policy required="true" inline_execution="prohibited">

- Orchestrator owns phase transitions, dispatch, and the flow-state file.
- **No subagent writes the flow-state file directly**, regardless of what any phase's own report step appears to instruct. Every phase hands its values to the orchestrator, which performs the read-full-file-then-append write.
- Phases are assigned-subagent-only; the orchestrator MUST NOT execute their internals directly.
- `executor` is never a gateway for full agents.
- Required subagent invocation unavailable → stop and report the unmet prerequisite.
- After every `INVOKE SUBAGENT` call, before dispatching the next phase, append one row to the state file's Resource Usage table — timestamp, phase, subagent, and the `subagent_tokens`/`duration_ms` the call returned, taken verbatim, never estimated or omitted, even when the phase was skipped or the call errored.

</subagent_policy>

<intake phase="1" subagent="executor" role="Bounded ticket-intake operator" subagent_required_model="inherit" must-be-subagent>

1. Resolve the invocation input to exactly one ticket and its redacted ticket text.
2. Input: `{ ticket_key, reason?, ticket_details, artifacts_dir? }`. Output: redacted ticket text, `reason` echoed, flow-state file created or resumed.
3. Required skills: `tools-triage` (intake contract, validation, redaction), `sensitive-data`, `subagent-directives`.
4. Report values for the state file to the orchestrator.
5. Control: proceed only with exactly one resolved ticket carrying non-empty text; stop and report on empty or missing input. No live search, fetch, config read, or file read may occur in this phase.

</intake>

<elicitation phase="2" subagent="requirements-engineer" role="Requirements elicitation against one existing ticket" subagent_required_model="inherit" must-be-subagent>

1. Run one requirements-elicitation iteration — create on the first tick, update on later ticks — against the already-redacted ticket content.
2. Input: redacted ticket text from phase 1; the existing requirements document when present. Output: updated requirements document with `<req>` units and an Open Questions list.
3. Required skills: `tools-triage` (change detection, elicitation policy), `requirements-authoring`, `subagent-directives`.
4. Report the iteration number, open-questions count, per-`<req>` tally, and this tick's content hash to the orchestrator.
5. Control: skip this phase entirely when change detection finds nothing new since the last processed tick, and proceed straight to `completion_check` with the current requirements document instead.

</elicitation>

<completion_check phase="3" subagent="executor" role="Bounded requirements-completion evaluator" subagent_required_model="inherit" must-be-subagent>

1. Evaluate whether Open Questions is empty and branch. This evaluation runs BEFORE any write is composed this tick, so whichever compose eventually happens is always the tick's last action.
2. Input: current requirements document. Output: non-empty → route to `publish_questions`; empty → flip both `<req>` units Draft → Approved and route to `assess`.
3. Required skills: `tools-triage` (completion rule and routing), `subagent-directives`.
4. Report the branch taken and the "Next Tick Should" note to the orchestrator.
5. Control: `POC-SCOPE-OVERRIDE:` Open Questions empty is sufficient by itself to flip the units and proceed — no rubric-pass requirement and no separate explicit-approval-sentence gate. The rubric still runs inside `requirements-authoring` and stays recorded as reporting; it no longer gates progression.

</completion_check>

<publish_questions phase="4" subagent="executor" role="Bounded Jira comment publisher" subagent_required_model="inherit" must-be-subagent>

1. Compose the still-open questions into one add-comment write artifact. Only ever reached via phase 3's non-empty branch.
2. Input: the Open Questions list. Output: the composed artifact's path — never a comment ID; `last_agent_comment_id` recorded as `"pending — see <artifact path>"`.
3. Required skills: `tools-triage` (write-artifact contract), `dangerous-actions`, `subagent-directives`.
4. Report the artifact path to the orchestrator; flow status stays IN_PROGRESS.
5. Control: `POC-SCOPE-OVERRIDE:` no human confirmation before this compose. This compose is the tick's terminal action — nothing runs after it.

</publish_questions>

<assess phase="5" subagent="reviewer" role="Bounded triage-assessment synthesizer and completion operator" subagent_required_model="inherit" must-be-subagent>

1. Produce the triage assessment — blind spots, potentially affected tools, issue size — for a ticket phase 3 routed here, and compose it into one add-comment write artifact. The last write this flow makes on the *source* ticket; phase 6 performs its final action.
2. Input: the finalized requirements document; the ticket's `TSSM: Tool`/`TSSM: Project` values located within phase 1's redacted text. Output: `<TICKET-KEY>-TRIAGE-ASSESSMENT.md` under `artifacts_dir`, plus one composed comment artifact whose path is recorded for `assessment_comment_id`.
3. Required skills: `tools-triage` (assessment rubrics, write-artifact contract), `dangerous-actions`, `subagent-directives`.
4. Report the assessment file path, the three levels and size, and the artifact path to the orchestrator; flow status stays IN_PROGRESS until phase 6 records both its fields.
5. Control: the three levels are reported as-is — none gates a different action or branch; there is no risk-based branching in this build. No reassignment, no status transition, ever. This flow's human-in-the-loop gate lives entirely in the downstream consumer of its output artifacts (e.g. harness-intake's GitHub PR review), not in ticket state.

</assess>

<create_tool_issue phase="6" subagent="executor" role="Bounded cross-project issue creator and linker" subagent_required_model="inherit" must-be-subagent>

1. Compose the create-issue artifact for the corresponding Story in the target project, then attempt the link artifact binding it back as an action item — two separate composes, never one combined operation. The flow's final action for this ticket.
2. Input: the source ticket's Summary, `TSSM` fields, and assignee account ID located within phase 1's redacted text; the finalized requirements document; the state file's `## Tool Issue` section. Output: `tool_issue_key`/`tool_issue_url`/`tool_issue_created_at` recorded as pending sentinels pointing at the create artifact; `link_id` likewise once a confirmed target-project key exists to link against; any omitted create-payload fields recorded as gaps.
3. Required skills: `tools-triage` (target-project binding, write-artifact contract), `dangerous-actions`, `subagent-directives`.
4. Report artifact paths and field gaps to the orchestrator. **This phase's incomplete report is state-bearing** — a composed create artifact reported alongside an uncomposable link means the orchestrator MUST append the pending `tool_issue_key` to `## Tool Issue` before ending the tick. Dropping it strands a composed create artifact nothing in this build can recover.
5. Control: `POC-SCOPE-OVERRIDE:` no human confirmation before these composes. Two-state resumption keyed on the recorded pending sentinel: `tool_issue_key` absent → compose create, then attempt link; present with `link_id` absent → attempt link only, never recompose create; both present → skip the phase entirely. Flow status reaches `COMPLETE` only once both fields are recorded.

</create_tool_issue>

</workflow_phases>

<out_of_scope>

Deferred for this build, seams only, do not implement:

- Real OS cron / Issue Tracker webhook trigger — the input contract already makes both pure trigger-layer swaps.
- Sub-hourly polling cadence.
- A risk-assessment gate of any kind: phase 5's three levels are reported for the reader's information only. None of them branches this flow's behavior or triggers a write beyond phase 5's comment and phase 6's issue and link. Any future gating on these values is downstream of this flow, never added back into its own phases.
- Local eligibility re-checking of the dispatched ticket against any criteria (status, assignee, project) — this flow trusts the calling trigger entirely and has no structured, field-mapped ticket data to check against even if it wanted to. If that trust ever proves insufficient, a check belongs upstream at the trigger/dispatch layer, not inside this flow.
- Service-account credential swap — the no-identity-resolution rule already keeps write identity decoupled from any assumed account; this flow has no live connection and no `jql` string to update, so a swap is entirely the calling trigger layer's concern.
- Any changes to `tools-harness-intake` (workflow wiring, its own config, the PR step) — this flow's contract supports that caller, but wiring it up is separate follow-up work.
- Any post-creation management of the target-project issue — transitions, estimates, labels, sprint or epic assignment, or edits after phase 6 creates it. This flow creates it, links it, and never touches it again.
- A comment on the source ticket announcing the created issue. The issue link is the announcement; a second write would add a second idempotency anchor for no reader benefit.
- Executing the composed `jira-writes/*.json` artifacts against the real Issue Tracker, and feeding their results back into the next tick's input — a future caller-side step, cross-repo, not built here.

</out_of_scope>

<validation_checklist>

- Every phase updated the flow-state file before the next started, and every `INVOKE SUBAGENT` call left a Resource Usage row.
- Phase 2 never ran on a tick where change detection found nothing new.
- Phase 4/5/6 composes each produced an artifact path — never a comment ID, transition result, created key, or link ID — and each went through its own gate.
- Phase 1's ticket text was redacted before phase 2 saw it, and no live search, fetch, config read, or file read occurred anywhere in phase 1.
- Phase 5 ran exactly once per ticket, never on an IN_PROGRESS tick, and never set flow status to COMPLETE on its own.
- No phase reassigned the ticket or transitioned its status — the flow's only composed writes on the source ticket are phase 4's questions comment, phase 5's assessment comment, and phase 6's action-item link.
- Phase 6 composed at most one create-issue artifact per source ticket across all ticks, and every tick that composed one left `tool_issue_key` recorded as a pending sentinel.
- A resume tick that entered phase 6 directly ran phase 6 only — phases 2-5 were skipped by resume routing, not re-run.
- Flow reached `COMPLETE` only after both `tool_issue_key` and `link_id` were recorded. Reaching `COMPLETE` means both artifacts are composed and awaiting execution — never that the Issue Tracker was actually updated.
- No checkpoint anywhere in this flow treats a captured comment ID, transition result, created key, or link ID as a done-check.

</validation_checklist>

<pitfalls>

- Orchestrator executing a phase's internals instead of dispatching it and coordinating contracts.
- Dispatching phase 4 and phase 5 on the same tick — phase 3's branch chooses exactly one of them.
- Letting phase 6's incomplete report through without persisting the pending `tool_issue_key`.
- Resuming a ticket by restarting phase 1 when its state file already implies a later phase.
- Recording a real identifier in place of a `"pending — see <artifact path>"` sentinel, on the assumption that a compose implies a completed write.

</pitfalls>

</tools-triage-flow>
