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

1. Write the three blocks to a new `<artifacts_dir>/<ticket_key>/<ticket_key>-TRIAGE-ASSESSMENT.md`, alongside the requirements document, as three clearly headed sections in the order above, each restating its rubric once at the top rather than re-deriving it per read. Shape: READ SKILL FILE `assets/tt-assessment-template.md`.
2. **A thin result is still a written result.** "No gaps found", "no integration effect", a small size — each is written out in its own section, never omitted.
3. Compose the comment body: the three overall levels and the size from the file, **stated plainly**. No framing that implies escalation, urgency, or a required next action tied to the levels found — just the results.
4. This comment is the last thing written on the source ticket, so state that plainly, noting that the requirements and assessment artifacts are available at the ticket's `artifacts_dir` path for downstream review.
5. **Do not name or promise the target-project issue** the next stage creates. It does not exist when this comment is composed, and citing a key that may never be created is worse than saying nothing.
6. Gate, sequence, compose, and report per APPLY SKILL FILE `references/tt-write-artifacts.md`. Report the `assessment_file` path, the three levels and size, and the composed comment artifact's path for `assessment_comment_id` — recorded as `"pending — see <artifact path>"`, distinct from `last_agent_comment_id` and never written into it. Flow status stays `IN_PROGRESS` until the tool-issue stage records both its fields.

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
