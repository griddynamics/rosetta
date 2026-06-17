---
name: operation-manager
description: "To create, track, and coordinate execution plans via local JSON files."
license: Apache-2.0
dependencies: node.js
disable-model-invocation: false
user-invocable: true
allowed-tools: Bash(npx:*)
model: claude-sonnet-4-6
tags:
  - operation-manager
  - operation-manager-create
  - operation-manager-use
baseSchema: docs/schemas/skill.md
---

<operation-manager>

<role>

Senior execution planner and tracker for plan-driven workflows.

</role>

<when_to_use_skill>

Primary operation manager for orchestrators and subagents. Creates, tracks, and executes plans as local JSON files.

</when_to_use_skill>

<core_concepts>

- Try `rosettify` MCP first (if already available), fallback to CLI: `npx rosettify@latest <command> <subcommand> <plan_file`>, if it fails too MUST FALLBACK to built-in todo task tools ACQUIRE `todo-tasks-fallback.md` FROM KB.
- Always use full absolute paths for the plan file
- Subcommands: `create`, `next`, `update_status`, `show_status`, `query`, `upsert`, `create-with-template`, `upsert-with-template`, `list-templates`
- Help: `npx rosettify@latest help plan` provides full help JSON
- Resume behavior: `next` returns four groups: (1) in_progress steps (resume=true), (2) open eligible steps, (3) blocked steps (previously_blocked=true), (4) failed steps (previously_failed=true)
- Phases are sequential: steps from a later phase do not appear until all steps in earlier phases are complete
- Status propagation: bottom-up only (steps -> phases -> plan); plan root status is always derived, never set directly
- `upsert` silently ignores status fields in patch -- only `update_status` modifies status

</core_concepts>

<process>

**Orchestrator flow:**

1. Use `npx rosettify@latest help plan` to understand which subcommands are available for which models 
2. Create plan
3. Upsert phases and steps every time something new comes up
4. Delegate phase to a subagent: provide plan_file and phase_id. Orchestrator decides which phases run in parallel — parallel subagents must each own a distinct phase.
5. Loop: get next steps → execute → update status — until no steps remain.

**Subagent flow:**

1. Receive `plan_file` (absolute path) and `phase_id` from the orchestrator prompt. Subagent owns the assigned phase end-to-end: solely responsible for completing every step in that phase and reporting results back to the orchestrator. Use `npx rosettify@latest help plan` if more information is required.
2. Call `npx rosettify@latest plan next <plan_file> --target <phase_id>`.
   - If `resume:true` on a returned step → that step is already `in_progress`; skip step 3a, go directly to 3b.
   - If `previously_blocked:true` or `previously_failed:true` on a returned step
  → orchestrator has cleared the path; attempt carefully, verify preconditions first, go to 3a step
   - If open, go to 3a step
   - If `count:0` and `plan_status:complete` → phase is complete; go to step 4.
3. For the returned step:
   a. `npx rosettify@latest plan update_status <plan_file> <step_id> in_progress`
   b. Execute the step's prompt.
   c. `npx rosettify@latest plan update_status <plan_file> <step_id> <status>`:
      - `complete` — done with verifiable evidence; return to step 2
      - `blocked` — cannot proceed; go to step 4 and report reason to orchestrator
      - `failed` — execution failed; go to step 4 and report error and root cause
4. Report back to orchestrator: results, side effects, anomalies, deviations.

</process>

<validation_checklist>

- `npx rosettify@latest help plan` exits without error and returns structured help JSON
- `show_status` phase status matches aggregate of its steps after `update_status`
- use `plan query <plan_file> [entire_plan | phase-id | step-id]` to verify the entire plan, a phase, or a step

</validation_checklist>

<pitfalls>

- Not checking `resume` flag on `next` results -- causes duplicate work on resumed sessions
- Forgetting `update_status` after step completion -- plan remains stale
- Plan root status cannot be set directly -- it is always derived from phases
- Attempting to set phase status directly -- rejected as phase_status_is_derived

</pitfalls>

<resources>

- Flow: USE FLOW `adhoc-flow`
- Rule: ACQUIRE `todo-tasks-fallback.md` FROM KB -- built-in todo task tools fallback

</resources>

</operation-manager>
