---
name: task-define
description: "Create or revise a managed task and approve its requirements."
---

<task_define>

<description_and_purpose>
Input: no arguments, initial requirements text, or task ID/folder followed by changes.
Output: registered task, reviewed requirements, durable approval state, next command.
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed.
2. USE SKILL `load-project-context`, `orchestration`, `hitl`; activate decision-bound continuation for this invocation and its delegated work only.
3. Use todo tasks ledger; execute sequentially; load instructions just in time.
4. Nested workflow owns phase delegation. Dispatched subagents MUST USE SKILL `subagent-directives` and assigned skills.

</prerequisites>

<resolve phase="1" role="Orchestrator binding the task">

1. USE SKILL `task-management` to resolve/create from the original arguments; ask on ambiguity before writing.
2. Show identity, folder, current stage. Bind FEATURE to task ID, FEATURE PLAN to task folder, REQUIREMENTS to the task requirements folder; FEATURE TEMP remains task-scoped.
3. Existing task: inspect current sources and approvals; preserve history. Before changing requirements, record the proposed revision and invalidate affected downstream approvals using `task-management`.
4. No arguments: create the task identity, then elicit the initial need; never invent requirements.

5. USE SKILL `task-management` for consultation context. Through `orchestration`, INVOKE SUBAGENT `architect` as a separate read-only background consultant, all sizes; reuse only the same task/conversation instance. Pass its brief and decision-bound continuation to nested work. Persist material advice through `task-management`; advice never replaces human approval or independent review.

</resolve>

<requirements phase="2" role="Orchestrator invoking requirements specialists">

1. USE FLOW `requirements-authoring-flow.md` with original input, resolved task, current requirements, scoped output root, consultant binding, and decision-bound continuation. Consult before its intent/outline/requirement approval gates on gaps, feasibility, constraints, dependencies, and conflicts; await advice before presenting affected decisions. Do not require solution design to approve requirements unless observable behavior or a mandatory constraint depends on it.
2. Preserve its discovery, questioning, independent review, and requirement approval gates. Persist task progress via USE SKILL `task-management` after each phase or interruption.
3. Record the reviewed requirements and actual user approvals using `task-management`; unapproved work stays pending.
4. Stop at requirements finalization. Its coding handoff is a recommendation only for this invocation; neither `/goal` nor nested instructions may start specification or implementation here.

</requirements>

<handoff phase="3" role="Orchestrator reporting the next action">

1. USE SKILL `task-management` to inspect and report stage, blockers, artifacts, and next action.
2. If current requirements are approved, return `rosetta:task-spec <TASK_ID>`; otherwise give the exact `rosetta:task-define <TASK_ID>` continuation and unresolved decisions.

</handoff>

</workflow_phases>

</task_define>
