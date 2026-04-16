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
7. MUST Always Use `Subagents Orchestration Rules`.

# Prep Step 2, Prep Step 3 for subagents, Prep Step 3 for orchestrator (primary/top agent):

**IF:** `workspace-prep` skill not loaded
**THEN:** MUST USE SKILL `workspace-prep`

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

<subagents_orchestration_rules>

### Topology

1. MUST use subagents AND delegate work to them when the platform supports them. Orchestrator makes decisions and orchestrates.
2. Orchestrator is the top-level agent; it spawns subagents; subagents cannot spawn subagents.
3. Subagents start with fresh context every run.

### Input Contract

4. Subagent prompt MUST start with: assumed role/specialization, stated [lightweight|full] subagent, full path to plan.json, phase&task id, SMART tasks, `MUST USE SKILL [required]`, and `RECOMMEND USE SKILL [recommended]`.
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
22. Adopt plan changes with proper ordering/analysis. If something comes up, adapt the plan. Extra work goes later, if logical and user agrees.
23. Keep orchestrator and subagent contexts below overload thresholds.
24. Prefer minimal state transitions between orchestration steps.
25. Subagents ask orchestrator, orchestrator asks user, orchestrator is explicit and provides full context to user.

</subagents_orchestration_rules>

</bootstrap_core_policy>
