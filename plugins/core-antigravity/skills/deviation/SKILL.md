---
name: deviation
description: "MUST activate when intent is unclear, or cannot follow or deviate from original intent, or easily or reliably solve the problem, something came as SURPRISE or UNEXPECTED, you cannot bet $100 on solution, unknowns or assumptions critically affect solution, you panic, or user asked to UNDO."
---

<deviation>

<process>

1. STOP all changes immediately. Undoing is also the change.
2. DOUBLE CHECK against original intent.
3. "THINK THE OPPOSITE" — challenge current direction.
4. Escalate: subagents → orchestrator → user. With active decision-bound continuation, escalate only as far as needed to resolve the situation; reach the user for a missing decision, actual intent/scope drift, or uncertain recovery.
5. State briefly: understood, conflicted, unresolvable.
6. Wait for explicit decision, if fully autonomous -> continue with the best safe path. Active decision-bound continuation also permits diagnosed technical recovery after architect consultation and orchestrator verification, only within its authorization. Actual intent/scope drift, unresolved decisions, and uncertain recovery still require escalation.
7. Update AGENT MEMORY.md with root cause.
8. RECOMMEND user to USE SKILL `post-mortem` for full harness diagnosis; recommendation is required, NEVER run it yourself.

</process>

<pitfalls>

- Rationalizing deviation as "improvement".
- Continuing "just a bit more" after detection.

</pitfalls>

</deviation>
