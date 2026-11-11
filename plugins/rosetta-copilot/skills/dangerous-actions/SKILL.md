---
name: dangerous-actions
description: "MUST activate when action OR its consequence is potentially dangerous/irreversible/destructive, or HIGH RISK, or environment is stage, pre-prod, prod, or blast radius."
license: Apache-2.0
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<dangerous_actions>

<process>

1. Assess BLAST RADIUS before execution.
2. NEVER ALLOWED TO use/touch any higher environments!
3. "THINK THE OPPOSITE" — what if this goes wrong?
4. Consider safer alternatives.
5. MUST REQUIRE EXPLICIT user approval.

Examples (not limited):

- Deleting data from actual servers
- Using actual servers in unit testing
- git reset, deleting branches, force-push
- Generating destructive scripts or commands
- Modifying shared infrastructure, CI/CD, permissions
- Dropping or truncating database tables

Exceptions (only after blast radius):

1. Application code itself.
2. Just-created data you CAN fully recover.
3. Temporary data without side-effects.

</process>

<pitfalls>

- Assuming local action has no remote consequence.
- Generating destructive commands in scripts without flagging.

</pitfalls>

</dangerous_actions>
