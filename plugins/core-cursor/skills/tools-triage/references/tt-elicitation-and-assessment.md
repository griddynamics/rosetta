<elicitation_and_assessment>

The two judgment stages and the routing decision between them: one requirements-elicitation iteration, the completion check that branches on open questions, and — on the empty branch — the triage assessment with its rubrics and output shape.

<elicitation_and_completion>

One requirements-elicitation iteration per invocation, and the routing decision that follows it.

<elicitation>

1. **Run the change detection first** — before any elicitation work. Mechanism and outcomes: READ SKILL FILE `references/tt-intake-and-state.md`. Nothing changed → report a no-op and hand control straight to the completion check with the requirements document unchanged; do NOT run an iteration this invocation.
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

<assessment_rubrics>

Produce the triage assessment for a ticket whose requirements are finished, write it to a file, and compose it as one comment on the source ticket. Reached only immediately after the completion check's empty-open-questions branch — never on an IN_PROGRESS invocation, and never re-run for a ticket whose state already records an `assessment_file`.

**There is no risk-based branching.** Every ticket reaching this stage gets the same treatment regardless of the levels found. This stage never reassigns the ticket and never transitions its status; its only write on the source ticket is the one composed assessment comment.

<inputs>

1. The finalized `<artifacts_dir>/<ticket_key>/<ticket_key>-REQUIREMENTS.md` — all `<req>` units now `Approved`.
2. The ticket's `TSSM: Tool` / `TSSM: Project` values, located directly within the redacted `ticket_details` text carried in state since intake. **These two fields name the tool and the project this feature is being built for and in** — the starting point for the affected-tools reasoning, not an incidental attribute. Not stated clearly in that text → a gap; do not guess.

</inputs>

<three_blocks>

Produce three blocks, each independently scannable, in this order.

**Blind spots.** Bullet the specific gaps a planning or coding agent could hit later. The requirements are complete and business-confirmed, but not yet planning-ready — do not over-dramatize; most tickets carry ordinary, easily-absorbed gaps. Roll up to one **Overall Risk Level**, stated with a one-line justification:

- `Critical` — huge gaps or contradictions in the elicited requirements.
- `High` — major gaps or contradictions that could trouble planning or coding agents.
- `Medium` — one or two non-minor gaps a planning or coding agent with project and codebase access can still handle.
- `Low` — only minor gaps, or none.

**Potentially affected tools.** Starting from the `TSSM: Tool` / `TSSM: Project` target, reason from the completed requirements to name other Grid Dynamics tools with plausible integration exposure, one line of reason each. Roll up to one **Overall Impact Level**:

- `Critical` — huge impact on an existing integration point, or an unpredictable new one.
- `High` — high impact on an existing point, or a new point whose effect is predictable but has major uncertainties.
- `Medium` — some medium effect on an existing point, or a minor new point. **Any nonzero risk lands here at minimum.**
- `Low` — no integration effect detected. **Reserved strictly for that case, never a catch-all for "didn't look".**

**Issue size.** One t-shirt size — `XL`, `L`, `M`, or `S` — with a 1-2 sentence justification grounded in the requirements' scope: unit count, dependency depth, new integration points.

</three_blocks>

<output>

1. Write the three blocks to a new `<artifacts_dir>/<ticket_key>/<ticket_key>-TRIAGE-ASSESSMENT.md`, alongside the requirements document, as three clearly headed sections in the order above, each restating its rubric once at the top rather than re-deriving it per read. Shape: `<assessment_template>` at the end of this file.
2. **A thin result is still a written result.** "No gaps found", "no integration effect", a small size — each is written out in its own section, never omitted.
3. Compose the comment body: the three overall levels and the size from the file, **stated plainly**. No framing that implies escalation, urgency, or a required next action tied to the levels found — just the results.
4. This comment is the last thing written on the source ticket, so state that plainly, noting that the requirements and assessment artifacts are available at the ticket's `artifacts_dir` path for downstream review.
5. **Do not name or promise the target-project issue** the next stage creates. It does not exist when this comment is composed, and citing a key that may never be created is worse than saying nothing.
6. Gate, sequence, compose, and report per APPLY SKILL FILE `references/tt-writes-and-tool-issue.md`. Report the `assessment_file` path, the three levels and size, and the composed comment artifact's path for `assessment_comment_id` — recorded as `"pending — see <artifact path>"`, distinct from `last_agent_comment_id` and never written into it. Flow status stays `IN_PROGRESS` until the tool-issue stage records both its fields.

</output>

<validation_checklist>

- Ran exactly once per ticket reaching the empty-open-questions branch — never on an IN_PROGRESS invocation, never duplicated for an already-assessed ticket.
- All three sections present and independently readable, including thin ones.
- No reassignment and no transition; the only write on the source ticket is the one composed assessment comment.
- The comment states results plainly without escalation or urgency framing, and names no target-project issue.
- `assessment_comment_id` reported as the pending sentinel, never a fabricated or assumed comment ID, and never setting flow status to COMPLETE on its own.

</validation_checklist>

<pitfalls>

- Reintroducing a risk-based branch — a reassignment, a transition, or differently-worded comments per level. Every ticket is treated the same regardless of the levels found.
- Defaulting to `Low` on the affected-tools block out of uncertainty rather than genuinely finding no integration exposure. **Uncertainty belongs in `Medium` or above.**
- Reading `TSSM: Tool` / `TSSM: Project` as arbitrary metadata instead of as the target tool and project the feature is being delivered into.
- Composing the comment before the assessment file is fully written, or omitting a section instead of writing a thin one.
- Reporting a real comment ID instead of the pending sentinel.

</pitfalls>

</assessment_rubrics>

<assessment_template>

Shape of `<artifacts_dir>/<TICKET-KEY>/<TICKET-KEY>-TRIAGE-ASSESSMENT.md`. Three clearly headed sections, in this order, each restating its rubric once at the top rather than re-deriving it per read. Rubric definitions and level semantics: `<assessment_rubrics>` in this file. Every section is written even when its answer is thin.

```
# <TICKET-KEY> — Triage Assessment

## Blind Spots
Rubric: Critical = huge gaps/contradictions · High = major gaps that could trouble planning or coding agents · Medium = one or two non-minor gaps an agent with project + codebase access can handle · Low = only minor gaps, or none.

- <specific gap a planning/coding agent could hit>
- ...

**Overall Risk Level: <Critical|High|Medium|Low>** — <one-line justification>

## Potentially Affected Tools
Rubric: Critical = huge impact on an existing integration point, or an unpredictable new one · High = high impact on an existing point, or a new point predictable but with major uncertainties · Medium = some medium effect, or a minor new point; any nonzero risk lands here at minimum · Low = no integration effect detected, reserved strictly for that case.

- <tool> — <one line of reason>
- ...

**Overall Impact Level: <Critical|High|Medium|Low>** — <one-line justification>

## Issue Size
Rubric: one t-shirt size grounded in the requirements' scope — unit count, dependency depth, new integration points.

**Size: <XL|L|M|S>** — <1-2 sentence justification>
```

</assessment_template>

</elicitation_and_assessment>
