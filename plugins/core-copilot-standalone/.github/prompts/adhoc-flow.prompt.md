---
name: adhoc-flow
description: "Workflow for the rest of tasks: lightweight documentation, build, track, synchronize, etc."
tags: ["workflow"]
baseSchema: docs/schemas/workflow.md
---


<adhoc_flow>

<description_and_purpose>

Problem: Fixed workflows cannot cover the combinatorial space of real requests; orchestrators lock into rigid classification.
Solution: Meta-workflow — construct a bespoke plan from building blocks, persist as a plan file (see `<plan_manager>`), review, execute with tracking. Each user turn can extend, adapt, or restart.

</description_and_purpose>

<models>

- large (smart, slow): claude-opus-4-8, gpt-5.3-codex-high, gpt-5.4-high, gpt-5.5-high, gemini-3.1-pro-preview
- medium (workhorse): claude-sonnet-5, gpt-5.3-codex-medium, gpt-5.4-medium, glm-5, kimi-k2.5, minimax-m2.5
- small (fast): claude-haiku-4-5, gpt-5-mini, gemini-3-flash-preview

Match to cognitive demand. Match to current tool.

</models>

<plan_manager>

Execution plans are local JSON files driven via CLI: `npx -y rosettify@latest plan <subcommand> <plan_file>`. Always use full absolute paths for the plan file. Todo tasks/built-in planners are for tracking INSIDE step execution only.

Orchestrator:

1. `npx -y rosettify@latest help plan` to confirm available subcommands and the plan JSON structure.
2. Create plan: `plan create <plan_file> '<json>'` — plan ⊃ phases ⊃ steps. Use ONLY plain `create`/`upsert` — NEVER `create-with-template`/`upsert-with-template`: template-seeded prep steps reference skills by names that do not match this release's skills.
3. Upsert phases and steps every time something new comes up; adapt continuously — reorder, re-analyze, add, re-scope as discovery/subagent returns shift reality.
4. Delegate a target to a subagent — add to the subagent prompt, right after the `You are [role/specialization]...` line: `Plan: [absolute plan.json path]. Phase: [phase id]. [Step: [step id].]`, and include `<subagent_plan_manager_instructions>`. Subagent owns that target end-to-end. Decide which phases run in parallel — parallel subagents MUST each own a distinct phase (collision-free).
5. Loop: `next` → dispatch/execute → `update_status` — until no steps remain.
6. Track: `show_status` / `query` for state; clear `blocked`/`failed` steps so subagents can retry.
7. Close: confirm the plan derives to `complete` (never set root directly), verify via `show_status`/`query`; keep the plan and core Rosetta files current as phases land.

</plan_manager>

<subagent_plan_manager_instructions>

1. Receive your target from the prompt's `Plan: [absolute plan.json path]. Phase: [phase id]. [Step: [step id].]` line.
2. `npx -y rosettify@latest plan next <plan_file> --target <phase_id>` (target = your phase, or step id if the prompt scopes to one) — pull the next step.
   - `resume:true` → step is already `in_progress`; skip 3a, go to 3b.
   - `previously_blocked:true` / `previously_failed:true` → orchestrator cleared the path; verify preconditions carefully first, then 3a.
   - open → 3a.
   - `count:0` and `plan_status:complete` → target complete; go to step 4.
3. For the returned step — ONE at a time:
   a. `npx -y rosettify@latest plan update_status <plan_file> <step_id> in_progress`.
   b. Split the step's prompt into todo tasks (your own isolated list — invisible to other agents); order by dependencies; output `Tasks Created: [task ids]`; execute; close each on verifiable evidence.
   c. `npx -y rosettify@latest plan update_status <plan_file> <step_id> <status>`:
      - `complete` — done with verifiable evidence → back to step 2 for the next step.
      - `blocked` — cannot proceed → step 4, report reason.
      - `failed` — execution failed → step 4, report error + root cause.
4. At target end (or on `blocked`/`failed`), report to the orchestrator per your prompt's `## Output` and `## Evidence` sections — `blocked` carries the reason, `failed` carries the error + root cause.

</subagent_plan_manager_instructions>

<building_blocks>

Compose these into plan phases/steps to build any execution workflow.

- **discover-research**: scan project context and KB; research external knowledge if needed; deliver summarized references
- **requirements-capture**: reverse-engineer or interrogate requirements; persist intent as source of truth
- **reasoning-decomposition**: USE SKILL `reasoning` (7D) to decompose into sub-problems with decisions and trade-offs
- **plan-wbs**: USE SKILL `planning` to build sequenced WBS; persist via plan `upsert` with subagent/role/model
- **tech-specs**: USE SKILL `tech-specs` to generate target technical implementation specs; makes AI to figure out entire solution, instead of discovering something as a surprise
- **subagent-delegation**: provide role + context/refs; route parallel/sequential; enforce focus — report back if off-plan
- **delegate-but-verify**: use subagent delegation, but verify both reasoning and results
- **critically-review**: critically review inputs, outputs, reasoning, completeness, ambiguity, results of user, subagents, tools, scripts, etc.
- **execute-track**: plan `next` → execute → `update_status`; `upsert` to adapt mid-execution; loop
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

- All Rosetta prep steps MUST be FULLY completed, load-context skill loaded and fully executed.
- Use available skills and agents.
- You will FOR SURE run out of LLM context, leading to loss of information, delegate to subagents!
- If `/goal` is set repeat phases 4-5 until goal is met.

<build_plan phase="2">

1. USE SKILL `reasoning` if needed or LARGE.
2. Use building block, sequence a plan.
3. Upsert.

</build_plan>

<review_plan phase="3" if="MEDIUM, LARGE" subagent="reviewer" role="Plan reviewer of AI automated tasks" subagent_required_model="gpt-5.4-medium, gemini-3.1-pro-preview, claude-sonnet-5" must-be-subagent>

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
