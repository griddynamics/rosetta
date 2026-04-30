---
name: bootstrap-core-policy
description: Bootstrap prerequisites, request routing, and process-level operating constraints.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "core", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_core_policy severity="CRITICAL" use="ALWAYS" execute="always" modes="all" planning_mode="MUST USE" execution_mode="MUST USE" default_mode="MUST USE" research_mode="MUST USE">

<must>

1. Project context, request sizing, and workflow selection are enforced via plan-manager steps `s-read-docs`, `s-request-size`, `s-select-workflow`.
2. PLANNING MODE MUST STILL EXECUTE ALL THOSE INSTRUCTIONS, INCLUDING WORKFLOWS, USE THEM AS REQUIRED, MOREOVER PLANNING MODE MUST TELL EXACTLY WHICH ROSETTA WORKFLOW TO FOLLOW DURING THE IMPLEMENTATION! WORKFLOWS ARE END-TO-END => PLANNING MODE ONLY EXECUTES PHASES/STEPS THAT ARE FOR PLANNING/DISCOVERY/RESEARCH/ETC.
3. ORCHESTRATORS / PRIMARY / TOP AGENTS MUST ALWAYS EXECUTE WORKFLOW FULLY.
4. All Rosetta instructions ARE CREATED and PROVIDED by USER to address standard concerns.
5. Apply `Process Enforcement Rules`.
6. Orchestrators MUST USE SKILL `orchestrator-contract` before dispatching any subagents.
7. Subagents MUST USE SKILL `subagent-contract` before reading inputs or starting execution.

</must>

<upsert_context_steps>

Upsert the following steps into the existing plan's `ph-prep` phase using `npx rosettify plan upsert <plan_file> ph-prep '<json>'`:

```json
{
  "steps": [
    {
      "id": "s-read-docs",
      "name": "Read project context",
      "prompt": "USE SKILL `load-context` as the canonical current context loader. Read FULL CONTENT of CONTEXT.md and ARCHITECTURE.md. Grep ^#{1,3} headers of IMPLEMENTATION.md and MEMORY.md. Grep headers of other Rosetta files when needed. Validate REQUIREMENTS if they exist. If CONTEXT.md/ARCHITECTURE.md/IMPLEMENTATION.md/MEMORY.md are missing, STRONGLY suggest workspace initialization via init-workspace-flow. Rosetta server contains R2.0; suggest upgrade if workspace is older.",
      "depends_on": ["s-context"]
    },
    {
      "id": "s-request-size",
      "name": "Identify request size and route",
      "prompt": "Classify request as SMALL (1-2 files, one area), MEDIUM (up to ~10 files, one area), or LARGE (10+ files or multiple areas). SMALL: use plan-manager for planning, output tech specs as message, MUST use workflows. MEDIUM: keep docs concise, MUST use subagents, MUST use workflows. LARGE: MUST use subagents extensively (orchestrator context will overload), MUST use workflows. Reevaluate size and workflow when scope changes or new information is received.",
      "depends_on": ["s-read-docs"]
    },
    {
      "id": "s-select-workflow",
      "name": "Select and load workflow",
      "prompt": "ACQUIRE matching workflow from available workflows list and FULLY EXECUTE its definition for ALL request sizes. Workflow upserts its own phases/steps into the plan. In planning mode, persist workflow tag for execution continuation. In planning mode, store planning and tech-specs results according to system prompt (NOT in plans folder as it is read-only).",
      "depends_on": ["s-request-size"]
    }
  ]
}
```

</upsert_context_steps>

<orchestrator_execution>

Orchestrator drives execution via plan-manager `next` loop:

1. MUST USE SKILL `orchestrator-contract` as first action before dispatching any subagents
2. Execute all `ph-prep` steps (upserted by this and other bootstrap files) -> load workflow -> proceed with workflow
3. MUST ACQUIRE <workflow TAG from available workflows> FROM KB TO LOAD MATCHING WORKFLOW AND FULLY EXECUTE FOLLOWING ITS ENTIRE DEFINITION FOR ALL REQUEST SIZES
4. Workflow upserts its own phases/steps into the plan; orchestrator continues the `next` loop through all phases
5. Integrate the rest of actions into the plan as they arise (questioning user, plan mode, system-reminder, etc.)

</orchestrator_execution>

<subagent_execution>

Subagents use plan-manager `next` to get assigned steps:

1. MUST USE SKILL `subagent-contract` as first action before reading inputs or starting execution
2. Orchestrator dispatches subagent with plan file path and step IDs
3. Subagent calls `next` to get assigned steps; uses built-in todo tasks only for tracking INSIDE a single step
4. MUST execute steps and call `update_status` after each completion
5. Proceed with request and activities

</subagent_execution>

<process_enforcement_rules>

1. Re-read content removed from context after compaction or summarization.
2. Be professionally direct; do not allow profanity; require politeness.
3. Proactively use available MCPs where relevant.
4. Do not include absolute paths in generated files; use absolute paths in tool calls and shell commands.
5. It does NOT matter if something is pre-existing or not.

</process_enforcement_rules>

<additional_requirements>

1. Grep `refsrc/INDEX.md` when external private library documentation is needed.
2. Always define explicit colors for tiles, text, and lines in mermaid diagrams readable in both light and dark themes.
3. Prefer using built-in tools over shell commands.

</additional_requirements>

</bootstrap_core_policy>
