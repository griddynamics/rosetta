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
10. **Verification-failure unilateral start** — falsified-skip-claim handling (see `<gate_priority>` for scope):
    10a. **Trigger.** A skip is asserted (by user or upstream context) but the workflow state file does not mark the claimed phases complete, OR the corresponding output artifacts are absent on disk.
    10b. **Required announcement.** One line stating the failing conditions, e.g., `skip refused: state row missing → starting at Phase 0`.
    10c. **Action.** Begin the earliest incomplete phase in the **same turn**, without yielding to user input.
    10d. **Forbidden at this gate.** `AskUserQuestion`, menu/options blocks, confirmation prompts, or pausing for input before starting.
    10e. **Only acceptable user input.** Producing the missing state row or output artifact on disk; bare instruction to bypass is refused with the same announcement, then 10c proceeds.
11. If spawning subagents, follow the active platform dispatch/review contract.

</process>

<gate_priority>

Steps 8, 9, and 10 govern three distinct transition shapes. They never apply to the same transition — but if more than one seems to apply, the precedence below resolves it.

| Step | Shape | Trigger | User input role |
|---|---|---|---|
| 8 — HITL approval gate | Forward path: about to advance from Phase N to Phase N+1, and the parent workflow's phase file says the transition requires approval (e.g., "WAIT FOR USER APPROVAL before Phase 5"). | Parent workflow declares the transition as HITL. | Required — explicit approval per the `hitl` skill; AskUserQuestion is appropriate here. |
| 9 — Legitimate skip request | Forward path: user explicitly asks to skip a phase (the parent workflow does not require it). | User initiates the skip and gives a reason. | Required — restate blast radius, get explicit approval per `hitl`. |
| 10 — Falsified-skip-claim verification | Backward path: user claims phases 0..N are already complete, but the state file / artifacts on disk do not corroborate that claim. | Disk evidence contradicts the asserted skip. | NOT solicited — the disk evidence already decided the outcome. Step 10d forbids AskUserQuestion. The only acceptable user input is supplying the missing artifacts. |

**Precedence rule.** If a transition seems to match both step 8 (HITL approval) and step 10 (falsified-skip-claim), **step 8 wins**: the parent workflow's HITL contract is authoritative, and step 10's no-questions rule does NOT override a genuine approval gate. Step 10 fires only when the workflow is *not* in a parent-declared HITL state and the user is trying to bypass an unverified prior-completion claim.

**Reconciliation with `hitl` skill.** The `hitl` skill governs approval semantics for genuine HITL gates (step 8). Step 10 is not an approval gate — it is a verification gate where the evidence is already complete. The two skills are not in conflict because they apply to different transition shapes; step 10 explicitly defers to step 8 / `hitl` whenever both seem to apply.

</gate_priority>

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
- Confusing step 10 (falsified-skip verification) with step 8 (HITL approval) and applying step 10's no-questions rule where the parent workflow legitimately requires approval — when in doubt, `<gate_priority>` says step 8 wins
- Asking `AskUserQuestion` to "confirm" a falsified-skip refusal — the verification is the decision; the announcement-then-begin sequence in 10b/10c is the only correct action

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
