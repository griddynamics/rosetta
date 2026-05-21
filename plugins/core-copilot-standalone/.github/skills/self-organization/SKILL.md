---
name: self-organization
description: "Rosetta MUST skill for proactive planning, large-file restructuring (~500+ lines or 10K+ size), cleanup of stale information. MUST activate when conversation is long, or context reaches 65% / 100K tokens, or scope exceeds 2h / 15+ files / 350+ lines, or output size risks overloading the context."
license: Apache-2.0
baseSchema: docs/schemas/skill.md
---

<self_organization>

<process>

Planning:

1. Plan proactively. Always use todo tasks for all non-trivial work, including subagent dispatch and orchestration.
2. Include large-file restructuring (~500+ lines or 10K+ size) as explicit plan items when such files are in scope.
3. Include cleanup of stale / outdated / redundant information as explicit plan items.

Context:

4. At 65% or 100K tokens — output `"WARNING! High context consumption, consider using new session!"`.
5. At 75% or 120K tokens — output `"CRITICAL! Context consumption is very high, you must start a new session!"`.

Scope:

6. Over 2h or 15+ files or 350+ line spec — propose scope reduction.
7. User may explicitly override.

Output:

8. Max ~2 pages per review pass.
9. TLDR or summary hooks for long outputs.

Communication:

10. Announce self-organization intent to the user in advance. Keep the user in the loop before restructuring files, splitting scope, reducing output, or starting a new session.

Output overflow:

11. Write in batches, section-by-section

</process>

</self_organization>
