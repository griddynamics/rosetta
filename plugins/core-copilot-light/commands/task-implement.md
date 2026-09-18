---
name: task-implement
description: "Implement, review, test, and accept a managed task's approved plan."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<task_implement>

<description_and_purpose>
Input: existing task ID or folder. Output: verified delivery and explicit final acceptance.
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. USE SKILL `load-project-context`, `orchestration`, `hitl`; activate decision-bound continuation for this invocation and its delegated work only.
3. Use todo tasks ledger; execute sequentially; load instructions just in time.
4. Nested workflow owns phase delegation. Dispatched subagents MUST USE SKILL `subagent-directives` and assigned skills.

</prerequisites>

<resolve phase="1" role="Orchestrator checking approved delivery inputs">

1. USE SKILL `task-management` to resolve an existing task and inspect current requirements, architecture, and specification/plan approvals.
2. Missing target: request ID/folder. Missing or stale prerequisite: report blockers and the exact `rosetta:task-define <TASK_ID>` or `rosetta:task-spec <TASK_ID>` action; do not implement.
3. Bind FEATURE to task ID, FEATURE PLAN to task folder, REQUIREMENTS to task requirements folder; provide resolved task context to the nested workflow.
4. Already accepted and current: report completion without replaying implementation.

5. USE SKILL `task-management` for consultation context. Through `orchestration`, INVOKE SUBAGENT `architect` as a separate read-only background consultant, all sizes; reuse only the same task/conversation instance. Pass its brief and decision-bound continuation to nested work. Persist material advice through `task-management`; advice never replaces human approval or independent review.

</resolve>

<execute phase="2" role="Orchestrator invoking implementation and verification specialists">

1. USE FLOW `coding-flow.md` with explicit invocation binding `task_stage=implement`, resolved task context, consultant binding, and decision-bound continuation.
2. Resume the earliest incomplete or freshness-unproven delivery phase. After interruption, repeat reviews, validation, and tests unless a current passed verification receipt proves unchanged exact inputs/delivery and upstream approvals; a continuation label or old report is insufficient. Retain every applicable independent review and validation phase.
3. Preserve all applicable approval gates. Never treat plan approval or code completion as final delivery acceptance.
4. USE SKILL `task-management` to record progress and evidence after each phase and before interruption; record failures as incomplete checks; diagnose and recover under decision-bound continuation. Escalate unresolved blockers; do not end the invocation for a recoverable failure alone.

</execute>

<accept phase="3" role="Orchestrator presenting delivery for human acceptance" type="HITL">

1. USE SKILL `task-management` to record a passed verification receipt after every criterion and required check passes, unless that exact current receipt already exists; then inspect it. Failed, stale, or incomplete verification blocks acceptance; return remaining work instead.
2. Present that exact verified delivery snapshot: requirement coverage, verification results, outstanding limitations, and exact user verification steps.
3. Obtain explicit final user acceptance if not already recorded for this snapshot; no duplicate approval request for unchanged accepted evidence.
4. Re-inspect before recording acceptance; changes require renewed verification and presentation. USE SKILL `task-management` to bind acceptance to the current passed verification receipt and inspect derived stage. Report done only when its completion contract holds.
5. USE SKILL `task-management` with operation `handoff`; render every command per `command-rendering`. Accepted and complete: report acceptance and offer the `tasks-list` command; no new chat is required. Unfinished: persist the outcome, hand back the continuation command with the remaining work, and end the invocation at that boundary.

</accept>

</workflow_phases>

</task_implement>
