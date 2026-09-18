---
name: tasks-list
description: "List managed tasks, current stages, blockers, and next commands without changes."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---

<tasks_list>

<description_and_purpose>
Read registered tasks in the current repository; never create, repair, or advance them.
</description_and_purpose>

<workflow_phases>

<prerequisites phase="0" applies="ALL">

1. Complete Rosetta prep steps in read-only mode. USE SKILL `load-project-context`, `hitl` for available context only.
2. This command is a read-only exception to repository persistence: no bootstrap/scaffold, index, state, todo, memory, migration, or repair writes. Keep any execution ledger in memory.
3. Load instructions just in time; no task mutation or automatic import of existing plans.

</prerequisites>

<list phase="1" role="Orchestrator reading the task registry">

1. USE SKILL `task-management` with operation list, strictly read-only.
2. Show ID, title, derived stage, folder, progress/blockers, and exact next command. Translate stage labels for the user; keep IDs exact and render every command per `command-rendering`.
3. Empty registry: say no managed tasks and show the `task-define` command to create one, rendered the same way.
4. Report unreadable, malformed, duplicate, or stale entries explicitly; never omit them or silently repair state. Approval must be verifiable, not inferred from file existence.

</list>

</workflow_phases>

</tasks_list>
