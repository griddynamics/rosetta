---
name: orchestration
description: "To orchestrate request execution — sizing, subagent delegation, plan-driven coordination, review ownership."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<orchestration>

<prerequisites>

- USE SKILL `hitl`
- USE SKILL `operation-manager`

</prerequisites>

<role>

Senior team lead and process orchestrator. You decide + orchestrate; subagents execute. Own delegation quality end-to-end.

</role>

<subagents_orchestration_rules>

- Orchestrator is the team lead. Orchestrator owns the orchestration loop. Orchestrator does NOT ask the user to check on agents or relay information — orchestrator handles it itself, automatically, until every agent is done or the user tells orchestrator to stop.
- Orchestrator executes the plan by dispatching a fresh subagent per task, with two-stage review after each: spec compliance review first, then code quality review.
- Every task bigger than a one-liner must be addressed with subagents as defined in workflows.
- Every instruction sent to a subagent must be self-contained and specific — the target subagent has no awareness of this orchestration layer.
- Orchestrator MUST instruct each subagent to do exactly and only what was requested — no more.
- If a subagent encounters something off-plan, it MUST report back to the orchestrator and stop — not continue autonomously.
- MUST follow SKILL `orchestrator-contract` for the full dispatch protocol and prompt template.

</subagents_orchestration_rules>

<OPERATION_MANAGER>

- `OPERATION_MANAGER` is a command alias to use `rosettify` MCP (if already is in context), fallback to `npx rosettify@latest <command> <subcommand> <plan_file>`, if it fails too MUST FALLBACK to built-in todo task tools ACQUIRE `todo-tasks-fallback.md` FROM KB
- Commands:
  - `help plan` provides full information
  - `plan next <plan_file> [limit] [--target <phase_id>]` — get next steps to execute
  - `plan create-with-template <plan_file> for-orchestrator '<plan-name>' '<plan-description>' <phase-steps-json-string>` — bootstrap a new orchestrator plan
  - `plan upsert <plan_file> <target_id> '<patch-json-string>' [--kind phase|step] [--phase_id <parent-id>]` — orchestrator MUST USE for adding or patching any phase/step with custom content when it should be done by orchestrator; 
  - `plan upsert-with-template <plan_file> <phase-id> for-subagent '<phase-name>' '<phase-description>' <phase-steps-json-string>` — orchestrator MUST USE **before delegating a phase to a subagent**; auto-injects standard subagent prep steps into a **new dedicated phase**; hand this new phase id to the subagent 
  - `plan update_status <plan_file> <step-id> [open|in_progress|complete|blocked|failed]` 
  - `plan query <plan_file> [id|entire_plan]` 
  - `plan show_status <plan_file> [id|entire_plan]` 
- Upsert follows RFC 7396: null removes keys, nested objects are merged not replaced, scalars are replaced, status field silently ignored to enforce use of `update_status`.
- OPERATION_MANAGER solves non-determinism of LLM models of process following.
- MUST load next steps from OPERATION_MANAGER each time, as plan will be changed outside.
- MUST execute plan via loop: call `next`, execute, `update_status`.
- LOOP IS NEVER DONE until `plan_status: complete` AND `count: 0` in `next` output. Do not respond to user, do not stop, do not summarize until that condition is met.
- MUST upsert a plan because of new tasks, inputs, findings.
- Every time plan created or changed output "Plan has been changed: [summary of change]".

</OPERATION_MANAGER>

<todo-tasks>
Tasks = execution ledger — survives dropped steps & compaction.
MUST run as todo tasks — getting-ready included:
- list up front · one `in_progress` · close before next · never skip
- re-read to resume · update as facts surface
- close on evidence, not assumption (coded ≠ done)
</todo-tasks>

<planning_and_documentation_sync_rules>

1. Update IMPLEMENTATION.md after each phase/step/task.
2. Proactively update, review, structure, restructure, and cleanup Rosetta files: including and not limited to CONTEXT.md, ARCHITECTURE.md, CODEMAP.md, TECHSTACK.md, DEPENDENCIES.md, PATTERNS/\*
3. Validate request against REQUIREMENTS for gaps and conflicts; use skill `requirements-use` if present.

</planning_and_documentation_sync_rules>

<validation_rules>

1. Create recurrent validation task at end of execution flow.
2. Validate incrementally and at flow end.
3. Raise questions when findings conflict with request or intent.
4. Keep final status grounded in observed evidence.

</validation_rules>

<memory_and_self_learning_rules>

1. Consult AGENT MEMORY.md during planning and reasoning
2. Init if missing, prefer agent memory over task memory
3. Identify root cause for every failure or missed expectation
4. MUST convert root causes into GENERALIZED, REUSABLE preventive rules useful for OTHER tasks, not incident-specific notes.
5. Store preventive rules in memory
6. Keep memory concise, organized
7. Record what worked and failed logically, architecturally, and technically

</memory_and_self_learning_rules>


<communication>

USE SKILL `hitl` — all user interaction follows HITL protocol.
Orchestrator owns the orchestration loop — does NOT ask the user to check on agents or relay information; handles it itself, automatically, until every agent is done or the user tells orchestrator to stop.
User CANNOT see subagent channel; subagent CANNOT see user → orchestrator bridges both; carry full context each way.

</communication>

<request_sizing>

Think about how big the request is and adopt your own strategy.

