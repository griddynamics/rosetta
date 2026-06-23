---
name: rosetta
description: "Smart router for selecting the best-matching workflow and hand off"
license: Apache-2.0
alwaysApply: false
disable-model-invocation: true
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<rosetta>

<prerequisites>

- Orchestration rules, context is loaded USING SKILL `orchestration` 
- User communication gates is loaded USING SKILL `hitl` 

</prerequisites>

<FORBIDDEN severity="CRITICAL" required-sequence-instead="USE SKILL orchestration → USE SKILL hitl → USE FLOW <workflow>">

Receiving a user request → immediately writing code, files, scripts, or commands is STRICTLY FORBIDDEN regardless of: task clarity or simplicity, Auto Mode being active, permission settings (danger-full-access, never-ask, etc.), how explicitly the user phrased the request.

</FORBIDDEN>

<process>

1. ACQUIRE `<workflow TAG>` FROM KB — load the best-matching workflow for the current request
2. If resume/continue: load workflow state file; extract completed steps, current phase, and pending work; resume from there
3. Hand off to the workflow — let it drive questioning, planning, execution, review, and validation; no phase skipping
4. Keep HITL active unless user explicitly requested `fully autonomous` or `No HITL`

</process>

</rosetta>
