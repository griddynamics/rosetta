---
name: triage-flow
description: "Workflow for triaging one issue-tracker ticket: intake, elicitation, assessment, and linked issue creation."
alwaysApply: false
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<triage_flow>

<description_and_purpose>

Turn a triggered wake-up (invoked today by a caller — e.g. tools-harness-intake's CI job — for one specific ticket; a cron tick or webhook event later) into a repeatable ticket-triage cycle: take the ticket's details as caller-supplied text (redacted directly by this flow's own intake step via `sensitive-data`), run requirements elicitation through comment round-trips, on completion post the assessment as a comment, and then create the corresponding Story in the configured target project from the finalized requirements, linked back to the source ticket as an action item — without a human answering an interactive prompt each tick, and without this flow mutating the source ticket's status or assignee. This flow is fully self-contained: it never reads anything from Jira itself — the caller supplies ticket content as text with the invocation, no file, no config, no shared read/write skill sits between this flow and the Issue Tracker — it takes its input directly and composes its own write artifacts, per `<intake_contract>` and `<write_artifact_contract>` below (`dangerous-actions` and `sensitive-data` are generic cross-cutting guardrails, not Issue-Tracker-specific, and stay as shared dependencies). This build: caller-supplied `ticket_key` only, no scheduler, no write-confirmation gate — both explicitly deferred, see `<out_of_scope>`.

</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. MUST USE SKILL `load-project-context`, `orchestration`, `hitl`.
3. No deployment config file — this flow has no external config to read. `artifacts_dir` (the base directory for this flow's own generated artifacts: flow state, Requirements.md, `jira-writes/*.json`) comes from the caller-supplied invocation input (see `<intake_contract>`), default `agents/TEMP` when the caller omits it — it is caller-controlled per-invocation (e.g. a caller may point it at an already-checked-out directory such as `knowledge`). The target-project settings phase 6 needs (`project_key`, `issue_type`, `carry_fields`, `link_type`, `link_inward`) are fixed constants for this build, hardcoded directly in `triage-flow-create-tool-issue.md` — not read from anywhere.
4. This build requires the active orchestrator model to be `sonnet`-tier (a deliberate narrowing of `requirements-authoring-flow.md`'s own broader "Fable/Opus/GPT-5.5+ class" rule down to a specific, hardcoded choice for this deployment, matching the actual unattended-CI invocation this flow runs under — `--model sonnet`). If the active model isn't `sonnet`-tier → STOP_AND_REPORT (no human is present in unattended CI to act on a switch-model demand); do not silently proceed or downgrade.
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

- **Input**: `{ ticket_key: string, reason?: string, ticket_details: string, artifacts_dir?: string }`. `ticket_key` is required — the caller (e.g. tools-harness-intake's CI job) always supplies the Jira issue key it was dispatched for; there is no discovery mode where this flow picks a ticket on its own. `reason` is free text describing why the flow woke up (e.g. `"harness-intake dispatch"`, later `"cron tick"` or `"webhook: comment_created"`); when the caller omits it, intake MUST default it to `"manual invocation"` rather than prompting for it. Intake MUST NOT infer a trigger mechanism from `reason`'s content. `ticket_details` is required — free text the caller composes directly into the invocation with whatever it has about the ticket (summary, description, url, status, custom fields such as `TSSM: Tool`/`TSSM: Project`, assignee, and the comment thread to date) — there is no fixed schema and no file this flow reads; the caller writes prose or labeled lines, whatever is natural for it to produce, and this flow works from that text as given. `artifacts_dir` is optional, default `agents/TEMP` when omitted — the base directory for this flow's own generated artifacts (flow state, Requirements.md, `jira-writes/*.json`); caller-controlled per-invocation (e.g. a caller may point it at an already-checked-out directory such as `knowledge`).
- **Behavior: intake takes `ticket_details` exactly as supplied — no file read, no live search or fetch, no shared read skill, nothing to fetch or resolve.** Empty or missing `ticket_details` → stop and report; this flow cannot triage a ticket it has no content for. There is no local eligibility check in this build — the calling Action's own trigger (e.g. a Jira Automation webhook) is trusted to have already gated eligibility before dispatch; this flow does not re-derive or re-check it (a deliberate simplification once there is no structured, field-mapped snapshot to check fields against — see `<out_of_scope>`).
- **Output**: `ticket_details`, redacted directly by this phase via USE SKILL `sensitive-data` before it goes anywhere else (descriptions and comment bodies are the highest-risk fields — this phase runs the redaction itself, no shared skill does it on this phase's behalf) — plus `reason`, both written into the flow-state file.

Once webhooks land (out of scope for this build), a webhook payload supplies `ticket_key`/`ticket_details` directly, exactly as a caller does today — intake's contract and behavior do not change, only where the caller-supplied values originate.

</intake_contract>

<write_artifact_contract>

Stable output contract for every Jira write this flow ever composes (phases 4, 5, 6) — this flow has no live connection to the Issue Tracker anywhere, and never will until a future, out-of-scope, cross-repo execution step is built (see `<out_of_scope>`). No shared write skill is involved — each composing phase applies this contract directly:

- **No live write, ever.** Every write this flow decides to make is composed into one JSON artifact at `<artifacts_dir>/<TICKET-KEY>/jira-writes/<NNN>-<op>.json`, `op ∈ {add_comment, create_issue, link_issues}` (this build never transitions or reassigns — see `<out_of_scope>`). `NNN` is the next unused three-digit sequence number in that ticket's `jira-writes` directory, zero-padded, starting at `001` — list the directory, take the highest existing `NNN`, use the next one; never reuse or guess a number. Every artifact contains exactly `op`, `target_issue_key`, `payload` (op-specific, the same fields the composing phase already has in hand), and `composed_at` (ISO8601).
- **Gate before compose, every time.** USE SKILL `dangerous-actions` immediately before composing any artifact: assess blast radius (a live, shared Issue Tracker ticket is exactly the "touches a shared/live system" class this gate exists to catch, even though composing an artifact here never itself touches it), consider the opposite (what if this composed request is wrong), consider safer alternatives. The gate's purpose is "is this composed request safe to hand to a future executor," not "is this write safe to make" — this flow never makes the write itself.
- **`POC-SCOPE-OVERRIDE`**: this build skips `dangerous-actions` step 5 ("MUST REQUIRE EXPLICIT user approval") and `hitl`'s "dangerous actions ALWAYS require explicit approval" rule, for all three compose operations (`add_comment`, `create_issue`, `link_issues`) — unattended/autonomous **at compose time** by design, matching this flow's overall unattended-CI posture (see prerequisites step 4). This override only ever governs whether an artifact gets composed and written to disk; it says nothing about whether executing that artifact later is safe or reversible — that judgment belongs to the future, out-of-scope execution step, never to this compose step. To restore human confirmation for this build: remove this `POC-SCOPE-OVERRIDE` paragraph and re-enable `dangerous-actions` step 5 directly in phases 4/5/6 — there is no config flag to flip, the override is this prose.
- **`create_issue` is the one exception the override does not touch**: composing its artifact does not make the eventual write safe or revertible — there is no delete, and a wrongly-created issue keeps its key forever once a future step executes it. Phase 6 MUST state, as part of its own compose, which duplicate-prevention check it ran and what it found — that evidence is REQUIRED at compose time, not deferrable, because it will not exist in phase 6's context by the time a future execution step runs and that executor cannot re-derive it. A `create_issue` compose arriving without that evidence is refused.
- **Gate cadence for phase 6's create-then-link pair**: the gate above runs once per composed artifact — phase 6 composing a create and then a link runs it twice, never a shared pass. The link's own pass is bounded to "does this composed edge connect the two keys named, in the direction named" — its only outcomes are compose the link, or stop and report an issue-created-but-unlinked state; never a silent skip (see `triage-flow-create-tool-issue.md` for why a real target-project key may not exist yet to link against).
- **No identity resolution, ever.** This flow has no live connection and cannot know which account will eventually execute a composed artifact — that is a static fact of whatever Jira secret the future execution step authenticates as, not of this flow. Never fabricate, guess, or assume an identity value anywhere in a composed artifact or the flow-state file's `## Identity` section.
- **Report the artifact path — never a live result.** The phase that composed an artifact reports its path to the orchestrator; the orchestrator records the corresponding state-file field as `"pending — see <artifact path>"`, never a real comment ID, transition result, created key, or link ID — none of those exist until a future, out-of-scope execution step runs the artifact and reports back (see `<state_and_resumption>`, `<idempotency>`).
- **Documented regression, not solved here**: composing `create_issue`/`link_issues` trusts the caller-declared payload as-is — this flow has no live connection to pre-validate a custom-field option value or a link-type name against real Jira state before writing the artifact. An invalid value will compose successfully and will not surface until a future execution step attempts the real write. The eventual execution step MUST re-validate before sending.

</write_artifact_contract>

<intake phase="1" subagent="executor" role="Bounded ticket-intake operator" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5" must-be-subagent>

- Purpose: resolve the intake contract above into one concrete ticket and its redacted `ticket_details` text, taken directly from the invocation input (this phase runs `sensitive-data` itself — no file read, no shared read skill, no eligibility check in this build).
- Input: `{ ticket_key, reason, ticket_details, artifacts_dir? }` (see `<intake_contract>`).
- Output: redacted `ticket_details`; `reason` echoed; flow-state file created/updated.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-intake.md` + resolve the ticket per the intake contract and redact its content directly.
- Control: proceed only with exactly one resolved ticket carrying non-empty `ticket_details`; stop and report on empty/missing `ticket_details`. No live search or fetch call, and no config or file read, may occur in this phase.

</intake>

<elicitation phase="2" subagent="requirements-engineer" role="Requirements elicitation against one existing ticket" subagent_required_model="claude-opus-5, gpt-5.6-sol-high, gemini-3.7-flash-high" must-be-subagent>

- Purpose: run one iteration of requirements-authoring — create on first tick, update on later ticks — against the already-redacted ticket content and any unprocessed comment.
- Input: redacted `ticket_details` text from phase 1; existing `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-REQUIREMENTS.md` if present; idempotency check result (see `<idempotency>`).
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
- Input: finalized Requirements.md (all `<req>` units now Approved); the ticket's `TSSM: Tool`/`TSSM: Project` custom fields, located directly within phase 1's redacted `ticket_details` text.
- Output: `<TICKET-KEY>-TRIAGE-ASSESSMENT.md` written under `artifacts_dir`; one assessment-comment artifact composed per `<write_artifact_contract>` (its path captured; `assessment_comment_id` recorded as `"pending — see <artifact path>"`, never a real comment ID); flow status stays `IN_PROGRESS` until phase 6 records both `tool_issue_key` and `link_id`.
- INVOKE SUBAGENT `reviewer` to APPLY PHASE `triage-flow-assess.md` + produce the three assessment blocks and compose the comment artifact per `<write_artifact_contract>`.
- Control: the three assessment blocks (`blind_spots_risk_level`, `affected_tools_impact_level`, `issue_size`) are reported as-is in the comment — none of them gates a different action or branch; there is no risk-based branching in this build. No ticket reassignment, no status transition, ever. The human-in-the-loop gate for this flow lives entirely in the downstream consumer of its output artifacts (e.g. harness-intake's GitHub PR review), not in Jira ticket state.

</assess>

<create_tool_issue phase="6" subagent="executor" role="Bounded cross-project issue creator and linker" subagent_required_model="claude-haiku-4-5, gpt-5.6-luna-medium, gemini-3.7-flash-low, composer-2.5" must-be-subagent>

- Purpose: compose, per `<write_artifact_contract>`, the create-issue artifact for the corresponding Story in the configured target project (this build's fixed target settings, hardcoded in `triage-flow-create-tool-issue.md`) from the just-triaged ticket, and — once a real target-project key is confirmed, which this build's feedback loop does not yet supply — the link-issues artifact linking it back as an action item. This is the flow's final action for this ticket. Composes no comment, and never mutates the source ticket's status or assignee.
- Input: the source ticket's Summary, `TSSM: Tool`/`TSSM: Project`, and Assignee account ID, located directly within phase 1's redacted `ticket_details` text; the finalized Requirements.md; the state file's `## Tool Issue` section.
- Output: `tool_issue_key`, `tool_issue_url`, `tool_issue_created_at` recorded in `## Tool Issue` as `"pending — see <create-artifact-path>"`; `link_id` recorded as `"pending — see <link-artifact-path>"` only once step 6.5 finds a confirmed real key to link against (an event this build's input contract does not yet produce — see `<out_of_scope>`) — otherwise left absent; any omitted create-payload fields recorded as gaps; flow status set to `COMPLETE` once both `tool_issue_key` and `link_id` are recorded as pending sentinels pointing at their respective composed artifacts.
- INVOKE SUBAGENT `executor` to APPLY PHASE `triage-flow-create-tool-issue.md` + compose the create_issue artifact, then attempt the link_issues artifact, per `<write_artifact_contract>` — two separate composes, never one combined operation; neither performs a live write, both only compose artifacts.
- Control: `POC-SCOPE-OVERRIDE:` no human confirmation before these composes (see `<write_artifact_contract>`). Two-state resumption, now keyed on the recorded pending sentinel rather than a real value: `tool_issue_key` absent → compose create, then attempt link; present with `link_id` absent → attempt link only, never recompose create; both present → skip the phase entirely. **This phase's incomplete report is state-bearing** — when it reports a composed create artifact's path alongside an uncomposable link, the orchestrator MUST append that pending `tool_issue_key` to `## Tool Issue` before ending the tick. It is the only phase here whose *incomplete* report carries state that must be persisted, and dropping it strands a composed create artifact that nothing in this build can recover.

</create_tool_issue>

</workflow_phases>

<idempotency>

Checked at the entry of phase 2 (`triage-flow-elicitation.md`): compute a content hash (SHA-256 hex) of this tick's redacted `ticket_details` text, and compare it against `last_processed_ticket_details_hash` in the flow-state file. Equal, and `last_processed_ticket_details_hash` actually present → nothing about the ticket has changed since this flow last processed it, skip straight to phase 3 with the current Requirements.md — do NOT invoke `requirements-authoring` this tick. Different, or `last_processed_ticket_details_hash` absent → something changed since last time (a new comment, an edited field, or this is the ticket's first-ever tick), run this tick's elicitation iteration; after it runs, report this tick's hash for the orchestrator to store as the new `last_processed_ticket_details_hash`.

**This is a coarser check than a comment-ID comparison, deliberately** — free text carries no structured comment IDs to diff against, so this flow compares the whole `ticket_details` text rather than isolating "just the new comment." A caller who reformats or re-sends the ticket_details identically triggers no re-run (same hash); any real change (including a genuinely new comment) does. The worst case of this coarseness is an unnecessary elicitation re-run on a no-op text change, never a missed genuine update — acceptable since this flow has no way to execute a live write and observe its own post landing in a future tick's input anyway (see `<write_artifact_contract>`), so there was never a live "is this my own comment" distinction to preserve here. This replaces the POC's original author-based-detection bug fix (comparing comment IDs, not authors, because the agent and a human could share one Jira identity) — that specific failure mode does not apply to a content-hash comparison, since there is no author concept in free text at all.

**`last_processed_ticket_details_hash` absent on a resumed tick before phase 2 has ever run is an EXPECTED, VALID state — not corruption** — it simply means "run elicitation," the same as tick 1. `last_agent_comment_id` (a separate field, tracking whether phase 4 composed a pending write artifact this tick) holding `"pending — see <artifact path>"` is unrelated to this comparison and never participates in it.

</idempotency>

<state_and_resumption>

`<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md` sections (runtime convention, modeled on `agents/init-workspace-flow-state.md`; `artifacts_dir` comes from the caller-supplied invocation input, default `agents/TEMP` when omitted — see `<intake_contract>`). The same ticket-scoped folder also holds `<TICKET-KEY>-REQUIREMENTS.md` (phase 2's output) — both are this flow's own generated artifacts, never written into the target repo's real requirements tree:

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
- last_processed_ticket_details_hash (SHA-256 hex of the redacted `ticket_details` text as of the last tick phase 2 actually ran on; absent on tick 1 — see `<idempotency>`)
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
- POC-SCOPE-OVERRIDE: writes_require_human_confirmation = false (hardcoded for this build — see `<write_artifact_contract>`, no config file)
## Next Tick Should
- <plain-language note for the next invocation>
```

**The five fields above that name a comment, key, URL, or link — `last_agent_comment_id`, `assessment_comment_id`, `tool_issue_key`, `tool_issue_url`, `link_id` — are recorded as the literal string `"pending — see <artifact path>"` at tick-end, never a real value.** This flow has no live connection to the Issue Tracker (see `<write_artifact_contract>`); it composes a JSON artifact and reports only that artifact's path. This flow has no way to know the real values until a future tick's `ticket_details` input reflects the executed result (e.g. the posted comment appears in that text on a later invocation) — a future, out-of-scope execution step, not built here.

Each invocation re-reads this file if it exists (same `ticket_key`) and resumes at the phase implied by its state, rather than restarting phase 1 unconditionally.

**`## Tool Issue` is the one section here that can be validly half-written.** Every other section is written once, whole, by the phase that owns it. This one is written twice by phase 6 — the pending key/URL/created_at sentinel when the create artifact is composed, the pending `link_id` sentinel when the link artifact is composed — precisely so an uncomposable link between the two is a resumable state instead of a lost issue. `tool_issue_key` present (as the pending sentinel) with `link_id` absent is not corruption and MUST NOT be "repaired" by clearing the section: the next invocation reads it as created-but-unlinked and re-checks only whether the link is now composable. Clearing it — or letting an incomplete phase-6 report through without persisting the pending `tool_issue_key` — causes a second create artifact to be composed on the next tick, which is a second permanently undeletable issue once both are eventually executed.

**Resume routing.** When `## Assessment` already records an `assessment_file` and `## Tool Issue` is missing `tool_issue_key` or `link_id` (including when `tool_issue_key` is still the pending sentinel and `link_id` has never been set), the invocation resumes directly at phase 6; the orchestrator skips phases 2 through 5 rather than relying on their own guards. Phase 2's idempotency check compares this tick's `ticket_details` hash against `last_processed_ticket_details_hash`, which phase 5's assessment comment deliberately does not update — without this routing rule a resume tick's (possibly unchanged) `ticket_details` text would still get re-diffed and could re-open elicitation on an already-finalized ticket if the caller's supplied text drifted even cosmetically between ticks. This is a real interaction that phase 6 makes reachable for the first time: before phase 6 existed there was never a legitimate reason to re-tick a ticket after phase 5 ran, so this rule was never needed until now.

**This file is append/edit-in-place only, never regenerated from scratch.** Every write reads the file's current full content first, then adds this tick's row(s) or updates the specific field named by the writing step — every row from every prior tick in `Poll Tick / Event Log` and `Resource Usage`, and every prior entry elsewhere, carries forward unchanged. A write that reproduces the file with only the current tick's data, even unintentionally, is a data-loss bug in that step.

</state_and_resumption>

<out_of_scope>

Deferred for this build, seams only, do not implement:

- Real OS cron / Jira webhook trigger — `<intake_contract>`'s `{ticket_key, reason?, ticket_details}` shape already makes both pure trigger-layer swaps (a webhook payload would populate `ticket_key`/`ticket_details` the same way a caller does today).
- Sub-hourly polling cadence.
- A risk-assessment gate of any kind: phase 5 (`assess`) reports `blind_spots_risk_level`, `affected_tools_impact_level`, and `issue_size` for the reader's information only — none of them branches this flow's behavior or triggers a Jira write beyond phase 5's assessment comment and phase 6's issue creation and link. Any future gating on these values is downstream of this flow (e.g. in the consuming PR review), never added back into this flow's own phases.
- Local eligibility re-checking of the dispatched ticket against any criteria (e.g. status/assignee/project) — this flow trusts the calling Action's own trigger entirely and has no structured, field-mapped ticket data to check such criteria against even if it wanted to; if that trust ever proves insufficient, re-adding a check belongs upstream of this flow, at the trigger/dispatch layer, not inside it.
- Service-account credential swap — `<write_artifact_contract>`'s no-identity-resolution rule already keeps write identity decoupled from any assumed account; this flow has no live connection and no `jql` string to update at all, so a service-account swap is entirely the calling Action/trigger layer's concern, nothing here changes.
- Any changes to `tools-harness-intake` (workflow wiring, its own config, the PR step) — this flow's contract changes are designed to support that caller, but wiring it up is separate follow-up work.
- Any post-creation management of the target-project issue — transitions, estimates, labels, sprint or epic assignment, or edits after phase 6 creates it. This flow creates it, links it, and never touches it again.
- A comment on the source ticket announcing the created issue. The issue link is the announcement; a second write would add a second idempotency anchor for no reader benefit.
- Executing the composed `jira-writes/*.json` artifacts against real Jira, and feeding their results back into the next tick's `ticket_details` input — a future Action-side step, cross-repo, not built here.

</out_of_scope>

<validation_checklist>

- Every phase updated `<TICKET-KEY>-TRIAGE-FLOW-STATE.md` before the next started.
- Phase 2 never ran on a tick where the idempotency check found nothing new (this tick's `ticket_details` hash equaled `last_processed_ticket_details_hash`).
- Phase 4/5/6 composes each went through the `dangerous-actions` content-level gate per `<write_artifact_contract>` (human-confirmation intentionally skipped per the override) and produced an artifact path — never a comment ID, transition result, created key, or link ID.
- Phase 1's `ticket_details` input always redacted via `sensitive-data` directly before returning — no unredacted ticket content ever reached phase 2, and no live search, fetch, or config/file read occurred anywhere in phase 1.
- Phase 5's assessment ran exactly once per ticket, never on an IN_PROGRESS tick, and composed its comment artifact with `assessment_comment_id` recorded as `"pending — see <artifact path>"` — never overwriting `last_agent_comment_id`, never recorded as a real comment ID, and never setting flow status to COMPLETE on its own.
- No phase ever reassigned the ticket or transitioned its status — the flow's only composed writes on the source ticket are comment artifacts (phase 4's Open Questions comment, phase 5's assessment comment) and phase 6's one action-item link artifact.
- Phase 6 composed at most one create-issue artifact per source ticket across all ticks — a tick that found `tool_issue_key` already recorded (as the pending sentinel) never recomposed create.
- Every phase-6 tick that composed a create artifact left `tool_issue_key` recorded as `"pending — see <artifact path>"` in the state file, including ticks whose link could not yet be composed.
- A resume tick entering case B ran phase 6 only — phases 2-5 were skipped by the resume-routing rule, not re-run.
- The flow reached `COMPLETE` only after both `tool_issue_key` and `link_id` were recorded as pending sentinels pointing at their respective composed artifacts; phase 5's assessment comment artifact alone no longer means complete. Reaching `COMPLETE` in this build means both artifacts are composed and awaiting a future execution step — never that Jira itself was actually updated (see `<out_of_scope>`).
- No validation-checklist item anywhere in `triage-flow.md` or its phase files treats a captured comment ID, transition result, created key, or link ID as a done-check — every such check is against the recorded `"pending — see <artifact path>"` sentinel or the artifact path itself.

</validation_checklist>

</triage_flow>
