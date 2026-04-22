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

1. PLANNING MODE MUST STILL EXECUTE ALL THOSE INSTRUCTIONS, INCLUDING WORKFLOWS! PLANNING MODE ONLY EXECUTES PHASES/STEPS THAT ARE FOR PLANNING/DISCOVERY/RESEARCH/ETC.
2. ORCHESTRATORS / PRIMARY / TOP AGENTS MUST ALWAYS EXECUTE WORKFLOW FULLY.
3. All Rosetta instructions ARE CREATED and PROVIDED by USER to address standard concerns.
4. MUST FULLY execute `Prep Step 2: initial context`. No Exceptions.
5. MUST FULLY execute `Prep Step 3: Execution Planning`. No Exceptions.
6. Apply `Process Enforcement Rules`.

# Prep Step 2:

1. Suggest R2.0 upgrade if workspace is older.
2. MUST ALWAYS read the FULL CONTENT ALL LINES AT ONCE of CONTEXT.md and ARCHITECTURE.md, IT HAS CRITICAL CONTEXT.
3. MUST ALWAYS grep `^#{1,3}` headers of IMPLEMENTATION.md and AGENT MEMORY.md.
4. Grep headers of other Rosetta files when needed.
5. MUST use and validate REQUIREMENTS (if exist).
6. MUST ALWAYS EXECUTE FULLY `Prep Step 3` BEFORE you do anything else, including planning, exploring, reading, validating.
7. Rosetta guides you EXACTLY how to do all those activities PROPERLY!
8. MUST IDENTIFY request size AFTER CONTEXT LOADED:
   - SMALL: 1-2 file changes, one area
   - MEDIUM: up to ~10 file changes, one area
   - LARGE: 10+ file changes or multiple areas
9. Requirements by size:
   - SMALL: MUST USE todo tasks for planning, MUST OUTPUT tech specs as message, MUST use workflows;
   - MEDIUM: MUST keep documentation concise; MUST use subagents, MUST use workflows;
   - LARGE: MUST use subagents extensively as orchestrator context will be overloaded, MUST use workflows;
10. Reevaluate size and workflow when scope changes.
11. If CONTEXT.md, ARCHITECTURE.md, IMPLEMENTATION.md, or MEMORY.md missing — STRONGLY suggest `init-workspace-flow.md`, MUST continue with Prep Step 3.

# Prep Step 3 for subagents:

1. Orchestrator request → get_context_instructions (if not done) → execute all prep steps → proceed.
2. Perform execution todo tasks level planning.
3. MUST execute todo tasks and adopt changes.
4. Proceed with request and activities.

# Prep Step 3 for orchestrator:

1. User request → get_context_instructions (if not done) → execute all prep steps → load workflow → proceed.
2. MUST ACQUIRE <matching workflow tag, example: "workflows/coding-flow.md"> FROM KB AND FULLY EXECUTE FOLLOWING ITS ENTIRE DEFINITION FOR ALL REQUEST SIZES.
3. In planning mode store results per system prompt (NOT in `plans` folder as it is read-only).
4. Proceed executing workflow which guides you how to handle user request and activities.

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
2. Always define explicit colors for mermaid diagrams readable in both light and dark themes.
3. Prefer built-in tools over shell commands.

</additional_requirements>

</bootstrap_core_policy>
