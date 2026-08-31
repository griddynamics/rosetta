<intake_and_state>

Everything about taking one ticket in and tracking it across invocations: the input contract and its redaction, the state file's semantics and shape, change detection, and resume routing. Every stage needs the state half.

<intake_contract>

Input/output contract for the intake stage, and the only place ticket content enters this work. Stable across trigger mechanisms: a caller-supplied key today, a cron tick or webhook payload later — those swap only how the values get populated, never this shape.

<input_shape>

`{ ticket_key: string, reason?: string, ticket_details: string, artifacts_dir?: string }`

- **`ticket_key`** — required. The caller always supplies the issue key it was dispatched for. There is no discovery mode that picks a ticket on its own. Missing → stop immediately and report; never fall back to open-ended discovery.
- **`reason`** — optional free text describing why this invocation woke up (`"harness-intake dispatch"`, later `"cron tick"` or `"webhook: comment_created"`). Omitted → default to `"manual invocation"`. Never prompt for it, never overwrite a supplied value, and never infer a trigger mechanism from its content.
- **`ticket_details`** — required free text the caller composes with whatever it has about the ticket: summary, description, url, status, custom fields such as `TSSM: Tool` / `TSSM: Project`, assignee, and the comment thread to date. **There is no fixed schema and no file to read** — the caller writes prose or labeled lines, whatever is natural for it to produce, and this work uses that text as given.
- **`artifacts_dir`** — optional, default `agents/TEMP`. Base directory for generated artifacts: the state file, the requirements document, and `jira-writes/*.json`. Caller-controlled per invocation (a caller may point it at an already-checked-out directory such as `knowledge`). **There is no config file to read it from** — it is purely an invocation input.

</input_shape>

<intake_steps>

1. Validate `ticket_key` against `^[A-Z][A-Z0-9]+-\d+$` before using it anywhere. It is externally supplied and MUST NOT be trusted as pre-validated. Mismatch → stop and report the invalid key.
2. Resolve `reason` and `artifacts_dir` per their defaults above.
3. Check for an existing `<artifacts_dir>/<ticket_key>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`. Present → load it; this is a resumed invocation, not a first one.
4. `ticket_details` missing or empty → stop immediately and report `tools-triage-flow/intake: ticket_details missing or empty`. Never fabricate content to fill the gap.
5. USE SKILL `sensitive-data` directly on `ticket_details` BEFORE anything downstream sees it — descriptions and comment bodies are the highest-risk content here. Replace literal secrets and PII with shape-preserving placeholders. `sensitive-data` cannot be loaded or run → STOP and report.
6. Report `ticket_key`, `reason`, `artifacts_dir`, this invocation's timestamp, and intake completion to the caller; return the redacted `ticket_details` plus `reason`.

</intake_steps>

<behavior>

- **Intake takes `ticket_details` exactly as supplied.** No file read, no live search, no fetch, no shared read skill — there is nothing to fetch or resolve.
- **No eligibility check exists in this build.** The calling trigger is trusted to have already gated eligibility before dispatch; do not re-derive or re-check it.
- **Redaction is performed here, directly.** No other stage does it on intake's behalf, and no later stage repeats it.
- **Cite redaction evidence by type, count, and location only** — e.g. "2 PII_EMAIL masked". Never the raw value, not even parenthetically as "originally X". An evidence or traceability request never justifies restating a masked value.
- **Output**: the redacted `ticket_details` plus `reason`, both recorded into the state file by the caller. Every downstream stage that needs a ticket field — `TSSM: Tool`, `TSSM: Project`, Summary, assignee, existing links — locates it inside this redacted text, never by a new read.

Once webhooks land, a webhook payload populates `ticket_key` / `ticket_details` exactly as a caller does today. This contract and behavior do not change; only where the values originate does.

</behavior>

<validation_checklist>

- Exactly one ticket resolved before returning, sourced entirely from the invocation input — no live search or fetch, no file read, no config read anywhere in this stage.
- Missing or empty `ticket_key` or `ticket_details` stopped the invocation immediately with the named failure; nothing proceeded on partial input.
- `sensitive-data` ran here, before anything downstream saw the text, with evidence cited by type/count/location only.
- `artifacts_dir` resolved from the invocation input or its default — never from a config file that does not exist.
- State file created, or correctly resumed and not overwritten from scratch.

</validation_checklist>

