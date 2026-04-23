---
name: self-learning
description: "Rosetta MUST skill. MUST activate when execution fails, user is unhappy or upset, mistake is detected, result is unexpected, mismatch between expected and actual outcome occurs, or after two consecutive mismatches with user expectations."
tags: []
baseSchema: docs/schemas/skill.md
---

<self_learning>

<process>

On failure or mismatch:

1. STOP all changes immediately.
2. Identify root cause — not symptoms.
3. Ask 1-3 clarifying questions if ambiguous.
4. State understanding and conflicts in brief bullets.
5. Wait for explicit user confirmation.

Memory:

6. Consult AGENT MEMORY.md during planning.
7. Init if missing; prefer agent memory over task memory.
8. Convert root causes into GENERALIZED, REUSABLE preventive rules — not incident-specific notes.
9. Store in AGENT MEMORY.md concisely and organized.
10. Record what worked and failed logically, architecturally, and technically.

</process>

<pitfalls>

- Fixing the artifact instead of the harness that produced it.
- Storing incident notes instead of generalizable rules.

</pitfalls>

</self_learning>
