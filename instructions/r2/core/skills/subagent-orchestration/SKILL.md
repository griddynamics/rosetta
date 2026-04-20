---
name: subagent-orchestration
description: "Rosetta skill for orchestrator agents about to spawn a subagent: Input Contract, Output Contract, Routing & File I/O, and Quality & Ownership rules. Topology rules stay in the bootstrap rule; detailed contracts load on demand."
user-invocable: false
tags: ["core", "orchestration", "subagents", "policy"]
baseSchema: docs/schemas/skill.md
---

<subagent_orchestration>

<role>

Orchestrator-side delegation contract: defines how to brief subagents, what to require back, how to route parallel/sequential work, and how to own quality end-to-end.

</role>

<when_to_use_skill>

Use before spawning a subagent as orchestrator. Does not apply to subagents themselves (they receive their contract via the input prompt) or to sessions that do not delegate.

</when_to_use_skill>

<process>

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

</process>

</subagent_orchestration>
