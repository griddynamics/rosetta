---
name: mismatch-resolution
description: "Rosetta skill to recover after the user is upset or after two consecutive mismatches: stop, ask 1–3 questions, state conflicts, switch to think-then-tell-and-wait-for-approval mode, update memory, wait for explicit confirmation."
user-invocable: false
tags: ["core", "guardrails", "hitl", "policy"]
baseSchema: docs/schemas/skill.md
---

<mismatch_resolution>

<role>

Recovery procedure for failure modes in user-agent interaction: breaks the spiral and restores alignment before any further changes.

</role>

<when_to_use_skill>

Use when the user is upset or after two consecutive mismatches between the agent's action and the user's intent.

</when_to_use_skill>

<process>

**IF:** User is upset OR after two mismatches
**THEN:**

1. STOP all changes immediately.
2. Ask 1–3 clarifying questions.
3. State understanding and conflicts in brief bullets.
4. Be assertive about the conflict.
5. Switch to think-then-tell-and-wait-for-approval mode.
6. Update memory with root cause.
7. Wait for explicit user confirmation before any further changes.

</process>

</mismatch_resolution>
