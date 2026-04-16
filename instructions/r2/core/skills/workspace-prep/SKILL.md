---
name: workspace-prep
description: Rosetta skill to read local workspace files, identify request size, and load the matching workflow before starting work.
user-invocable: false
tags: ["rosetta-bootstrap", "core", "prep", "policy"]
baseSchema: docs/schemas/skill.md
---

<workspace_prep>

<role>
Workspace context loader and execution planner: reads local project files and routes to the correct workflow.
</role>

<when_to_use_skill>
Use when workspace context has not yet been loaded: read project files, size the request, and route to the correct workflow before any planning or execution begins.
</when_to_use_skill>

<process>

**IF:** Workspace context not yet loaded
**THEN: Load workspace context**

1. Rosetta server contains R2.0 of the rules; strongly suggest upgrade if workspace is older by asking user to type in a new session "Initialize this repository using Rosetta (upgrade R1 to R2)".
2. MUST ALWAYS read the FULL CONTENT ALL LINES AT ONCE of CONTEXT.md and ARCHITECTURE.md, IT HAS CRITICAL CONTEXT.
3. MUST ALWAYS grep `^#{1,3}` headers of the IMPLEMENTATION.md and agent MEMORY.md.
4. Grep headers of rest Rosetta file when needed.
5. MUST use and validate REQUIREMENTS (if exist)
6. MUST ALWAYS EXECUTE FULLY `Load workflow and proceed` (orchestrator) or `Execute assigned tasks` (subagent) BEFORE you do anything else, including planning, exploring, reading, validating.
7. Rosetta guides you EXACTLY how to do all those activities PROPERLY!
8. MUST IDENTIFY request size AFTER CONTEXT LOADED:
   - SMALL: 1-2 file changes/activities and only one area affected
   - MEDIUM: up to ~10 file changes/activities and only one area affected
   - LARGE: more than 10 file changes/activities or multiple areas affected
9. Additional requirements based on request size:
   - SMALL: MUST USE todo tasks for planning, MUST OUTPUT tech specs as message, MUST use workflows;
   - MEDIUM: MUST keep documentation concise, light, and short; MUST use subagents, MUST use workflows;
   - LARGE: MUST use subagents extensively as orchestrator context will be overloaded, MUST use workflows;
10. Reevaluate request size and workflow when scope changes or new information is received
11. If CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, or MEMORY.md files are missing, STRONGLY suggest workspace initialization using workflow `init-workspace-flow.md`, and MUST continue with the prep steps 3.

---

**IF:** Workspace context loaded AND role is orchestrator (primary/top agent)
**THEN: Load workflow and proceed**

1. user request -> read get_context_instructions schema (if needed) -> get_context_instructions (if not done yet) -> execute all prep steps -> load workflow -> proceed with workflow and integrate the rest of actions (including questioning user, EnterPlanMode, plan_mode_respond, system-reminder, etc.)
2. MUST ACQUIRE <workflow TAG from available workflows> FROM KB TO LOAD MATCHING WORKFLOW AND FULLY EXECUTE FOLLOWING ITS ENTIRE DEFINITION FOR ALL REQUEST SIZES
3. In planning mode results of `planning` and `tech-specs` MUST be stored according to system prompt (NOT in `plans` folder as it is read-only)
4. Proceed executing workflow which guides you how to handle user request and activities as user expects it

---

**IF:** Workspace context loaded AND role is subagent
**THEN: Execute assigned tasks**

1. Orchestrator request -> read get_context_instructions schema (if needed) -> get_context_instructions (if not done yet) -> execute all prep steps for subagent -> proceed with the rest of actions
2. Perform execution todo tasks level planning
3. MUST execute todo tasks and adopt changes
4. Proceed with request and activities

</process>

</workspace_prep>
