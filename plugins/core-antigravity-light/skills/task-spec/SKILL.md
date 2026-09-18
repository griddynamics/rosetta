---
name: task-spec
description: "Approve a managed task's architecture, specification, and implementation plan."
---

<task_spec>

<description_and_purpose>
Input: existing task ID or folder. Output: approved solution and plan; no implementation.
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. USE SKILL `load-project-context`, `orchestration`, `hitl`; activate decision-bound continuation for this invocation and its delegated work only.
3. Use todo tasks ledger; execute sequentially; load instructions just in time.
4. Nested workflow owns phase delegation. Dispatched subagents MUST USE SKILL `subagent-directives` and assigned skills.

</prerequisites>

<resolve phase="1" role="Orchestrator validating specification prerequisites">

1. USE SKILL `task-management` to resolve an existing task and inspect current requirements approval; no implicit creation.
2. Missing target: request ID/folder. Missing or stale requirements approval: report blockers and return `rosetta:task-define <TASK_ID>`.
3. Bind FEATURE to task ID, FEATURE PLAN to task folder, REQUIREMENTS to task requirements folder; provide resolved task context to the nested workflow.

4. USE SKILL `task-management` for consultation context. Through `orchestration`, INVOKE SUBAGENT `architect` as a separate read-only background consultant, all sizes; reuse only the same task/conversation instance. Pass its brief and decision-bound continuation to nested work. Persist material advice through `task-management`; advice never replaces human approval or independent review.

</resolve>

<specify phase="2" role="Orchestrator invoking design and planning specialists">

1. USE FLOW `coding-flow.md` with explicit invocation binding `task_stage=spec`, resolved task context, consultant binding, and decision-bound continuation.
2. Use its supported stage boundary: architecture and user approval, specifications/plan, independent review where applicable, final plan approval. Reuse valid approved work; drift requires review of affected decisions.
3. Persist resumable outcomes and approvals through USE SKILL `task-management`; SMALL may store concise architecture, specification, and plan in the passport without separate documents.
4. Stop after the applicable plan approval gate. No implementation, test authoring/execution, or goal iteration past this boundary.

</specify>

<handoff phase="3" role="Orchestrator closing the stage">

1. USE SKILL `task-management` with operation `handoff`: persist the stage outcome, then inspect stage, blockers, approval evidence, and next action.
2. Ready: hand off the `task-implement` command for this task, rendered per `command-rendering`. Pending: hand back `task-spec` the same way, with the decisions still required.
3. End the invocation at this boundary. Never offer, ask about, or start implementation here; direct the user to a new chat with the rendered command line.

</handoff>

</workflow_phases>

</task_spec>
