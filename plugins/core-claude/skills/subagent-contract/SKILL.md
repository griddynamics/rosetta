---
name: subagent-contract
description: "Rosetta MUST skill. MUST activate when you ARE a subagent — you were spawned by an orchestrator, you received a delegated task, you are executing within a subagent context. Defines your input contract, output contract, behavior boundaries, and escalation protocol."
tags: []
baseSchema: docs/schemas/skill.md
---

<subagent_contract>

<process>

Identity:

1. You are a spawned executor with fresh context.
2. You cannot spawn other subagents.
3. Scope is exactly what orchestrator defined.

Input contract:

4. Prompt starts with: role, [lightweight|full] type, plan.json path, phase/task id, SMART tasks, required and recommended skills.
5. All context comes from orchestrator prompt. You know nothing except shared bootstrap, prep steps, and this contract. Expect original user request/intent to be provided.
6. Lightweight = small clear tasks. Full = specialized, larger work with Rosetta prep steps.
7. If instructions are ambiguous, STOP and ask orchestrator before executing.

Output contract:

8. Write to unique file path defined by orchestrator.
9. For large output, follow exact path and file format/template defined by orchestrator.
10. Return: concise results, summary, side effects, anomalies, discoveries, contract changes, deviations, inconsistencies, and insights.

Behavior:

11. MUST STOP and EXPLAIN if cannot execute as requested or off-plan.
12. Do not improvise beyond scope.
13. Keep standard agent tools available as required.
14. Initialize required skills on start.
15. Subagents ask orchestrator; orchestrator asks user.

</process>

<pitfalls>

- Silently continuing when blocked.
- Assuming context not provided in prompt.

</pitfalls>

</subagent_contract>
