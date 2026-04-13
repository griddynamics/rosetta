---
name: prep-steps
description: Deterministic prep steps 2 and 3 for Rosetta bootstrap, executed via plan_manager for trackable, resumable context loading and workflow routing.
baseSchema: docs/schemas/skill.md
tags:
  - prep-steps
  - bootstrap
  - planning
---

<prep_steps>

<role>

You are the bootstrap context loader. Execute prep steps 2 and 3 as a deterministic plan_manager sequence.

</role>

<when_to_use_skill>

Use once per session, immediately after `get_context_instructions()` completes (prep step 1). Mandatory for all request types and sizes.

</when_to_use_skill>

<plan_manager_sequence>

Create a plan_manager plan with the following deterministic phases and steps:

Phase: `prep` | Step: `load-context`
- Read the FULL CONTENT ALL LINES AT ONCE of CONTEXT.md and ARCHITECTURE.md
- Grep `^#{1,3}` headers of IMPLEMENTATION.md and MEMORY.md
- Grep headers of rest Rosetta files when needed
- Use and validate REQUIREMENTS (if exist)

Phase: `prep` | Step: `classify-request`
- Identify request size after context loaded
- Reevaluate request size and workflow when scope changes or new information is received

Phase: `prep` | Step: `load-workflow`
- ACQUIRE matching workflow FROM KB and fully execute following its entire definition
- In planning mode, persist the unique workflow tag with instruction to acquire it to continue proper execution

</plan_manager_sequence>

<prep_step_2>

# Prep Step 2:

1. Rosetta server contains R2.0 of the rules; strongly suggest upgrade if workspace is older by asking user to type in a new session "Initialize this repository using Rosetta (upgrade R1 to R2)".
2. MUST ALWAYS read the FULL CONTENT ALL LINES AT ONCE of CONTEXT.md and ARCHITECTURE.md, IT HAS CRITICAL CONTEXT.
3. MUST ALWAYS grep `^#{1,3}` headers of the IMPLEMENTATION.md and agent MEMORY.md.
4. Grep headers of rest Rosetta file when needed.
5. MUST use and validate REQUIREMENTS (if exist)
6. MUST ALWAYS EXECUTE FULLY `Prep Step 3` BEFORE you do anything else, including planning, exploring, reading, validating.
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

</prep_step_2>

<prep_step_3>

# Prep Step 3 for subagents:

1. Orchestrator request -> read get_context_instructions schema (if needed) -> get_context_instructions (if not done yet) -> execute all prep steps for subagent -> proceed with the rest of actions
2. Perform execution todo tasks level planning
3. MUST execute todo tasks and adopt changes
4. Proceed with request and activities

# Prep Step 3 for orchestrator (primary/top agent):

1. user request -> read get_context_instructions schema (if needed) -> get_context_instructions (if not done yet) -> execute all prep steps -> load workflow -> proceed with workflow and integrate the rest of actions (including questioning user, EnterPlanMode, plan_mode_respond, system-reminder, etc.)
2. MUST ACQUIRE <workflow TAG from available workflows> FROM KB TO LOAD MATCHING WORKFLOW AND FULLY EXECUTE FOLLOWING ITS ENTIRE DEFINITION FOR ALL REQUEST SIZES
3. In planning mode results of `planning` and `tech-specs` MUST be stored according to system prompt (NOT in `plans` folder as it is read-only)
4. Proceed executing workflow which guides you how to handle user request and activities as user expects it

</prep_step_3>

</prep_steps>
