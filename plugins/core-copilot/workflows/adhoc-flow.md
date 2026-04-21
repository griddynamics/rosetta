---
name: adhoc-flow
description: "Rosetta ad-hoc adaptive meta-workflow that constructs, tracks, reviews, and executes a tailored execution plan per user request using building blocks and available instructions. Useful for small or simple tasks if none other workflows matches. Lightweight."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---


<adhoc_flow>

<description_and_purpose>

Problem: Fixed workflows cannot cover the combinatorial space of real requests; orchestrators lock into rigid classification.
Solution: Meta-workflow — construct a bespoke plan from building blocks, persist via `plan-manager` skill, review, execute with tracking. Each user turn can extend, adapt, or restart.

</description_and_purpose>

<models>

- large (smart, slow): claude-opus-4-6, gpt-5.3-codex-high, gpt-5.4-high, gemini-3.1-pro-preview
- medium (workhorse): claude-sonnet-4-6, gpt-5.3-codex-medium, gpt-5.4-medium, glm-5, kimi-k2.5, minimax-m2.5
- small (fast): claude-haiku-4-5, gpt-5-mini, gemini-3-flash-preview

Match to cognitive demand. Match to current tool.

</models>

<plan_manager>

USE SKILL `plan-manager` as the main execution planner (file-based, via `npx rosettify plan`).

Orchestrator and subagents:
- MUST use plan-manager as main execution planner; todo tasks/built-in planners are for tracking INSIDE step execution only.
- MUST USE `next` to drive execution loop until `plan_status: complete` and `count: 0`.
- MUST USE `update_status` after each step.
- MUST USE `upsert` to adapt plan mid-execution (add/remove phases/steps).

Orchestrator:
- MUST tell subagents all above MUST as MUST (within their scope).
- MUST tell subagents: "tell orchestrator to modify plan if work is outside your scope".

ACQUIRE `plan-manager/assets/pm-schema.md` FROM KB for data structure reference.

</plan_manager>

<building_blocks>

Compose these into plan phases/steps to build any execution workflow.

- **discover-research**: scan project context and KB; research external knowledge if needed; deliver summarized references
- **requirements-capture**: reverse-engineer or interrogate requirements; persist intent as source of truth
- **reasoning-decomposition**: USE SKILL `reasoning` (7D) to decompose into sub-problems with decisions and trade-offs
- **plan-wbs**: USE SKILL `planning` to build sequenced WBS; persist via `plan-manager upsert` with subagent/role/model
- **tech-specs**: USE SKILL `tech-specs` to generate target technical implementation specs; makes AI to figure out entire solution, instead of discovering something as a surprise
- **subagent-delegation**: provide role + context/refs; route parallel/sequential; enforce focus — report back if off-plan
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

- Rosetta prep steps completed.
- Use available skills and agents.
- You will FOR SURE run out of LLM context, leading to loss of information, delegate to subagents!

<build_plan phase="2">

1. USE SKILL `reasoning` if needed or LARGE.
2. Use building block, sequence a plan.
3. Upsert.

</build_plan>

<review_plan phase="3" if="MEDIUM, LARGE" subagent="reviewer" role="Plan reviewer of AI automated tasks">

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
2. Summarize to user if completed.

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
