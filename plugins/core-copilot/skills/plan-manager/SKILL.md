---
name: plan-manager
description: "Rosetta skill for plan creation, tracking, and execution coordination via local JSON files."
dependencies: node.js
disable-model-invocation: false
user-invocable: true
argument-hint: feature-name plan-name
allowed-tools: Bash(npx:*)
model: claude sonnet 4.6
tags:
  - plan-manager
  - plan-manager-create
  - plan-manager-use
baseSchema: docs/schemas/skill.md
---

<plan-manager>

<role>

Senior execution planner and tracker for plan-driven workflows.

</role>

<when_to_use_skill>

Primary plan manager for orchestrators and subagents. Creates, tracks, and executes plans as local JSON files.

</when_to_use_skill>

<core_concepts>

- Rosetta prep steps completed
- Plan file lives in FEATURE PLAN folder: `<feature_plan_folder_full_path>/plan.json`
- CLI: `npx rosettify plan <subcommand> <plan_file> [args...]`
- Always use full absolute paths for the plan file
- Seven subcommands: `help`, `create`, `next`, `update_status`, `show_status`, `query`, `upsert`
- Resume behavior: `next` returns four groups: (1) in_progress steps (resume=true), (2) open eligible steps, (3) blocked steps (previously_blocked=true), (4) failed steps (previously_failed=true)
- Phases are sequential: steps from a later phase do not appear until all steps in earlier phases are complete
- Status propagation: bottom-up only (steps -> phases -> plan); plan root status is always derived, never set directly
- Phase status updates are rejected (phase_status_is_derived); `entire_plan` target is rejected for update_status (invalid_target)
- `upsert` silently ignores status fields in patch -- only `update_status` modifies status
- ACQUIRE `plan-manager/assets/pm-schema.md` FROM KB for data structure reference

</core_concepts>

<process>

**Orchestrator flow:**

1. Create plan: `npx rosettify plan create <plan_file> '<json>'` -- see pm-schema.md for JSON structure
2. Upsert phases and steps: `npx rosettify plan upsert <plan_file> entire_plan [kind] '<json>'`
3. Delegate steps to subagents -- pass plan file path and step IDs
4. Loop: call `next` until `plan_status: complete` and `count: 0`

**Subagent flow:**

1. Get next steps: `npx rosettify plan next <plan_file> [limit]`
2. Check `resume` flag -- if `true`, continue interrupted work; if `false`, start fresh
3. Execute step
4. Update: `npx rosettify plan update_status <plan_file> <step-id> complete`
5. Repeat from step 1

</process>

<validation_checklist>

- `npx rosettify plan help` exits without error and returns structured help JSON
- `show_status` output: plan root status is derived (never manually set)
- `next` output: in_progress steps appear before open steps; blocked and failed steps are included with flags
- `show_status` phase status matches aggregate of its steps after `update_status`

</validation_checklist>

<pitfalls>

- Not checking `resume` flag on `next` results -- causes duplicate work on resumed sessions
- Forgetting `update_status` after step completion -- plan remains stale
- Plan root status cannot be set directly -- it is always derived from phases
- Attempting to set phase status directly -- rejected as phase_status_is_derived

</pitfalls>

<resources>

- Asset: ACQUIRE `plan-manager/assets/pm-schema.md` FROM KB -- plan JSON structure
- Flow: USE FLOW `adhoc-flow`

</resources>

</plan-manager>
