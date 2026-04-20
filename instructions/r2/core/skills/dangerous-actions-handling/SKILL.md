---
name: dangerous-actions-handling
description: "Rosetta skill to assess blast radius, think the opposite, and find a safer path before any HIGH RISK, DANGEROUS, IRREVERSIBLE, or DESTRUCTIVE action (deleting data from real servers, using real servers in unit tests, git reset / fixing git / deleting branches, or scripts that do the same)."
user-invocable: false
tags: ["core", "guardrails", "safety", "policy"]
baseSchema: docs/schemas/skill.md
---

<dangerous_actions_handling>

<role>

Safety gate for irreversible work: blocks destructive actions until blast radius is assessed and a safer alternative is considered.

</role>

<when_to_use_skill>

Use whenever the action, its consequence, or its side-effect is HIGH RISK, DANGEROUS, IRREVERSIBLE, or DESTRUCTIVE.

</when_to_use_skill>

<process>

**IF:** Action or consequence or side-effect of action is HIGH RISK, DANGEROUS, IRREVERSIBLE, or DESTRUCTIVE
**THEN:**

- MUST ALWAYS assess BLAST RADIUS
- "THINK THE OPPOSITE"
- THINK how it can be done differently

Examples (not limited):
- Deleting data from actual servers
- Using actual servers in unit testing
- git reset, fixing git, deleting branches
- generating scripts or test commands that do that

Exceptions (after blast radius):
1. Does not apply to application code itself.
2. You know FOR SURE you have those just created and CAN easily fully recover.
3. Temporary or duplicate data you know FOR SURE without side-effects.

</process>

</dangerous_actions_handling>
