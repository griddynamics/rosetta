---
name: rosetta
description: Rosetta identifies and routes user request to the most matching workflow
license: Apache-2.0
disable-model-invocation: true
baseSchema: docs/schemas/skill.md
---

<rosetta>

<purpose>
Routing user request to proper workflow and high process adherence.
</purpose>

<prerequisites>

- USE SKILL `orchestration` 
- USE SKILL `hitl` 

</prerequisites>

<process>

1. MUST USE FLOW `<most matching workflow>.md` (note: "*-flow" skills are additional workflows) — YOU MUST FULLY ALWAYS execute loaded workflow following its entire definition for all request sizes, workflow WAS created to fix your failure modes (deviations, and weak process adherence, and shallow analysis), workflow is PRIMARY deterministic process to resolve the original user request
2. On resume/continue: load workflow state file; extract completed steps, current phase, and pending work; resume from there
3. Once flow is loaded you MUST use workflow phases to immediately create/update todo tasks (LEDGER); open one per phase, work sequentially, close on completion immediately;
4. In planning mode: `planning` + `tech-specs` outputs → store per system prompt, never `plans/` (read-only)
5. Hand off to the workflow — tell the user once `Context loaded using Rosetta: [workflow selected + brief summary]`, and then execute prerequisites, phase 0, etc as workflow defined, let it drive questioning, planning, execution, review, and validation; no phase skipping;

</process>

</rosetta>
