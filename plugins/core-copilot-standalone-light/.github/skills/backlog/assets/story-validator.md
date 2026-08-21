<story_validator>

<contract>

Input: a story, ticket, or epic handle. Output: two verdicts, a grounded readiness report, and an updated backlog.
Never produce the implementation, the design, or the interface choice. Produce the information that makes those decisions safe.

</contract>

<process>

1. **Intake, read only.** USE SKILL `data-collection` with role `Issue Tracker` for the item, its parents, children, sibling tasks, links, and every comment — comments hold requirements more often than descriptions do, and they hold the answers to earlier runs. Referenced wiki pages -> role `Wiki`. Record retrieved / restricted / absent per source. No interpretation here.

2. **Delta against prior runs.** Runs repeat on the same story for weeks before implementation. Find the prior analysis comments, the prior `Q-nn` question comments, and the verdict labels already on the item. Classify every earlier question: **answered** -> the answer is now a fact, cite the comment · **open** -> carry it forward unchanged, same id · **void** -> the story moved under it, say so and retire it. Work the delta only: what changed, what is still open, what got answered. Never re-ask an answered question. First run -> everything is delta.

3. **Business analysis.** APPLY SKILL FILE `assets/story-validator-business-analysis.md` against the intake record, the established facts from step 2, and the repository scope.

4. **Gate 1 — user Q&A.** Present business findings as a short non-technical narrative, TLDR first. Ask only what code cannot answer. Answers become facts; unanswered -> labelled assumption, carried forward, never silently resolved. Anything the user cannot answer alone goes to step 8 as a `Q-nn` comment addressed to its owner.

5. **Technical analysis.** APPLY SKILL FILE `assets/story-validator-technical-analysis.md` against the intake record, the business findings, and every confirmed answer. Separate prompt, separate lens — never merge it with step 3.

6. **Focused concerns, parallel.** Each `needs-analysis` concern that could flip a verdict gets one `engineer`, one concern, scoped to that concern alone. Give it the concern, the single question it must answer, and the evidence bar. Ad-hoc dispatch, no `dispatch` name. Concerns that cannot flip a verdict stay listed, unanalysed, and are named as such.

7. **Gate 2 — user Q&A.** Unknowns surfaced by steps 5 and 6. Same rules as gate 4.

8. **Write-back, in this context.** APPLY SKILL FILE `assets/story-validator-backlog-writeback.md`. Never dispatch it — the approval gate needs the actor the user answers. Established facts land on the story; open questions land as comments. Each run leaves the story closer to buildable than it was.

</process>

<verdicts>

Two labels, decided independently, from the enough-information test:

| Axis | Ready | Not ready |
|---|---|---|
| Business | `ready-for-development` | `not-ready-for-development` |
| Technical | `tech-ready` | `not-tech-ready` |

- Each verdict names the unknowns that drive it, and the single piece of evidence that would flip it.
- Honest, not diplomatic. Effort already spent on analysis is not a reason to grade ready.
- Technical feasibility can be sound while business intent is ambiguous, and the reverse. Do not let one axis colour the other.
- A slice can be ready when the whole is not: name the slice, propose the split, grade the slice.

</verdicts>

<toolbox>

Reach for these to make an unready item actionable. Never stop at "blocked".

Decomposition:

- Story -> independent units of work, each independently valuable and independently deliverable.
- Problem -> roles, actors, contracts, inputs, outputs, prerequisites, consequences, steps.

Reasoning:

- Ask how a BSA or a manager closes this gap, not only how an engineer does. Name the owner and the artifact that closes it.

Moves:

- Split the story along the readiness boundary.
- Comment on the story with the grounded findings.
- Spike task: a scripted proof of the one thing nobody can answer from documents.
- Spec-first task: close named gaps before implementation opens, so implementation starts with zero gaps.
- Best-guess clarification: fill the gap with the safest best-practice reading, label it, and raise a follow-up story to confirm it.
- Simplest-assumption clarification: fill the gap with the simplest acceptable reading, state the exact assumptions, and raise a follow-up story to refactor whatever differs from business expectation.

</toolbox>

<report>

Persist to the FEATURE PLAN folder before step 8, then present. Order:

- **Open questions** — `Q-nn`, each with its owner and one line on what it blocks. The extractable list: an analyst takes it to stakeholders unchanged
- Answered since last run — question id, the answer, the comment it came from
- Verdicts, both, one line each with the flipping evidence
- What this story asks for, in business language
- Consequences if built exactly as written now
- Ambiguities, inconsistencies, gaps, dependencies — each cited
- Technical concerns per split concern, each with its own state
- Unknowns still open, with who owns each
- Assumptions carried, and the follow-up raised for each
- Facts promoted onto the story this run
- Backlog changes proposed or applied

</report>

<validation_checklist>

- Comments and linked items were read, not only the description
- Prior questions were classified answered / open / void before any new question was asked
- No question carries a new id when an open one already covers it
- Every open question names an owner, and exists as a comment on the item
- Business findings were shown to the user before technical analysis started
- Every `needs-analysis` concern that could flip a verdict was actually dispatched, or named as deliberately not analysed
- Each verdict states its flipping evidence
- Every carried assumption has a follow-up item
- The report names a path forward even when both verdicts are negative

</validation_checklist>

<pitfalls>

- Treating the description as the requirement while the answer sits in comment 14
- Re-asking a question a stakeholder already answered in a comment
- Renumbering question ids between runs, so answers can no longer be matched
- Leaving established facts in the report only, where implementation will never read them
- Running technical analysis on a premise the user would have corrected in one sentence
- A single unresolved external dependency collapsing every concern into not-ready
- Proposing a split that leaves one side undeliverable on its own
- Assumptions recorded in the report but never raised as follow-up items
- Grading ready because the story is well written

</pitfalls>

</story_validator>
