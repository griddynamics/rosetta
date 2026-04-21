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
6. MUST Always Use `Subagents Orchestration Rules`.

</must>

<upsert_context_steps>

Upsert the following steps into the existing plan's `ph-prep` phase using `npx rosettify plan upsert <plan_file> ph-prep '<json>'`:

```json
{
  "steps": [
    {
      "id": "s-read-docs",
      "name": "Read project context",
      "prompt": "Read FULL CONTENT of CONTEXT.md and ARCHITECTURE.md. Grep ^#{1,3} headers of IMPLEMENTATION.md and MEMORY.md. Grep headers of other Rosetta files when needed. Validate REQUIREMENTS if they exist. If CONTEXT.md/ARCHITECTURE.md/IMPLEMENTATION.md/MEMORY.md are missing, STRONGLY suggest workspace initialization via init-workspace-flow. Rosetta server contains R2.0; suggest upgrade if workspace is older.",
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

1. Execute all `ph-prep` steps (upserted by this and other bootstrap files) -> load workflow -> proceed with workflow
2. MUST ACQUIRE <workflow TAG from available workflows> FROM KB TO LOAD MATCHING WORKFLOW AND FULLY EXECUTE FOLLOWING ITS ENTIRE DEFINITION FOR ALL REQUEST SIZES
3. Workflow upserts its own phases/steps into the plan; orchestrator continues the `next` loop through all phases
4. Integrate the rest of actions into the plan as they arise (questioning user, plan mode, system-reminder, etc.)

</orchestrator_execution>

<subagent_execution>

Subagents use plan-manager `next` to get assigned steps:

1. Orchestrator dispatches subagent with plan file path and step IDs
2. Subagent calls `next` to get assigned steps; uses built-in todo tasks only for tracking INSIDE a single step
3. MUST execute steps and call `update_status` after each completion
4. Proceed with request and activities

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
3. Prefer using built-in tools (yes) instead of shell commands (no).

</additional_requirements>

<subagents_orchestration_rules>

### Topology

1. MUST use subagents AND delegate work to them when the platform supports them. Orchestrator makes decisions and orchestrates.
2. Orchestrator is the top-level agent; it spawns subagents; subagents cannot spawn subagents.
3. Subagents start with fresh context every run.

### Input Contract

4. Subagent prompt MUST start with: assumed role/specialization, stated [lightweight|full] subagent, full path to plan.json, phase&step id, SMART tasks, `MUST USE SKILL [required]`, and `RECOMMEND USE SKILL [recommended]`.
5. Provide specific task, full context, and references. Subagents know nothing except shared bootstrap and prep steps and this contract, always provide original user request/intent throughout all steps.
6. Define explicit scope, expected outputs, and clear expectations. Forbid out-of-scope work.
7. Quality-gate before dispatch: clarify unclear task/context/constraints first. Never dispatch ambiguous instructions.
8. Lightweight = generic, built-in, small clear tasks (e.g., build/tests). Full = user-defined, specialized role, larger work.
9. Keep standard agent tools available to subagents as required.
10. Initialize required skills together with subagent usage.

### Output Contract

11. Define unique output file path per subagent.
12. For large output, define exact path and required file format/template.
13. Subagent must stop and report when blocked or off-plan.
14. Subagent returns, at minimum: concise results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, and insights.

### Routing & File I/O

15. Route independent work in parallel and dependent work sequentially.
16. For large input, use TEMP feature folder and provide workspace path.
17. Define collision-safe strategy for parallel file writes.
18. Use TEMP folder for temporary coordination.

### Quality & Ownership

19. Orchestrator is team manager; owns delegation quality end-to-end.
20. Orchestrator must spawn reviewer subagents to verify delegated work. Use different model if possible.
21. `Review` = static inspection (recommendations). `Validate` = running on real/sample tasks (catches real issues, expensive).
22. Adopt plan changes via `upsert` with proper ordering/analysis. If something comes up, adapt the plan. Extra work goes later, if logical and user agrees.
23. Keep orchestrator and subagent contexts below overload thresholds.
24. Prefer minimal state transitions between orchestration steps.
25. Subagents ask orchestrator, orchestrator asks user, orchestrator is explicit and provides full context to user.

</subagents_orchestration_rules>

</bootstrap_core_policy>
