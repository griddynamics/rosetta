---
name: dangerous-actions
description: "CRITICAL. MUST activate when action OR its consequence is potentially dangerous/irreversible/destructive, or HIGH RISK — even if it seems safe. Even a remote chance activate."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<dangerous_actions>

<process>

1. Assess BLAST RADIUS before execution.
2. "THINK THE OPPOSITE" — what if this goes wrong?
3. Consider safer alternatives.
4. MUST REQUIRE EXPLICIT user approval.

Examples (not limited):

- Deleting data from actual servers
- Using actual servers in unit testing
- git reset, deleting branches, force-push
- Generating destructive scripts or commands
- Modifying shared infrastructure, CI/CD, permissions
- Dropping or truncating database tables

Exceptions (only after blast radius):

5. Application code itself.
6. Just-created data you CAN fully recover.
7. Temporary data without side-effects.

</process>

<pitfalls>

- Assuming local action has no remote consequence.
- Generating destructive commands in scripts without flagging.

</pitfalls>

</dangerous_actions>
