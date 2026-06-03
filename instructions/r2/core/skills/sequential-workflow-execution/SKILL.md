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

<input_contract>

All inputs are supplied by the parent workflow phase file. This skill does not infer them — missing required values trigger the inline GATEs in `<process>` (step 3 ACQUIRE GATE, step 7 prereq verification, step 10 falsified-skip verification).

| Input | Required? | Source | Used by |
|---|---|---|---|
| **Current phase id** | **required** | Parent workflow phase file (the active phase tag/identifier — e.g. `aqa-flow-test-implementation`, `qa-flow-execution-and-report-analysis`) | Step 1 (confirm) + step 4 (execute scope) + step 10b (announcement string includes the phase id) |
| **Phase ACQUIRE target** | **required** | Parent workflow phase file (the KB document tag this skill ACQUIREs at step 2 — typically the same as the phase id or a `<phase-id>.md` mapping) | Step 2 (ACQUIRE) + step 3 GATE (zero-doc handling) |
| **Workflow state file path** | **required** | Parent workflow phase file (e.g. `agents/aqa-state.md`, `agents/qa-state.md`, `agents/testgen/{TICKET-KEY}/testgen-state.md`) | Step 5 (state update) + step 9 (skip-reason recording) + step 10a (verification source for "state row missing") + step 10e (acceptable user input lands here) |
| **Parent HITL-transition declaration** | optional (omitted when the transition is not HITL-gated) | Parent workflow phase file's explicit declaration that an upcoming transition requires user approval (e.g. *"WAIT FOR USER APPROVAL before Phase 5"*, *"HITL transition between Phase 7 and Phase 8"*) | Step 8 GATE — if declared, this skill MUST NOT advance until explicit approval; if absent, normal advance applies |
| **Dispatch / orchestrator contract** | optional (active only when the parent workflow spawns subagents) | Parent workflow phase file OR the active platform's `orchestrator-contract` skill (referenced in `<resources>`) | Step 11 — sub-agent dispatch follows the named contract; absent → step 11 is a no-op |
| **Phase exit criteria** | **required** | Parent workflow phase file (each phase file declares its own completion criteria — this skill consumes them as opaque values) | Step 4 (execute until criteria met) + step 7 (downstream-prereq verification) |

**Required-input failure rule.** If the current phase id, the phase ACQUIRE target, or the workflow state file path is missing, this skill cannot run — stop, report `sequential-workflow-execution: required input missing — <name>` to the parent workflow, ask the user / parent to supply. Do NOT pick a default for any of these; the linear-execution guarantee depends on them being explicit.

</input_contract>

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

<output_format>

This skill emits **three user-facing or workflow-state artifacts** — all are governed by the templates below. The `<templates>` block at the end of the skill holds the canonical state-delta snippet; the other two are defined here.

### 1. State delta snippet (step 5, step 9)

Appended to the workflow state file path supplied by the parent (per `<input_contract>`). Canonical template lives in `<templates>` — the structure is `## Phase [N] — [title]` heading + Status + Completed + Outputs + Notes. Both step 5 (normal completion) and step 9 (user-approved skip) use the same template; step 9's `Status` field is `skipped (user-approved)` with the skip reason recorded under `Notes`.

### 2. Required announcement (step 10b — falsified-skip-claim refusal)

One line announcing the failing verification conditions, emitted immediately before the same-turn unilateral start. Format:

```
skip refused: <one-clause failing condition> → starting at <earliest incomplete phase id>
```

**Canonical examples:**

- `skip refused: state row missing → starting at Phase 0`
- `skip refused: Phase 3 output artifact agents/aqa/{TICKET}/code-analysis.md absent on disk → starting at Phase 3`
- `skip refused: state file marks Phase 5 in-progress but no completion timestamp recorded → starting at Phase 5`

The announcement MUST cite the specific evidence the falsified-skip-claim verification found (which state row was missing, which artifact path was absent, etc.) — vague *"skip refused"* without a reason is incomplete. Per step 10d, this announcement is followed immediately by the same-turn start of the earliest incomplete phase; no AskUserQuestion, no menu, no pause.

### 3. Phase summary (best_practices — 3–6 bullets before asking to continue)

Emitted at phase completion before any HITL transition prompt or before announcing the next phase. Format:

```markdown
**Phase [N] — [title] — summary**
- [Outcome bullet 1: what was produced / decided / verified]
- [Outcome bullet 2: ...]
- [Outcome bullet 3: ...]
- [Risks / assumptions / follow-ups carried into the next phase, if any]
- [Next phase: <phase-id> — <one-line scope>]
```

**Canonical example:**

```markdown
**Phase 3 — Code Analysis — summary**
- Code-analysis report written at `agents/plans/aqa-checkout-flow-code-analysis.md` (12 page-object references mapped, 4 existing helpers found).
- Test-location decision recorded: add-to-existing-file `tests/e2e/checkout.spec.ts` (current file 280 lines, well under 400-line anchor).
- 1 conflict between repo docs and user instructions surfaced: user instructions favor named exports, but `IMPLEMENTATION.md` mandates default exports → resolved per "repo docs win"; recorded in report's Conflicts section.
- Carrying assumption forward to Phase 4: page-source capture will reuse the existing `RefSrc/checkout-ui/` snapshot rather than re-rendering.
- Next phase: `aqa-flow-selector-identification` — map the planned test interactions to selectors using the code-analysis page-object inventory.
```

Required: ≥3 bullets, ≤6 bullets, including at least one "Next phase" line so the user can confirm the planned transition or override it.

</output_format>

<gate_priority>

Steps 8, 9, and 10 govern three distinct transition shapes. They never apply to the same transition — but if more than one seems to apply, the precedence below resolves it.

| Step | Shape | Trigger | User input role |
|---|---|---|---|
| 8 — HITL approval gate | Forward path: about to advance from Phase N to Phase N+1, and the parent workflow's phase file says the transition requires approval (e.g., "WAIT FOR USER APPROVAL before Phase 5"). | Parent workflow declares the transition as HITL. | Required — explicit approval per the `hitl` skill; AskUserQuestion is appropriate here. |
| 9 — Legitimate skip request | Forward path: user explicitly asks to skip a phase (the parent workflow does not require it). | User initiates the skip and gives a reason. | Required — restate blast radius, get explicit approval per `hitl`. |
| 10 — Falsified-skip-claim verification | Backward path: user claims phases 0..N are already complete, but the state file / artifacts on disk do not corroborate that claim. | Disk evidence contradicts the asserted skip. | NOT solicited — the disk evidence already decided the outcome. Step 10d forbids AskUserQuestion. The only acceptable user input is supplying the missing artifacts. |

**Precedence rule.** If a transition seems to match both step 8 (HITL approval) and step 10 (falsified-skip-claim), **step 8 wins** — the parent workflow's HITL contract is authoritative.

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
- Confusing step 10 (falsified-skip verification) with step 8 (HITL approval) — see `<gate_priority>` precedence rule
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
