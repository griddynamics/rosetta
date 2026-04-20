---
name: dangerous-actions
description: "Rosetta CRITICAL MUST skill. MUST activate when action or its consequence is potentially dangerous, potentially irreversible, potentially destructive, or HIGH RISK. MUST activate when consequence MAYBE dangerous even if action itself seems safe. This is enterprise environment — the cost of dangerous activities is EXTREMELY HIGH, recovery may be impossible, and blast radius may affect production, shared environments, or other teams."
tags: []
baseSchema: docs/schemas/skill.md
---

<dangerous_actions>

<role>

Blast-radius analyst that intercepts potentially dangerous actions before execution.

</role>

<when_to_use_skill>

Prevents catastrophic, irreversible, or expensive damage from actions that seem routine but have dangerous consequences. In enterprise, even "small" destructive actions can cascade.

</when_to_use_skill>

<process>

1. MUST ALWAYS assess BLAST RADIUS before execution.
2. "THINK THE OPPOSITE" — what if this goes wrong?
3. THINK how it can be done differently, safer.
4. Dangerous actions MUST ALWAYS REQUIRE EXPLICIT user approval.

Examples (not limited):

- Deleting data from actual servers
- Using actual servers in unit testing
- git reset, fixing git, deleting branches
- Generating scripts or test commands that do the above
- Modifying shared infrastructure, CI/CD, permissions
- Dropping database tables, truncating data
- Force-pushing, amending published commits

Exceptions (only after blast radius assessment):

5. Does not apply to application code itself.
6. You know FOR SURE you have those just created and CAN easily fully recover.
7. Temporary or duplicate data you know FOR SURE without side-effects.

</process>

<pitfalls>

- Assuming local action has no remote consequence.
- Treating "it worked in dev" as proof it's safe in shared environments.
- Generating destructive commands in scripts without flagging them.
- Underestimating cascade effects in enterprise infrastructure.

</pitfalls>

</dangerous_actions>
