---
name: adhoc-flow
description: "Workflow for the rest of tasks: lightweight documentation, build, track, synchronize, etc."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---


<adhoc_flow>

<description_and_purpose>

Problem: Fixed workflows cannot cover the combinatorial space of real requests; orchestrators lock into rigid classification.
Solution: Meta-workflow — construct a bespoke plan from building blocks, persist via `plan-manager` skill, review, execute with tracking. Each user turn can extend, adapt, or restart.

</description_and_purpose>

<models>

- large (smart, slow): claude-opus-4-8, gpt-5.3-codex-high, gpt-5.4-high, gpt-5.5-high, gemini-3.1-pro-preview
- medium (workhorse): claude-sonnet-4-6, gpt-5.3-codex-medium, gpt-5.4-medium, glm-5, kimi-k2.5, minimax-m2.5
- small (fast): claude-haiku-4-5, gpt-5-mini, gemini-3-flash-preview

Match to cognitive demand. Match to current tool.

</models>

<OPERATION_MANAGER>

- `OPERATION_MANAGER` is a command alias to use `rosettify` MCP (if already is in context), fallback to `npx rosettify@latest <command> <subcommand> <plan_file>`, if it fails too MUST FALLBACK to built-in todo task tools ACQUIRE `todo-tasks-fallback.md` FROM KB
- Commands:
  - `help plan` provides full information
  - `plan next <plan_file> [limit] [--target <phase_id>]` — get next steps to execute
  - `plan create-with-template <plan_file> for-orchestrator '<plan-name>' '<plan-description>'` — bootstrap a new orchestrator plan
  - `plan upsert-with-template <plan_file> <phase-id> for-subagent '<phase-name>' '<phase-description>'` — orchestrator MUST USE for adding prep steps for subagent
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

<building_blocks>

Compose these into plan phases/steps to build any execution workflow.

- **discover-research**: scan project context and KB; research external knowledge if needed; deliver summarized references
- **requirements-capture**: reverse-engineer or interrogate requirements; persist intent as source of truth
- **reasoning-decomposition**: USE SKILL `reasoning` (7D) to decompose into sub-problems with decisions and trade-offs
- **plan-wbs**: USE SKILL `planning` to build sequenced WBS; persist via `plan-manager upsert` with subagent/role/model
- **tech-specs**: USE SKILL `tech-specs` to generate target technical implementation specs; makes AI to figure out entire solution, instead of discovering something as a surprise
- **subagent-delegation**: provide role + context/refs; route parallel/sequential; enforce focus — report back if off-plan
- **delegate-but-verify**: use subagent delegation, but verify both reasoning and results
- **critically-review**: critically review inputs, outputs, reasoning, completeness, ambiguity, results of user, subagents, tools, scripts, etc.
- **execute-track**: plan-manager next → execute → update_status; `upsert` to adapt mid-execution; loop
- **modify-review**: modify then review with different agent/model
- **review-validate**: review (static inspection against intent) + validate (run locally, call/use local, runtime evidence on real tasks)
- **memory-learn**: root-cause failures → reusable preventive rules → update AGENT MEMORY.md
- **hitl-gate**: present summary to user; block until explicit approval
- **simulate**: walk through plan with use cases; verify cognitive load and phase boundaries
- **draft-improve**: short core draft → improve one non-conflicting aspect at a time
- **ralph-loop**: execute → review → update task memory with root causes → loop
- **use**: use existing skills, agents, workflows

</building_blocks>

<workflow_phases>

<prerequisites phase="1" applies="ALL">

1. All Rosetta prep steps MUST be FULLY completed, SKILL `load-context` loaded and fully executed.
2. MUST USE OPERATION_MANAGER for deterministic execution
3. Use available skills and agents.
4. You will FOR SURE run out of LLM context, leading to loss of information, delegate to subagents!
5. If `/goal` is set repeat phases 4-5 until goal is met.

</prerequisites>

<build_plan phase="2">

1. USE SKILL `reasoning` if needed or LARGE.
2. Use building block, sequence a plan.
3. Upsert.

</build_plan>

<review_plan phase="3" if="MEDIUM, LARGE" subagent="reviewer" role="Plan reviewer of AI automated tasks" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-4-6" must-be-subagent>

1. Review: completeness, sequencing, dependency correctness, prompt clarity, etc.
2. Subagent to query by full path to plan.json. Orchestrator to upsert fixes.
3. hitl-gate — present summary, block until approved.

</review_plan>

<execute_plan phase="4" loop="true">

1. Get next steps.
2. Per step: delegate to subagent or execute directly.
3. Adapt plan changes.
4. Loop until all completed.

</execute_plan>

<review_and_summarize phase="5">

1. Final review - validate against original intent.
2. Repeat execution if not met original intent.
3. Summarize to user if completed.

</review_and_summarize>

</workflow_phases>

<best_practices>

- Short and clear
- Use git worktrees for parallel work
- Use self-learning
- Validate incrementally
- Do not accumulate unverified work
- Prevent scope creep, always pass original intent to subagents
- Keep context lean — delegate to subagents
- Plan is a living artifact
- Provide references, not dumps
- Use subagent to build_plan for MEDIUM/LARGE requests

</best_practices>

<pitfalls>

- Over-planning SMALL requests
- Context overload: delegate instead
- Parallel work collisions

</pitfalls>

</adhoc_flow>
