---
name: todo-tasks-fallback
description: Fallback execution guardrail when OPERATION_MANAGER (rosettify) is unavailable — use built-in todo task tools instead.
alwaysApply: false
trigger: on_fallback
tags: ["rosetta-bootstrap", "core", "fallback"]
baseSchema: docs/schemas/rule.md
---

<todo-tasks-fallback severity="CRITICAL" use="ON_FALLBACK">

<when>

Use this rule when `rosettify` MCP fails AND `npx -y rosettify@latest` also fails.

</when>

<rules>

1. Each agent creates its own independent todo list for its own scope — orchestrator and subagent lists are isolated and invisible to each other
2. Create ALL tasks for your scope IMMEDIATELY — as the very first action, before any other work
3. Only one task `in_progress` at a time; mark `completed` before starting the next
4. Never skip tasks; add new tasks when scope changes
5. Output to user after creating tasks: `Tasks Created: [task ids]`

</rules>

<orchestrator-tasks>

1. MUST USE SKILL `load-context-instructions`
2. MUST USE SKILL `load-context` 
3. MUST USE SKILL `orchestrator-contract` before dispatching any subagents. MUST USE SKILL `hitl` unless explicitly requested in prompt with exactly `No HITL`.
4. MUST USE SKILL `load-workflow`
5. Add and update todo tasks reflecting the loaded workflow's phases. Output: `Tasks Created: [ids]`.
6. Execute the loaded workflow end-to-end.

</orchestrator-tasks>

<subagent-tasks>

1. MUST USE SKILL `load-context-instructions`
2. MUST USE SKILL `load-context`
3. MUST USE SKILL `subagent-contract`
4. Create todo tasks for this phase's scope. Identify dependencies and order before acting.
5. Execute planned todo tasks and adopt changes. Update task status as work progresses.
6. Proceed with the original assigned request, following all guardrails and HITL rules.

</subagent-tasks>

<execution-loop>

`next pending task` → mark `in_progress` → execute → mark `completed` → repeat until no `pending` or `in_progress` tasks remain

</execution-loop>

</todo-tasks-fallback>
