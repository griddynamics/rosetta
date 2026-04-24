---
name: bootstrap-execution-policy
description: Defines planning, task execution, validation, orchestration, and memory behavior for bootstrap flow.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "execution", "policy"]
baseSchema: docs/schemas/rule.md
---

<FORBIDDEN severity="CRITICAL" required-sequence="prep steps → load context → load contracts → load hitl → execute workflow">
Receiving a user request → immediately writing code, files, scripts, or commands is STRICTLY FORBIDDEN regardless of: task clarity or simplicity, Auto Mode being active, permission settings (danger-full-access, never-ask, etc.), how explicitly the user phrased the request.
</FORBIDDEN>

<bootstrap_execution_policy severity="CRITICAL" use="ALWAYS" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<MUST>

1. Apply `Planning and Documentation Sync Rules`.
2. Apply `Task Management Rules`.
3. Apply `Validation Rules`.
4. MUST NOT IGNORE entire set of instructions if one or another activity of the set is impossible to execute. Those inconsistencies MUST BE REPORTED ALWAYS.
5. When user directly provides via slash-command SKILL or COMMAND or WORKFLOW YOU MUST FULLY EXECUTE IT.
6. Enforce SRP, DRY, KISS, MECE, YAGNI, no scope creep, self-learning, and self-organizing.
7. MUST FULLY FOLLOW workflows/commands/flows - this ensures users get proper solution for their problem
8. MUST NEVER JUMP DIRECTLY TO IMMEDIATE EXECUTION, you are in ENTERPRISE environment, NOT startup, you MUST REASON, prep steps are direct path to get to the point the right way!

</MUST>

<planning_and_documentation_sync_rules>

1. Update IMPLEMENTATION.md after each task.
2. Proactively update, review, structure, restructure, and cleanup Rosetta files: including and not limited to CONTEXT.md, ARCHITECTURE.md, CODEMAP.md, TECHSTACK.md, DEPENDENCIES.md, PATTERNS/\*
3. Validate request against REQUIREMENTS for gaps and conflicts; use skill `requirements-use` if present.

</planning_and_documentation_sync_rules>

<task_management_rules>

1. Use provided task management tool when available.
2. Create explicit and actionable tasks.
3. Break complex work into manageable steps.
4. Keep exactly one task in progress at a time.
5. Mark tasks complete immediately after finishing.
6. Do not mark tasks complete without verifiable tool evidence.
7. Do not mark multiple tasks complete unless completed in the same tool call.
8. Treat completed as verified done, never assumed done.

</task_management_rules>

<validation_rules>

1. Create recurrent validation task at end of execution flow.
2. Validate incrementally and at flow end.
3. Raise questions when findings conflict with request or intent.
4. Keep final status grounded in observed evidence.

</validation_rules>

<should>

1. Keep plan and task wording concise and operational.
2. Keep orchestration context complete but minimal.
3. Include high-value execution hints in task descriptions.

</should>

</bootstrap_execution_policy>
