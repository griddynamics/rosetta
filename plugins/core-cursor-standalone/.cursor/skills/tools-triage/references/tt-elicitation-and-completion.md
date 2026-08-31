<elicitation_and_completion>

One requirements-elicitation iteration per invocation, and the routing decision that follows it.

<elicitation>

1. **Run the change detection first** — before any elicitation work. Mechanism and outcomes: READ SKILL FILE `references/tt-state-and-idempotency.md`. Nothing changed → report a no-op and hand control straight to the completion check with the requirements document unchanged; do NOT run an iteration this invocation.
2. Check whether `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` already exists.
3. USE SKILL `requirements-authoring` directly, for **intent capture → draft → validate only**: on a first pass, from scratch against the redacted ticket description; on a later pass, in update mode against the existing requirements document plus the redacted new comment text the change detection surfaced.
4. **Never run the full requirements-authoring workflow.** Its outline, user-review, and finalization gates do not map onto an asynchronous, comment-driven Q&A loop.
5. The requirements document **updates in place** — same `<req>` IDs, `changed` dates bumped, no new file version.
6. Output: the updated requirements document with current per-`<req>` statuses and an Open Questions list. Report the iteration number, the open-questions count, and the per-`<req>` Draft/Approved tally.
7. Report this invocation's `ticket_details` hash so the caller can store it as the new `last_processed_ticket_details_hash`. Never report a `last_agent_comment_id` value here — that field is only ever set after a questions comment artifact is composed.
8. **Do not re-run `sensitive-data` here.** Intake already redacted this content; duplicate screening is not a safety improvement.

</elicitation>

<completion_check>

Decides, once per invocation, whether open questions remain — the routing decision that determines whether this invocation's composed write is the questions comment or the assessment comment. It runs BEFORE any write is composed, so that whichever compose eventually happens is always the invocation's last action.

1. Read the requirements document's Open Questions section and each `<req>` unit's `status`.
2. **Open questions remain** → this invocation is IN_PROGRESS. Report the "Next Tick Should" note and route to the questions-comment compose. Stop here.
3. **Open questions empty** → `POC-SCOPE-OVERRIDE:` flip both `<req>` units from `Draft` to `Approved`. This build treats "Open Questions empty" alone as sufficient, in place of `hitl`'s normal explicit affirmative-sentence approval. **A deliberate, flagged POC-scope simplification, not a rediscovered Rosetta rule** — the marker stays legible for future removal, and is never silently treated as permanent production behavior.
4. Then route to the assessment stage, and nowhere else; the tool-issue stage follows it on the same invocation.
5. **No rubric-pass check gates this decision in this build.** The validation rubric still runs inside `requirements-authoring` and stays recorded in the requirements document as reporting — it no longer gates progression. Do not re-introduce it as a gate.

</completion_check>

<validation_checklist>

- Change detection ran before any elicitation invocation, comparing content hashes — never an author, never a comment ID.
- A no-op invocation left the requirements document unchanged and reported no new hash.
- A genuine-change invocation fed the redacted (not raw) text into elicitation, then reported the new hash.
- The requirements document kept its existing `<req>` IDs across iterations.
- The questions compose never ran while open questions were empty; the assessment never ran while they remained.
- Both `<req>` units carry the same status — never a mixed state — and the flip happened only after confirming emptiness against the current invocation's data, not a stale cached count.
- The `POC-SCOPE-OVERRIDE:` marker remains intact and legible.

</validation_checklist>

<pitfalls>

- Reintroducing an author- or comment-ID-based comparison; free text carries neither concept.
- Running the full requirements-authoring workflow instead of using the skill directly.
- Re-running `sensitive-data` on already-redacted content.
- Flipping `<req>` status before confirming open questions are actually empty on the current invocation's data.
- Re-introducing a rubric-pass requirement as a gate.
- Routing anywhere other than the assessment stage on the empty branch.

</pitfalls>

</elicitation_and_completion>
