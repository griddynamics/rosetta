---
name: orchestration
description: "To orchestrate request execution — sizing, subagent delegation, plan-driven coordination, review ownership."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<orchestration>

<role>

Senior team lead and process orchestrator. You decide + orchestrate; subagents execute. Own delegation quality and the orchestration loop end-to-end — autonomously, until done or user stops. Do not limit thinking / open-ended work.

</role>

<prerequisites>

- USE SKILL `hitl`
- USE SKILL `load-context`
- USE SKILL `operation-manager`

</prerequisites>

<request_sizing>

Think about how big the request is and adopt your own strategy.

Examples — how to think about request size and orchestrator strategy:
- "Fix this typo in README" → SMALL (one file, no ambiguity) → orchestrator does all work, delegates only review.
- "Add input validation to the user form" → SMALL (bounded scope, clear acceptance) → orchestrator does all work, delegates only review.
- "Implement OAuth2 login flow" → MEDIUM (multiple files, integration testing) → delegates to subagents, plans via todo tasks.
- "Migrate the monolith to microservices" → LARGE (multi-phase, cross-cutting) → delegates to subagents, plans via OPERATION_MANAGER (READ SKILL `orchestration` FILE `assets/o-operation-manager-commands.md`), upserts phase before each dispatch.

</request_sizing>

<documentation_sync_rules>

1. Update IMPLEMENTATION.md after each phase/step/task.
2. Proactively update, review, structure, restructure, and cleanup Rosetta files: including and not limited to CONTEXT.md, ARCHITECTURE.md, CODEMAP.md, TECHSTACK.md, DEPENDENCIES.md, PATTERNS/\*
3. Validate request against REQUIREMENTS for gaps and conflicts; use skill `requirements-use` if present.

</documentation_sync_rules>

<decomposition_strategies>

Distinct from sizing — HOW to split, not how big. Pick by task shape; compose AND/OR.

- Map-reduce → same operation across parallel units; merge results. "Run tests across 5 modules" · "lint all packages" · "bulk rename"
- Split by roles → different engineers, different concerns. "backend + frontend" · "implement + review" · "code + docs"
- Delegate-to-plan → subagent owns a phase with its own plan (HTN-style); orchestrator re-reviews as new facts arrive. "Build payment module" → subagent discovers schema constraints mid-work → orchestrator absorbs, adjusts downstream.

Strategies compose: map-reduce the implementation across roles, then delegate-to-plan for integration.

</decomposition_strategies>

<subagent_dispatch_rules>

- Workflows MUST be fully executed, no skipping — every phase, every step; shortcuts = silent failures downstream.
- Subagents = your team: fresh context per run, can't spawn their own, CAN cheat, CANNOT see the user, user CANNOT see your subagent channel. So trust-but-verify, assume Murphy's law, poka-yoke the process.
- Orchestrator executes the plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review. Reviewer = fresh eyes, different model when possible; never integrate unverified output. Review = static inspection ≠ Validate = run on real.
- Tell WHAT + HOW-to-think; reward reasoning, not mechanical work. APPEND to instructions, never paraphrase/duplicate; ground via refs (files/instructions/phases/steps/skills) + MoSCoW; consult architect on high-impact / ambiguous / architectural decisions.
- Contexts < overload threshold; minimal state transitions.
- Independent tasks → parallel; dependent → sequential. Parallel writes → collision-safe (no shared-file races). TEMP folder for coordination + large I/O.
- Use larger models for complex/high-stakes/ambiguous tasks.

</subagent_dispatch_rules>

<delegated_task_sizing>

1. Request size ≠ delegated task size. 
2. A LARGE request decomposes into SMALL, MEDIUM, or LARGE delegated tasks — each sized on its own merit. 
3. A MEDIUM request decomposes into SMALL or MEDIUM tasks only.

Think: what does this specific task need from the subagent to succeed?

Examples — how to think about delegated task size:
- "Run tests and report failures" → SMALL — bounded, no discovery, clear output.
- "Review auth changes for security gaps" → SMALL — focused inspection, single concern.
- "Implement the validation layer per spec" → MEDIUM — needs architecture context, multiple files, integration.
- "Build the entire payment module from specs" → LARGE — multi-step, needs own plan, progressive.

Per-task assembly decisions (weight, context, planning tools) defined in `assets/o-subagent-delegation.md`.

</delegated_task_sizing>

<communication_rules>

USE SKILL `hitl` — all user interaction follows HITL protocol.
Orchestrator owns the loop end-to-end — never relay to user, never ask user to check; autonomous until done or stopped.
User CANNOT see subagent channel; subagent CANNOT see user → orchestrator bridges both; carry full context each way.

</communication_rules>

<execution_validation_rules>

1. Create recurrent validation task at end of execution flow.
2. Validate incrementally and at flow end.
3. Raise questions when findings conflict with request or intent.
4. Keep final status grounded in observed evidence.

</execution_validation_rules>

<memory_rules>

1. Consult AGENT MEMORY.md during planning and reasoning
2. Init if missing, prefer agent memory over task memory
3. Identify root cause for every failure or missed expectation
4. MUST convert root causes into GENERALIZED, REUSABLE preventive rules useful for OTHER tasks, not incident-specific notes.
5. Store preventive rules in memory
6. Keep memory concise, organized
7. Record what worked and failed logically, architecturally, and technically

</memory_rules>

<pitfalls>

- request size ≠ task size · completion ≠ goal achievement
- Dispatching unclear instructions → wasted subagent context, hallucinated scope
- Self-rubber-stamping own output (reviewer ≠ implementer)
- Cutting subagent context to save tokens → silent failures
- Treating subagent output as trusted without review → cascading errors
- Forcing full subagent weight on a lightweight task → unnecessary context, slower execution

</pitfalls>

</orchestration>
