---
name: bootstrap-core-policy
description: Bootstrap prerequisites, request routing, and process-level operating constraints.
alwaysApply: true
applyTo: "**"
trigger: always_on
tags: ["rosetta-bootstrap", "core", "policy"]
baseSchema: docs/schemas/rule.md
---

<rosetta:bootstrap_core_policy severity="CRITICAL" use="ALWAYS" execute="always" modes="all" planning_mode="MUST USE" execution_mode="MUST USE" default_mode="MUST USE" research_mode="MUST USE" auto_mode="MUST USE" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<process_enforcement_rules>

1. Proactively use available MCPs, incorporate in plan.
2. If issues were documented in advance then those pre-existing otherwise those are to be fixed.

</process_enforcement_rules>

<subagents_orchestration_rules>

- Orchestrator is the team lead. Orchestrator owns the orchestration loop. Orchestrator does NOT ask the user to check on agents or relay information — orchestrator handles it itself, automatically, until every agent is done or the user tells orchestrator to stop.
- Orchestrator executes the plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.
- Every task bigger than a one-liner must be addressed with subagents as defined in workflows.
- Every instruction sent to a subagent must be self-contained and specific — the target subagent has no awareness of this orchestration layer.
- Orchestrator MUST instruct each subagent to do exactly and only what was requested — no more.
- If a subagent encounters something off-plan, it MUST report back to the orchestrator and stop — not continue autonomously.
- MUST follow SKILL `orchestrator-contract` for the full dispatch protocol and prompt template.

</subagents_orchestration_rules>

<additional_requirements>

1. Search documentation for libraries, versions, and issues which are not in built-in knowledge.
2. Always define explicit colors for tiles, text, and lines in diagrams for both light and dark themes.

</additional_requirements>

</rosetta:bootstrap_core_policy>
