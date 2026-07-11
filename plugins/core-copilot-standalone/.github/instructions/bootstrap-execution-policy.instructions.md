---
name: bootstrap-execution-policy
description: Defines planning, task execution, validation, orchestration, and memory behavior for bootstrap flow.
alwaysApply: true
applyTo: "**"
trigger: always_on
tags: ["rosetta-bootstrap", "execution", "policy"]
baseSchema: docs/schemas/rule.md
---

<bootstrap_execution_policy severity="HIGH" use="ALWAYS">

<must>

1. Apply `Planning and Documentation Sync Rules`.
2. Apply `Task Management Rules`.
3. Apply `Validation Rules`.
4. Apply `Memory And Self-Learning Rules`.
5. MUST Always Use `Subagents Orchestration Rules`.
6. MUST NOT IGNORE entire set of instructions if one or another activity of the set is impossible to execute. Those inconsistencies MUST BE REPORTED ALWAYS.
7. When user directly provides via slash-command SKILL or COMMAND or WORKFLOW YOU MUST FULLY EXECUTE IT
8. Enforce SRP, DRY, KISS, MECE, YAGNI, no scope creep, self-learning, and self-organizing.

</must>

<planning_and_documentation_sync_rules>

1. Update IMPLEMENTATION.md after each task.
2. MUST FULLY FOLLOW prompts/commands/flows - this ensures users get proper solution for their problem
3. MUST NOT NEVER JUMP DIRECTLY TO IMMEDIATE EXECUTION, you are in ENTERPRISE environment, NOT startup, you MUST REASON, prep steps are direct path to get to the point the right way!
4. Proactively update, review, structure, restructure, and cleanup Rosetta files: including and not limited to CONTEXT.md, ARCHITECTURE.md, CODEMAP.md, TECHSTACK.md, DEPENDENCIES.md, PATTERNS/\*
5. Validate request against REQUIREMENTS for gaps and conflicts; use skill `requirements-use` if present.

</planning_and_documentation_sync_rules>

<task_management_rules>

1. Use provided task management tool when available.
2. Create explicit and actionable tasks.
3. Break complex work into manageable steps.
4. Keep exactly one task in progress at a time.
5. Mark tasks complete immediately after finishing.
6. Do not mark tasks complete without verifiable tool evidence.
7. Do not mark multiple tasks complete unless completed in the same tool call.
8. Treat completed as verified done, never assumed done.

</task_management_rules>

<validation_rules>

1. Create recurrent validation task at the end of execution flow.
2. Validate incrementally and at flow end.
3. Raise questions when findings conflict with request or intent.
4. Keep final status grounded in observed evidence.

</validation_rules>

<memory_and_self_learning_rules>

1. Consult AGENT MEMORY.md during planning and reasoning
2. Init if missing, prefer agent memory over task memory
3. Identify root cause for every failure or missed expectation
4. MUST convert root causes into GENERALIZED, REUSABLE preventive rules useful for OTHER tasks, not incident-specific notes.
5. Store preventive rules in memory
6. Keep memory concise, organized
7. Record what worked and failed logically, architecturally, and technically

</memory_and_self_learning_rules>

<subagents_orchestration_rules>

### Topology

1. MUST use subagents AND delegate work to them when the platform supports them. Orchestrator makes decisions and orchestrates.
2. Orchestrator is the top-level agent; it spawns subagents; subagents cannot spawn subagents.
3. Subagents start with fresh context every run.

### Input Contract

4. Subagent prompt MUST start with: assumed role/specialization, stated [lightweight|full] subagent, SMART tasks, `MUST USE SKILL [required]`, and `RECOMMEND USE SKILL [recommended]`.
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


<should>

1. Keep plan and task wording concise and operational.
2. Keep orchestration context complete but minimal.
3. Include high-value execution hints in task descriptions.

</should>

</bootstrap_execution_policy>
