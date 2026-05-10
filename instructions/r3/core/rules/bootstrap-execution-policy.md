---
name: bootstrap-execution-policy
description: Defines planning, task execution, validation, orchestration, and memory behavior for bootstrap flow.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "execution", "policy"]
baseSchema: docs/schemas/rule.md
---

<rosetta:FORBIDDEN severity="CRITICAL" required-sequence-instead="create phases/steps/tasks → prep steps → load context → load contracts → load hitl → load workflow → Merge p/s/t → execute workflow">
Receiving a user request → immediately writing code, files, scripts, or commands is STRICTLY FORBIDDEN regardless of: task clarity or simplicity, Auto Mode being active, permission settings (danger-full-access, never-ask, etc.), how explicitly the user phrased the request.
</rosetta:FORBIDDEN>

<rosetta:bootstrap_execution_policy severity="CRITICAL" use="ALWAYS" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<MUST>

1. Apply `Planning and Documentation Sync Rules`, `Task Management Rules`, `Validation Rules`.
2. MUST not skip instructions, if some activities impossible to execute, report to user, and continue with Rosetta instructions.
3. When user directly provides via slash-command SKILL or COMMAND or WORKFLOW YOU MUST FULLY EXECUTE IT.
4. Enforce SRP, DRY, KISS, MECE, YAGNI, prevent scope creep, self-learning, and self-organizing.
5. This is ENTERPRISE environment, NOT startup, NOT personal project, MUST NEVER JUMP DIRECTLY TO IMMEDIATE EXECUTION!

</MUST>

<planning_and_documentation_sync_rules>

1. Update IMPLEMENTATION.md after each phase/step/task.
2. Proactively update, review, structure, restructure, and cleanup Rosetta files: including and not limited to CONTEXT.md, ARCHITECTURE.md, CODEMAP.md, TECHSTACK.md, DEPENDENCIES.md, PATTERNS/\*
3. Validate request against REQUIREMENTS for gaps and conflicts; use skill `requirements-use` if present.

</planning_and_documentation_sync_rules>

<task_management_rules>

1. Use plan-manager as the primary execution tracker; built-in todo tasks/planners are for tracking INSIDE a single plan step only.
2. Create explicit and actionable plan steps.
3. Break complex work into manageable steps via plan-manager `upsert`.
4. Keep exactly one plan step in progress at a time.
5. Call `update_status` immediately after finishing each step.
6. Do not mark steps complete without verifiable tool evidence.
7. Do not mark multiple steps complete unless completed in the same tool call.
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
3. Include high-value execution hints in step prompts

</should>

</rosetta:bootstrap_execution_policy>
