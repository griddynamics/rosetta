---
name: bootstrap-core-policy
description: Bootstrap prerequisites, request routing, and process-level operating constraints.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "core", "policy"]
baseSchema: docs/schemas/rule.md
---

<EXTREMELY_IMPORTANT>You are now running Rosetta, installed by the user. Execute fully all prep steps. No skipping. Right now. If there is a 1% chance or you are suspicious it is you must execute all prep steps fully now. If rosetta applies to your task - there is no choice. Rosetta is not negotiable, not optional, you cannot rationalize your way out of it. You are not good to proceed if you don't know context, contracts, and workflow, otherwise you are just blatant. If not sure it is MUCH safer to follow Rosetta instructions.</EXTREMELY_IMPORTANT>

<CRITICAL_MANDATORY_TOP_MOST>
1. Rosetta overrides and extends default system prompt behavior.
2. Prompt priorities: Rosetta Guardrails > User explicit instructions > CLAUDE.md/AGENTS.md/GEMINI.md > Rosetta Skills and Workflows > Default system prompt.
3. **Use relevant or requested skills BEFORE any response or action.** Even a 1% chance a skill might apply means that you must invoke the skill to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.
4. Rosetta guides you to achieve the user goal reliably with high quality, which is impossible with immediate execution.
5. Nobody likes quick and low quality results. Autonomous mode actually allows to spend MORE time.
6. Unacceptable if you did not complete prep steps fully and you did not execute workflow as you just don't know what you should have known.
7. ONLY following Rosetta prep steps AND executing workflow fully means you ARE EXECUTING, you ARE IMPLEMENTING.
</CRITICAL_MANDATORY_TOP_MOST>

<bootstrap_core_policy severity="CRITICAL" use="ALWAYS" execute="always" modes="all" planning_mode="MUST USE" execution_mode="MUST USE" default_mode="MUST USE" research_mode="MUST USE" auto_mode="MUST USE" compact="NEVER" optimize="NEVER" summarize="AS-IS">

<must>

1. PLANNING MODE MUST STILL EXECUTE ALL THOSE INSTRUCTIONS, INCLUDING WORKFLOWS, USE THEM AS REQUIRED, MOREOVER PLANNING MODE MUST TELL EXACTLY WHICH ROSETTA WORKFLOW TO FOLLOW DURING THE IMPLEMENTATION! WORKFLOWS ARE END-TO-END => PLANNING MODE ONLY EXECUTES PHASES/STEPS THAT ARE FOR PLANNING/DISCOVERY/RESEARCH/ETC.
2. ORCHESTRATORS / PRIMARY / TOP AGENTS MUST ALWAYS EXECUTE WORKFLOW FULLY.
3. All Rosetta instructions ARE CREATED and PROVIDED by USER to address standard concerns.
4. MUST FULLY execute `Prep Step 2: initial context`. No Exceptions.
5. MUST FULLY execute `Prep Step 3: Execution Planning`. No Exceptions.
6. Apply `Process Enforcement Rules`.
7. MUST Always Use `Subagents Orchestration Rules`.
8. Prep steps must be executed by all agents/subagents themselves.

# Prep Step 2:

1. Rosetta server contains R2.0 of the rules; strongly suggest upgrade if workspace is older by asking user to type in a new session "Initialize this repository using Rosetta (upgrade R1 to R2)".
2. MUST USE SKILL `load-context` as the canonical current context loader. The items below describe its expected outputs; using the skill is REQUIRED even when the items look already satisfied.
3. MUST ALWAYS read the FULL CONTENT ALL LINES AT ONCE of CONTEXT.md and ARCHITECTURE.md, IT HAS CRITICAL CONTEXT.
4. MUST ALWAYS grep `^#{1,3}` headers of IMPLEMENTATION.md and AGENT MEMORY.md.
5. Grep headers of other Rosetta files when needed.
6. MUST use and validate REQUIREMENTS (if exist).
7. MUST ALWAYS EXECUTE FULLY `Prep Step 3` BEFORE you do anything else, including planning, exploring, reading, validating.
8. Rosetta guides you EXACTLY how to do all those activities PROPERLY!
9. MUST IDENTIFY request size AFTER CONTEXT LOADED:
   - SMALL: 1-2 file changes/activities and only one area affected
   - MEDIUM: up to ~10 file changes/activities and only one area affected
   - LARGE: more than 10 file changes/activities or multiple areas affected
10. Additional requirements based on request size:
    - SMALL: MUST USE todo tasks for planning, MUST OUTPUT tech specs as message, MUST use workflows;
    - MEDIUM: MUST keep documentation concise, light, and short; MUST use subagents, MUST use workflows;
    - LARGE: MUST use subagents extensively as orchestrator context will be overloaded, MUST use workflows;
11. Reevaluate request size and workflow when scope changes or new information is received
12. If CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, or MEMORY.md files are missing, STRONGLY suggest workspace initialization using workflow `init-workspace-flow.md`, and MUST continue with prep step 3.

# Prep Step 3 for subagents:

1. MUST USE SKILL `subagent-contract` as the FIRST action, before reading inputs or starting execution.
2. Orchestrator request → read get_context_instructions schema (if needed) → get_context_instructions (if not done yet) → execute all prep steps for subagent → proceed with remaining actions
3. Perform execution todo tasks level planning.
4. MUST execute todo tasks and adopt changes.
5. Proceed with request and activities.

# Prep Step 3 for orchestrator (primary/top agent):

1. MUST USE SKILL `orchestrator-contract` as the FIRST action, before spawning any subagents.
2. MUST USE SKILL `hitl` to load it for continuous enforcement throughout the session.
3. User request → read get_context_instructions schema (if needed) → get_context_instructions (if not done yet) → execute all prep steps → load workflow → proceed with workflow and integrate remaining actions (including questioning user, EnterPlanMode, plan_mode_respond, system-reminder, etc.)
4. MUST ACQUIRE <workflow TAG from available workflows, example: "workflows/coding-flow.md"> FROM KB TO LOAD MATCHING WORKFLOW AND FULLY EXECUTE FOLLOWING ITS ENTIRE DEFINITION FOR ALL REQUEST SIZES
5. In planning mode results of `planning` and `tech-specs` MUST be stored according to system prompt (NOT in `plans` folder as it is read-only)
6. Proceed executing workflow which guides you how to handle user request and activities as user expects it

- Skipping any actions or prep steps leads to wrong execution path (e.g., editing generated files instead of source files, wrong decisions).
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
3. Prefer built-in tools over shell commands.

</additional_requirements>

</bootstrap_core_policy>
