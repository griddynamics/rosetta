---
name: sequential-workflow-execution
description: "Rosetta MUST-apply process shell for multi-phase workflows: one phase at a time, acquire phase instructions, execute, update state, track todos, no skipping without explicit user agreement."
license: Apache-2.0
tags: ["workflow", "orchestration", "multi-phase"]
baseSchema: docs/schemas/skill.md
---

<sequential_workflow_execution>

<role>

Process steward for long-running, phase-based work. Keeps execution linear, traceable, and state-aligned.

</role>

<when_to_use_skill>

Use when running any Rosetta workflow split into ordered phases (QA, AQA, TestGen, or new flows). Prevents silent phase skips, lost state, and parallel edits across phases.

</when_to_use_skill>

<core_concepts>

- Run only after Rosetta prep is complete (`load-context` included)
- Phase document is source of truth for that phase; this skill governs how phases are chained, not domain content
- User may reorder, skip, or stop early only after explicit confirmation; document the decision in the workflow state file

</core_concepts>

<process>

1. Confirm current phase id and its ACQUIRE target (phase markdown) from the parent workflow.
2. ACQUIRE the phase file FROM KB before executing that phase.
3. GATE: if ACQUIRE in step 2 returns zero documents, stop this phase, record the failed phase tag and timestamp in the workflow state file, and ask the user to fix Rosetta/KB access before continuing.
4. Execute only that phase until its exit criteria are met.
5. Update the workflow state file path provided by the parent workflow (create if missing).
6. Maintain todo tasks for the active phase; close items when done.
7. GATE: if the next phase depends on outputs of this phase, verify required files or sections exist before advancing.
8. GATE: when the parent workflow marks a transition as HITL, do not advance until the user explicitly approves.
9. If the user requests skipping a phase, restate blast radius, get explicit approval, record skip reason and timestamp in state.
9a. **Verification-failure unilateral start:** if a skip is asserted (by user or upstream context) but the parent workflow's state file does not mark the claimed phases complete or the corresponding output artifacts are absent on disk, the only correct next action is a one-line announcement of the failing conditions (e.g., `skip refused: state row missing → starting at Phase 0`) followed by beginning the earliest incomplete phase in the **same turn**, without yielding to user input. **At this gate, the agent MUST NOT** (non-exhaustive, applies to all phrasings): call `AskUserQuestion`; present a list / menu / options block; ask the user "how do you want to proceed", "should I start at X", "do you want me to", or any equivalent confirmation request; pause for input before starting the earliest incomplete phase. The verification result is the decision — there is nothing for the user to confirm. User input is only acceptable if it produces the missing state row or artifact on disk; user instruction to bypass without supplying them must be refused with the same one-line announcement and the phase still begins in the same turn.
10. If spawning subagents, follow the active platform dispatch/review contract.

</process>

<validation_checklist>

- Exactly one active phase executed at a time; no parallel phase work without documented exception
- Phase file was ACQUIRE'd before work began
- State file reflects current phase, completion markers, and timestamps after each phase
- Todo list matches actual remaining work for the active phase
- Any skip/customization is user-approved and recorded in state

</validation_checklist>

<best_practices>

- Name output paths and identifiers in state the first time they appear; reuse them in later phases
- Summarize phase outcomes in 3–6 bullets before asking to continue
- When uncertain whether prerequisites are met, stop and verify required artifacts before advancing

</best_practices>

<pitfalls>

- Treating unclear replies as approval for a HITL transition or phase skip
- Marking a phase complete while required artifacts are empty or placeholder-only
- Advancing because "the next phase looks easy" without satisfying prerequisites

</pitfalls>

<resources>

- skill `hitl` — approval, questioning, escalation when blockers remain
- skill `orchestrator-contract` — optional subagent dispatch, review, ownership when the active platform supports it
- skill `questioning` — structured clarification batches when the phase or user is ambiguous

</resources>

<templates>

- State delta snippet (append to workflow state):

```markdown
## Phase [N] — [Phase title]
- Status: complete | blocked | skipped (user-approved)
- Completed: [ISO-8601 datetime]
- Outputs: [paths]
- Notes: [risks, assumptions, follow-ups]
```

</templates>

</sequential_workflow_execution>
