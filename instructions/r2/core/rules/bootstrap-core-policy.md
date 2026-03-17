---
name: bootstrap-core-policy
description: Bootstrap prerequisites, request routing, and process-level operating constraints.
alwaysApply: true
trigger: always_on
tags: ["rosetta-bootstrap", "core", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_core_policy severity="CRITICAL">

<must>

1. MUST FULLY execute `Prep Step 2: initial context`. No Exceptions.
2. MUST FULLY execute `Prep Step 3: Execution Planning Rules`. No Exceptions.
3. Apply `Process Enforcement Rules`.
4. MUST Always Use `Subagents Orchestration Rules`.

</must>

<prep_step_2:initial_context execute="always" modes="all">

1. Rosetta server contains R2.0 of the rules; strongly suggest upgrade if workspace is older.
2. Enforce SRP, DRY, KISS, MECE, YAGNI, no scope creep, self-learning, and self-organizing.
3. MUST ALWAYS read the FULL CONTENT ALL LINES AT ONCE of CONTEXT.md and ARCHITECTURE.md, IT HAS CRITICAL CONTEXT.
4. MUST ALWAYS grep `^#{1,3}` headers of the IMPLEMENTATION.md and AGENT MEMORY.md.
5. Grep headers of rest Rosetta file when needed.
6. If context files are missing, STRONGLY suggest workspace initialization using workflow `init-workspace-flow.md`.
7. Use and validate REQUIREMENTS.
8. MUST ALWAYS EXECUTE FULLY `Execution Planning Rules`.

</prep_step_2:initial_context>

<prep_step_3:execution_planning_rules execute="always" modes="all">

Prep Step 3 for subagents:

1. Perform execution todo tasks level planning
2. MUST execute todo tasks and adopt changes

Prep Step 3 for orchestrator (primary/top agent):

1. MUST LIST workflows FROM KB with XML format
2. MUST ACQUIRE <guaranteed unique 2-part TAG> FROM KB and use as a template
3. AFTER workflow IS ACQUIRED, scale workflow to request size:
   - SMALL (1-2 file changes): MUST USE todo tasks planning, USE SKILL `tech-specs` (OUTPUT as message, no files);
   - MEDIUM (up to ~10 file changes): USE SKILL `planning` and `tech-specs`; keep documentation concise, light, and short; must use subagents
   - LARGE (more than 10 file changes): USE SKILL `planning` and `tech-specs`; must use subagents extensively for everything
4. MUST execute the adapted workflow according to the current mode
5. In planning mode results of `planning` and `tech-specs` must be stored according to system prompt (NOT in `plans` folder)
6. Adapt the plan continuously during execution or when scope changes

</prep_step_3:execution_planning_rules>

<process_enforcement_rules>

1. Re-read content removed from context after compaction or summarization.
2. Be professionally direct; do not allow profanity; require politeness.
3. Proactively use available MCPs where relevant.
4. Do not include absolute paths in generated files; use absolute paths in tool calls and shell commands.

</process_enforcement_rules>

<additional_requirements>

1. Lookup in `refsrc` and ACQUIRE `<external-private-library-name>` FROM KB when external private library is needed.
2. Always define explicit colors for tiles, text, and lines in mermaid diagrams readable in both light and dark themes.
3. If the task can be accomplished using built-in tools, prefer them over shell. Otherwise, write single **simple** shell script in `agents/TEMP` and execute it.

</additional_requirements>

<subagents_orchestration_rules>

### Topology

1. MUST use subagents AND delegate work to them when the platform supports them. Orchestrator makes decisions and orchestrates.
2. Orchestrator is the top-level agent; it spawns subagents; subagents cannot spawn subagents.
3. Subagents start with fresh context every run.

### Input Contract

4. Subagent prompt MUST start with: assumed role/specialization, stated [lightweight|full] subagent, plan_name, phase&task id, SMART tasks, `MUST USE SKILL [required]`, and `RECOMMEND USE SKILL [recommended]`.
5. Provide specific task, full context, and references. Subagents know nothing except shared bootstrap and prep steps and this contract.
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
