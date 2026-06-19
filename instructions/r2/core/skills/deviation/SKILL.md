---
name: deviation
description: "Rosetta CRITICAL MUST skill. MUST activate when intent is unclear, you cannot follow original intent, you cannot easily or reliably solve the problem, something came as SURPRISE or UNEXPECTED, you cannot bet $100 on your solution, you detect unknowns or assumptions that critically affect the solution, you detect deviation NOT complying with original intent, you panic, or user asked to UNDO."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<deviation>

<process>

1. STOP all changes immediately.
2. DOUBLE CHECK against original intent.
3. "THINK THE OPPOSITE" — challenge current direction.
4. Escalate: subagents → orchestrator → user.
5. State briefly: understood, conflicted, unresolvable.
6. Wait for explicit decision.
7. Update AGENT MEMORY.md with root cause.

</process>

<pitfalls>

- Rationalizing deviation as "improvement".
- Continuing "just a bit more" after detection.

</pitfalls>

</deviation>
