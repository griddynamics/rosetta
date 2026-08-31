---
name: triage-flow
description: "Workflow for triaging one issue-tracker ticket: intake, elicitation, assessment, and linked issue creation."
alwaysApply: false
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<triage_flow>

<description_and_purpose>

Turn a triggered wake-up (invoked today by a caller — e.g. tools-harness-intake's CI job — for one specific ticket; a cron tick or webhook event later) into a repeatable ticket-triage cycle: fetch the ticket from its caller-supplied snapshot file (redacted directly by this flow's own intake step via `sensitive-data`), run requirements elicitation through comment round-trips, on completion post the assessment as a comment, and then create the corresponding Story in the configured target project from the finalized requirements, linked back to the source ticket as an action item — without a human answering an interactive prompt each tick, and without this flow mutating the source ticket's status or assignee. This flow is self-contained: no shared read/write skill sits between it and the Issue Tracker — it reads its own snapshot file and composes its own write artifacts, per `<intake_contract>` and `<write_artifact_contract>` below (`dangerous-actions` and `sensitive-data` are generic cross-cutting guardrails, not Issue-Tracker-specific, and stay as shared dependencies). This build: caller-supplied `ticket_key` only, no scheduler, no write-confirmation gate — both explicitly deferred, see `<out_of_scope>`.