<pitfalls>

- Issuing any live search or fetch, or reading any file, for ticket content. The caller-supplied `ticket_details` is the only source.
- Inventing an eligibility check this build does not have, or second-guessing the trigger that dispatched this ticket.
- Restarting from a first invocation on a ticket that already has a state file.
- Skipping this stage's own redaction, or assuming some shared skill performs it.
- Proceeding on missing or empty `ticket_details` instead of stopping and reporting.
- Looking for a config file (`agents/jira-triage.config.json` or similar) — this build has none.

</pitfalls>

</intake_contract>

<state_and_idempotency>

State-file semantics, change detection, and resume routing. Every stage needs this; no stage writes the file itself.

<ownership>

- State lives at `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`. The requirements document sits alongside it in the same ticket-scoped folder at `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-REQUIREMENTS.md`. Both are generated artifacts and never belong in the target repo's real requirements or `docs/` tree.
- Shape: `<flow_state_template>` at the end of this file. It is a runtime-artifact convention, not a shipped template.
- **No stage opens or writes this file directly**, regardless of how any step's wording reads. Every stage reports its values to the caller, and the caller performs the actual write. Report, never write.
- **Append or edit-in-place only, never regenerated.** Every write reads the file's current full content first, then adds this invocation's row(s) or updates the specific named field. Every row from every prior invocation in `Poll Tick / Event Log` and `Resource Usage`, and every prior entry elsewhere, carries forward unchanged. A write that reproduces the file with only the current invocation's data — even unintentionally — is a data-loss bug in that step.
- **Resource Usage is written per subagent call**: one row appended after each call and before the next stage is dispatched, carrying the timestamp, the stage, the subagent name, and the `subagent_tokens` / `duration_ms` the call returned — taken verbatim, never estimated or omitted, even when the stage was skipped or the call errored (record what actually happened, e.g. `n/a — phase skipped`).
- Each invocation re-reads this file when it exists for the same `ticket_key` and resumes at the stage its state implies, rather than restarting intake unconditionally.

</ownership>

<pending_sentinel>

Five fields name a comment, key, URL, or link: `last_agent_comment_id`, `assessment_comment_id`, `tool_issue_key`, `tool_issue_url`, `link_id`. **Each is recorded as the literal string `"pending — see <artifact path>"`, never a real value.**

There is no live connection: a write stage composes a JSON artifact and reports only that artifact's path. The real values cannot be known until a future invocation's `ticket_details` input reflects an executed result — that execution step is not built here. A recorded sentinel is trusted exactly like a real value would be: never re-derived, never re-verified, never "repaired".

</pending_sentinel>

<change_detection>

Checked at the entry of the elicitation stage:

