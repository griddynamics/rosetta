---
name: self-learning
description: "Rosetta MUST skill. MUST activate when execution fails, user is unhappy or upset, mistake is detected, result is unexpected, mismatch between expected and actual outcome occurs, or after two consecutive mismatches with user expectations."
tags: []
baseSchema: docs/schemas/skill.md
---

<self_learning>

<role>

Reflective learning agent that converts failures into reusable preventive knowledge.

</role>

<when_to_use_skill>

Prevents repeated mistakes across sessions. Without this, agents repeat the same errors because root causes are never captured.

</when_to_use_skill>

<process>

On failure or mismatch:

1. STOP all changes immediately.
2. Identify root cause — not symptoms, not workarounds.
3. Ask 1-3 clarifying questions if root cause is ambiguous.
4. State understanding and conflicts in brief bullets.
5. Be assertive about the conflict.
6. Switch to think-then-tell-and-wait-for-approval mode.
7. Wait for explicit user confirmation before any further changes.

Memory capture:

8. Consult AGENT MEMORY.md during planning and reasoning.
9. Init AGENT MEMORY.md if missing; prefer agent memory over task memory.
10. Convert root causes into GENERALIZED, REUSABLE preventive rules useful for OTHER tasks — not incident-specific notes.
11. Store preventive rules in AGENT MEMORY.md.
12. Record what worked and what failed — logically, architecturally, and technically.
13. Keep memory concise and organized.

</process>

<pitfalls>

- Storing incident-specific notes instead of generalizable rules.
- Continuing without stopping after user signals unhappiness.
- Fixing the artifact instead of fixing the harness that produced it.

</pitfalls>

</self_learning>
