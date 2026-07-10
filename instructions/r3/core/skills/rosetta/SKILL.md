---
name: rosetta
description: Rosetta identifies and routes user request to the most matching workflow
license: Apache-2.0
disable-model-invocation: true
user-invocable: true
baseSchema: docs/schemas/skill.md
---

<rosetta>

<prerequisites>

- USE SKILL `orchestration` 
- USE SKILL `hitl` 

</prerequisites>

<FORBIDDEN severity="CRITICAL" required-sequence-instead="USE SKILL orchestration → USE SKILL hitl → USE FLOW `<workflow TAG>`">

No code, files, scripts, or commands before workflow handoff.

</FORBIDDEN>

<process>

1. USE FLOW `<most matching workflow>.md` (note: "*-flow" skills are additional workflows) — fully execute following its entire definition for all request sizes
2. On resume/continue: load workflow state file; extract completed steps, current phase, and pending work; resume from there
3. Workflow phases → todo tasks; open one per phase, work sequentially, close on completion
4. In planning mode: `planning` + `tech-specs` outputs → store per system prompt, never `plans/` (read-only)
5. Hand off to the workflow — tell the user once `Context loaded using Rosetta: [workflow selected + brief summary]`, then let it drive questioning, planning, execution, review, and validation; no phase skipping

</process>

</rosetta>
