---
name: story-validator
description: Mode method for validating whether an existing story is honestly ready for development.
---

<story_validator>

<contract>

Input: a story, ticket, or epic handle. Output: two verdicts, a grounded readiness report, and an updated backlog.
Never produce the implementation, the design, or the interface choice. Produce the information that makes those decisions safe.

</contract>

<process>

1. **Intake, read only.** USE SKILL `data-collection` with role `Issue Tracker` for the item, its parents, children, sibling tasks, links, and every comment. Comments hold requirements more often than descriptions do. Referenced wiki pages -> role `Wiki`. Record retrieved / restricted / absent per source. No interpretation here.

2. **Business analysis.** INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `assets/story-validator-business-analysis.md`, passing the intake record and the repository scope.

3. **Gate 1 — user Q&A.** Present the business findings as a short narrative, TLDR first, non-technical. Ask only what code cannot answer: 5-10 MECE questions, one decision each, batched. Record answers as facts. Unanswered -> labelled assumption, carried forward, never silently resolved.

4. **Technical analysis.** INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `assets/story-validator-technical-analysis.md`, passing the intake record, the business findings, and the confirmed answers.

5. **Focused concerns, parallel.** Each concern marked `needs-analysis` by step 2 or 4 that could flip a verdict gets one dispatch: `engineer`, one concern, scoped to that concern alone. Give it the concern, the single question it must answer, and the evidence bar. Concerns that cannot flip a verdict stay listed, unanalysed, and are named as such.

6. **Gate 2 — user Q&A.** Unknowns surfaced by steps 4 and 5. Same rules as gate 1.

7. **Write-back.** INVOKE SUBAGENT `engineer` to APPLY SKILL FILE `assets/story-validator-backlog-writeback.md`, passing every confirmed finding, answer, assumption, and verdict.

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

Assemble and present, in order:

- Verdicts, both, one line each with the flipping evidence
- What this story asks for, in business language
- Consequences if built exactly as written now
- Ambiguities, inconsistencies, gaps, dependencies — each cited
- Technical concerns per split concern, each with its own state
- Unknowns still open, with who owns each
- Assumptions carried, and the follow-up raised for each
- Backlog changes proposed or applied

</report>

<validation_checklist>

- Comments and linked items were read, not only the description
- Business findings were shown to the user before technical analysis started
- Every `needs-analysis` concern that could flip a verdict was actually dispatched, or named as deliberately not analysed
- Each verdict states its flipping evidence
- Every carried assumption has a follow-up item
- The report names a path forward even when both verdicts are negative

</validation_checklist>

<pitfalls>

- Treating the description as the requirement while the answer sits in comment 14
- Running technical analysis on a premise the user would have corrected in one sentence
- A single unresolved external dependency collapsing every concern into not-ready
- Proposing a split that leaves one side undeliverable on its own
- Assumptions recorded in the report but never raised as follow-up items
- Grading ready because the story is well written

</pitfalls>

</story_validator>
