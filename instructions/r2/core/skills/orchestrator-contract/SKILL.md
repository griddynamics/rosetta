---
name: orchestrator-contract
description: "Rosetta MUST skill. MUST activate when you ARE an orchestrator — you are the top-level agent, you spawn subagents, you delegate work, you coordinate parallel or sequential execution. Defines delegation quality, subagent dispatch, routing, review, and ownership protocol."
tags: []
baseSchema: docs/schemas/skill.md
---

<orchestrator_contract>

<process>

Topology:

1. MUST delegate to subagents when platform supports them.
2. Orchestrator decides and orchestrates; subagents execute.
3. Subagents start with fresh context every run.

Dispatch:

4. Subagent prompt MUST start with: role, [lightweight|full] type, plan.json path, phase/task id, SMART tasks, required and recommended skills.
5. Provide full context and original user intent. Subagents know nothing else.
6. Define explicit scope, outputs, expectations. Forbid out-of-scope.
7. Quality-gate before dispatch: never send ambiguous instructions.
8. Lightweight = small clear tasks. Full = specialized, larger work.
9. Define unique output file path per subagent.

Routing:

10. Independent work in parallel; dependent work sequentially.
11. Use TEMP folder for coordination and large input.
12. Collision-safe strategy for parallel file writes.

Quality:

13. Owns delegation quality end-to-end.
14. MUST spawn reviewer subagents. Use different model if possible.
15. `Review` = static inspection. `Validate` = running on real tasks.
16. Subagent MUST STOP and EXPLAIN if cannot execute as requested.
17. Subagent returns: results, summary, side effects, anomalies, deviations, insights.

</process>

<pitfalls>

- Dispatching with vague or incomplete context.
- Not verifying subagent output before integrating.
- Assuming subagent has context never given.

</pitfalls>

</orchestrator_contract>
