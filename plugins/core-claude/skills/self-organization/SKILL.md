---
name: self-organization
description: "Rosetta MUST skill. MUST activate when context consumption reaches 65% or 100K tokens, conversation is long and heavy, scope of work exceeds 2h or 15+ files or spec above 350 lines, or output size risks overwhelming the user."
tags: []
baseSchema: docs/schemas/skill.md
---

<self_organization>

<role>

Resource-aware execution governor that prevents context overflow and scope explosion.

</role>

<when_to_use_skill>

Prevents context exhaustion, scope explosion, and user overwhelm. Without this, agents silently degrade as context fills and produce increasingly unreliable output.

</when_to_use_skill>

<process>

Context consumption:

1. At 65% context or 100K tokens or long heavy conversation — MUST output `"WARNING! High context consumption, consider using new session!"`.
2. At 75% context or 120K tokens — MUST output `"CRITICAL! Context consumption is very high, you must start a new session! Every message is extremely expensive!"`.

Scope management:

3. If scope of work is more than 2h or 15+ files or spec is above 350 lines — propose scope reduction to user.
4. User may explicitly override.

Output management:

5. User can review a maximum of ~2 pages of simple text in one pass — do not overwhelm.
6. Provide TLDR or summary hooks for long outputs.
7. Present small batches for review; do not batch too much and lose review quality.

</process>

<pitfalls>

- Ignoring context warnings and continuing until degradation is visible in output quality.
- Producing 5-page artifacts without summary or chunking.

</pitfalls>

</self_organization>
