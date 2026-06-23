---
name: rosetta
description: "To route a user request to the best-matching workflow before acting"
license: Apache-2.0
disable-model-invocation: true
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<rosetta>

<prerequisites>

- USE SKILL `orchestrator-contract` 
- USE SKILL `hitl` 

</prerequisites>

<FORBIDDEN severity="CRITICAL" required-sequence-instead="USE SKILL orchestrator-contract → USE SKILL hitl → USE FLOW `<workflow TAG>`">

No code, files, scripts, or commands before workflow handoff.

</FORBIDDEN>

<process>

1. USE FLOW `<workflow TAG>` - load the best-matching workflow for the current request
2. If resume/continue: load workflow state file; extract completed steps, current phase, and pending work; resume from there
3. Hand off to the workflow — let it drive questioning, planning, execution, review, and validation; no phase skipping
4. Keep HITL active unless user explicitly requested `fully autonomous` or `No HITL`

</process>

</rosetta>
