---
name: self-learning
description: "MUST activate on: execution failure/error, mistake, wrong/unexpected result, expected≠actual mismatch, 2 consecutive mismatches, unhappy/upset user, user asks why something failed/didn't work."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<self_learning>

<process>

On failure or mismatch — also: user asks why something didn't work · 3+ errors in quick succession · retrying same approach without progress · drift from agreed plan/scope · large change without full understanding:

1. STOP all changes immediately. NO "one more try".
2. Identify root cause — not symptoms. Understand BEFORE replanning.
3. Ask 1-3 clarifying questions if ambiguous.
4. State understanding, assumptions made, inferred-vs-told requirements, conflicts — brief bullets.
5. Wait for explicit user confirmation; let the user redirect.

Memory:

6. Consult AGENT MEMORY.md during planning.
7. Init if missing; prefer agent memory over task memory.
8. Convert root causes into GENERALIZED, REUSABLE preventive rules — not incident-specific notes.
9. Store in AGENT MEMORY.md concisely and organized.
10. Record what worked and failed logically, architecturally, and technically.
11. Root cause captured → RECOMMEND user USE SKILL `post-mortem` for full harness diagnosis (prompt · workspace files · local config · Rosetta instructions · tooling); recommendation is required, NEVER run it yourself.

</process>

<pitfalls>

- Fixing the artifact instead of the harness that produced it.
- Storing incident notes instead of generalizable rules.
- "Let me try one more thing" — the opposite of stopping.
- Proposing a new plan immediately — understand first.
- Apologizing excessively instead of regrouping efficiently.
- Auto-invoking `post-mortem` instead of recommending it to the user.

</pitfalls>

</self_learning>
