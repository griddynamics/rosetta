---
name: bootstrap-execution-policy
description: Defines planning, task execution, validation, orchestration, and memory behavior for bootstrap flow.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "execution", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_execution_policy severity="HIGH" use="ALWAYS">

<must>

1. MUST USE SKILL `execution-discipline` for planning sync, task management, validation, and memory rules.
2. MUST NOT IGNORE entire set of instructions if one or another activity of the set is impossible to execute. Those inconsistencies MUST BE REPORTED ALWAYS.
3. When user directly provides via slash-command SKILL or COMMAND or WORKFLOW YOU MUST FULLY EXECUTE IT
4. Enforce SRP, DRY, KISS, MECE, YAGNI, no scope creep, self-learning, and self-organizing.

</must>

<should>

1. Keep plan and task wording concise and operational.
2. Keep orchestration context complete but minimal.
3. Include high-value execution hints in task descriptions.

</should>

</bootstrap_execution_policy>
