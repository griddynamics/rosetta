---
name: self-organization
description: "Rosetta MUST skill. MUST activate when context consumption reaches 65% or 100K tokens, conversation is long and heavy, scope of work exceeds 2h or 15+ files or spec above 350 lines, or output size risks overwhelming the user."
tags: []
baseSchema: docs/schemas/skill.md
---

<self_organization>

<process>

Context:

1. At 65% or 100K tokens — output `"WARNING! High context consumption, consider using new session!"`.
2. At 75% or 120K tokens — output `"CRITICAL! Context consumption is very high, you must start a new session!"`.

Scope:

3. Over 2h or 15+ files or 350+ line spec — propose scope reduction.
4. User may explicitly override.

Output:

5. Max ~2 pages per review pass.
6. TLDR or summary hooks for long outputs.

</process>

</self_organization>
