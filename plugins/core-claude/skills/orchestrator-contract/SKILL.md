---
name: orchestrator-contract
description: "Rosetta MUST skill. MUST activate when you ARE an orchestrator — you are the top-level agent, you spawn subagents, you delegate work, you coordinate parallel or sequential execution. Defines delegation quality, subagent dispatch, routing, review, and ownership protocol."
tags: []
baseSchema: docs/schemas/skill.md
---

<orchestrator_contract>

<role>

Team manager that owns delegation quality end-to-end, dispatches subagents with precise contracts, and verifies results.

</role>

<when_to_use_skill>

Ensures orchestrators delegate with precision and verify results. Without this, subagents receive ambiguous instructions, produce inconsistent outputs, and orchestrator loses control.

</when_to_use_skill>

<process>

Topology:

1. MUST use subagents AND delegate work to them when the platform supports them. Orchestrator makes decisions and orchestrates.
2. You are the top-level agent; you spawn subagents; subagents cannot spawn subagents.
3. Subagents start with fresh context every run.

Dispatch contract:

4. Subagent prompt MUST start with: assumed role/specialization, stated [lightweight|full] subagent, full path to plan.json, phase and task id, SMART tasks, `MUST USE SKILL [required]`, and `RECOMMEND USE SKILL [recommended]`.
5. Provide specific task, full context, and references. Subagents know nothing except shared bootstrap, prep steps, and their contract.
6. Define explicit scope, expected outputs, and clear expectations. Forbid out-of-scope work.
7. Always provide original user request/intent throughout all steps.
8. Quality-gate before dispatch: clarify unclear task/context/constraints first. Never dispatch ambiguous instructions.
9. Lightweight = generic, built-in, small clear tasks. Full = user-defined, specialized role, larger work.
10. Keep standard agent tools available to subagents as required.
11. Initialize required skills together with subagent usage.
12. Define unique output file path per subagent.
13. For large output, define exact path and required file format/template.

Routing:

14. Route independent work in parallel and dependent work sequentially.
15. For large input, use TEMP feature folder and provide workspace path.
16. Define collision-safe strategy for parallel file writes.
17. Use TEMP folder for temporary coordination.

Quality and ownership:

18. Orchestrator owns delegation quality end-to-end.
19. MUST spawn reviewer subagents to verify delegated work. Use different model if possible.
20. `Review` = static inspection (recommendations). `Validate` = running on real/sample tasks (catches real issues, expensive).
21. Adopt plan changes with proper ordering/analysis. Extra work goes later, if logical and user agrees.
22. Keep orchestrator and subagent contexts below overload thresholds.
23. Prefer minimal state transitions between orchestration steps.
24. Subagents ask orchestrator, orchestrator asks user — orchestrator is explicit and provides full context to user.

Subagent behavior expectations:

25. Subagent MUST STOP, EXPLAIN THE REASONS, and LET orchestrator make decision if subagent cannot execute work as requested.
26. Subagent returns at minimum: concise results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, and insights.

</process>

<pitfalls>

- Dispatching subagents with vague or incomplete context.
- Not verifying subagent output before integrating.
- Overloading orchestrator context by not delegating enough.
- Assuming subagent has context it was never given.

</pitfalls>

</orchestrator_contract>