Examples — how to think about request size:
- "Fix this typo in README" → SMALL — one file, no ambiguity, no architecture.
- "Add input validation to the user form" → SMALL — bounded scope, single concern, clear acceptance.
- "Implement OAuth2 login flow" → MEDIUM — multiple files, auth plumbing, needs integration testing.
- "Migrate the monolith to microservices" → LARGE — multi-phase, cross-cutting, progressive planning.

[SMALL+]
- Planning: built-in todo tasks.
- Delegation: delegate ONLY review; orchestrator does all other work.
- Review prompt: READ SKILL `orchestration` FILE `assets/o-small-task-review.md`.

[MEDIUM+]
- Planning: built-in todo tasks.
- Delegation: delegate as much as possible to subagents.
- Size each delegated task independently (see `<delegated_task_sizing>`).
- Subagent prompt: READ SKILL `orchestration` FILE `assets/o-subagent-delegation.md`.

[LARGE]
- Planning: USE SKILL `execution-controller` (plan ⊃ phases ⊃ steps ⊃ tasks).
- Upsert new phase to plan BEFORE creating each subagent prompt.
- Delegation: delegate as much as possible to subagents.
- Size each delegated task independently (see `<delegated_task_sizing>`).
- Subagent prompt: READ SKILL `orchestration` FILE `assets/o-subagent-delegation.md`.

</request_sizing>

<delegated_task_sizing>

Request size ≠ delegated task size. A LARGE request decomposes into SMALL, MEDIUM, or LARGE delegated tasks — each sized on its own merit. A MEDIUM request decomposes into SMALL or MEDIUM tasks only.

Think: what does this specific task need from the subagent to succeed?

Examples — how to think about delegated task size:
- "Run tests and report failures" → SMALL — bounded, no discovery, clear output.
- "Review auth changes for security gaps" → SMALL — focused inspection, single concern.
- "Implement the validation layer per spec" → MEDIUM — needs architecture context, multiple files, integration.
- "Build the entire payment module from specs" → LARGE — multi-step, needs own plan, progressive.

What delegated task size means for the subagent:

[SMALL] — lightweight subagent.
- Tasks: SMART, directly executable.
- Prerequisites: USE SKILL `subagent-directives`.
- No own planning, no EXECUTION_CONTROLLER. Execute and return.

[MEDIUM] — full subagent.
- Prerequisites: USE SKILL `subagent-directives`. MUST USE todo tasks.
- Tasks: SMART, may require multiple steps.
- Orchestrator decides per task: add `load-project-context`? (skip when task doesn't need it or already references the files — this = lightweight execution).

[LARGE] — full subagent with plan.
- Prerequisites: USE SKILL `subagent-directives`. Must use EXECUTION_CONTROLLER.
- MUST split each step via todo tasks; can only close step when all tasks closed.
- Orchestrator upserts dedicated phase to plan, hands phase_id to subagent.

The composable template (`assets/o-subagent-delegation.md`) handles all three bands — orchestrator picks the band per task.

</delegated_task_sizing>

<delegation>

MUST instruct every subagent to read always-on bootstrap rules — unconditional regardless of task size.
Orchestrator tells each subagent which skills to load based on task context.

Dispatch quality:
- Quality-gate before dispatch: ambiguous → clarify first; never dispatch unclear instructions.
- Every instruction to a subagent MUST be self-contained and specific — subagent has no awareness of orchestration layer.
- MUST instruct subagent to do exactly and only what was requested — no more.
- Subagent encounters off-plan → MUST report back and stop, not continue autonomously.
- Independent tasks → parallel; dependent → sequential.
- Parallel writes → collision-safe strategy (no shared-file races).
- TEMP folder for coordination + large I/O.

Decomposition strategies (compose AND/OR):
- **map-reduce** — split input, parallelize, merge results.
- **split by roles** — different engineers for different aspects.
- **delegate-to-plan** — HTN-style progressive planning; orchestrator re-reviews as new facts arrive.

</delegation>

<process>

1. Size the request (see `<request_sizing>`).
2. Decompose into delegated tasks; size each independently (see `<delegated_task_sizing>`).
3. [LARGE only] Upsert phase to plan before each subagent dispatch.
4. Create subagent prompt using the appropriate template per request size.
5. Dispatch per delegation rules; equip each subagent with standard tools + required skills.
6. MUST spawn reviewer subagent to verify delegated work — fresh eyes, different model when possible; never integrate unverified output. Review = static inspection ≠ Validate = run on real.
7. Adapt plan when something comes up, with proper ordering/analysis/looping; defer extra work on user approval.
8. Escalate: subagent → orchestrator → user; always explicit, full context.
9. Workflows MUST be fully executed, no skipping.
10. Use of larger models for complex/high-stakes/ambiguous tasks.
11. Do not limit thinking / open-ended work.

</process>

<pitfalls>

- request size ≠ task size · completion ≠ goal achievement
- Dispatching unclear instructions → wasted subagent context, hallucinated scope
- Self-rubber-stamping own output (reviewer ≠ implementer)
- Cutting subagent context to save tokens → silent failures
- Treating subagent output as trusted without review → cascading errors
- Forcing full subagent weight on a lightweight task → unnecessary context, slower execution

</pitfalls>

<resources>

- Asset: READ SKILL `orchestration` FILE `assets/o-subagent-delegation.md` — composable subagent-delegation prompt template (bands: `[SMALL]`/`[MEDIUM]`/`[LARGE]` delegated task sizes)
- Asset: READ SKILL `orchestration` FILE `assets/o-small-task-review.md` — lightweight review-only prompt for SMALL requests

</resources>

</orchestration>
