<state_and_idempotency>

State-file semantics, change detection, and resume routing. Every stage needs this; no stage writes the file itself.

<ownership>

- State lives at `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-FLOW-STATE.md`. The requirements document sits alongside it in the same ticket-scoped folder at `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-REQUIREMENTS.md`. Both are generated artifacts and never belong in the target repo's real requirements or `docs/` tree.
- Shape: READ SKILL FILE `assets/tt-flow-state-template.md`. It is a runtime-artifact convention, not a shipped template.
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
