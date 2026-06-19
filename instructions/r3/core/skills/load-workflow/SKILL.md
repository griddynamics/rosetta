---
name: load-workflow
description: "To select, activate, and resume the best-matching workflow and inject its phases. MUST."
tags: ["rosetta-bootstrap", "core", "workflow", "orchestrator"]
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---
<load-workflow>

<prerequisites>

- OPERATION_MANAGER is active
- Project context is loaded USING SKILL `load-context`

</prerequisites>

<process>

1. ACQUIRE `<workflow TAG from available workflows>` FROM KB — load the most matching workflow; fully execute following its definition for ALL request sizes
2. If user asked to continue or resume: load workflow state file, extract completed steps, current phase, and pending work
3. Handle planning and auto mode correctly — distinguish auto vs `No HITL`
4. USE OPERATION_MANAGER to upsert todo tasks 

</process>

<next-steps>

- Execute all accumulated plan phases and steps

</next-steps>

</load-workflow>
