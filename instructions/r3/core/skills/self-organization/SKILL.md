---
name: self-organization
description: "CRITICAL. MUST activate at 65%+ context usage, 2h / 15+ file / 350+ line scope, or large-file restructuring. Proactive planning, reorganization, stale-content cleanup."
license: Apache-2.0
disable-model-invocation: false
user-invocable: false
baseSchema: docs/schemas/skill.md
---

<self_organization>

<process>

1. Plan proactively; run everything as todo tasks per always-on `<tasks>`, incl. subagent dispatch/orchestration.
2. Explicit plan items for: restructuring large in-scope files (~500+ lines / 10K+ size) · cleanup of stale/outdated/redundant content.
3. At 65% context → output "WARNING! High context consumption, consider using new session!"; at 75% → output "CRITICAL! Context consumption is very high, you must start a new session!".
4. Over 2h / 15+ files / 350+ line spec → propose scope reduction; user may override.
5. Max ~2 pages per review pass; TLDR/summary hooks for long outputs.
6. Announce self-organization intent in advance — keep user in loop before restructuring files, splitting scope, reducing output, or starting a new session.
7. Output overflow → write in batches, section-by-section.

</process>

</self_organization>
