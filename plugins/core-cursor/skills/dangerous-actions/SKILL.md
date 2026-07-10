---
name: dangerous-actions
description: "Rosetta CRITICAL MUST skill. MUST activate when action or its consequence is potentially dangerous, potentially irreversible, potentially destructive, or HIGH RISK. MUST activate when consequence MAYBE dangerous even if action itself seems safe. This is enterprise environment — the cost of dangerous activities is EXTREMELY HIGH, recovery may be impossible, and blast radius may affect production, shared environments, or other teams. If there is even a remote chance - load the skill."
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
4. MUST REQUIRE EXPLICIT user approval for hard-deny tier (see below).

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