</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. MUST USE SKILL `load-project-context`, `orchestration`, `hitl`.
3. Read the deployment config file (`agents/jira-triage.config.json` in the target repo) for: `jql`, `orchestrator_model_policy`, `artifacts_dir`, `tool_issue_target` (`project_key`, `issue_type`, `carry_fields`, `link_type`, `link_inward` — phase 6's target). Missing config file, or a missing `tool_issue_target` block, → stop and report; never invent these values. `artifacts_dir` is the base directory for this flow's own generated artifacts (flow state + Requirements.md) — it is caller-controlled (e.g. a caller may point it at an already-checked-out directory such as `knowledge`), default `agents/TEMP` when absent from an older config, but the shipped config template MUST declare it explicitly.
4. Check the active orchestrator model against `orchestrator_model_policy.required_tier` (this build: `sonnet`, a deliberate narrowing of `requirements-authoring-flow.md`'s own broader "Fable/Opus/GPT-5.5+ class" rule down to a specific choice for this deployment, matching the actual unattended-CI invocation this flow runs under). If `enforce: true` and the active model doesn't match → STOP_AND_REPORT (no human is present in unattended CI to act on a switch-model demand); do not silently proceed or downgrade.
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
- **Behavior: intake reads the caller-supplied snapshot file at `<artifacts_dir>/<TICKET-KEY>/ticket-snapshot.json` directly — this flow's only source of ticket content, no shared read skill involved — then evaluates the config's `jql` exactly once per invocation, scoped to `ticket_key`, as a LOCAL check.** The snapshot file's required shape: `{ticket_key, reason, summary, description, url, status, custom_fields: {...}, assignee_account_id: string|null, comments: [{id, author_account_id, body, created}]}`. Missing `ticket_key`, or the `comments` array key itself (an empty array `[]` is valid, the key being absent is not) → stop and report the named missing field; never proceed on partial data. Parse `jql`'s clauses (status, assignee, project, etc.) as documented eligibility constraints and compare each against the snapshot's own `status`/`custom_fields`/`assignee_account_id` fields; no live search or fetch call is made anywhere in this phase, and no shared read skill is involved — the snapshot file is the only input source, so there is no live/file variance to reconcile. All constraints satisfied → use the snapshot. Any constraint mismatched → stop and report that the ticket does not match the configured jql (status/assignee/project mismatch) — a specific, expected outcome, not a signal to investigate further. **This local check is defense-in-depth only**: the real caller's trigger (a Jira Automation webhook, per `agents/jira-triage.config.json`'s `jql_note`) already gates eligibility upstream before dispatching this flow — this flow must not assume that gate held, and independently refuses an ineligible snapshot every time. Intake never varies, narrows, or broadens the check, and never autonomously picks among multiple candidates (there is only ever the one caller-supplied snapshot).
- **Output**: normalized issue snapshot, redacted directly by this phase via USE SKILL `sensitive-data` before it goes anywhere else (descriptions and comment bodies are the highest-risk fields) — no shared read skill's redaction step is involved, this phase runs it itself — plus `reason`, both written into the flow-state file.

Once webhooks land (out of scope for this build), a webhook payload supplies `ticket_key` directly, exactly as a caller does today — intake's contract and behavior do not change, only where the caller-supplied `ticket_key` originates.

</intake_contract>

<write_artifact_contract>

Stable output contract for every Jira write this flow ever composes (phases 4, 5, 6) — this flow has no live connection to the Issue Tracker anywhere, and never will until a future, out-of-scope, cross-repo execution step is built (see `<out_of_scope>`). No shared write skill is involved — each composing phase applies this contract directly:

- **No live write, ever.** Every write this flow decides to make is composed into one JSON artifact at `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-<op>.json`, `op ∈ {add_comment, create_issue, link_issues}` (this build never transitions or reassigns — see `<out_of_scope>`). `NNN` is the next unused three-digit sequence number in that ticket's `jira-writes` directory, zero-padded, starting at `001` — list the directory, take the highest existing `NNN`, use the next one; never reuse or guess a number. Every artifact contains exactly `op`, `target_issue_key`, `payload` (op-specific, the same fields the composing phase already has in hand), and `composed_at` (ISO8601).
- **Gate before compose, every time.** USE SKILL `dangerous-actions` immediately before composing any artifact: assess blast radius (a live, shared Issue Tracker ticket is exactly the "touches a shared/live system" class this gate exists to catch, even though composing an artifact here never itself touches it), consider the opposite (what if this composed request is wrong), consider safer alternatives. The gate's purpose is "is this composed request safe to hand to a future executor," not "is this write safe to make" — this flow never makes the write itself.
- **`POC-SCOPE-OVERRIDE`**: this build skips `dangerous-actions` step 5 ("MUST REQUIRE EXPLICIT user approval") and `hitl`'s "dangerous actions ALWAYS require explicit approval" rule, for all three compose operations (`add_comment`, `create_issue`, `link_issues`) — unattended/autonomous **at compose time** by design, matching this flow's overall unattended-CI posture (see prerequisites step 4). This override only ever governs whether an artifact gets composed and written to disk; it says nothing about whether executing that artifact later is safe or reversible — that judgment belongs to the future, out-of-scope execution step, never to this compose step. To restore human confirmation: re-enable `dangerous-actions` step 5 in phases 4/5/6 and flip `confirmation_gate_override.writes_require_human_confirmation` to `true` in the deployment config.
- **`create_issue` is the one exception the override does not touch**: composing its artifact does not make the eventual write safe or revertible — there is no delete, and a wrongly-created issue keeps its key forever once a future step executes it. Phase 6 MUST state, as part of its own compose, which duplicate-prevention check it ran and what it found — that evidence is REQUIRED at compose time, not deferrable, because it will not exist in phase 6's context by the time a future execution step runs and that executor cannot re-derive it. A `create_issue` compose arriving without that evidence is refused.
- **Gate cadence for phase 6's create-then-link pair**: the gate above runs once per composed artifact — phase 6 composing a create and then a link runs it twice, never a shared pass. The link's own pass is bounded to "does this composed edge connect the two keys named, in the direction named" — its only outcomes are compose the link, or stop and report an issue-created-but-unlinked state; never a silent skip (see `triage-flow-create-tool-issue.md` for why a real target-project key may not exist yet to link against).
- **No identity resolution, ever.** This flow has no live connection and cannot know which account will eventually execute a composed artifact — that is a static fact of whatever Jira secret the future execution step authenticates as, not of this flow. Never fabricate, guess, or assume an identity value anywhere in a composed artifact or the flow-state file's `## Identity` section.
- **Report the artifact path — never a live result.** The phase that composed an artifact reports its path to the orchestrator; the orchestrator records the corresponding state-file field as `"pending — see <artifact path>"`, never a real comment ID, transition result, created key, or link ID — none of those exist until a future, out-of-scope execution step runs the artifact and reports back (see `<state_and_resumption>`, `<idempotency>`).
- **Documented regression, not solved here**: composing `create_issue`/`link_issues` trusts the caller-declared payload as-is — this flow has no live connection to pre-validate a custom-field option value or a link-type name against real Jira state before writing the artifact. An invalid value will compose successfully and will not surface until a future execution step attempts the real write. The eventual execution step MUST re-validate before sending.

</write_artifact_contract>

<intake phase="1" subagent="executor" role="Bounded ticket-intake and local-eligibility operator" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5" must-be-subagent>

- Purpose: resolve the intake contract above into one concrete ticket and its normalized, already-redacted content, read directly from the caller-supplied snapshot file (this phase runs `sensitive-data` itself — no shared read skill, no separate screening phase), then run the config's `jql` as a LOCAL eligibility check against that snapshot — defense-in-depth only, since the real trigger (a Jira Automation webhook) already gates eligibility upstream.
- Input: `{ ticket_key, reason }`; the snapshot file path `<artifacts_dir>/<TICKET-KEY>/ticket-snapshot.json`; the config's `jql`, parsed as constraints (see `<intake_contract>`).
- Output: redacted, normalized issue snapshot; `reason` echoed; flow-state file created/updated.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-intake.md` + resolve the ticket per the intake contract, read and redact its content directly, and run the local eligibility check.
- Control: proceed only with exactly one resolved, eligible ticket; stop and report on a snapshot read failure or an eligibility-constraint mismatch. No live search or fetch call may occur in this phase.

</intake>

<elicitation phase="2" subagent="requirements-engineer" role="Requirements elicitation against one existing ticket" subagent_required_model="claude-opus-5, gpt-5.6-sol-high, gemini-3.7-flash-high" must-be-subagent>

- Purpose: run one iteration of requirements-authoring — create on first tick, update on later ticks — against the already-redacted ticket content and any unprocessed comment.
- Input: redacted ticket snapshot from phase 1; existing `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-REQUIREMENTS.md` if present; idempotency check result (see `<idempotency>`).
- Output: updated Requirements.md with `<req>` units and an Open Questions list.
- INVOKE SUBAGENT `requirements-engineer` to APPLY PHASE `triage-flow-elicitation.md` + USE SKILL `requirements-authoring` directly for intent-capture/draft/validate only — NOT the full `requirements-authoring-flow.md` (its outline/user_review/finalization gates don't map onto an async comment-driven Q&A loop).
- Control: skip this phase entirely (per idempotency check) when nothing new exists since the agent's own last comment; proceed straight to `completion_check` (phase 3) with the current Requirements.md state instead.

</elicitation>

<completion_check phase="3" subagent="executor" role="Bounded requirements-completion evaluator" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5" must-be-subagent>

- Purpose: evaluate whether Open Questions is empty, and branch — this phase's own evaluation runs BEFORE any Jira write is made this tick, so that whichever write eventually happens (phase 4's comment, or phase 5's assessment comment) is always the tick's last action.
- Input: current Requirements.md (Open Questions section, `<req>` unit statuses).
- Output: Open Questions non-empty → hand off to `publish_questions` (phase 4). Open Questions empty → flip both `<req>` units Draft → Approved and hand off to `assess` (phase 5).
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-completion-check.md` + evaluate Open Questions emptiness and route accordingly.
- Control: `POC-SCOPE-OVERRIDE:` Open Questions empty is sufficient by itself to flip `<req>` units to Approved and proceed — no rubric-pass requirement (the rubric still runs inside `requirements-authoring` and stays recorded in Requirements.md as reporting; it no longer gates progression) and no separate explicit-approval-sentence gate.

</completion_check>

<publish_questions phase="4" subagent="executor" role="Bounded Jira comment publisher" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5" must-be-subagent>

- Purpose: compose the current Open Questions into one add-comment write artifact, per `<write_artifact_contract>`. Only ever reached via phase 3's non-empty branch — never invoked, and never needs to check for itself, when Open Questions is empty.
- Input: Open Questions list from phase 2.
- Output: composed artifact path (never a comment ID — this flow has no live connection and reports only the artifact it wrote); `last_agent_comment_id` written to flow state as `"pending — see <artifact path>"`.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-publish-questions.md` + compose the add_comment artifact per `<write_artifact_contract>`.
- Control: `POC-SCOPE-OVERRIDE:` no human confirmation before this compose (see `<write_artifact_contract>`). This compose is the tick's terminal action — nothing runs after it.

</publish_questions>

<assess phase="5" subagent="reviewer" role="Bounded triage-assessment synthesizer and completion operator" subagent_required_model="claude-opus-5, gpt-5.6-sol-high, gemini-3.7-flash-high" must-be-subagent>

- Purpose: produce the triage assessment (blind spots, potentially affected tools, issue size) for a ticket phase 3 has just routed here (Open Questions empty, `<req>` units flipped to Approved), and compose it into one Jira add-comment write artifact per `<write_artifact_contract>` — the last write this flow makes on the *source* ticket; phase 6 performs the flow's actual final action. This phase never mutates the ticket's status or assignee.
- Input: finalized Requirements.md (all `<req>` units now Approved); the ticket's `TSSM: Tool`/`TSSM: Project` custom fields from phase 1's snapshot.
- Output: `<TICKET-KEY>-TRIAGE-ASSESSMENT.md` written under `artifacts_dir`; one assessment-comment artifact composed per `<write_artifact_contract>` (its path captured; `assessment_comment_id` recorded as `"pending — see <artifact path>"`, never a real comment ID); flow status stays `IN_PROGRESS` until phase 6 records both `tool_issue_key` and `link_id`.
- INVOKE SUBAGENT `reviewer` to APPLY PHASE `triage-flow-assess.md` + produce the three assessment blocks and compose the comment artifact per `<write_artifact_contract>`.
- Control: the three assessment blocks (`blind_spots_risk_level`, `affected_tools_impact_level`, `issue_size`) are reported as-is in the comment — none of them gates a different action or branch; there is no risk-based branching in this build. No ticket reassignment, no status transition, ever. The human-in-the-loop gate for this flow lives entirely in the downstream consumer of its output artifacts (e.g. harness-intake's GitHub PR review), not in Jira ticket state.

</assess>

<create_tool_issue phase="6" subagent="executor" role="Bounded cross-project issue creator and linker" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5" must-be-subagent>

- Purpose: compose, per `<write_artifact_contract>`, the create-issue artifact for the corresponding Story in the configured target project (`tool_issue_target` in the deployment config) from the just-triaged ticket, and — once a real target-project key is confirmed, which this build's feedback loop does not yet supply — the link-issues artifact linking it back as an action item. This is the flow's final action for this ticket. Composes no comment, and never mutates the source ticket's status or assignee.
- Input: the source ticket's Summary, `TSSM: Tool`/`TSSM: Project`, and Assignee account ID from phase 1's snapshot; the finalized Requirements.md; the state file's `## Tool Issue` section.
- Output: `tool_issue_key`, `tool_issue_url`, `tool_issue_created_at` recorded in `## Tool Issue` as `"pending — see <create-artifact-path>"`; `link_id` recorded as `"pending — see <link-artifact-path>"` only once step 6.5 finds a confirmed real key to link against (an event this build's snapshot contract does not yet produce — see `<out_of_scope>`) — otherwise left absent; any omitted create-payload fields recorded as gaps; flow status set to `COMPLETE` once both `tool_issue_key` and `link_id` are recorded as pending sentinels pointing at their respective composed artifacts.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-create-tool-issue.md` + compose the create_issue artifact, then attempt the link_issues artifact, per `<write_artifact_contract>` — two separate composes, never one combined operation; neither performs a live write, both only compose artifacts.
- Control: `POC-SCOPE-OVERRIDE:` no human confirmation before these composes (see `<write_artifact_contract>`). Two-state resumption, now keyed on the recorded pending sentinel rather than a real value: `tool_issue_key` absent → compose create, then attempt link; present with `link_id` absent → attempt link only, never recompose create; both present → skip the phase entirely. **This phase's incomplete report is state-bearing** — when it reports a composed create artifact's path alongside an uncomposable link, the orchestrator MUST append that pending `tool_issue_key` to `## Tool Issue` before ending the tick. It is the only phase here whose *incomplete* report carries state that must be persisted, and dropping it strands a composed create artifact that nothing in this build can recover.

</create_tool_issue>

</workflow_phases>

<idempotency>

Checked at the entry of phase 2 (`triage-flow-elicitation.md`), never by comment author: compare the ticket's current newest comment ID against `last_agent_comment_id` in the flow-state file. **Logic is unchanged** — only the source of the comparison changed: the newest comment ID now comes from the file-supplied `comments[]` array in this tick's input snapshot (`<artifacts_dir>/<TICKET-KEY>/ticket-snapshot.json`, read directly by phase 1 per `<intake_contract>`), never a live fetch. Equal, and both values actually present → nothing new since the agent's own last post, skip straight to phase 3 with the current Requirements.md. Different, or `last_agent_comment_id` absent → a new requester reply exists (or this is the ticket's first-ever tick), run this tick's elicitation iteration. This exact rule was validated against a real bug in the POC (author-based detection fails when the agent and a human share one Jira identity) — do not reintroduce an author-based check anywhere in this flow.

**`last_agent_comment_id` holding the literal string `"pending — see <artifact path>"` on a resumed tick, before the real comment ID is ever confirmed, is an EXPECTED, VALID state — not corruption.** This flow has no way to learn the real ID until a future tick's input snapshot reflects the executed result (the posted comment showing up in that snapshot's `comments[]`). A resumed tick that still reads `"pending"` and finds no comment in the snapshot's `comments[]` whose author isn't the flow's own eventual-executor identity reads as "nothing new," exactly the same as an equal-IDs no-op today — do not treat a still-`pending` value as a reason to stop, error, or re-derive anything.

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
- last_agent_comment_id (recorded as the literal string "pending — see <artifact path>" once phase 4 composes a comment artifact this tick — never a real comment ID; see `<idempotency>`)
- newest_comment_id_seen
## Assessment
- assessment_file (path to `<TICKET-KEY>-TRIAGE-ASSESSMENT.md`, written by phase 5, once per ticket reaching COMPLETE)
- blind_spots_risk_level, affected_tools_impact_level, issue_size
- assessment_comment_id (recorded as "pending — see <artifact path>" once phase 5 composes its comment artifact — distinct from last_agent_comment_id, never written into it; never a real comment ID)
## Tool Issue
- tool_issue_key, tool_issue_url, tool_issue_created_at (each recorded as "pending — see <create-artifact-path>" the moment phase 6 composes the create-issue artifact, before the link is attempted — never real values)
- link_id (recorded as "pending — see <link-artifact-path>" only once phase 6 composes the link artifact; absent is a valid state — see below)
- field_gaps (fields omitted from the create and why, e.g. `TSSM: Project — option not in the target project's field context`)
## Identity
- resolved_acting_identity — not populated by this build; this flow has no live connection and resolves no identity at compose time (see `<write_artifact_contract>`). Never fabricate or assume a value here.
## Approval Rule (this build)
- POC-SCOPE-OVERRIDE: writes_require_human_confirmation = false (see agents/jira-triage.config.json)
## Next Tick Should
- <plain-language note for the next invocation>
```

**The five fields above that name a comment, key, URL, or link — `last_agent_comment_id`, `assessment_comment_id`, `tool_issue_key`, `tool_issue_url`, `link_id` — are recorded as the literal string `"pending — see <artifact path>"` at tick-end, never a real value.** This flow has no live connection to the Issue Tracker (see `<write_artifact_contract>`); it composes a JSON artifact and reports only that artifact's path. This flow has no way to know the real values until a future tick's input snapshot reflects the executed result (e.g. the posted comment shows up in that snapshot's `comments[]` on a later invocation) — a future, out-of-scope execution step, not built here.

Each invocation re-reads this file if it exists (same `ticket_key`) and resumes at the phase implied by its state, rather than restarting phase 1 unconditionally.

**`## Tool Issue` is the one section here that can be validly half-written.** Every other section is written once, whole, by the phase that owns it. This one is written twice by phase 6 — the pending key/URL/created_at sentinel when the create artifact is composed, the pending `link_id` sentinel when the link artifact is composed — precisely so an uncomposable link between the two is a resumable state instead of a lost issue. `tool_issue_key` present (as the pending sentinel) with `link_id` absent is not corruption and MUST NOT be "repaired" by clearing the section: the next invocation reads it as created-but-unlinked and re-checks only whether the link is now composable. Clearing it — or letting an incomplete phase-6 report through without persisting the pending `tool_issue_key` — causes a second create artifact to be composed on the next tick, which is a second permanently undeletable issue once both are eventually executed.

**Resume routing.** When `## Assessment` already records an `assessment_file` and `## Tool Issue` is missing `tool_issue_key` or `link_id` (including when `tool_issue_key` is still the pending sentinel and `link_id` has never been set), the invocation resumes directly at phase 6; the orchestrator skips phases 2 through 5 rather than relying on their own guards. Phase 2's idempotency check compares the newest comment ID against `last_agent_comment_id`, which phase 5's assessment comment deliberately does not update — without this routing rule a resume tick reads the flow's own assessment comment as a new requester reply and re-opens elicitation on an already-finalized ticket. This is a real interaction that phase 6 makes reachable for the first time: before phase 6 existed there was never a legitimate reason to re-tick a ticket after phase 5 ran, so this rule was never needed until now.

**This file is append/edit-in-place only, never regenerated from scratch.** Every write reads the file's current full content first, then adds this tick's row(s) or updates the specific field named by the writing step — every row from every prior tick in `Poll Tick / Event Log` and `Resource Usage`, and every prior entry elsewhere, carries forward unchanged. A write that reproduces the file with only the current tick's data, even unintentionally, is a data-loss bug in that step.

</state_and_resumption>

<out_of_scope>

Deferred for this build, seams only, do not implement:

- Real OS cron / Jira webhook trigger — `<intake_contract>`'s `{ticket_key, reason?}` shape already makes both pure trigger-layer swaps (a webhook payload would populate `ticket_key` the same way a caller does today).
- Sub-hourly polling cadence.
- A risk-assessment gate of any kind: phase 5 (`assess`) reports `blind_spots_risk_level`, `affected_tools_impact_level`, and `issue_size` for the reader's information only — none of them branches this flow's behavior or triggers a Jira write beyond phase 5's assessment comment and phase 6's issue creation and link. Any future gating on these values is downstream of this flow (e.g. in the consuming PR review), never added back into this flow's own phases.
- Service-account credential swap — `<write_artifact_contract>`'s no-identity-resolution rule already keeps write identity decoupled from any assumed account; swapping to a service account means reconnecting the Issue Tracker integration under its credentials and updating the `jql` string's `assignee` clause to that account's ID, nothing else.
- Any changes to `tools-harness-intake` (workflow wiring, its own config, the PR step) — this flow's contract changes are designed to support that caller, but wiring it up is separate follow-up work.
- Any post-creation management of the target-project issue — transitions, estimates, labels, sprint or epic assignment, or edits after phase 6 creates it. This flow creates it, links it, and never touches it again.
- A comment on the source ticket announcing the created issue. The issue link is the announcement; a second write would add a second idempotency anchor for no reader benefit.
- Executing the composed `jira-writes/*.json` artifacts against real Jira, and feeding their results back into the next tick's input snapshot — a future Action-side step, cross-repo, not built here.

</out_of_scope>

<validation_checklist>

- Every phase updated `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` before the next started.
- Phase 2 never ran on a tick where the idempotency check found nothing new (checked against the file-supplied `comments[]` in this tick's input snapshot).
- Phase 4/5/6 composes each went through the `dangerous-actions` content-level gate per `<write_artifact_contract>` (human-confirmation intentionally skipped per the override) and produced an artifact path — never a comment ID, transition result, created key, or link ID.
- Phase 1's snapshot read always redacted via `sensitive-data` directly before returning — no unredacted ticket content ever reached phase 2, and no live search or fetch call occurred anywhere in phase 1.
- Phase 5's assessment ran exactly once per ticket, never on an IN_PROGRESS tick, and composed its comment artifact with `assessment_comment_id` recorded as `"pending — see <artifact path>"` — never overwriting `last_agent_comment_id`, never recorded as a real comment ID, and never setting flow status to COMPLETE on its own.
- No phase ever reassigned the ticket or transitioned its status — the flow's only composed writes on the source ticket are comment artifacts (phase 4's Open Questions comment, phase 5's assessment comment) and phase 6's one action-item link artifact.
- Intake (phase 1) never treated the configured `jql` as anything other than a local, snapshot-scoped eligibility check — every invocation checks the caller-supplied `ticket_key`'s own snapshot, never a broader or unscoped evaluation, and never a live query.
- Phase 6 composed at most one create-issue artifact per source ticket across all ticks — a tick that found `tool_issue_key` already recorded (as the pending sentinel) never recomposed create.
- Every phase-6 tick that composed a create artifact left `tool_issue_key` recorded as `"pending — see <artifact path>"` in the state file, including ticks whose link could not yet be composed.
- A resume tick entering case B ran phase 6 only — phases 2-5 were skipped by the resume-routing rule, not re-run.
- The flow reached `COMPLETE` only after both `tool_issue_key` and `link_id` were recorded as pending sentinels pointing at their respective composed artifacts; phase 5's assessment comment artifact alone no longer means complete. Reaching `COMPLETE` in this build means both artifacts are composed and awaiting a future execution step — never that Jira itself was actually updated (see `<out_of_scope>`).
- No validation-checklist item anywhere in `triage-flow.md` or its phase files treats a captured comment ID, transition result, created key, or link ID as a done-check — every such check is against the recorded `"pending — see <artifact path>"` sentinel or the artifact path itself.

</validation_checklist>

</triage_flow>
