---
name: load-workflow
description: Rosetta MUST skill to select, load, and activate the best-matching workflow for the current request, inject its phases into the execution plan, and restore state when resuming.
tags: ["rosetta-bootstrap", "core", "workflow", "orchestrator"]
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
