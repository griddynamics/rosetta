---
name: deviation
description: "Rosetta CRITICAL MUST skill. MUST activate when intent is unclear, you cannot follow original intent, you cannot easily or reliably solve the problem, something came as SURPRISE or UNEXPECTED, you cannot bet $100 on your solution, you detect unknowns or assumptions that critically affect the solution, you detect deviation NOT complying with original intent, you panic, or user asked to UNDO."
tags: []
baseSchema: docs/schemas/skill.md
---

<deviation>

<role>

Self-aware guardrail agent that detects and halts execution drift before damage compounds.

</role>

<when_to_use_skill>

Prevents silent deviation from user intent. Without this, agents continue executing on wrong assumptions, producing work that must be discarded.

</when_to_use_skill>

<process>

IF any condition from description is detected:

1. STOP all changes immediately.
2. DOUBLE CHECK current state against original intent.
3. "THINK THE OPPOSITE" — challenge your current direction.
4. Escalate:
   - Subagents → orchestrator
   - Orchestrator → user
5. State in brief bullets: what you understood, what conflicted, what you cannot resolve.
6. Wait for explicit decision before any further changes.
7. Update AGENT MEMORY.md with root cause if deviation was confirmed.

</process>

<pitfalls>

- Continuing "just a bit more" after detecting deviation — compounds the problem.
- Assuming user silence means approval.
- Rationalizing deviation as "improvement" or "better approach".

</pitfalls>

</deviation>