1. Compute a content hash (SHA-256 hex) of this invocation's redacted `ticket_details`.
2. Compare it against `last_processed_ticket_details_hash` in the state file.
3. **Equal, and the stored hash actually present** → nothing about the ticket has changed since it was last processed. Report a no-op and hand control straight to the completion check with the requirements document unchanged. Do NOT run an elicitation iteration.
4. **Different, or the stored hash absent** → something changed (a new comment, an edited field, or this is the ticket's first pass). Run the iteration, then report this invocation's hash so the caller can store it as the new `last_processed_ticket_details_hash`.

**This is deliberately coarser than a comment-ID comparison.** Free text carries no structured comment IDs to diff, so the whole `ticket_details` text is compared rather than isolating "just the new comment". A caller that reformats or re-sends identical text triggers no re-run (same hash); any real change, including a genuinely new comment, does. The worst case of this coarseness is an unnecessary elicitation re-run on a no-op text change — never a missed genuine update. Acceptable, because there is no way to execute a live write and then observe one's own comment landing in a later invocation's input anyway, so there was never a live "is this my own comment" distinction to preserve.

This replaces the original POC's author-based-detection bug fix (comparing comment IDs rather than authors, because the agent and a human could share one identity). That failure mode does not apply to a content hash at all — free text has no author concept.

`last_processed_ticket_details_hash` absent on a resumed invocation, before elicitation has ever run, is an **EXPECTED, VALID state — not corruption**: it means "run elicitation", the same as a first pass. `last_agent_comment_id` is a separate field, tracking whether a questions artifact was composed, and never participates in this comparison.

</change_detection>

<half_written_section>

`## Tool Issue` is the one section that can be validly half-written. Every other section is written once, whole, by the stage that owns it. This one is written twice — the pending key/URL/created_at sentinel when the create artifact is composed, the pending `link_id` sentinel when the link artifact is composed — precisely so an uncomposable link between the two is a resumable state instead of a lost issue.

`tool_issue_key` present as a pending sentinel with `link_id` absent is **not corruption and MUST NOT be "repaired" by clearing the section.** The next invocation reads it as created-but-unlinked and re-checks only whether the link is now composable. Clearing it — or letting an incomplete tool-issue report through without persisting the pending `tool_issue_key` — causes a second create artifact to be composed on the next pass, which becomes a second permanently undeletable issue once both are executed.

An incomplete tool-issue report is therefore **state-bearing**: the pending `tool_issue_key` MUST be appended to `## Tool Issue` before the invocation ends. It is the only incomplete report here that carries state which must be persisted, and dropping it strands a composed create artifact that nothing in this build can recover.

</half_written_section>

<resume_routing>

When `## Assessment` already records an `assessment_file` and `## Tool Issue` is missing `tool_issue_key` or `link_id` — including when `tool_issue_key` is still the pending sentinel and `link_id` has never been set — the invocation resumes directly at the tool-issue stage. Elicitation, completion check, and assessment are skipped by this routing rule, not left to their own guards.

Why the rule is needed: the assessment stage deliberately does not update `last_processed_ticket_details_hash`. Without this routing, a resumed invocation's (possibly unchanged) `ticket_details` would still be re-diffed, and could re-open elicitation on an already-finalized ticket if the caller's supplied text drifted even cosmetically between invocations.

Flow status reaches `COMPLETE` only once both `tool_issue_key` and `link_id` are recorded as pending sentinels pointing at their respective composed artifacts. `COMPLETE` here means both artifacts are composed and awaiting execution — never that the Issue Tracker was actually updated.

</resume_routing>

<pitfalls>

- Regenerating the state file instead of reading-then-appending, silently dropping prior invocations' log and usage rows.
- Writing the state file from inside a stage instead of reporting values to the caller.
- Treating an absent `last_processed_ticket_details_hash` as corruption.
- Reintroducing an author- or comment-ID-based change comparison — free text carries neither concept.
- Clearing or "repairing" a half-written `## Tool Issue`.
- Writing `assessment_comment_id` into `last_agent_comment_id`, or either as a real ID.
- Populating `## Identity` with any value: no identity is resolved here, ever.

</pitfalls>

</state_and_idempotency>

<flow_state_template>

Shape of `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md` — a runtime-artifact convention modeled on `agents/init-workspace-flow-state.md`, not a shipped deliverable. `artifacts_dir` comes from the invocation input, default `agents/TEMP`. Semantics, ownership, and resume rules: `<state_and_idempotency>` in this file.

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
- last_agent_comment_id (recorded as the literal string "pending — see <artifact path>" once a questions comment artifact is composed this tick — never a real comment ID)
- last_processed_ticket_details_hash (SHA-256 hex of the redacted `ticket_details` text as of the last tick elicitation actually ran on; absent on the first tick)
## Assessment
- assessment_file (path to `<TICKET-KEY>-TRIAGE-ASSESSMENT.md`, written by the assessment stage, once per ticket reaching COMPLETE)
- blind_spots_risk_level, affected_tools_impact_level, issue_size
- assessment_comment_id (recorded as "pending — see <artifact path>" once the assessment comment artifact is composed — distinct from last_agent_comment_id, never written into it; never a real comment ID)
## Tool Issue
- tool_issue_key, tool_issue_url, tool_issue_created_at (each recorded as "pending — see <create-artifact-path>" the moment the create-issue artifact is composed, before the link is attempted — never real values)
- link_id (recorded as "pending — see <link-artifact-path>" only once the link artifact is composed; absent is a valid state)
- field_gaps (fields omitted from the create and why, e.g. `TSSM: Project — option not in the target project's field context`)
## Identity
- resolved_acting_identity — not populated by this build; there is no live connection and no identity is resolved at compose time. Never fabricate or assume a value here.
## Approval Rule (this build)
- POC-SCOPE-OVERRIDE: writes_require_human_confirmation = false (hardcoded for this build — no config file)
## Next Tick Should
- <plain-language note for the next invocation>
```

</flow_state_template>

</intake_and_state>
