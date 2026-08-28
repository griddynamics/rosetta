---
name: triage-flow
description: "Workflow for triaging one caller-specified issue-tracker ticket: intake (redacted via data-collection), requirements elicitation via comments, a posted assessment comment, and a linked target-project issue created from the finalized requirements on completion."
alwaysApply: false
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<triage_flow>

<description_and_purpose>

Turn a triggered wake-up (invoked today by a caller — e.g. tools-harness-intake's CI job — for one specific ticket; a cron tick or webhook event later) into a repeatable ticket-triage cycle: fetch the ticket (redacted by `data-collection`'s own mandatory step), run requirements elicitation through comment round-trips, on completion post the assessment as a comment, and then create the corresponding Story in the configured target project from the finalized requirements, linked back to the source ticket as an action item — without a human answering an interactive prompt each tick, and without this flow mutating the source ticket's status or assignee. This build: caller-supplied `ticket_key` only, no scheduler, no write-confirmation gate — both explicitly deferred, see `<out_of_scope>`.

</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. MUST USE SKILL `load-project-context`, `orchestration`, `hitl`.
3. Read the deployment config file (`agents/jira-triage.config.json` in the target repo) for: `jql`, `orchestrator_model_policy`, `artifacts_dir`, `tool_issue_target` (`project_key`, `issue_type`, `carry_fields`, `link_type`, `link_inward` — phase 6's target). Missing config file, or a missing `tool_issue_target` block, → stop and report; never invent these values. `artifacts_dir` is the base directory for this flow's own generated artifacts (flow state + Requirements.md) — it is caller-controlled (e.g. a caller may point it at an already-checked-out directory such as `knowledge`), default `agents/TEMP` when absent from an older config, but the shipped config template MUST declare it explicitly.
4. Check the active orchestrator model against `orchestrator_model_policy.required_tier` (this build: `opus`, a deliberate narrowing of `requirements-authoring-flow.md`'s own broader "Fable/Opus/GPT-5.5+ class" rule down to a specific choice for this deployment). If `enforce: true` and the active model doesn't match → DEMAND USER SWITCH MODEL; do not silently proceed or downgrade.
5. MUST ALWAYS use todo tasks ledger. Phases run sequentially per invocation; re-invocation resumes from state, it does not restart phase 1 unconditionally — see `<state_and_resumption>`.
6. Workflow state MUST be saved to `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`, and phase 2's Requirements.md MUST be saved alongside it in the same ticket-scoped folder at `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-REQUIREMENTS.md` — keeping every artifact this flow generates out of the target repo's real `docs/` tree. Every phase updates the state file before the next starts. Section shape is defined in `<state_and_resumption>` below (this is a runtime-artifact convention, not a shipped template).

</prerequisites>

<subagent_policy required="true" inline_execution="prohibited">

- Orchestrator owns phase transitions, dispatch, and the flow-state file.
- No subagent writes `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` directly, regardless of what any phase file's own step wording appears to instruct. Every phase-file "update_state"/report step hands values to the orchestrator; the orchestrator performs the actual read-full-file-then-append write. This overrides any contrary phrasing anywhere in `triage-flow-*.md`.
- Phase files are assigned-subagent-only; orchestrator MUST NOT load, read, or execute them directly.
- `executor` is never a gateway for full agents.
- If a required subagent invocation is unavailable, stop and report the unmet prerequisite.
- After every `INVOKE SUBAGENT` call, before dispatching the next phase, append one row to the state file's Resource Usage table: this tick's timestamp, the phase, the subagent name, and the `subagent_tokens`/`duration_ms` the call returned — taken verbatim, never estimated or omitted, even when the phase was skipped or the call errored (record what actually happened, e.g. `n/a — phase skipped`).

</subagent_policy>

<intake_contract>

Stable input/output contract, unchanged across trigger stages (caller-supplied ticket key today; cron/webhook later swap only how `ticket_key` gets populated, never this shape):

- **Input**: `{ ticket_key: string, reason?: string }`. `ticket_key` is required — the caller (e.g. tools-harness-intake's CI job) always supplies the Jira issue key it was dispatched for; there is no discovery mode where this flow picks a ticket on its own. `reason` is free text describing why the flow woke up (e.g. `"harness-intake dispatch"`, later `"cron tick"` or `"webhook: comment_created"`); when the caller omits it, intake MUST default it to `"manual invocation"` rather than prompting for it. Intake MUST NOT infer a trigger mechanism from `reason`'s content.
- **Behavior: intake evaluates the config's `jql` exactly once per invocation, scoped to `ticket_key`** — append a key filter (e.g. `AND key = "<ticket_key>"`) to the configured `jql` string, turning it into a pure eligibility/authorization check (status, assignee, project, etc. all still enforced by the rest of the jql) against that one ticket, via the configured Issue Tracker's search capability. Exactly one match → use it. Zero matches → stop and report that the ticket does not match the configured jql (status/assignee/project mismatch) — a specific, expected outcome, not a signal to investigate further. Multiple matches → stop and report all matching keys (should not occur when filtering by key; kept as a defensive guard against a malformed jql). Intake never varies, narrows, or broadens the query, and never autonomously picks among multiple candidates.
- **Output**: normalized, already-redacted issue snapshot (per `data-collection`'s issue-vendor-binding field map — its own step 4 runs `sensitive-data` before returning; no separate screening phase exists in this flow) plus `reason`, both written into the flow-state file.

Once webhooks land (out of scope for this build), a webhook payload supplies `ticket_key` directly, exactly as a caller does today — intake's contract and behavior do not change, only where the caller-supplied `ticket_key` originates.

</intake_contract>

<intake phase="1" subagent="executor" role="Bounded ticket-intake and JQL-eligibility operator" subagent_required_model="claude-haiku-4-5, gpt-5.6-terra, gemini-3.7-flash, composer-2.5, gpt-5.6-luna" must-be-subagent>

- Purpose: resolve the intake contract above into one concrete ticket and its normalized, already-redacted content (fetched via `data-collection`, whose own mandatory step 4 runs `sensitive-data` before returning — no separate screening phase in this flow).
- Input: `{ ticket_key, reason }`; the config's `jql`, scoped to `ticket_key` (see `<intake_contract>`).
- Output: redacted, normalized issue snapshot; `reason` echoed; flow-state file created/updated.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-intake.md` + resolve the ticket per the intake contract and fetch its content via `data-collection`.
- Control: proceed only with exactly one resolved ticket; stop and report on zero/multiple JQL matches or a fetch failure.

</intake>

<elicitation phase="2" subagent="requirements-engineer" role="Requirements elicitation against one existing ticket" subagent_required_model="claude-opus-5, gpt-5.6-sol" must-be-subagent>

- Purpose: run one iteration of requirements-authoring — create on first tick, update on later ticks — against the already-redacted ticket content and any unprocessed comment.
- Input: redacted ticket snapshot from phase 1; existing `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-REQUIREMENTS.md` if present; idempotency check result (see `<idempotency>`).
- Output: updated Requirements.md with `<req>` units and an Open Questions list.
- INVOKE SUBAGENT `requirements-engineer` to APPLY PHASE `triage-flow-elicitation.md` + USE SKILL `requirements-authoring` directly for intent-capture/draft/validate only — NOT the full `requirements-authoring-flow.md` (its outline/user_review/finalization gates don't map onto an async comment-driven Q&A loop).
- Control: skip this phase entirely (per idempotency check) when nothing new exists since the agent's own last comment; proceed straight to `completion_check` (phase 3) with the current Requirements.md state instead.

</elicitation>

<completion_check phase="3" subagent="executor" role="Bounded requirements-completion evaluator" subagent_required_model="claude-haiku-4-5, gpt-5.6-terra, gemini-3.7-flash, composer-2.5, gpt-5.6-luna" must-be-subagent>

- Purpose: evaluate whether Open Questions is empty, and branch — this phase's own evaluation runs BEFORE any Jira write is made this tick, so that whichever write eventually happens (phase 4's comment, or phase 5's assessment comment) is always the tick's last action.
- Input: current Requirements.md (Open Questions section, `<req>` unit statuses).
- Output: Open Questions non-empty → hand off to `publish_questions` (phase 4). Open Questions empty → flip both `<req>` units Draft → Approved and hand off to `assess` (phase 5).
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-completion-check.md` + evaluate Open Questions emptiness and route accordingly.
- Control: `POC-SCOPE-OVERRIDE:` Open Questions empty is sufficient by itself to flip `<req>` units to Approved and proceed — no rubric-pass requirement (the rubric still runs inside `requirements-authoring` and stays recorded in Requirements.md as reporting; it no longer gates progression) and no separate explicit-approval-sentence gate.

</completion_check>

<publish_questions phase="4" subagent="executor" role="Bounded Jira comment publisher" subagent_required_model="claude-haiku-4-5, gpt-5.6-terra, gemini-3.7-flash, composer-2.5, gpt-5.6-luna" must-be-subagent>

- Purpose: post the current Open Questions as one ticket comment. Only ever reached via phase 3's non-empty branch — never invoked, and never needs to check for itself, when Open Questions is empty.
- Input: Open Questions list from phase 2.
- Output: posted comment ID; `last_agent_comment_id` written to flow state.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-publish-questions.md` + USE SKILL `jira-write` (post comment).
- Control: `POC-SCOPE-OVERRIDE:` no human confirmation before this write (see `jira-write`'s `<dangerous_actions_gate>`). This write is the tick's terminal action — nothing runs after it.

</publish_questions>

<assess phase="5" subagent="reviewer" role="Bounded triage-assessment synthesizer and completion operator" subagent_required_model="claude-opus-5, gpt-5.6-sol" must-be-subagent>

- Purpose: produce the triage assessment (blind spots, potentially affected tools, issue size) for a ticket phase 3 has just routed here (Open Questions empty, `<req>` units flipped to Approved), and post it as one Jira comment — the last write this flow makes on the *source* ticket; phase 6 performs the flow's actual final action. This phase never mutates the ticket's status or assignee.
- Input: finalized Requirements.md (all `<req>` units now Approved); the ticket's `TSSM: Tool`/`TSSM: Project` custom fields from phase 1's snapshot.
- Output: `<TICKET-KEY>-TRIAGE-ASSESSMENT.md` written under `artifacts_dir`; one assessment comment posted via `jira-write` (`assessment_comment_id` captured); flow status stays `IN_PROGRESS` until phase 6 records both `tool_issue_key` and `link_id`.
- INVOKE SUBAGENT `reviewer` to APPLY PHASE `triage-flow-assess.md` + produce the three assessment blocks and post the comment.
- Control: the three assessment blocks (`blind_spots_risk_level`, `affected_tools_impact_level`, `issue_size`) are reported as-is in the comment — none of them gates a different action or branch; there is no risk-based branching in this build. No ticket reassignment, no status transition, ever. The human-in-the-loop gate for this flow lives entirely in the downstream consumer of its output artifacts (e.g. harness-intake's GitHub PR review), not in Jira ticket state.

</assess>

<create_tool_issue phase="6" subagent="executor" role="Bounded cross-project issue creator and linker" subagent_required_model="claude-haiku-4-5, gpt-5.6-terra, gemini-3.7-flash, composer-2.5, gpt-5.6-luna" must-be-subagent>

- Purpose: create the corresponding Story in the configured target project (`tool_issue_target` in the deployment config) from the just-triaged ticket, and link it back as an action item — the flow's final action for this ticket. Runs on the same tick as phase 5, immediately after its comment posts. Posts no comment, and never mutates the source ticket's status or assignee.
- Input: the source ticket's Summary, `TSSM: Tool`/`TSSM: Project`, and Assignee account ID from phase 1's snapshot; the finalized Requirements.md; the state file's `## Tool Issue` section.
- Output: `tool_issue_key`, `tool_issue_url`, `tool_issue_created_at`, `link_id` recorded in `## Tool Issue`; any omitted fields recorded as gaps; flow status set to `COMPLETE` once both key and link are recorded.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-create-tool-issue.md` + USE SKILL `jira-write` (create issue, then link issues — two separate calls, never one combined operation).
- Control: `POC-SCOPE-OVERRIDE:` no human confirmation before these writes (see `jira-write`'s `<dangerous_actions_gate>`). Two-state resumption: `tool_issue_key` absent → create then link; present with `link_id` absent → link only, never create; both present → skip the phase entirely. **This phase's failure report is state-bearing** — when it reports a created key alongside a link failure, the orchestrator MUST append that key to `## Tool Issue` before ending the tick. It is the only phase here whose *failed* report carries state that must be persisted, and dropping it strands an issue that nothing in this build can delete.

</create_tool_issue>

</workflow_phases>

<idempotency>

Checked at the entry of phase 2 (`triage-flow-elicitation.md`), never by comment author: compare the ticket's current newest comment ID against `last_agent_comment_id` in the flow-state file. Equal, and both values actually present → nothing new since the agent's own last post, skip straight to phase 3 with the current Requirements.md. Different, or `last_agent_comment_id` absent → a new requester reply exists (or this is the ticket's first-ever tick), run this tick's elicitation iteration. This exact rule was validated against a real bug in the POC (author-based detection fails when the agent and a human share one Jira identity) — do not reintroduce an author-based check anywhere in this flow or in `jira-write`.

</idempotency>

<state_and_resumption>

`<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md` sections (runtime convention, modeled on `agents/init-workspace-flow-state.md`; `artifacts_dir` comes from `agents/jira-triage.config.json`, default `agents/TEMP`). The same ticket-scoped folder also holds `<TICKET-KEY>-REQUIREMENTS.md` (phase 2's output) — both are this flow's own generated artifacts, never written into the target repo's real requirements tree:

```
## State
- ticket_key, reason, status (IN_PROGRESS|COMPLETE), last_tick
## Phase Progress
| Phase | Status | Notes |
## Poll Tick / Event Log
| Tick timestamp | trigger reason | phases run | result |
## Resource Usage
| Tick timestamp | Phase | Subagent | Tokens | Duration (ms) |
## Idempotency
- last_agent_comment_id
- newest_comment_id_seen
## Assessment
- assessment_file (path to `<TICKET-KEY>-TRIAGE-ASSESSMENT.md`, written by phase 5, once per ticket reaching COMPLETE)
- blind_spots_risk_level, affected_tools_impact_level, issue_size
- assessment_comment_id (from phase 5's comment post — distinct from last_agent_comment_id, never written into it)
## Tool Issue
- tool_issue_key, tool_issue_url, tool_issue_created_at (written by phase 6 the moment the create returns, before the link is attempted)
- link_id (written by phase 6 once the link write confirms; absent is a valid state — see below)
- field_gaps (fields omitted from the create and why, e.g. `TSSM: Project — option not in the target project's field context`)
## Identity
- resolved_acting_identity (from `jira-write`'s "read current identity", captured at the most recent write — never an assumed value)
## Approval Rule (this build)
- POC-SCOPE-OVERRIDE: writes_require_human_confirmation = false (see agents/jira-triage.config.json)
## Next Tick Should
- <plain-language note for the next invocation>
```

Each invocation re-reads this file if it exists (same `ticket_key`) and resumes at the phase implied by its state, rather than restarting phase 1 unconditionally.

**`## Tool Issue` is the one section here that can be validly half-written.** Every other section is written once, whole, by the phase that owns it. This one is written twice by phase 6 — key/URL/created_at when the create returns, `link_id` when the link confirms — precisely so a failure between the two is a resumable state instead of a lost issue. `tool_issue_key` present with `link_id` absent is not corruption and MUST NOT be "repaired" by clearing the section: the next invocation reads it as created-but-unlinked and completes only the link. Clearing it — or letting a failed phase-6 report through without persisting the key — causes a second, permanently undeletable issue on the next tick.

**Resume routing.** When `## Assessment` already records an `assessment_file` and `## Tool Issue` is missing `tool_issue_key` or `link_id`, the invocation resumes directly at phase 6; the orchestrator skips phases 2 through 5 rather than relying on their own guards. Phase 2's idempotency check compares the newest comment ID against `last_agent_comment_id`, which phase 5's assessment comment deliberately does not update — without this routing rule a resume tick reads the flow's own assessment comment as a new requester reply and re-opens elicitation on an already-finalized ticket. This is a real interaction that phase 6 makes reachable for the first time: before phase 6 existed there was never a legitimate reason to re-tick a ticket after phase 5 ran, so this rule was never needed until now.

**This file is append/edit-in-place only, never regenerated from scratch.** Every write reads the file's current full content first, then adds this tick's row(s) or updates the specific field named by the writing step — every row from every prior tick in `Poll Tick / Event Log` and `Resource Usage`, and every prior entry elsewhere, carries forward unchanged. A write that reproduces the file with only the current tick's data, even unintentionally, is a data-loss bug in that step.

</state_and_resumption>

<out_of_scope>

Deferred for this build, seams only, do not implement:

- Real OS cron / Jira webhook trigger — `<intake_contract>`'s `{ticket_key, reason?}` shape already makes both pure trigger-layer swaps (a webhook payload would populate `ticket_key` the same way a caller does today).
- Sub-hourly polling cadence.
- A risk-assessment gate of any kind: phase 5 (`assess`) reports `blind_spots_risk_level`, `affected_tools_impact_level`, and `issue_size` for the reader's information only — none of them branches this flow's behavior or triggers a Jira write beyond phase 5's assessment comment and phase 6's issue creation and link. Any future gating on these values is downstream of this flow (e.g. in the consuming PR review), never added back into this flow's own phases.
- Service-account credential swap — `jira-write`'s `<identity_note>` already keeps write identity decoupled from any assumed account; swapping to a service account means reconnecting the Issue Tracker integration under its credentials and updating the `jql` string's `assignee` clause to that account's ID, nothing else.
- Any changes to `tools-harness-intake` (workflow wiring, its own config, the PR step) — this flow's contract changes are designed to support that caller, but wiring it up is separate follow-up work.
- Any post-creation management of the target-project issue — transitions, estimates, labels, sprint or epic assignment, or edits after phase 6 creates it. This flow creates it, links it, and never touches it again.
- A comment on the source ticket announcing the created issue. The issue link is the announcement; a second write would add a second idempotency anchor for no reader benefit.

</out_of_scope>

<validation_checklist>

- Every phase updated `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` before the next started.
- Phase 2 never ran on a tick where the idempotency check found nothing new.
- Phase 4/5/6 writes each went through `jira-write`'s content-level gate (human-confirmation intentionally skipped per the override).
- Phase 1's `data-collection` fetch always redacted before returning — no unredacted ticket content ever reached phase 2.
- Phase 5's assessment ran exactly once per ticket, never on an IN_PROGRESS tick, and posted its comment with `assessment_comment_id` recorded — never overwriting `last_agent_comment_id`, and never setting flow status to COMPLETE on its own.
- No phase ever reassigned the ticket or transitioned its status — the flow's only writes on the source ticket are comments (phase 4's Open Questions comment, phase 5's assessment comment) and phase 6's one action-item link.
- Intake (phase 1) never ran the configured `jql` unscoped — every invocation filters by the caller-supplied `ticket_key`.
- Phase 6 created at most one target-project issue per source ticket across all ticks — a tick that found `tool_issue_key` already recorded never called create.
- Every phase-6 tick that created an issue left `tool_issue_key` in the state file, including ticks whose link write failed.
- A resume tick entering case B ran phase 6 only — phases 2-5 were skipped by the resume-routing rule, not re-run.
- The flow reached `COMPLETE` only after both `tool_issue_key` and `link_id` were recorded; phase 5's assessment comment alone no longer means complete.

</validation_checklist>

</triage_flow>
