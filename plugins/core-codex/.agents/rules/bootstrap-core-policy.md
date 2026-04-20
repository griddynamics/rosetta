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

1. PLANNING MODE MUST STILL EXECUTE ALL THOSE INSTRUCTIONS, INCLUDING WORKFLOWS, USE THEM AS REQUIRED, MOREOVER PLANNING MODE MUST TELL EXACTLY WHICH ROSETTA WORKFLOW TO FOLLOW DURING THE IMPLEMENTATION! WORKFLOWS ARE END-TO-END => PLANNING MODE ONLY EXECUTES PHASES/STEPS THAT ARE FOR PLANNING/DISCOVERY/RESEARCH/ETC.
2. ORCHESTRATORS / PRIMARY / TOP AGENTS MUST ALWAYS EXECUTE WORKFLOW FULLY.
3. All Rosetta instructions ARE CREATED and PROVIDED by USER to address standard concerns.
4. MUST FULLY execute `Prep Step 2: initial context`. No Exceptions.
5. MUST FULLY execute `Prep Step 3: Execution Planning`. No Exceptions.
6. Apply `Process Enforcement Rules`.
7. MUST USE SKILL `orchestrator-contract` when spawning subagents.
8. MUST USE SKILL `subagent-contract` when executing as subagent.

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

</must>

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


</bootstrap_core_policy>
